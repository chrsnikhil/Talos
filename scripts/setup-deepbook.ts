/**
 * One-time: create a DeepBook BalanceManager on Sui testnet and fund it with a
 * little SUI, so Icarus can place real DeepBook orders. Prints the BalanceManager
 * object id — put it in .env.local as TALOS_BALANCE_MANAGER.
 */
import { Transaction } from "@mysten/sui/transactions"
import { DeepBookClient } from "@mysten/deepbook-v3"
import { client, keypair, AGENT_ADDRESS } from "../lib/talos/config"

async function main() {
  console.log("DeepBook setup — testnet · agent", AGENT_ADDRESS)
  const db = new DeepBookClient({ client, address: AGENT_ADDRESS, env: "testnet" })

  // 1. create + share a BalanceManager
  const tx = new Transaction()
  tx.add(db.balanceManager.createAndShareBalanceManager())
  const res = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showObjectChanges: true, showEffects: true },
  })
  await client.waitForTransaction({ digest: res.digest })
  const created = (res.objectChanges ?? []).find(
    (o: any) => o.type === "created" && String(o.objectType).includes("balance_manager::BalanceManager"),
  ) as any
  const bmId = created?.objectId
  if (!bmId) throw new Error("could not find created BalanceManager in objectChanges")
  console.log("✓ BalanceManager:", bmId, " (tx", res.digest + ")")

  // 2. deposit a little SUI into it (so it can back orders)
  const db2 = new DeepBookClient({
    client,
    address: AGENT_ADDRESS,
    env: "testnet",
    balanceManagers: { MANAGER_1: { address: bmId } },
  })
  const tx2 = new Transaction()
  tx2.add(db2.balanceManager.depositIntoManager("MANAGER_1", "SUI", 0.2))
  const res2 = await client.signAndExecuteTransaction({ signer: keypair, transaction: tx2 })
  await client.waitForTransaction({ digest: res2.digest })
  console.log("✓ deposited 0.2 SUI into manager (tx", res2.digest + ")")

  console.log("\nAdd to .env.local:\nTALOS_BALANCE_MANAGER=" + bmId)
  process.exit(0)
}

main().catch((e) => {
  console.error("setup failed:", e?.message ?? e)
  process.exit(1)
})
