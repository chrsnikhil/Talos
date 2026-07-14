import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })
import { Transaction } from "@mysten/sui/transactions"
import { criticKeypair, CRITIC_ADDRESS, AGENT_ADDRESS, PACKAGE_ID, client } from "../lib/talos/config"

// The CRITIC key creates a new reputation ledger for the agent (subject). Because
// create_reputation sets critic = ctx.sender(), the critic key becomes the ledger's
// locked critic — so only it can ever submit ratings. Dry-runs first; LEDGER_EXECUTE=1 to run.

const EXECUTE = process.env.LEDGER_EXECUTE === "1"

async function main() {
  console.log("critic (signer):", CRITIC_ADDRESS)
  console.log("subject (rated agent):", AGENT_ADDRESS)
  if (CRITIC_ADDRESS === AGENT_ADDRESS) throw new Error("critic == agent — TALOS_CRITIC_KEY not set; aborting")
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::reputation::create_reputation_entry`,
    arguments: [tx.pure.address(AGENT_ADDRESS)],
  })
  tx.setSender(CRITIC_ADDRESS)
  const built = await tx.build({ client })
  const dry = await client.dryRunTransactionBlock({ transactionBlock: built })
  console.log("dry-run:", dry.effects.status.status, dry.effects.status.error ?? "")
  if (dry.effects.status.status !== "success") throw new Error("dry-run failed; aborting")
  if (!EXECUTE) { console.log("DRY RUN only (no ledger created). Re-run with LEDGER_EXECUTE=1."); return }
  const res = await client.signAndExecuteTransaction({
    signer: criticKeypair, transaction: tx, options: { showEffects: true, showObjectChanges: true },
  })
  console.log("digest:", res.digest, "status:", res.effects?.status?.status)
  const created: any = (res.objectChanges ?? []).find(
    (c: any) => c.type === "created" && String(c.objectType).includes("::reputation::Reputation"))
  console.log(created ? "NEW_REPUTATION_ID=" + created.objectId : "(ledger id not auto-detected — check Suiscan)")
}
main().then(() => process.exit(0)).catch((e) => { console.error(e?.message ?? e); process.exit(1) })
