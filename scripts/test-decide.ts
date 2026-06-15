import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })
import { decideWithLLM } from "../lib/talos/decide"
const apys = [
  { protocol: "scallop", apy: 5.82 },
  { protocol: "navi", apy: 6.37 },
  { protocol: "kai", apy: 4.48 },
] as any
const policy = { remaining_budget: 99700, per_tx_cap: 10000 }
async function main() {
  // current = navi (the best) → must be HOLD even if Mistral says REBALANCE→navi
  for (let i = 0; i < 3; i++) {
    const d = await decideWithLLM("navi", apys, policy, 100)
    console.log(`run ${i + 1}:`, JSON.stringify(d))
  }
  // current = kai (worst) → SHOULD legitimately REBALANCE to navi
  const r = await decideWithLLM("kai", apys, policy, 100)
  console.log("from kai:", JSON.stringify(r))
}
main().then(() => process.exit(0)).catch((e) => { console.error(e?.message ?? e); process.exit(1) })
