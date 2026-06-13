import { NextResponse } from "next/server"
import { SuiClient } from "@mysten/sui/client"
import { RPC, PACKAGE_ID, POLICY_ID, REPUTATION_ID } from "@/lib/talos/public"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const map = (e: any) => ({
  type: String(e.type).split("::").pop() as string,
  tx: e.id.txDigest,
  timestampMs: Number(e.timestampMs ?? 0),
  data: e.parsedJson as Record<string, any>,
})

export async function GET() {
  try {
    const client = new SuiClient({ url: RPC })
    const [pol, rep] = await Promise.all([
      client.queryEvents({ query: { MoveModule: { package: PACKAGE_ID, module: "agent_policy" } }, order: "descending", limit: 50 }),
      client.queryEvents({ query: { MoveModule: { package: PACKAGE_ID, module: "reputation" } }, order: "descending", limit: 50 }),
    ])
    const events = [
      ...pol.data.map(map).filter((e) => e.data?.policy_id === POLICY_ID),
      ...rep.data.map(map).filter((e) => e.data?.reputation_id === REPUTATION_ID),
    ]
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, 60)
    return NextResponse.json({ events })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e), events: [] }, { status: 500 })
  }
}
