import { NextResponse } from "next/server"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Streams the swarm's recent decision feed (the "AGENT THOUGHTS") by reading the ring
// buffer that lib/talos/feed.ts writes each tick. Returns newest-first so the dashboard
// can render it as a live stream. Empty list (not an error) when the swarm hasn't run.
const FEED_FILE = process.env.TALOS_DECISIONS_FILE ?? ".talos-decisions.json"

export async function GET() {
  try {
    const path =
      FEED_FILE.startsWith("/") || /^[A-Za-z]:/.test(FEED_FILE) ? FEED_FILE : join(process.cwd(), FEED_FILE)
    if (!existsSync(path)) return NextResponse.json({ decisions: [] })
    const arr = JSON.parse(readFileSync(path, "utf8"))
    const decisions = Array.isArray(arr) ? arr.slice().reverse() : []
    return NextResponse.json({ decisions })
  } catch (e: any) {
    return NextResponse.json({ decisions: [], error: String(e?.message ?? e) }, { status: 500 })
  }
}
