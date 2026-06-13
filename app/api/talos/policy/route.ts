import { NextResponse } from "next/server"
import { SuiClient } from "@mysten/sui/client"
import { RPC, PACKAGE_ID, POLICY_ID, NETWORK } from "@/lib/talos/public"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function readProtocols(field: any): string[] {
  // VecSet<String> → { fields: { contents: [...] } }; elements may be strings or { fields: { bytes }}.
  const contents = field?.fields?.contents ?? field?.contents ?? []
  return (Array.isArray(contents) ? contents : []).map((x: any) =>
    typeof x === "string" ? x : (x?.fields?.bytes ?? x?.bytes ?? String(x)),
  )
}

export async function GET() {
  try {
    const client = new SuiClient({ url: RPC })
    const o = await client.getObject({ id: POLICY_ID, options: { showContent: true } })
    const f = (o.data as any)?.content?.fields
    if (!f) return NextResponse.json({ error: "policy not found" }, { status: 404 })
    return NextResponse.json({
      network: NETWORK,
      packageId: PACKAGE_ID,
      policyId: POLICY_ID,
      owner: f.owner,
      agent: f.agent,
      remaining_budget: Number(f.remaining_budget),
      per_tx_cap: Number(f.per_tx_cap),
      total_spent: Number(f.total_spent),
      expires_at_ms: Number(f.expires_at_ms),
      revoked: Boolean(f.revoked),
      protocols: readProtocols(f.allowed_protocols),
    })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 })
  }
}
