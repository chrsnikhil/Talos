import { getSuiPrice } from "@7kprotocol/sdk-ts"
import { RPC } from "@/lib/talos/public"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const AGENT =
  process.env.TALOS_AGENT_ADDRESS ||
  "0x1f0455e5fb79711dff710e04aa9a7ea4dbb582b77a3a5452fcc61be1cb80ea7f"

const SUI_TYPE = "0x2::sui::SUI"
const USDC_TYPE =
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"

interface Balance {
  coinType: string
  totalBalance: string
}

async function rpc(method: string, params: unknown[]) {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  })
  if (!r.ok) throw new Error(`rpc ${method} ${r.status}`)
  const j = await r.json()
  if (j.error) throw new Error(j.error.message || "rpc error")
  return j.result
}

export async function GET() {
  try {
    const [balances, price, decisionsRes, activityRes] = await Promise.all([
      rpc("suix_getAllBalances", [AGENT]) as Promise<Balance[]>,
      getSuiPrice().catch(() => 0),
      fetch(
        `${process.env.DASHBOARD_SELF_URL || "http://127.0.0.1:3000"}/api/talos/decisions`,
        { cache: "no-store" },
      )
        .then((r) => r.json())
        .catch(() => null),
      fetch(
        `${process.env.DASHBOARD_SELF_URL || "http://127.0.0.1:3000"}/api/talos/activity`,
        { cache: "no-store" },
      )
        .then((r) => r.json())
        .catch(() => null),
    ])

    const byType = new Map(balances.map((b) => [b.coinType, b.totalBalance]))
    const sui = Number(byType.get(SUI_TYPE) ?? "0") / 1e9
    const usdc = Number(byType.get(USDC_TYPE) ?? "0") / 1e6
    const suiUsd = sui * (price || 0)

    const lending: Array<{
      venue: string
      label: string
      amountUsd: number
      kind: "lending"
    }> = []
    for (const b of balances) {
      const t = b.coinType.toLowerCase()
      const amt = Number(b.totalBalance)
      if (amt <= 0) continue
      if (t.includes("scallop"))
        lending.push({ venue: "scallop", label: "SCALLOP", amountUsd: amt / 1e6, kind: "lending" })
      else if (t.includes("navi") && t.includes("usdc"))
        lending.push({ venue: "navi", label: "NAVI", amountUsd: amt / 1e6, kind: "lending" })
      else if (t.includes("kai") && t.includes("usdc"))
        lending.push({ venue: "kai", label: "KAI", amountUsd: amt / 1e6, kind: "lending" })
    }

    const positions = [
      {
        venue: "sui",
        label: "SUI (gas + strategy)",
        amountUsd: +suiUsd.toFixed(2),
        kind: "volatile" as const,
      },
      { venue: "usdc", label: "USDC (cash)", amountUsd: +usdc.toFixed(2), kind: "cash" as const },
      ...lending.map((l) => ({ ...l, amountUsd: +l.amountUsd.toFixed(2) })),
    ].filter((p) => p.amountUsd > 0)

    const totalUsd = +positions.reduce((s, p) => s + p.amountUsd, 0).toFixed(2)

    const decisions: unknown[] = (decisionsRes?.decisions as unknown[]) ?? []
    const latest = decisions[0] as any
    const currentVenue = latest?.target ?? latest?.from ?? "—"
    const apys: unknown[] = (latest?.apys as unknown[]) ?? []
    const cur = (apys as any[]).find((a) => a.protocol === currentVenue)
    const blendedApy: number | null = cur ? cur.apy : null

    const events: unknown[] = (activityRes?.events as unknown[]) ?? []
    const spends = (events as any[]).filter((e) => e.type === "SpendAuthorized")
    const lastSpend = spends[0]
    const lastRebalance = lastSpend
      ? {
          from: "—",
          to: lastSpend.data?.protocol ?? "—",
          amount: Number(lastSpend.data?.amount ?? 0),
          ts: new Date(lastSpend.timestampMs).toISOString(),
          txDigest: lastSpend.tx,
        }
      : null
    const history = spends
      .slice(0, 20)
      .map((e: any) => ({ ts: e.timestampMs, from: "—", to: e.data?.protocol ?? "—", txDigest: e.tx }))

    return Response.json({
      address: AGENT,
      totalUsd,
      positions,
      currentVenue,
      blendedApy,
      lastRebalance,
      history,
    })
  } catch (e: any) {
    return Response.json({ error: String(e?.message ?? e) }, { status: 200 })
  }
}
