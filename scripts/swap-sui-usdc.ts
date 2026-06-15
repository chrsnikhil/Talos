import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { fromBase64 } from "@mysten/sui/utils"
import { MetaAg } from "@7kprotocol/sdk-ts"
import { keypair, AGENT_ADDRESS } from "../lib/talos/config"

// Swap a small amount of SUI -> native Circle USDC on Sui mainnet, via the 7K
// meta-aggregator (routes across Cetus/FlowX/Bluefin). Quotes + simulates first;
// only signs/executes when SWAP_EXECUTE=1, so a dry run never spends funds.

const SUI = "0x2::sui::SUI"
const USDC = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"

const AMOUNT_SUI = process.env.SWAP_SUI ?? "0.5"
const EXECUTE = process.env.SWAP_EXECUTE === "1"

async function main() {
  const amountIn = BigInt(Math.round(Number(AMOUNT_SUI) * 1e9)).toString()
  const metaAg = new MetaAg({ slippageBps: 100 }) // 1% slippage, default mainnet
  console.log(`agent: ${AGENT_ADDRESS}`)
  console.log(`quoting ${AMOUNT_SUI} SUI -> USDC (simulated as ${AGENT_ADDRESS}) ...`)

  const quotes = await metaAg.quote(
    { coinTypeIn: SUI, coinTypeOut: USDC, amountIn, timeout: 20000 },
    { sender: AGENT_ADDRESS, timeout: 20000 },
  )
  if (!quotes.length) throw new Error("no quotes returned")

  const best = quotes.reduce((m, q) => (BigInt(q.amountOut) > BigInt(m.amountOut) ? q : m))
  console.log(`best provider: ${best.provider}`)
  console.log(`  amountOut:        ${Number(best.amountOut) / 1e6} USDC`)
  console.log(`  simulatedAmount:  ${best.simulatedAmountOut ? Number(best.simulatedAmountOut) / 1e6 + " USDC" : "(no sim)"}`)
  if (best.simulatedAmountOut == null) {
    console.log("  ⚠ no simulation result — provider could not simulate. Aborting to be safe.")
    if (EXECUTE) throw new Error("refusing to execute without a successful simulation")
  }

  if (!EXECUTE) {
    console.log("\nDRY RUN only (no funds moved). Re-run with SWAP_EXECUTE=1 to execute.")
    return
  }

  console.log("\nexecuting real swap ...")
  const res = await metaAg.fastSwap({
    quote: best,
    signer: AGENT_ADDRESS,
    signTransaction: async (txBytes: string) => keypair.signTransaction(fromBase64(txBytes)),
  })
  console.log(`digest: ${res.digest}`)
  console.log(`status: ${res.effects?.status?.status}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e?.message ?? e)
    process.exit(1)
  })
