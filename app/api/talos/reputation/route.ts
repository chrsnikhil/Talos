import { NextResponse } from "next/server"
import { SuiClient } from "@mysten/sui/client"
import { RPC, REPUTATION_ID } from "@/lib/talos/public"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// The critic identity was rotated mid-project: 412 ratings live on the original
// (now frozen) ledger, and the current critic key writes to the live ledger
// (REPUTATION_ID). "Lifetime" = both, which is the figure the README / cards cite.
const MIGRATED_LEDGER = "0x3928f7b3ab4114a44b0f533ed627c247994894985c91cf05464ab36d161f072a"

async function readLedger(client: SuiClient, id: string): Promise<{ total: number; sum: number }> {
  const o = await client.getObject({ id, options: { showContent: true } })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = (o.data as any)?.content?.fields
  return { total: Number(f?.total ?? 0), sum: Number(f?.score_sum ?? 0) }
}
const avg = (sum: number, total: number) => (total ? Math.round((sum * 100) / total) / 100 : 0)

export async function GET() {
  try {
    const client = new SuiClient({ url: RPC })
    const o = await client.getObject({ id: REPUTATION_ID, options: { showContent: true } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f = (o.data as any)?.content?.fields
    const total = Number(f?.total ?? 0)
    const sum = Number(f?.score_sum ?? 0)

    // Lifetime = live ledger + the migrated ledger (unless the live one already IS it).
    let lifeTotal = total
    let lifeSum = sum
    if (REPUTATION_ID.toLowerCase() !== MIGRATED_LEDGER.toLowerCase()) {
      try {
        const old = await readLedger(client, MIGRATED_LEDGER)
        lifeTotal += old.total
        lifeSum += old.sum
      } catch {
        // migrated ledger unreadable this refresh — fall back to live-only lifetime
      }
    }

    return NextResponse.json({
      reputationId: REPUTATION_ID,
      total,
      avg: avg(sum, total),
      // lifetime across both critic keys — matches the public "84-ish" figure
      lifetimeTotal: lifeTotal,
      lifetimeAvg: avg(lifeSum, lifeTotal),
      subject: f?.subject,
      critic: f?.critic,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: String((e as Error)?.message ?? e) }, { status: 500 })
  }
}
