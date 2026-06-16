import { MetaAg, getSuiPrice } from "@7kprotocol/sdk-ts"
import { fromBase64 } from "@mysten/sui/utils"
import { writeFileSync, readFileSync, existsSync } from "fs"
import { client, keypair, AGENT_ADDRESS, RPC } from "./config"

// "Helios" — the volatile rotation venue (Sui MAINNET). Unlike the lending venues
// (scallop/navi/kai) which earn a quiet single-asset APY, this venue rotates real
// USDC into a *risk asset* (SUI) and back, via the 7k DEX aggregator. It is the
// agent's exposure to a volatile market: when SUI's recent momentum beats the best
// lending yield (see yields.ts), Icarus swaps USDC→SUI; when momentum fades it swaps
// back to cash. Trend-following between cash and a risk asset — real price motion and
// real PnL, which the lending venues structurally cannot produce.
//
// Safety: tiny chunks only; a hard SUI gas reserve is never touched; every swap is
// slippage-bounded; and the acquired-SUI position is tracked locally so an exit only
// ever sells what this strategy bought (never the agent's gas SUI).

const SUI_TYPE = "0x2::sui::SUI"
const USDC_TYPE = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
const SUI_DECIMALS = 9
const USDC_DECIMALS = 6

const SLIPPAGE_BPS = Number(process.env.TALOS_SWAP_SLIPPAGE_BPS ?? 100) // 1% default
const GAS_RESERVE_SUI = Number(process.env.TALOS_GAS_RESERVE_SUI ?? 1.0) // never swap below this much SUI
const POS_FILE = process.env.TALOS_HELIOS_FILE ?? ".talos-helios.json"

type Res = { digest: string; status?: string }

let ag: MetaAg | null = null
function aggregator(): MetaAg {
  if (!ag) ag = new MetaAg({ fullnodeUrl: RPC, slippageBps: SLIPPAGE_BPS })
  return ag
}

// ---- local position store: SUI base units this strategy currently holds ----
function readPos(): bigint {
  try {
    if (!existsSync(POS_FILE)) return 0n
    const raw = JSON.parse(readFileSync(POS_FILE, "utf8"))
    return BigInt(raw?.suiBase ?? 0)
  } catch {
    return 0n
  }
}
function writePos(suiBase: bigint) {
  try {
    writeFileSync(POS_FILE, JSON.stringify({ suiBase: suiBase.toString() }, null, 2))
  } catch (e: any) {
    console.error("could not persist helios position:", e?.message ?? e)
  }
}

/** All routes for a swap, sorted by amountOut descending (best first). */
async function sortedQuotes(coinTypeIn: string, coinTypeOut: string, amountIn: string) {
  const quotes = await aggregator().quote({ coinTypeIn, coinTypeOut, amountIn })
  if (!quotes?.length) throw new Error("no swap route found")
  return [...quotes].sort((a, b) => (BigInt(b.amountOut) > BigInt(a.amountOut) ? 1 : -1))
}

/** Execute a swap best-route-first, falling through to the next route when one aborts.
 * Some routes (esp. SUI→USDC) intermittently abort at build/dry-run with a Move
 * `dynamic_field` error; a different provider's route usually settles cleanly. We make
 * two passes (re-quoting between them so a transiently-stale route is refreshed) and try
 * up to the 4 best routes each pass. A failed build dry-run-aborts BEFORE submitting, so
 * falling through costs no gas. Returns the winning quote + result, else throws. */
async function swapBestEffort(
  coinTypeIn: string,
  coinTypeOut: string,
  amountIn: string,
): Promise<{ quote: any; res: Res }> {
  let lastErr: unknown
  for (let pass = 0; pass < 2; pass++) {
    const quotes = await sortedQuotes(coinTypeIn, coinTypeOut, amountIn)
    for (const quote of quotes.slice(0, 4)) {
      try {
        const res = await executeSwap(quote)
        if (res.status === "success") return { quote, res }
        lastErr = new Error(`swap on-chain status: ${res.status}`)
      } catch (e) {
        lastErr = e
      }
    }
  }
  throw lastErr ?? new Error("all swap routes failed")
}

/** Build, sign, and execute a swap via 7k. Returns digest + on-chain status. */
async function executeSwap(quote: any): Promise<Res> {
  const r = await aggregator().fastSwap(
    {
      quote,
      signer: AGENT_ADDRESS,
      signTransaction: async (txBytes: string) => keypair.signTransaction(fromBase64(txBytes)),
    },
    { options: { showEffects: true } },
  )
  return { digest: r.digest, status: (r as any).effects?.status?.status }
}

/** Current free SUI balance (whole SUI). */
async function suiBalance(): Promise<number> {
  const b = await client.getBalance({ owner: AGENT_ADDRESS, coinType: SUI_TYPE })
  return Number(b.totalBalance) / 10 ** SUI_DECIMALS
}

/** Enter the volatile position: swap `amountUsdc` of real USDC into SUI. */
export async function depositUsdc(amountUsdc: number): Promise<Res> {
  const amountIn = Math.round(amountUsdc * 10 ** USDC_DECIMALS).toString()
  const { quote, res } = await swapBestEffort(USDC_TYPE, SUI_TYPE, amountIn)
  if (res.status === "success") {
    // record the SUI we just acquired so a later exit sells exactly this, not gas SUI
    writePos(readPos() + BigInt(quote.amountOut))
  }
  return res
}

/** Exit the volatile position: swap the strategy's held SUI back to USDC.
 * Never sells below the gas reserve; `amountUsdc` is advisory (a full rotation exits
 * the whole position the strategy opened). */
export async function withdrawUsdc(_amountUsdc: number): Promise<Res> {
  let suiToSell = readPos()
  if (suiToSell <= 0n) throw new Error("no helios SUI position to exit")

  // never dip into the gas reserve, even if our recorded position says otherwise
  const free = await suiBalance()
  const sellableSui = Math.max(0, free - GAS_RESERVE_SUI)
  const sellableBase = BigInt(Math.floor(sellableSui * 10 ** SUI_DECIMALS))
  if (sellableBase <= 0n) throw new Error(`gas reserve guard: only ${free.toFixed(4)} SUI free`)
  if (suiToSell > sellableBase) suiToSell = sellableBase

  const { res } = await swapBestEffort(SUI_TYPE, USDC_TYPE, suiToSell.toString())
  if (res.status === "success") {
    const remaining = readPos() - suiToSell
    writePos(remaining > 0n ? remaining : 0n)
  }
  return res
}

/** USD value of the strategy's SUI position, for the dashboard (real PnL). null on error. */
export async function readUsdcPosition(): Promise<number | null> {
  try {
    const suiBase = readPos()
    if (suiBase <= 0n) return 0
    const price = await getSuiPrice() // SUI in USD
    const sui = Number(suiBase) / 10 ** SUI_DECIMALS
    return +(sui * price).toFixed(6)
  } catch {
    return null
  }
}
