import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { SuiClient } from "@mysten/sui/client"
import { AGENT_ADDRESS, RPC } from "../lib/talos/config"
import { mainnetClient, readUsdcApy, readUsdcPosition } from "../lib/talos/scallop"
import { readUsdcPosition as readNaviPosition } from "../lib/talos/navi"
import { runCycle } from "../lib/talos/icarus"

// Mainnet Icarus runner. Unlike scripts/run-icarus.ts (testnet), this one moves
// REAL USDC across real lending venues (Scallop, NAVI). It refuses to run unless the
// env is genuinely pointed at mainnet, the lending leg is enabled, and the wallet is funded.

const SUI_TYPE = "0x2::sui::SUI"
// Scallop's "usdc" market is native Circle USDC on Sui mainnet.
const USDC_TYPE = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"

const MIN_SUI = Number(process.env.TALOS_MIN_SUI ?? 0.2) // gas headroom
const MIN_USDC = Number(process.env.TALOS_USDC_CHUNK ?? 0.5) // must cover one deposit
const CYCLES = Number(process.env.TALOS_CYCLES ?? 2)
const INTERVAL_MS = Number(process.env.TALOS_INTERVAL_MS ?? 8000)

function fail(msg: string): never {
  console.error(`\n✗ pre-flight failed: ${msg}\n`)
  process.exit(1)
}

async function preflight() {
  console.log("=== Icarus mainnet pre-flight (read-only) ===")
  console.log("agent:", AGENT_ADDRESS)

  if (!/mainnet/i.test(RPC)) fail(`SUI_RPC is not mainnet ("${RPC}"). Set SUI_RPC=https://fullnode.mainnet.sui.io:443 and the mainnet TALOS_PACKAGE_ID/POLICY_ID/REPUTATION_ID in .env.local.`)
  if (process.env.TALOS_LENDING !== "1" && process.env.TALOS_SCALLOP !== "1") fail("real lending leg disabled. Set TALOS_LENDING=1 (or TALOS_SCALLOP=1) in .env.local.")

  // Use the policy/RPC client for gas check (same chain the policy lives on).
  const client = new SuiClient({ url: RPC })
  const sui = await client.getBalance({ owner: AGENT_ADDRESS, coinType: SUI_TYPE })
  const suiAmt = Number(sui.totalBalance) / 1e9
  console.log(`balance · SUI: ${suiAmt}`)
  if (suiAmt < MIN_SUI) fail(`only ${suiAmt} SUI — need >= ${MIN_SUI} SUI for gas. Fund ${AGENT_ADDRESS}.`)

  const usdc = await mainnetClient.getBalance({ owner: AGENT_ADDRESS, coinType: USDC_TYPE })
  const usdcAmt = Number(usdc.totalBalance) / 1e6
  console.log(`balance · USDC (native): ${usdcAmt}`)
  if (usdcAmt < MIN_USDC) fail(`only ${usdcAmt} native USDC — need >= ${MIN_USDC} to deposit. Fund ${AGENT_ADDRESS} with native Circle USDC (not wormhole).`)

  console.log("read · Scallop USDC supply APY:", await readUsdcApy(), "%")
  console.log("read · current Scallop position:", await readUsdcPosition())
  console.log("read · current NAVI position:", await readNaviPosition())
  console.log(`config · USDC per rebalance: ${MIN_USDC} · cycles: ${CYCLES} · interval: ${INTERVAL_MS}ms`)
  console.log("=== pre-flight OK — proceeding to REAL mainnet cycles ===\n")
}

async function main() {
  await preflight()
  for (let n = 1; n <= CYCLES; n++) {
    try {
      await runCycle(n)
    } catch (e: any) {
      console.error(`[#${n}] cycle error:`, e?.message ?? e)
    }
    if (n < CYCLES) await new Promise((r) => setTimeout(r, INTERVAL_MS))
  }
  console.log("\nIcarus mainnet runtime finished.")
  process.exit(0)
}

main()
