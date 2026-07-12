import { NextResponse } from "next/server"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const revalidate = 3600

// DefiLlama pool ids for the three USDC lending venues on Sui (verified: their live APYs
// match the swarm's own decision feed exactly). These give real daily APY history.
const POOLS: Record<string, string> = {
  scallop: "ddf68725-6ced-4c27-90ca-c14752cd7218",
  navi: "0fddbf5d-ec14-4570-80d3-a70c85573d3e",
  kai: "1213b66c-82c8-4085-9047-6c962f5479a0",
}
const FEED_FILE = process.env.TALOS_DECISIONS_FILE ?? ".talos-decisions.json"

type Row = { timestamp: string; apy: number | null }
type Pt = { label: string; scallop?: number; navi?: number; kai?: number; agent?: number }

const r2 = (n: number | undefined) => (typeof n === "number" ? Math.round(n * 100) / 100 : undefined)
const day = (ts: string) => ts.slice(0, 10)

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

// 7D / 30D: DefiLlama daily history. AGENT line = best venue each day.
async function fromDefiLlama(days: number): Promise<Pt[]> {
  const [sc, nv, ka] = await Promise.all([chart(POOLS.scallop), chart(POOLS.navi), chart(POOLS.kai)])
  const byDay = (arr: Row[]) => new Map(arr.filter((p) => p.apy != null).map((p) => [day(p.timestamp), p.apy as number]))
  const [ms, mn, mk] = [byDay(sc), byDay(nv), byDay(ka)]
  const cutoff = Date.now() - (days + 1) * 86_400_000
  const dates = [...new Set([...ms.keys(), ...mn.keys(), ...mk.keys()])]
    .filter((d) => Date.parse(d) >= cutoff)
    .sort()
    .slice(-days)
  return dates.map((d) => {
    const s = ms.get(d), n = mn.get(d), k = mk.get(d)
    const vals = [s, n, k].filter((v): v is number => typeof v === "number")
    return { label: d.slice(5), scallop: r2(s), navi: r2(n), kai: r2(k), agent: vals.length ? r2(Math.max(...vals)) : undefined }
  })
}

// 1D: the swarm's own decision feed — intraday points (DefiLlama is daily-only). Each
// decision carries the live venue APYs at that tick; AGENT = best venue each point.
function fromDecisions(): Pt[] {
  try {
    const path = FEED_FILE.startsWith("/") || /^[A-Za-z]:/.test(FEED_FILE) ? FEED_FILE : join(process.cwd(), FEED_FILE)
    if (!existsSync(path)) return []
    const arr = JSON.parse(readFileSync(path, "utf8"))
    if (!Array.isArray(arr)) return []
    const cutoff = Date.now() - 26 * 3600_000
    return arr
      .filter((d: any) => d?.ts && Date.parse(d.ts) >= cutoff && Array.isArray(d.apys))
      .map((d: any) => {
        const by = new Map<string, number>(d.apys.map((a: any) => [a.protocol, a.apy]))
        const s = by.get("scallop"), n = by.get("navi"), k = by.get("kai")
        const vals = [s, n, k].filter((v): v is number => typeof v === "number")
        const t = new Date(Date.parse(d.ts))
        const label = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`
        return { label, scallop: r2(s), navi: r2(n), kai: r2(k), agent: vals.length ? r2(Math.max(...vals)) : undefined }
      })
  } catch {
    return []
  }
}

export async function GET(req: Request) {
  const range = new URL(req.url).searchParams.get("range") || "30d"
  try {
    const points = range === "1d" ? fromDecisions() : await fromDefiLlama(range === "7d" ? 7 : 30)
    return NextResponse.json({ range, points, ok: points.length > 0 })
  } catch (e: any) {
    return NextResponse.json({ range, points: [], ok: false, error: String(e?.message ?? e) }, { status: 200 })
  }
}
