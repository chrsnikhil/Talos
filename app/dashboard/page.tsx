"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, ArrowLeft, Activity, ShieldCheck, Ban } from "lucide-react"

const RULE = "3px solid var(--t-ink)"
const EXPLORER = "https://suiscan.xyz/testnet"

type Policy = {
  network: string
  policyId: string
  owner: string
  agent: string
  remaining_budget: number
  per_tx_cap: number
  total_spent: number
  expires_at_ms: number
  revoked: boolean
  protocols: string[]
  error?: string
}

type Ev = { type: string; tx: string; timestampMs: number; data: Record<string, any> }

const trunc = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—")

function ago(ms: number) {
  if (!ms) return ""
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const EV: Record<string, { label: string; accent: string }> = {
  SpendAuthorized: { label: "Rebalance", accent: "var(--t-red)" },
  PolicyRevoked: { label: "Revoked", accent: "var(--t-red)" },
  PolicyCreated: { label: "Created", accent: "var(--t-navy)" },
  ToppedUp: { label: "Top-up", accent: "var(--t-navy)" },
  ExpiryExtended: { label: "Extended", accent: "var(--t-navy)" },
}

function evDetail(e: Ev): string {
  const d = e.data || {}
  switch (e.type) {
    case "SpendAuthorized":
      return `${d.amount} → ${d.protocol} · remaining ${d.remaining}`
    case "PolicyRevoked":
      return "agent disabled by owner"
    case "PolicyCreated":
      return `budget ${d.budget} · per-tx ${d.per_tx_cap}`
    case "ToppedUp":
      return `+${d.added} · remaining ${d.remaining}`
    case "ExpiryExtended":
      return `new expiry ${d.new_expires_at_ms}`
    default:
      return ""
  }
}

function Cell({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-7 px-4 text-center">
      <span className="vl-display text-[clamp(26px,4vw,46px)] leading-none" style={{ color: accent ?? "var(--t-ink)" }}>
        {value}
      </span>
      <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] mt-2.5" style={{ color: "var(--t-text-muted)" }}>
        {label}
      </span>
    </div>
  )
}

