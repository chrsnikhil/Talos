import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })
import { Transaction } from "@mysten/sui/transactions"
import { keypair, AGENT_ADDRESS, client } from "../lib/talos/config"

// Transfer a little SUI from the agent to the critic address so the critic key can pay gas
// for creating its ledger and signing ratings. Dry-runs first; only spends with FUND_EXECUTE=1.

const TO = process.env.CRITIC_ADDR ?? ""
const AMOUNT = BigInt(Math.round(Number(process.env.FUND_SUI ?? "0.5") * 1e9))
const EXECUTE = process.env.FUND_EXECUTE === "1"

async function main() {
  if (!/^0x[0-9a-f]{64}$/.test(TO)) throw new Error("set CRITIC_ADDR=0x… (the critic address)")
  console.log(`fund ${TO}\n  with ${Number(AMOUNT) / 1e9} SUI from agent ${AGENT_ADDRESS}`)
  const tx = new Transaction()
  const [coin] = tx.splitCoins(tx.gas, [AMOUNT])
  tx.transferObjects([coin], TO)
  tx.setSender(AGENT_ADDRESS)
  const built = await tx.build({ client })
  const dry = await client.dryRunTransactionBlock({ transactionBlock: built })
  console.log("dry-run:", dry.effects.status.status, dry.effects.status.error ?? "")
  if (dry.effects.status.status !== "success") throw new Error("dry-run failed; aborting")
  if (!EXECUTE) { console.log("DRY RUN only (no funds moved). Re-run with FUND_EXECUTE=1."); return }
  const res = await client.signAndExecuteTransaction({ signer: keypair, transaction: tx, options: { showEffects: true } })
  console.log("digest:", res.digest, "status:", res.effects?.status?.status)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e?.message ?? e); process.exit(1) })
