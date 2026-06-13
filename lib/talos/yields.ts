export type Apy = { protocol: string; apy: number }

// Simulated APY feed for the testnet runtime. On mainnet this is replaced by
// gasless on-chain reads of Suilend / Scallop reserve rates (see SUI-RESEARCH.md).
let t = 0
export function getApys(): Apy[] {
  t++
  const base: Record<string, number> = { suilend: 4.0, scallop: 4.2 }
  const wiggle = (k: number) => Math.sin(t / 3 + k) * 0.5 + (Math.random() * 0.6 - 0.3)
  return [
    { protocol: "suilend", apy: +(base.suilend + wiggle(1)).toFixed(2) },
    { protocol: "scallop", apy: +(base.scallop + wiggle(2)).toFixed(2) },
  ]
}
