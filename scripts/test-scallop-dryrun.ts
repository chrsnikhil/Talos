import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { Scallop } from "@scallop-io/sui-scallop-sdk"
import { SuiClient } from "@mysten/sui/client"
import { AGENT_ADDRESS } from "../lib/talos/config"

// Dry-run the Scallop deposit tx (NO funds moved). Confirms the
// UnusedValueWithoutDrop fix builds a valid, executable tx.
const RPC = process.env.SUI_MAINNET_RPC || "https://fullnode.mainnet.sui.io:443"
const client = new SuiClient({ url: RPC })
const AMOUNT = Number(process.env.TALOS_USDC_CHUNK ?? 0.1)

async function main() {
  const scallop = new Scallop({ networkType: "mainnet" })
  const builder = await scallop.createScallopBuilder()
  const tx = builder.createTxBlock()
  tx.setSender(AGENT_ADDRESS)
  const sCoin = await tx.depositQuick(Math.round(AMOUNT * 1e6), "usdc")
  tx.transferObjects([sCoin], AGENT_ADDRESS)

  const bytes = await (tx.txBlock as any).build({ client })
  const dr = await client.dryRunTransactionBlock({ transactionBlock: bytes })
  console.log("dry-run status:", dr.effects.status.status)
  if (dr.effects.status.status !== "success") {
    console.log("error:", dr.effects.status.error)
  } else {
    const gas = dr.effects.gasUsed
    const net = Number(gas.computationCost) + Number(gas.storageCost) - Number(gas.storageRebate)
    console.log(`would succeed. net gas ≈ ${net / 1e9} SUI`)
    console.log("balance changes:")
    for (const b of dr.balanceChanges) {
      console.log(`  ${b.coinType.split("::").pop()}: ${b.amount}`)
    }
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e?.message ?? e); process.exit(1) })
