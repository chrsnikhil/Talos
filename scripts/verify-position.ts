import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { SuiClient } from "@mysten/sui/client"
import { readUsdcPosition, readUsdcApy } from "../lib/talos/scallop"

const A = "0x1f0455e5fb79711dff710e04aa9a7ea4dbb582b77a3a5452fcc61be1cb80ea7f"
const USDC = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"

async function main() {
  const c = new SuiClient({ url: "https://fullnode.mainnet.sui.io:443" })
  const sui = await c.getBalance({ owner: A })
  const usdc = await c.getBalance({ owner: A, coinType: USDC })
  console.log("SUI (wallet):       ", Number(sui.totalBalance) / 1e9)
  console.log("USDC (wallet):      ", Number(usdc.totalBalance) / 1e6)
  console.log("Scallop USDC APY:   ", await readUsdcApy(), "%")
  console.log("Scallop USDC position:", await readUsdcPosition())
}
main().then(() => process.exit(0)).catch((e) => { console.error(e?.message ?? e); process.exit(1) })
