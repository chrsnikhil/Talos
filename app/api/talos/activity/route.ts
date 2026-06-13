import { NextResponse } from "next/server"
import { SuiClient } from "@mysten/sui/client"
import { RPC, PACKAGE_ID, POLICY_ID } from "@/lib/talos/public"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const client = new SuiClient({ url: RPC })
    const res = await client.queryEvents({
      query: { MoveModule: { package: PACKAGE_ID, module: "agent_policy" } },
      order: "descending",
      limit: 50,
    })
    const events = res.data
      .map((e) => ({
        type: e.type.split("::").pop() as string,
        tx: e.id.txDigest,
        timestampMs: Number(e.timestampMs ?? 0),
        data: e.parsedJson as Record<string, any>,
      }))
      .filter((e) => e.data?.policy_id === POLICY_ID)
    return NextResponse.json({ events })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e), events: [] }, { status: 500 })
  }
}
