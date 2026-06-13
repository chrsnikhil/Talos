import { NextResponse } from "next/server"
import { SuiClient } from "@mysten/sui/client"
import { RPC, REPUTATION_ID } from "@/lib/talos/public"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const client = new SuiClient({ url: RPC })
    const o = await client.getObject({ id: REPUTATION_ID, options: { showContent: true } })
    const f = (o.data as any)?.content?.fields
    const total = Number(f?.total ?? 0)
    const sum = Number(f?.score_sum ?? 0)
    return NextResponse.json({
      reputationId: REPUTATION_ID,
      total,
      avg: total ? Math.round((sum * 100) / total) / 100 : 0,
      subject: f?.subject,
      critic: f?.critic,
    })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 })
  }
}
