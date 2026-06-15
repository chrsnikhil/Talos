import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { VAULTS, Amount } from "@kunalabs-io/kai"
import { Transaction } from "@mysten/sui/transactions"
import { client, keypair, AGENT_ADDRESS } from "../lib/talos/config"
import { readUsdcPosition } from "../lib/talos/kai"

const AMT = Number(process.env.TALOS_USDC_CHUNK ?? 0.1)

async function main() {
  console.log("agent:", AGENT_ADDRESS)
  const vault = VAULTS.USDC
  console.log("Kai USDC vault:", vault.id)
  console.log("  T  (underlying):", vault.T.typeName)
  console.log("  YT (receipt)   :", vault.YT.typeName)

  // balances
  const usdc = await client.getBalance({ owner: AGENT_ADDRESS, coinType: vault.T.typeName })
  const sui = await client.getBalance({ owner: AGENT_ADDRESS })
  console.log(`wallet USDC: ${Number(usdc.totalBalance) / 1e6}   SUI(gas): ${Number(sui.totalBalance) / 1e9}`)

  // current position
  const pos = await readUsdcPosition()
  console.log("current Kai position (USDC):", pos)

  // build + dry-run the deposit (no signing, no funds moved)
  const tx = new Transaction()
  await vault.depositFromWallet(tx, AGENT_ADDRESS, Amount.fromInt(Math.round(AMT * 1e6), 6))
  tx.setSender(AGENT_ADDRESS)
  const built = await tx.build({ client })
  const dry = await client.dryRunTransactionBlock({ transactionBlock: built })
  console.log(`\n=== dry-run deposit ${AMT} USDC ===`)
  console.log("status:", dry.effects.status.status, dry.effects.status.error ?? "")
  for (const b of dry.balanceChanges ?? []) {
    console.log(`  ${b.coinType.split("::").pop()}: ${b.amount}`)
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e?.message ?? e); process.exit(1) })
