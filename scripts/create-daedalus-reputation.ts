import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography"
import { Transaction } from "@mysten/sui/transactions"
import { client, AGENT_ADDRESS, PACKAGE_ID } from "../lib/talos/config"

// Create a NEW reputation ledger whose critic is Daedalus's own key and whose
// subject is Icarus (the executor / agent address). Signed by the Daedalus key,
// so `create_reputation` sets critic = Daedalus, subject = Icarus — two distinct
// on-chain identities. Prints the new TALOS_REPUTATION_ID to wire in.
function criticKeypair(): Ed25519Keypair {
  const k = process.env.TALOS_CRITIC_KEY
  if (!k) throw new Error("TALOS_CRITIC_KEY not set — run setup-daedalus.ts first")
  const { secretKey } = decodeSuiPrivateKey(k)
  return Ed25519Keypair.fromSecretKey(secretKey)
}

async function main() {
  const critic = criticKeypair()
  console.log("critic  (daedalus):", critic.toSuiAddress())
  console.log("subject (icarus)  :", AGENT_ADDRESS)

  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::reputation::create_reputation_entry`,
    arguments: [tx.pure.address(AGENT_ADDRESS)],
  })
  const res = await client.signAndExecuteTransaction({
    signer: critic,
    transaction: tx,
    options: { showEffects: true, showObjectChanges: true },
  })
  await client.waitForTransaction({ digest: res.digest })

  let repId = ""
  for (const c of res.objectChanges ?? []) {
    if (c.type === "created" && ((c as any).objectType as string).endsWith("::reputation::Reputation")) {
      repId = (c as any).objectId
    }
  }
  console.log("create-reputation tx:", res.digest, "status:", res.effects?.status?.status)
  console.log("\n=== wire this in (.env.local + lib/talos/public.ts) ===")
  console.log("TALOS_REPUTATION_ID =", repId)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e?.message ?? e); process.exit(1) })
