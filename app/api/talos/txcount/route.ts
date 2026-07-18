import { NextResponse } from "next/server"
import { SuiClient } from "@mysten/sui/client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Count against the official fullnode, NOT the app's default SUI_RPC (Suiscan's RPC
// rate-limits the ~270 rapid pagination calls this does and the count fails). The
// official node tolerates it; a small inter-page delay + per-page retry keeps it safe.
const COUNT_RPC = "https://fullnode.mainnet.sui.io:443"
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Sui has no per-account nonce, so a total tx count can only be had by paginating
// every transaction block from an address — ~90 RPC calls per address. Too heavy to
// run on each page-load, so we count in the BACKGROUND and cache the result; every
// request serves the cached number instantly and only triggers a recount when stale.
const ADDRS = [
  "0x1f0455e5fb79711dff710e04aa9a7ea4dbb582b77a3a5452fcc61be1cb80ea7f", // Icarus (executor)
  "0xcfedac7e763a82f0aada2960d07ac13d0418a948a26173577e271bf4e9be8148", // Daedalus (live critic key)
  "0x4f11c87bbd643a06ff73b88fc10faff62d47142dc0edf5ae3783bcc0ded9f2ea", // Daedalus (migrated critic key)
]

// Seeded with the last hand-verified total so a cold start never renders 0; the first
// request triggers a background refresh that replaces it with a fresh live count.
let cache = { total: 4558, at: 0 }
let running = false

async function pageWithRetry(
  client: SuiClient,
  addr: string,
  cursor: string | null,
): Promise<{ data: unknown[]; hasNextPage: boolean; nextCursor: string | null }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const q = await client.queryTransactionBlocks({ filter: { FromAddress: addr }, cursor, limit: 50 })
      return { data: q.data, hasNextPage: q.hasNextPage, nextCursor: q.nextCursor ?? null }
    } catch {
      await sleep(400 * (attempt + 1))
    }
  }
  throw new Error("page failed after retries")
}

async function countFrom(client: SuiClient, addr: string): Promise<number> {
  let n = 0
  let cursor: string | null = null
  for (let i = 0; i < 500; i++) {
    const q = await pageWithRetry(client, addr, cursor)
    n += q.data.length
    if (!q.hasNextPage) break
    cursor = q.nextCursor
    await sleep(60) // be gentle on the RPC across ~90 pages
  }
  return n
}

async function refresh(): Promise<void> {
  if (running) return
  running = true
  try {
    const client = new SuiClient({ url: COUNT_RPC })
    // Count addresses sequentially (not parallel) to keep the request rate low.
    let total = 0
    for (const a of ADDRS) total += await countFrom(client, a)
    cache = { total, at: Date.now() }
  } catch {
    // keep the last good cache on any RPC blip
  } finally {
    running = false
  }
}

const TTL_MS = 5 * 60 * 1000

export async function GET() {
  // Instant response from cache; refresh in the background if it's older than the TTL.
  if (Date.now() - cache.at > TTL_MS) void refresh()
  return NextResponse.json({ total: cache.total, updatedAt: cache.at })
}
