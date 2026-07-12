import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
// DefiLlama yield history updates ~daily; cache an hour so we don't hammer it.
export const revalidate = 3600

// DefiLlama pool ids for the three USDC lending venues on Sui (verified: their live APYs
// match the swarm's own decision feed exactly). These give real 30-day APY history.
const POOLS: Record<string, string> = {
  scallop: "ddf68725-6ced-4c27-90ca-c14752cd7218",
  navi: "0fddbf5d-ec14-4570-80d3-a70c85573d3e",
  kai: "1213b66c-82c8-4085-9047-6c962f5479a0",
}

type Row = { timestamp: string; apy: number | null }

async function chart(pool: string): Promise<Row[]> {
  try {
    const r = await fetch(`https://yields.llama.fi/chart/${pool}`, { next: { revalidate: 3600 } })
    if (!r.ok) return []
    const j = await r.json()
    return Array.isArray(j?.data) ? j.data : []
  } catch {
    return []
  }
}

const day = (ts: string) => ts.slice(0, 10)
const r2 = (n: number | undefined) => (typeof n === "number" ? Math.round(n * 100) / 100 : undefined)

// 30-day protocol APY history for Scallop / Navi / Kai (from DefiLlama) plus an AGENT line =
// the best venue each day — what the swarm captures by always chasing the top yield.
export async function GET() {
  try {
    const [sc, nv, ka] = await Promise.all([chart(POOLS.scallop), chart(POOLS.navi), chart(POOLS.kai)])
    const byDay = (arr: Row[]) => new Map(arr.filter((p) => p.apy != null).map((p) => [day(p.timestamp), p.apy as number]))
    const [ms, mn, mk] = [byDay(sc), byDay(nv), byDay(ka)]

    const cutoff = Date.now() - 31 * 86_400_000
    const dates = [...new Set([...ms.keys(), ...mn.keys(), ...mk.keys()])]
      .filter((d) => Date.parse(d) >= cutoff)
      .sort()
      .slice(-30)

    const points = dates.map((d) => {
      const s = ms.get(d), n = mn.get(d), k = mk.get(d)
      const vals = [s, n, k].filter((v): v is number => typeof v === "number")
      return {
        date: d,
        label: d.slice(5), // MM-DD
        scallop: r2(s),
        navi: r2(n),
        kai: r2(k),
        agent: vals.length ? r2(Math.max(...vals)) : undefined, // agent rides the best venue
      }
    })

    return NextResponse.json({ days: 30, points, ok: points.length > 0 })
  } catch (e: any) {
    return NextResponse.json({ days: 30, points: [], ok: false, error: String(e?.message ?? e) }, { status: 200 })
  }
}
