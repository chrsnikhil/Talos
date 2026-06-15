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

export async function getApys(): Promise<Apy[]> {
  if (process.env.TALOS_SIMULATE === "1") return simulated()
  const real = await fetchReal()
  if (real) {
    lastReal = real
    return real
  }
  return lastReal ?? simulated()
}
