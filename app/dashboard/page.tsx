"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, ArrowLeft } from "lucide-react"

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
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}
const LABEL: Record<string, string> = {
  SpendAuthorized: "REBALANCE",
  PolicyRevoked: "REVOKED",
  PolicyCreated: "CREATED",
  ToppedUp: "TOP-UP",
  ExpiryExtended: "EXTENDED",
  CriticRating: "RATING",
  ReputationCreated: "CRITIC INIT",
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

function Cell({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="px-5 py-6">
      <div className={`font-pixel text-3xl ${accent ? "text-accent" : ""}`}>{value}</div>
      <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
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
      {/* top bar */}
      <div className="sticky top-0 z-40 flex items-stretch justify-between border-b-2 border-foreground bg-background">
        <a href="/" className="flex items-center gap-2 border-r-2 border-foreground px-5 py-4 hover:bg-foreground hover:text-background">
          <ArrowLeft size={16} />
          <span className="font-pixel text-lg">TALOS</span>
          <span className="text-[10px] tracking-widest text-muted-foreground">/OPERATOR</span>
        </a>
        <div className="flex items-center gap-2 px-5 text-[11px] uppercase tracking-widest">
          <span className={`h-2 w-2 ${status === "ACTIVE" ? "animate-blink bg-accent" : "bg-foreground"}`} />
          {status}
        </div>
      </div>

      <div className="px-6 py-10 lg:px-12">
        {/* label row */}
        <div className="mb-8 flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">// ICARUS: LIVE</span>
          <div className="flex-1 border-t border-border" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {updated ? `UPDATED ${updated.toLocaleTimeString()}` : "CONNECTING…"} // AUTO 5S
          </span>
        </div>

        <h1 className="font-pixel text-4xl lg:text-5xl">ICARUS // LIVE</h1>
        <p className="mt-3 text-xs text-muted-foreground">
          policy {trunc(policy?.policyId)} · agent {trunc(policy?.agent)} · testnet
        </p>

        {/* budget */}
        <div className="mt-8 border-2 border-foreground">
          <div className="flex items-center justify-between border-b-2 border-foreground px-5 py-2.5 text-[11px] uppercase tracking-widest">
            <span>BUDGET LEASH</span>
            <span className="text-muted-foreground">{pct}% REMAINING</span>
          </div>
          <div className="px-5 pt-5">
            <div className="h-3 w-full border-2 border-foreground">
              <div className="h-full bg-accent transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 divide-x-2 divide-foreground">
            <Cell label="REMAINING" value={policy?.remaining_budget ?? "—"} accent />
            <Cell label="PER-TX CAP" value={policy?.per_tx_cap ?? "—"} />
            <Cell label="TOTAL SPENT" value={policy?.total_spent ?? "—"} />
          </div>
        </div>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
          {/* left column */}
          <div className="space-y-8">
            <div className="border-2 border-foreground">
              <div className="border-b-2 border-foreground px-5 py-2.5 text-[11px] uppercase tracking-widest">POLICY</div>
              {[
                { k: "STATUS", v: status },
                { k: "OWNER", v: trunc(policy?.owner) },
                { k: "AGENT", v: trunc(policy?.agent) },
                { k: "EXPIRES", v: policy ? new Date(policy.expires_at_ms).toLocaleDateString() : "—" },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between border-b border-border px-5 py-3 text-xs">
                  <span className="uppercase tracking-widest text-muted-foreground">{row.k}</span>
                  <span>{row.v}</span>
                </div>
              ))}
              <div className="px-5 py-4">
                <div className="mb-2.5 text-[10px] uppercase tracking-widest text-muted-foreground">ALLOWED PROTOCOLS</div>
                <div className="flex flex-wrap gap-2">
                  {(policy?.protocols ?? []).map((p) => (
                    <span key={p} className="border border-foreground px-2 py-1 text-[10px] uppercase tracking-wider">{p}</span>
                  ))}
                  {(!policy || policy.protocols.length === 0) && <span className="text-xs text-muted-foreground">—</span>}
                </div>
              </div>
              <a href={`${EXPLORER}/object/${policy?.policyId ?? ""}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border-t-2 border-foreground px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-foreground hover:text-background">
                VIEW ON EXPLORER <ArrowUpRight size={14} />
              </a>
            </div>

            <div className="border-2 border-foreground">
              <div className="border-b-2 border-foreground px-5 py-2.5 text-[11px] uppercase tracking-widest">DAEDALUS // REPUTATION</div>
              <div className="grid grid-cols-2 divide-x-2 divide-foreground">
                <div className="px-5 py-7 text-center">
                  <div className="font-pixel text-4xl text-accent">{rep ? rep.avg : "—"}</div>
                  <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">AVG /100</div>
                </div>
                <div className="px-5 py-7 text-center">
                  <div className="font-pixel text-4xl">{rep ? rep.total : "—"}</div>
                  <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">RATINGS</div>
                </div>
              </div>
            </div>
          </div>

          {/* activity feed */}
          <div className="border-2 border-foreground">
            <div className="border-b-2 border-foreground px-5 py-2.5 text-[11px] uppercase tracking-widest">ON-CHAIN ACTIVITY</div>
            {events.length === 0 && (
              <div className="px-5 py-12 text-center text-xs text-muted-foreground">
                NO EVENTS YET — RUN THE ICARUS RUNTIME TO SEE LIVE REBALANCES.
              </div>
            )}
            {events.map((e, i) => (
              <div key={e.tx + i} className="flex items-center gap-4 border-b border-border px-5 py-3">
                <span className="shrink-0 border border-foreground px-2 py-1 text-[9px] uppercase tracking-wider text-accent">{LABEL[e.type] ?? e.type}</span>
                <span className="flex-1 truncate text-xs text-muted-foreground">{evDetail(e)}</span>
                <span className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">{ago(e.timestampMs)}</span>
                <a href={`${EXPLORER}/tx/${e.tx}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" title="View tx">
                  <ArrowUpRight size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
