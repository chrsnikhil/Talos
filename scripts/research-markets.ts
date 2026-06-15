// Research: Sui USDC lending/yield markets on DeFiLlama (read-only).
async function main() {
  const r = await fetch("https://yields.llama.fi/pools")
  const j: any = await r.json()
  const d: any[] = j.data ?? []
  const sui = d.filter((p) => p.chain === "Sui")
  const usdc = sui
    .filter((p) => String(p.symbol ?? "").toUpperCase().includes("USDC"))
    .sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0))
  console.log("=== Sui USDC pools by TVL (top 25) ===")
  for (const p of usdc.slice(0, 25)) {
    const apy = (p.apy ?? 0).toFixed(2)
    const tvl = ((p.tvlUsd ?? 0) / 1e6).toFixed(2)
    console.log(`${String(p.project).padEnd(22)} ${String(p.symbol).slice(0, 18).padEnd(18)} apy=${apy.padStart(6)}%  tvl=$${tvl}M  pool=${p.pool}`)
  }
  const projs = [...new Set(sui.map((p) => p.project))].sort()
  console.log(`\n=== all ${projs.length} Sui projects on DeFiLlama ===`)
  console.log(projs.join(", "))
}
main().then(() => process.exit(0)).catch((e) => { console.error(e?.message ?? e); process.exit(1) })
