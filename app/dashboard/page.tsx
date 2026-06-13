"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, ArrowLeft, Activity, ShieldCheck, Ban, Gavel } from "lucide-react"

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

const LABEL: Record<string, string> = {
  SpendAuthorized: "Rebalance",
  PolicyRevoked: "Revoked",
  PolicyCreated: "Created",
  ToppedUp: "Top-up",
  ExpiryExtended: "Extended",
  CriticRating: "Rating",
  ReputationCreated: "Critic init",
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
    case "CriticRating":
      return `${d.score}/100 · ${d.verdict} · re ${String(d.ref_tx ?? "").slice(0, 8)}…`
    case "ReputationCreated":
      return "reputation ledger created"
    default:
      return ""
  }
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center border-r border-foreground/10 last:border-r-0">
      <span className="font-display text-[clamp(2rem,4vw,3rem)] leading-none">{value}</span>
      <span className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  )
}

export default function Dashboard() {
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [events, setEvents] = useState<Ev[]>([])
  const [rep, setRep] = useState<{ total: number; avg: number } | null>(null)
  const [updated, setUpdated] = useState<Date | null>(null)

  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const [p, a, rp] = await Promise.all([
          fetch("/api/talos/policy", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/talos/activity", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/talos/reputation", { cache: "no-store" }).then((r) => r.json()),
        ])
        if (!alive) return
        if (!p.error) setPolicy(p)
        setEvents(a.events || [])
        if (!rp.error) setRep(rp)
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
  const budgetTotal = policy ? policy.remaining_budget + policy.total_spent : 0
  const pct = policy && budgetTotal > 0 ? Math.round((policy.remaining_budget / budgetTotal) * 100) : 100

  return (
    <main className="min-h-screen bg-background text-foreground noise-overlay">
      {/* top bar */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-foreground/10">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="font-display text-xl">Talos</span>
            <span className="font-mono text-[10px] text-muted-foreground mt-1">operator</span>
          </a>
          <div className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              {status === "ACTIVE" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground/40" />}
              <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground" />
            </span>
            {status}
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Live · Sui testnet</span>
            <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] mt-2">Icarus, live</h1>
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              policy {trunc(policy?.policyId)} · agent {trunc(policy?.agent)}
            </p>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {updated ? `updated ${updated.toLocaleTimeString()}` : "connecting…"} · auto 5s
          </span>
        </div>

        {/* budget */}
        <div className="border border-foreground/10 rounded-lg overflow-hidden mb-8">
          <div className="flex items-center justify-between px-5 py-3 border-b border-foreground/10">
            <span className="font-display text-lg">Budget leash</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{pct}% remaining</span>
          </div>
          <div className="px-5 pt-5">
            <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
              <div className="h-full bg-foreground transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-3 mt-2">
            <Stat label="Remaining" value={policy?.remaining_budget ?? "—"} />
            <Stat label="Per-tx cap" value={policy?.per_tx_cap ?? "—"} />
            <Stat label="Total spent" value={policy?.total_spent ?? "—"} />
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,360px)_1fr] gap-8 items-start">
          {/* left column */}
          <div className="space-y-8">
            <div className="border border-foreground/10 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-foreground/10 flex items-center gap-2">
                {status === "REVOKED" ? <Ban className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                <span className="font-display text-lg">Policy</span>
              </div>
              {[
                { k: "Status", v: status },
                { k: "Owner", v: trunc(policy?.owner) },
                { k: "Agent", v: trunc(policy?.agent) },
                { k: "Expires", v: policy ? new Date(policy.expires_at_ms).toLocaleDateString() : "—" },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between px-5 py-3 border-b border-foreground/5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{row.k}</span>
                  <span className="font-mono text-sm">{row.v}</span>
                </div>
              ))}
              <div className="px-5 py-4">
                <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2.5">Allowed protocols</div>
                <div className="flex flex-wrap gap-2">
                  {(policy?.protocols ?? []).map((p) => (
                    <span key={p} className="font-mono text-xs px-2.5 py-1 border border-foreground/15 rounded-full">{p}</span>
                  ))}
                  {(!policy || policy.protocols.length === 0) && <span className="text-sm text-muted-foreground">—</span>}
                </div>
              </div>
              <a href={`${EXPLORER}/object/${policy?.policyId ?? ""}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-3.5 border-t border-foreground/10 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors">
                View policy on explorer <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="border border-foreground/10 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-foreground/10 flex items-center gap-2">
                <Gavel className="w-4 h-4" />
                <span className="font-display text-lg">Daedalus — reputation</span>
              </div>
              <div className="flex items-center justify-around py-8">
                <div className="text-center">
                  <div className="font-display text-[clamp(2rem,5vw,3rem)] leading-none">{rep ? rep.avg : "—"}</div>
                  <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mt-2">avg /100</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-[clamp(2rem,5vw,3rem)] leading-none">{rep ? rep.total : "—"}</div>
                  <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mt-2">ratings</div>
                </div>
              </div>
            </div>
          </div>

          {/* activity feed */}
          <div className="border border-foreground/10 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-foreground/10 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="font-display text-lg">On-chain activity</span>
            </div>
            {events.length === 0 && (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                No events yet — run the Icarus runtime to see live rebalances.
              </div>
            )}
            {events.map((e, i) => (
              <div key={e.tx + i} className="flex items-center gap-4 px-5 py-3.5 border-b border-foreground/5">
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 border border-foreground/20 rounded-full">
                  {LABEL[e.type] ?? e.type}
                </span>
                <span className="flex-1 font-mono text-sm text-foreground/80">{evDetail(e)}</span>
                <span className="hidden sm:inline font-mono text-[11px] text-muted-foreground">{ago(e.timestampMs)}</span>
                <a href={`${EXPLORER}/tx/${e.tx}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="View tx">
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
