import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { SuiClient } from "@mysten/sui/client"
import { getApys } from "../lib/talos/yields"
import { readUsdcPosition as scallopPos } from "../lib/talos/scallop"
import { readUsdcPosition as naviPos } from "../lib/talos/navi"
import { readUsdcPosition as kaiPos } from "../lib/talos/kai"

const A = "0x1f0455e5fb79711dff710e04aa9a7ea4dbb582b77a3a5452fcc61be1cb80ea7f"
const USDC = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"

// Read-only snapshot of where the agent's USDC sits + the live APY survey, so we can
// choose a real rebalance direction (a venue that holds withdrawable USDC → higher-APY venue).
async function main() {
  const c = new SuiClient({ url: "https://fullnode.mainnet.sui.io:443" })
  const [sui, usdc, apys, sP, nP, kP] = await Promise.all([
    c.getBalance({ owner: A }),
    c.getBalance({ owner: A, coinType: USDC }),
    getApys(),
    scallopPos(),
    naviPos(),
    kaiPos(),
  ])
  console.log("== wallet ==")
  console.log("SUI (gas):   ", Number(sui.totalBalance) / 1e9)
  console.log("USDC (free): ", Number(usdc.totalBalance) / 1e6)
  console.log("\n== positions (supplied USDC) ==")
  console.log("scallop:", sP)
  console.log("navi:   ", nP)
  console.log("kai:    ", kP)
  console.log("\n== live APY survey ==")
  for (const a of apys) console.log(`${a.protocol.padEnd(8)} ${a.apy}%`)
  const best = [...apys].sort((x, y) => y.apy - x.apy)[0]
  console.log(`\nbest = ${best.protocol} @ ${best.apy}%`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e?.message ?? e); process.exit(1) })
