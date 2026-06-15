import { getSuiPrice } from "@7kprotocol/sdk-ts"

export type Apy = { protocol: string; apy: number }

// Real Sui USDC lending markets the agent surveys each cycle. Each entry maps the
// agent's protocol key to the DeFiLlama `project` name(s) for its USDC supply pool
// (first that resolves wins). APYs are read live from DeFiLlama (read-only, no key).
// Set TALOS_SIMULATE=1 to force an oscillating feed (real rates barely move in 30s).
// All three are REAL execution venues — the agent both reads their APY and can move
// real USDC into/out of each (see VENUES in icarus.ts). No signal-only markets: every
// market Icarus surveys is one it can actually trade.
const LENDING: { key: string; llama: string[]; base: number }[] = [
  { key: "scallop", llama: ["scallop-lend", "scallop"], base: 5.4 },
  { key: "navi", llama: ["navi-lending", "navi-protocol"], base: 6.2 },
  { key: "kai", llama: ["kai-finance"], base: 5.2 },
]

let lastReal: Apy[] | null = null

async function fetchReal(): Promise<Apy[] | null> {
  try {
    const r = await fetch("https://yields.llama.fi/pools")
    if (!r.ok) return null
    const j: any = await r.json()
    const pools: any[] = j?.data ?? []
    const suiUsdc = pools.filter(
      (p) => p.chain === "Sui" && String(p.symbol ?? "").toUpperCase().includes("USDC"),
    )
    const out: Apy[] = []
    for (const { key, llama } of LENDING) {
      // a project may have several USDC pools — take the one with the most TVL
      const match = suiUsdc
        .filter((p) => llama.includes(p.project))
        .sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0))[0]
      if (match?.apy != null) out.push({ protocol: key, apy: +Number(match.apy).toFixed(2) })
    }
    // need at least two markets to make a rebalance decision meaningful
    return out.length >= 2 ? out : null
  } catch {
    return null
  }
}

let t = 0
function simulated(): Apy[] {
  t++
  const wiggle = (k: number) => Math.sin(t / 3 + k) * 0.5 + (Math.random() * 0.6 - 0.3)
  // Demo knob: TALOS_SIM_<PROTOCOL> overrides a protocol's base APY (e.g.
  // TALOS_SIM_NAVI=9 to steer the agent into NAVI for a deterministic demo).
  return LENDING.map((p, i) => {
    const base = Number(process.env[`TALOS_SIM_${p.key.toUpperCase()}`] ?? p.base)
    return { protocol: p.key, apy: +(base + wiggle(i + 1)).toFixed(2) }
  })
}

// ---- Helios: the volatile venue's signal (gated by TALOS_HELIOS=1) ----
// SUI is not a lending market, so it has no APY to read. Instead we express its
// attractiveness as a momentum-tilted yield comparable to the lending rates: a
// neutral baseline near the lending mid, tilted up when SUI's recent price trend is
// positive and down when it's negative. When the tilt pushes it above the best
// lending APY by the anti-churn threshold, decide() rotates real USDC into SUI (see
// sevenk.ts); when the trend fades it drops below cash and the agent rotates back.
// Raw short-window returns are meaningless to annualize, so we tilt-and-clamp instead
// — the sign and magnitude track real SUI price, bounded to a sane, readable band.
const SUI_BASE = Number(process.env.TALOS_SUI_BASE ?? 5.5) // neutral, ~ lending mid
const MOM_GAIN = Number(process.env.TALOS_SUI_MOM_GAIN ?? 4) // how hard recent % move tilts the signal
const MOM_LOOKBACK = Number(process.env.TALOS_SUI_LOOKBACK ?? 6) // samples back to measure the trend
const MOM_CLAMP_LO = Number(process.env.TALOS_SUI_CLAMP_LO ?? -50)
const MOM_CLAMP_HI = Number(process.env.TALOS_SUI_CLAMP_HI ?? 80)
const priceWindow: number[] = []

async function suiSignal(): Promise<Apy | null> {
  try {
    const price = await getSuiPrice()
    if (!(price > 0)) return null
    priceWindow.push(price)
    if (priceWindow.length > MOM_LOOKBACK + 1) priceWindow.shift()
    const past = priceWindow[0]
    const retPct = past > 0 ? ((price - past) / past) * 100 : 0
    const tilt = Math.max(MOM_CLAMP_LO, Math.min(MOM_CLAMP_HI, MOM_GAIN * retPct))
    return { protocol: "sui", apy: +(SUI_BASE + tilt).toFixed(2) }
  } catch {
    return null
  }
}

export async function getApys(): Promise<Apy[]> {
  let base: Apy[]
  if (process.env.TALOS_SIMULATE === "1") base = simulated()
  else {
    const real = await fetchReal()
    if (real) lastReal = real
    base = real ?? lastReal ?? simulated()
  }
  if (process.env.TALOS_HELIOS === "1") {
    const sui = await suiSignal()
    if (sui) base = [...base, sui]
  }
  return base
}
