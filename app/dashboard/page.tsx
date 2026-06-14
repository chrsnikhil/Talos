"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, ArrowLeft, Activity, ShieldCheck, Ban, Gavel } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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
    <div className="bg-card px-5 py-6 text-center">
      <div className="text-2xl font-semibold tracking-tight sm:text-3xl">{value}</div>
      <div className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
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
    <main className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
          <a href="/" className="group flex items-center gap-2">
            <ArrowLeft className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-xs font-bold">Τ</span>
            <span className="font-semibold">Talos</span>
            <span className="font-mono text-xs text-muted-foreground">operator</span>
          </a>
          <Badge variant={status === "ACTIVE" ? "default" : "destructive"} className="font-mono">
            <span className="mr-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-current" />
            {status}
          </Badge>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Live · Sui testnet</span>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight lg:text-5xl">Icarus, live</h1>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              policy {trunc(policy?.policyId)} · agent {trunc(policy?.agent)}
            </p>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {updated ? `updated ${updated.toLocaleTimeString()}` : "connecting…"} · auto 5s
          </span>
        </div>

        {/* budget */}
        <div className="mb-8 overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="font-semibold">Budget leash</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{pct}% remaining</span>
          </div>
          <div className="px-5 pt-5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-px bg-border">
            <Stat label="Remaining" value={policy?.remaining_budget ?? "—"} />
            <Stat label="Per-tx cap" value={policy?.per_tx_cap ?? "—"} />
            <Stat label="Total spent" value={policy?.total_spent ?? "—"} />
          </div>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
          <div className="space-y-8">
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                {status === "REVOKED" ? <Ban className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
                <span className="font-semibold">Policy</span>
              </div>
              {[
                { k: "Status", v: status },
                { k: "Owner", v: trunc(policy?.owner) },
                { k: "Agent", v: trunc(policy?.agent) },
                { k: "Expires", v: policy ? new Date(policy.expires_at_ms).toLocaleDateString() : "—" },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{row.k}</span>
                  <span className="font-mono text-sm">{row.v}</span>
                </div>
              ))}
              <div className="px-5 py-4">
                <div className="mb-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Allowed protocols</div>
                <div className="flex flex-wrap gap-2">
                  {(policy?.protocols ?? []).map((p) => (
                    <Badge key={p} variant="secondary" className="font-mono">{p}</Badge>
                  ))}
                  {(!policy || policy.protocols.length === 0) && <span className="text-sm text-muted-foreground">—</span>}
                </div>
              </div>
              <a href={`${EXPLORER}/object/${policy?.policyId ?? ""}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border-t border-border px-5 py-3.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                View policy on explorer <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                <Gavel className="h-4 w-4 text-primary" />
                <span className="font-semibold">Daedalus — reputation</span>
              </div>
              <div className="flex items-center justify-around py-8">
                <div className="text-center">
                  <div className="text-4xl font-semibold tracking-tight">{rep ? rep.avg : "—"}</div>
                  <div className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">avg /100</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-semibold tracking-tight">{rep ? rep.total : "—"}</div>
                  <div className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">ratings</div>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <Activity className="h-4 w-4" />
              <span className="font-semibold">On-chain activity</span>
            </div>
            {events.length === 0 && (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                No events yet — run the Icarus runtime to see live rebalances.
              </div>
            )}
            {events.map((e, i) => (
              <div key={e.tx + i} className="flex items-center gap-4 border-b border-border/60 px-5 py-3.5">
                <Badge variant="outline" className="shrink-0 font-mono text-[10px] uppercase">{LABEL[e.type] ?? e.type}</Badge>
                <span className="flex-1 font-mono text-sm text-foreground/80">{evDetail(e)}</span>
                <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">{ago(e.timestampMs)}</span>
                <a href={`${EXPLORER}/tx/${e.tx}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-foreground" title="View tx">
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
