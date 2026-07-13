import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { Transaction } from "@mysten/sui/transactions"
import { keypair, AGENT_ADDRESS, PACKAGE_ID, client } from "../lib/talos/config"

// Top up the AgentPolicy's remaining_budget via the OwnerCap. This is a pure allowance
// bump on-chain (no funds move) — agent_policy::top_up(policy, cap, amount) just does
// remaining_budget += amount. Dry-runs first; only executes with TOPUP_EXECUTE=1.

const POLICY = process.env.TALOS_POLICY_ID ?? "0x16d5c0c966ac8d78992908ada307dc5991fc76ce4915ae499fa91cfe11c1b5b6"
const OWNER_CAP = process.env.TALOS_OWNER_CAP ?? "0xd8a11f6305fde5db4aa18ee9b2a3a8d3de532ba979608e60b60f7c06a2a804d1"
const AMOUNT = BigInt(process.env.TOPUP_AMOUNT ?? "200000")
const EXECUTE = process.env.TOPUP_EXECUTE === "1"

async function main() {
  console.log(`agent:    ${AGENT_ADDRESS}`)
  console.log(`policy:   ${POLICY}`)
  console.log(`ownerCap: ${OWNER_CAP}`)
  console.log(`amount:   +${AMOUNT}`)

  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::agent_policy::top_up`,
    arguments: [tx.object(POLICY), tx.object(OWNER_CAP), tx.pure.u64(AMOUNT)],
  })
  tx.setSender(AGENT_ADDRESS)

  const built = await tx.build({ client })
  const dry = await client.dryRunTransactionBlock({ transactionBlock: built })
  console.log(`\ndry-run status: ${dry.effects.status.status}`)
  if (dry.effects.status.status !== "success") {
    console.log("dry-run error:", dry.effects.status.error)
    throw new Error("dry-run failed; aborting (no funds moved)")
  }
  const evDry: any = (dry.events ?? []).find((e: any) => e.type.endsWith("::ToppedUp"))
  if (evDry) console.log("simulated ToppedUp:", evDry.parsedJson)

  if (!EXECUTE) {
    console.log("\nDRY RUN only (budget NOT changed). Re-run with TOPUP_EXECUTE=1 to execute.")
    return
  }

  console.log("\nexecuting top-up ...")
  const res = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true, showEvents: true },
  })
  console.log(`digest: ${res.digest}`)
  console.log(`status: ${res.effects?.status?.status}`)
  const ev: any = (res.events ?? []).find((e: any) => e.type.endsWith("::ToppedUp"))
  if (ev) console.log("ToppedUp:", ev.parsedJson)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e?.message ?? e)
    process.exit(1)
  })