export default function Dashboard() {
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [events, setEvents] = useState<Ev[]>([])
  const [updated, setUpdated] = useState<Date | null>(null)

  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const [p, a] = await Promise.all([
          fetch("/api/talos/policy", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/talos/activity", { cache: "no-store" }).then((r) => r.json()),
        ])
        if (!alive) return
        if (!p.error) setPolicy(p)
        setEvents(a.events || [])
        setUpdated(new Date())
      } catch {
        /* keep last good state */
      }
    }
    tick()
    const id = setInterval(tick, 5000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  const expired = policy ? Date.now() >= policy.expires_at_ms : false
  const status = !policy ? "…" : policy.revoked ? "REVOKED" : expired ? "EXPIRED" : "ACTIVE"
  const statusColor = status === "ACTIVE" ? "var(--t-orange)" : "var(--t-red)"
  const budgetTotal = policy ? policy.remaining_budget + policy.total_spent : 0
  const pct = policy && budgetTotal > 0 ? Math.round((policy.remaining_budget / budgetTotal) * 100) : 100

  return (
    <main className="min-h-screen" style={{ background: "var(--t-paper)", color: "var(--t-ink)" }}>
      {/* top rail */}
      <div className="flex items-stretch" style={{ borderBottom: RULE }}>
        <a href="/" className="flex items-center gap-2 px-5 md:px-8 py-3.5 hover:bg-[var(--t-navy)] hover:text-white transition-colors" style={{ borderRight: RULE }}>
          <ArrowLeft className="w-4 h-4" />
          <span className="vl-display text-lg">TALOS</span>
        </a>
        <div className="flex items-center px-5 text-xs font-extrabold uppercase tracking-[0.18em]" style={{ borderRight: RULE }}>
          Operator
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2.5 px-5 text-xs font-extrabold uppercase tracking-[0.18em]" style={{ borderLeft: RULE }}>
          <span className="relative flex h-2.5 w-2.5">
            {status === "ACTIVE" && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: statusColor }} />
            )}
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: statusColor }} />
          </span>
          {status}
        </div>
      </div>

      <div className="px-5 md:px-10 py-10 md:py-14 max-w-[1400px] mx-auto">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="vl-display text-[clamp(36px,6vw,72px)] leading-[0.85]" style={{ color: "var(--t-navy)" }}>
              Icarus — live
            </h1>
            <p className="mt-3 text-sm font-medium" style={{ color: "var(--t-text-muted)", fontFamily: "var(--font-mono)" }}>
              policy {trunc(policy?.policyId)} · agent {trunc(policy?.agent)} · testnet
            </p>
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--t-text-muted)" }}>
            {updated ? `updated ${updated.toLocaleTimeString()}` : "connecting…"} · auto 5s
          </span>
        </div>

        {/* budget meter */}
        <div className="vl-card bg-[var(--t-bg-card)] overflow-hidden mb-8">
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: RULE, background: "var(--t-navy)" }}>
            <span className="vl-display text-lg text-white">Budget leash</span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/80">{pct}% remaining</span>
          </div>
          <div className="px-5 pt-5">
            <div className="h-5 w-full relative overflow-hidden" style={{ border: "3px solid var(--t-ink)" }}>
              <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: "var(--t-red)" }} />
            </div>
          </div>
          <div className="grid grid-cols-3" style={{ borderTop: "none" }}>
            <Cell label="Remaining" value={policy?.remaining_budget ?? "—"} accent="var(--t-red)" />
            <Cell label="Per-tx cap" value={policy?.per_tx_cap ?? "—"} />
            <Cell label="Total spent" value={policy?.total_spent ?? "—"} accent="var(--t-navy)" />
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,360px)_1fr] gap-8">
          {/* policy panel */}
          <div className="vl-doc bg-[var(--t-bg-card)] overflow-hidden h-fit">
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: RULE, background: "var(--t-navy)" }}>
              {status === "REVOKED" ? <Ban className="w-4 h-4 text-white" /> : <ShieldCheck className="w-4 h-4 text-white" />}
              <span className="vl-display text-lg text-white">Policy</span>
            </div>
            {[
              { k: "Status", v: status },
              { k: "Owner", v: trunc(policy?.owner) },
              { k: "Agent", v: trunc(policy?.agent) },
              { k: "Expires", v: policy ? new Date(policy.expires_at_ms).toLocaleDateString() : "—" },
            ].map((row) => (
              <div key={row.k} className="vl-row flex items-center justify-between px-5 py-3.5">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--t-text-muted)" }}>{row.k}</span>
                <span className="text-sm font-bold" style={{ fontFamily: "var(--font-mono)" }}>{row.v}</span>
              </div>
            ))}
            <div className="px-5 py-4" style={{ borderTop: RULE }}>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] mb-2.5" style={{ color: "var(--t-text-muted)" }}>Allowed protocols</div>
              <div className="flex flex-wrap gap-2">
                {(policy?.protocols ?? []).map((p) => (
                  <span key={p} className="vl-chip" style={{ fontFamily: "var(--font-mono)" }}>{p}</span>
                ))}
                {(!policy || policy.protocols.length === 0) && <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>—</span>}
              </div>
            </div>
            <a href={`${EXPLORER}/object/${policy?.policyId ?? ""}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.16em] hover:bg-[var(--t-navy)] hover:text-white transition-colors"
              style={{ borderTop: RULE }}>
              View policy on explorer <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* activity feed */}
          <div className="vl-doc bg-[var(--t-bg-card)] overflow-hidden">
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: RULE, background: "var(--t-navy)" }}>
              <Activity className="w-4 h-4 text-white" />
              <span className="vl-display text-lg text-white">On-chain activity</span>
            </div>
            {events.length === 0 && (
              <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--t-text-muted)" }}>
                No events yet — run the Icarus runtime to see live rebalances.
              </div>
            )}
            {events.map((e, i) => {
              const meta = EV[e.type] ?? { label: e.type, accent: "var(--t-ink)" }
              return (
                <div key={e.tx + i} className="vl-row flex items-center gap-4 px-5 py-3.5">
                  <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white shrink-0" style={{ background: meta.accent, border: "2px solid var(--t-ink)" }}>
                    {meta.label}
                  </span>
                  <span className="flex-1 text-sm font-medium" style={{ fontFamily: "var(--font-mono)" }}>{evDetail(e)}</span>
                  <span className="text-[11px] hidden sm:inline" style={{ color: "var(--t-text-muted)" }}>{ago(e.timestampMs)}</span>
                  <a href={`${EXPLORER}/tx/${e.tx}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-60" title="View tx">
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
