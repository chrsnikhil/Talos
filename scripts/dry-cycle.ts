import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { readPolicy } from "../lib/talos/chain"
import { getApys } from "../lib/talos/yields"
import { decide } from "../lib/talos/decide"

// Read-only: shows what Icarus would decide this cycle on mainnet, no tx sent.
const CHUNK = Number(process.env.TALOS_CHUNK ?? 100)
const start = process.env.TALOS_START_PROTOCOL ?? "suilend"

async function main() {
  const policy = await readPolicy()
  console.log("policy (mainnet):", {
    remaining_budget: policy.remaining_budget,
    per_tx_cap: policy.per_tx_cap,
    revoked: policy.revoked,
    expires_at_ms: policy.expires_at_ms,
  })
  const apys = await getApys()
  console.log("live APYs:", apys)
  const d = decide(start, apys, policy, CHUNK)
  console.log(`start=${start}  =>  decision:`, d)
  if (d.action === "REBALANCE" && d.target === "scallop") {
    console.log("=> would DEPOSIT real USDC into Scallop this cycle.")
  } else if (d.action === "REBALANCE" && start === "scallop") {
    console.log("=> would WITHDRAW real USDC from Scallop this cycle.")
  } else {
    console.log("=> would HOLD (no real USDC movement this cycle).")
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e?.message ?? e); process.exit(1) })
