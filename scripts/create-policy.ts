import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { Transaction } from "@mysten/sui/transactions"
import { client, keypair, AGENT_ADDRESS, PACKAGE_ID } from "../lib/talos/config"

// Recreate the on-chain AgentPolicy. The allowlist is immutable after creation
// (no add_protocol on the Move object), so changing the surveyed/tradeable markets
// means minting a fresh policy + OwnerCap. Prints the new IDs to paste into
// .env.local (TALOS_POLICY_ID / TALOS_OWNER_CAP) and lib/talos/public.ts.
const BUDGET = Number(process.env.POLICY_BUDGET ?? 100000)
const PER_TX_CAP = Number(process.env.POLICY_PER_TX_CAP ?? 10000)
const EXPIRES_AT_MS = Number(process.env.POLICY_EXPIRES_AT_MS ?? 1900000000000)
const PROTOCOLS = (process.env.POLICY_PROTOCOLS ?? "scallop,navi,kai").split(",").map((s) => s.trim()).filter(Boolean)

async function main() {
  console.log("agent     :", AGENT_ADDRESS)
  console.log("package   :", PACKAGE_ID)
  console.log("budget    :", BUDGET, " per_tx_cap:", PER_TX_CAP, " expires_at_ms:", EXPIRES_AT_MS)
  console.log("allowlist :", PROTOCOLS.join(", "))

  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::agent_policy::create_policy_entry`,
    arguments: [
      tx.pure.address(AGENT_ADDRESS),
      tx.pure.u64(BUDGET),
      tx.pure.u64(PER_TX_CAP),
      tx.pure.vector("string", PROTOCOLS),
      tx.pure.u64(EXPIRES_AT_MS),
    ],
  })

  const res = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true, showObjectChanges: true, showEvents: true },
  })
  await client.waitForTransaction({ digest: res.digest })

  console.log("\ncreate-policy tx:", res.digest, "status:", res.effects?.status?.status)
  let policyId = ""
  let ownerCap = ""
  for (const c of res.objectChanges ?? []) {
    if (c.type === "created") {
      const t = (c as any).objectType as string
      if (t.endsWith("::agent_policy::AgentPolicy")) policyId = (c as any).objectId
      if (t.endsWith("::agent_policy::OwnerCap")) ownerCap = (c as any).objectId
    }
  }
  console.log("\n=== NEW IDs (paste into .env.local + public.ts) ===")
  console.log("TALOS_POLICY_ID =", policyId)
  console.log("TALOS_OWNER_CAP =", ownerCap)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e?.message ?? e); process.exit(1) })
