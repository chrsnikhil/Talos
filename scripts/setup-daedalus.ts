import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { appendFileSync, readFileSync } from "fs"
import { Transaction } from "@mysten/sui/transactions"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { client, keypair, AGENT_ADDRESS } from "../lib/talos/config"

// One-time: give Daedalus (the critic) its OWN on-chain identity so its ratings
// are signed by a different key than Icarus (the executor). Generates a fresh
// keypair, writes its private key straight into .env.local as TALOS_CRITIC_KEY
// (never printed), and funds it with a little SUI for gas. The agent key only
// ever pays for this one funding transfer. Idempotent: aborts if a critic key
// already exists so it can't double-generate / double-fund.
const FUND_SUI = Number(process.env.DAEDALUS_FUND_SUI ?? 0.5)

async function main() {
  const env = readFileSync(".env.local", "utf8")
  if (/^TALOS_CRITIC_KEY=/m.test(env)) {
    console.log("TALOS_CRITIC_KEY already present in .env.local — refusing to overwrite. Aborting.")
    process.exit(1)
  }

  const dk = new Ed25519Keypair()
  const daedalusAddr = dk.toSuiAddress()
  // suiprivkey1... bech32, the same format config.ts decodes for the agent key
  appendFileSync(".env.local", `\nTALOS_CRITIC_KEY=${dk.getSecretKey()}\n`)
  console.log("DAEDALUS_ADDRESS =", daedalusAddr, "(critic key written to .env.local)")

  const amount = Math.round(FUND_SUI * 1e9)
  const tx = new Transaction()
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)])
  tx.transferObjects([coin], tx.pure.address(daedalusAddr))
  const res = await client.signAndExecuteTransaction({ signer: keypair, transaction: tx, options: { showEffects: true } })
  await client.waitForTransaction({ digest: res.digest })
  console.log(`fund tx: ${res.digest}  status: ${res.effects?.status?.status}  (${FUND_SUI} SUI from ${AGENT_ADDRESS})`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e?.message ?? e); process.exit(1) })
