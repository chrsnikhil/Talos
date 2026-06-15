import { NextResponse } from "next/server"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Surfaces the autonomous swarm's heartbeat (cycles run, uptime, active brain) by reading
// the state file that scripts/run-swarm.ts persists each tick. Returns running:false when
// the loop isn't active or has never run, so the dashboard can show an idle state.
const STATE_FILE = process.env.TALOS_SWARM_STATE ?? ".talos-swarm.json"

export async function GET() {
  try {
    const path = STATE_FILE.startsWith("/") || /^[A-Za-z]:/.test(STATE_FILE) ? STATE_FILE : join(process.cwd(), STATE_FILE)
    if (!existsSync(path)) {
      return NextResponse.json({ active: false, cycles: 0, reason: "swarm has not run yet" })
    }
    const s = JSON.parse(readFileSync(path, "utf8"))
    const lastTickMs = s.lastTickAt ? Date.parse(s.lastTickAt) : 0
    // Consider the loop "live" if it claims to be running and ticked within ~3 intervals.
    const interval = Number(s.intervalMs ?? 60000)
    const fresh = lastTickMs > 0 && Date.now() - lastTickMs < Math.max(interval * 3, 180000)
    return NextResponse.json({
      active: Boolean(s.running) && fresh,
      cycles: Number(s.cycles ?? 0),
      startedAt: s.startedAt ?? null,
      lastTickAt: s.lastTickAt ?? null,
      provider: s.provider ?? "none",
      model: s.model ?? "",
      intervalMs: interval,
      reputation: s.reputation ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({ active: false, cycles: 0, error: String(e?.message ?? e) }, { status: 500 })
  }
}
