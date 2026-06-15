import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { writeFileSync, readFileSync, existsSync } from "fs"
import { SuiClient } from "@mysten/sui/client"
import { AGENT_ADDRESS, RPC } from "../lib/talos/config"
import { runCycle } from "../lib/talos/icarus"
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

async function main() {
  if (!/mainnet/i.test(RPC)) {
    console.error(`✗ SUI_RPC is not mainnet ("${RPC}"). Refusing to run the real-fund swarm.`)
    process.exit(1)
  }

  const info = llmInfo()
  const brain = info.provider === "none" ? "heuristic (no LLM key)" : `${info.provider} · ${info.model}`
  const client = new SuiClient({ url: RPC })

  console.log("╔══════════════════════════════════════════════╗")
  console.log("║  TALOS swarm — autonomous, continuous (mainnet) ")
  console.log("╚══════════════════════════════════════════════╝")
  console.log("agent:   ", AGENT_ADDRESS)
  console.log("brain:   ", brain)
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

    state.cycles += 1
    const n = state.cycles
    try {
      await runCycle(n) // Icarus: sense → think → act (policy-gated) → Walrus
      await runCritique() // Daedalus: grade any new rebalances on-chain
    } catch (e: any) {
      console.error(`[#${n}] tick error:`, e?.message ?? e)
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
