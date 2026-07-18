import { NextResponse } from "next/server"
import { SuiClient } from "@mysten/sui/client"
import { RPC } from "@/lib/talos/public"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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

async function countFrom(client: SuiClient, addr: string): Promise<number> {
  let n = 0
  let cursor: string | null = null
  for (let i = 0; i < 500; i++) {
    const q = await client.queryTransactionBlocks({ filter: { FromAddress: addr }, cursor, limit: 50 })
    n += q.data.length
    if (!q.hasNextPage) break
    cursor = q.nextCursor ?? null
  }
  return n
}

async function refresh(): Promise<void> {
  if (running) return
  running = true
  try {
    const client = new SuiClient({ url: RPC })
    const counts = await Promise.all(ADDRS.map((a) => countFrom(client, a)))
    cache = { total: counts.reduce((s, c) => s + c, 0), at: Date.now() }
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
