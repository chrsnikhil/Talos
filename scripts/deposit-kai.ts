import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { AGENT_ADDRESS } from "../lib/talos/config"
import { readPolicy, authorizeSpend } from "../lib/talos/chain"
import { getApys } from "../lib/talos/yields"
import { storeDecision } from "../lib/talos/walrus"
import { depositUsdc as kaiDeposit, readUsdcPosition as kaiPosition } from "../lib/talos/kai"

// One real, policy-gated cycle that supplies USDC into Kai Finance — the same shape
// as icarus.runCycle's Kai branch, isolated to a deposit so it moves funds only into
// Kai (no withdraw leg). Proves the third real venue end-to-end: on-chain
// authorize_spend gate → real Kai deposit → decision logged to Walrus, ready for
// Daedalus to grade. Amount of real USDC = TALOS_USDC_CHUNK; the on-chain budget
// unit spent against the policy = TALOS_CHUNK (decoupled abstract leash unit).
const USDC_CHUNK = Number(process.env.TALOS_USDC_CHUNK ?? 0.1)
const BUDGET_UNITS = Number(process.env.TALOS_CHUNK ?? 100)

async function main() {
  const policy = await readPolicy()
  const apys = await getApys()
  const ts = new Date().toISOString()
  console.log("agent:", AGENT_ADDRESS)
  console.log("policy:", { remaining_budget: policy.remaining_budget, per_tx_cap: policy.per_tx_cap, revoked: policy.revoked })
  console.log("APYs:", apys.map((a) => `${a.protocol} ${a.apy}%`).join(" · "))

  if (policy.revoked) throw new Error("policy REVOKED — refusing to act")
  if (Date.now() >= policy.expires_at_ms) throw new Error("policy EXPIRED — refusing to act")

  const before = await kaiPosition()
  console.log("Kai position before:", before)

  const amount = Math.min(BUDGET_UNITS, policy.per_tx_cap, policy.remaining_budget)
  const decision = {
    action: "REBALANCE" as const,
    target: "kai",
    amount,
    reasoning: `supply ${USDC_CHUNK} USDC into Kai (3rd real venue)`,
    by: "heuristic" as const,
  }

  // on-chain policy gate
  const a = await authorizeSpend(amount, "kai")
  console.log(`authorize_spend(kai, ${amount}) → ${a.digest} (${a.status})`)
  if (a.status !== "success") throw new Error("authorize_spend did not succeed")

  // real Kai deposit
  const d = await kaiDeposit(USDC_CHUNK)
  console.log(`real Kai deposit ${USDC_CHUNK} USDC → ${d.digest} (${d.status})`)

  const blobId = await storeDecision({
    ts,
    agent: AGENT_ADDRESS,
    apys,
    decision,
    txDigest: a.digest,
    deepbookDigest: null,
    lendingDigest: d.digest,
    status: a.status,
  })
  if (blobId) console.log("decision stored on Walrus:", blobId)

  const after = await kaiPosition()
  console.log("Kai position after:", after)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e?.message ?? e); process.exit(1) })
