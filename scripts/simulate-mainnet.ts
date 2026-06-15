import { Scallop } from "@scallop-io/sui-scallop-sdk"
import { mainnetClient, readUsdcApy, readUsdcPosition } from "../lib/talos/scallop"
import { AGENT_ADDRESS } from "../lib/talos/config"

async function run() {
  console.log("=== Scallop mainnet simulation (no funds spent) ===")
  console.log("agent:", AGENT_ADDRESS)
  console.log("read · USDC supply APY:", await readUsdcApy(), "%")
  console.log("read · current USDC position:", await readUsdcPosition())

  const scallop = new Scallop({ networkType: "mainnet" })
  for (const [label, method] of [["deposit", "depositQuick"], ["withdraw", "withdrawQuick"]] as const) {
    console.log(`\n--- ${label} 1 USDC ---`)
    try {
      const builder = await scallop.createScallopBuilder()
      const tx = builder.createTxBlock()
      tx.setSender(AGENT_ADDRESS)
      await (tx as any)[method](1_000_000, "usdc")
      console.log("  ✓ Scallop builder produced a valid tx (API correct)")
      try {
        const sim = await mainnetClient.devInspectTransactionBlock({
          sender: AGENT_ADDRESS,
          transactionBlock: tx.txBlock as any,
        })
        const st: any = sim.effects?.status
        console.log("  devInspect:", st?.status, st?.error ? `→ ${st.error}` : "")
      } catch (e: any) {
        console.log("  devInspect error:", String(e?.message ?? e).split("\n")[0])
      }
    } catch (e: any) {
      console.log("  build error:", String(e?.message ?? e).split("\n")[0])
    }
  }
  process.exit(0)
}
run().catch((e) => { console.error(e); process.exit(1) })
