export type Apy = { protocol: string; apy: number }

// Real live lending APYs for Suilend & Scallop USDC on Sui, from DeFiLlama
// (read-only, no key). On testnet there is no live lending, so the agent reads
// real mainnet market rates as its signal. Set TALOS_SIMULATE=1 to force an
// oscillating feed (useful for demos, since real rates barely move in 30s).
let lastReal: Apy[] | null = null

async function fetchReal(): Promise<Apy[] | null> {
  try {
    const r = await fetch("https://yields.llama.fi/pools")
    if (!r.ok) return null
    const j: any = await r.json()
    const pools: any[] = j?.data ?? []
    const pick = (project: string) =>
      pools.find(
        (p) => p.chain === "Sui" && p.project === project && String(p.symbol).toUpperCase().includes("USDC"),
      )
    const suilend = pick("suilend")
    const scallop = pick("scallop-lend") ?? pick("scallop")
    const out: Apy[] = []
    if (suilend?.apy != null) out.push({ protocol: "suilend", apy: +Number(suilend.apy).toFixed(2) })
    if (scallop?.apy != null) out.push({ protocol: "scallop", apy: +Number(scallop.apy).toFixed(2) })
    return out.length === 2 ? out : null
  } catch {
    return null
  }
}

let t = 0
function simulated(): Apy[] {
  t++
  const base: Record<string, number> = { suilend: 4.0, scallop: 4.2 }
  const wiggle = (k: number) => Math.sin(t / 3 + k) * 0.5 + (Math.random() * 0.6 - 0.3)
  return [
    { protocol: "suilend", apy: +(base.suilend + wiggle(1)).toFixed(2) },
    { protocol: "scallop", apy: +(base.scallop + wiggle(2)).toFixed(2) },
  ]
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
