import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { NAVISDKClient } from "navi-sdk"
import { SuiClient } from "@mysten/sui/client"

async function main() {
  const nav = new NAVISDKClient({ privateKeyList: [process.env.TALOS_AGENT_KEY as string], networkType: "mainnet", numberOfAccounts: 1 })
  const acct = nav.accounts[0]
  const portfolio: Map<string, any> = await acct.getNAVIPortfolio(undefined, false)
  console.log("=== raw NAVI portfolio map ===")
  for (const [k, v] of portfolio.entries()) {
    if (v && (v.supplyBalance || v.borrowBalance)) console.log(`  ${k}:`, JSON.stringify(v))
  }
  // also confirm the deposit tx on-chain
  const c = new SuiClient({ url: "https://fullnode.mainnet.sui.io:443" })
  const tx = await c.getTransactionBlock({ digest: "J1JieMHvMyKozYQxzPc9ToNUcn3wQjUKYhFxKK6eJtbG", options: { showBalanceChanges: true, showEffects: true } })
  console.log("\n=== deposit tx balance changes ===")
  console.log("status:", tx.effects?.status?.status)
  for (const b of tx.balanceChanges ?? []) console.log(`  ${b.coinType.split("::").pop()}: ${b.amount}`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e?.message ?? e); process.exit(1) })
