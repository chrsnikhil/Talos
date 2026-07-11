import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { writeFileSync, readFileSync, existsSync } from "fs"
import { SuiClient } from "@mysten/sui/client"
import { AGENT_ADDRESS, RPC } from "../lib/talos/config"
import { runCycle, runMultiUserCycle } from "../lib/talos/icarus"
import { runCritique } from "../lib/talos/daedalus"
import { readPolicy, readReputation } from "../lib/talos/chain"
import { llmInfo } from "../lib/talos/llm"

// The Talos swarm, running autonomously and continuously. Each tick:
//   1. Icarus senses (live APYs) → decides (LLM or heuristic) → acts (policy-gated,
//      real USDC across Scallop/NAVI/Kai) → logs to Walrus.
//   2. Daedalus grades any new, un-rated Icarus rebalances on-chain.
// It loops forever at TALOS_INTERVAL_MS, persisting a small state file so the dashboard
// can show cycles + uptime, and halts cleanly if the owner revokes the policy, the policy
// expires, or it receives Ctrl-C. The on-chain policy is the leash: budget, per-tx cap,
// protocol allowlist and expiry bound everything this loop can do unattended.

const INTERVAL_MS = Number(process.env.TALOS_INTERVAL_MS ?? 60000) // one tick / minute
const STATE_FILE = process.env.TALOS_SWARM_STATE ?? ".talos-swarm.json"
const MIN_SUI = Number(process.env.TALOS_MIN_SUI ?? 0.1)
const DRY_RUN = process.env.TALOS_DRY_RUN === "1" // sense + think + tick, no on-chain writes
const SUI_TYPE = "0x2::sui::SUI"

type SwarmState = {
  startedAt: string
  cycles: number
  lastTickAt: string | null
  lastAction: string | null
  provider: string
  model: string
  intervalMs: number
  running: boolean
  reputation: { total: number; avg: number } | null
}

function loadState(): SwarmState {
  if (existsSync(STATE_FILE)) {
    try {
      const prev = JSON.parse(readFileSync(STATE_FILE, "utf8"))
      return { ...prev } // resume the cumulative cycle count across restarts
    } catch {
      /* fall through to fresh state */
    }
  }
  const info = llmInfo()
  return {
    startedAt: new Date().toISOString(),
    cycles: 0,
    lastTickAt: null,
    lastAction: null,
    provider: info.provider,
    model: info.model,
    intervalMs: INTERVAL_MS,
    running: false,
    reputation: null,
  }
}

function saveState(s: SwarmState) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(s, null, 2))
  } catch (e: any) {
    console.error("could not persist swarm state:", e?.message ?? e)
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const MAINNET_CHAIN_ID = "35834a8a"

async function main() {
  const client = new SuiClient({ url: RPC })

  // Confirm we're on mainnet before moving real funds. Verify the CHAIN IDENTIFIER
  // (robust to reliable RPC URLs that don't literally contain "mainnet", e.g.
  // sui-rpc.publicnode.com). Fall back to the URL heuristic only if the identifier
  // can't be fetched, so a transient RPC hiccup at boot doesn't wedge the loop.
  try {
    const chainId = await client.getChainIdentifier()
    if (chainId !== MAINNET_CHAIN_ID) {
      console.error(`✗ chain identifier "${chainId}" is not Sui mainnet (${MAINNET_CHAIN_ID}). Refusing to run the real-fund swarm.`)
      process.exit(1)
    }
  } catch {
    if (!/mainnet/i.test(RPC)) {
      console.error(`✗ could not confirm mainnet and SUI_RPC ("${RPC}") lacks "mainnet". Refusing to run the real-fund swarm.`)
      process.exit(1)
    }
  }

  const info = llmInfo()
  const brain = info.provider === "none" ? "heuristic (no LLM key)" : `${info.provider} · ${info.model}`

  console.log("╔══════════════════════════════════════════════╗")
  console.log("║  TALOS swarm — autonomous, continuous (mainnet) ")
  console.log("╚══════════════════════════════════════════════╝")
  console.log("agent:   ", AGENT_ADDRESS)
  console.log("brain:   ", brain)
  console.log("mode:    ", DRY_RUN ? "DRY-RUN — sense+think+tick only, NO on-chain writes" : "LIVE — real mainnet transactions")
  console.log("interval:", `${INTERVAL_MS}ms`)
  console.log("state:   ", STATE_FILE)

  const state = loadState()
  state.provider = info.provider
  state.model = info.model
  state.intervalMs = INTERVAL_MS
  state.running = true
  if (state.cycles > 0) console.log(`resuming — ${state.cycles} prior cycles on record`)

  let stopping = false
  const stop = (sig: string) => {
    if (stopping) return
    stopping = true
    console.log(`\n${sig} received — finishing current tick, then halting…`)
  }
  process.on("SIGINT", () => stop("SIGINT"))
  process.on("SIGTERM", () => stop("SIGTERM"))

  while (!stopping) {
    // Re-read the leash each tick: the owner can revoke or let it expire at any time.
    let policy
    try {
      policy = await readPolicy()
    } catch (e: any) {
      console.error("could not read policy this tick:", e?.message ?? e)
      await sleep(INTERVAL_MS)
      continue
    }
    if (policy.revoked) {
      console.log("policy REVOKED by owner — swarm halting.")
      break
    }
    if (Date.now() >= policy.expires_at_ms) {
      console.log("policy EXPIRED — swarm halting.")
      break
    }

    // Gas guard: don't spin uselessly if the wallet can't pay for txs.
    // Skipped in dry-run (the ephemeral key holds no SUI and signs nothing).
    if (!DRY_RUN) {
      try {
        const sui = await client.getBalance({ owner: AGENT_ADDRESS, coinType: SUI_TYPE })
        if (Number(sui.totalBalance) / 1e9 < MIN_SUI) {
          console.log(`low gas (< ${MIN_SUI} SUI) — pausing this tick.`)
          await sleep(INTERVAL_MS)
          continue
        }
      } catch {
        /* non-fatal; let the cycle try */
      }
    }

    state.cycles += 1
    const n = state.cycles
    // Flagship single-agent loop — preserves the mainnet proof + track record.
    // Runs unconditionally; a failure here does not affect the multi-user cycle.
    try {
      await runCycle(n) // Icarus: sense → think → act (policy-gated) → Walrus
      if (!DRY_RUN) await runCritique() // Daedalus: grade any new rebalances on-chain (signs — skip in dry-run)
    } catch (e: any) {
      console.error(`[#${n}] flagship tick error:`, e?.message ?? e)
    }
    // Multi-user cycle — iterates active user vaults. If listActiveVaults() returns []
    // this is a cheap no-op. Gated on TALOS_PACKAGE_ID=v2; on v1 logs intent only.
    // A failure here does not affect the flagship loop.
    try {
      await runMultiUserCycle(n)
    } catch (e: any) {
      console.error(`[#${n}] multi-user tick error:`, e?.message ?? e)
    }

    try {
      state.reputation = await readReputation()
    } catch {
      /* keep last known reputation */
    }
    state.lastTickAt = new Date().toISOString()
    saveState(state)
    const rep = state.reputation
    console.log(`   ↳ tick #${n} complete${rep ? ` · reputation ${rep.total} ratings · avg ${rep.avg}/100` : ""}`)

    if (stopping) break
    await sleep(INTERVAL_MS)
  }

  state.running = false
  saveState(state)
  console.log(`swarm stopped after ${state.cycles} cycles.`)
  process.exit(0)
}

main()
