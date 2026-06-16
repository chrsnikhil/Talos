"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { ArrowUpRight, ArrowLeft } from "lucide-react"
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { EventStream } from "@/components/talos-dash/event-stream"
import { ThoughtStream } from "@/components/talos-dash/thought-stream"
import { PortfolioPanel } from "@/components/talos-dash/portfolio-panel"
import { OnchainStream } from "@/components/talos-dash/onchain-stream"

const WorkshopScene = dynamic(
  () => import("@/components/talos-dash/workshop/scene").then((m) => m.WorkshopScene),
  { ssr: false, loading: () => <div className="flex h-[520px] items-center justify-center border-2 border-border text-xs uppercase tracking-widest text-muted-foreground">loading workshop…</div> },
)

const EXPLORER = "https://suiscan.xyz/mainnet"
const ACCENT = "#3b97fb"
const GRID = "#2e3440"
const TICK = "#8a93a6"

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
type Swarm = {
  active: boolean
  cycles: number
  startedAt?: string | null
  lastTickAt?: string | null
  provider?: string
  model?: string
  intervalMs?: number
}
const trunc = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—")
function ago(ms: number) {
  if (!ms) return ""
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}
const TABS = ["LIVE", "THOUGHT", "PORTFOLIO", "ON-CHAIN", "POLICY", "REPUTATION"] as const
type Tab = (typeof TABS)[number]

function ChartTip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="border-2 border-border bg-background px-3 py-2 text-[10px] uppercase tracking-widest">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-accent">
        {payload[0].value}
        {unit}
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-2 border-border">
      <div className="border-b-2 border-border px-5 py-2.5 text-[11px] uppercase tracking-widest">{title}</div>
      {children}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
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
  const [swarm, setSwarm] = useState<Swarm | null>(null)
  const [updated, setUpdated] = useState<Date | null>(null)
  const [tab, setTab] = useState<Tab>("LIVE")

  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const [p, a, rp, sw] = await Promise.all([
          fetch("/api/talos/policy", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/talos/activity", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/talos/reputation", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/talos/swarm", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        ])
        if (!alive) return
        if (!p.error) setPolicy(p)
        setEvents(a.events || [])
        if (!rp.error) setRep(rp)
        if (sw && !sw.error) setSwarm(sw)
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

  const spends = useMemo(() => events.filter((e) => e.type === "SpendAuthorized").slice().reverse(), [events])
  const ratings = useMemo(() => events.filter((e) => e.type === "CriticRating").slice().reverse(), [events])
  const budgetSeries = useMemo(() => {
    const arr: { name: string; remaining: number }[] = []
    if (policy) arr.push({ name: "init", remaining: budgetTotal })
    spends.forEach((s, i) => arr.push({ name: `#${i + 1}`, remaining: Number(s.data.remaining) }))
    return arr
  }, [spends, policy, budgetTotal])

  const scoreSeries = useMemo(
    () => ratings.map((r, i) => ({ name: `#${i + 1}`, score: Number(r.data.score) })),
    [ratings],
  )

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* top bar */}
      <div className="sticky top-0 z-40 flex items-stretch justify-between border-b-2 border-border bg-background">
        <a href="/" className="flex items-center gap-2 border-r-2 border-border px-5 py-4 hover:bg-foreground hover:text-background">
          <ArrowLeft size={16} />
          <span className="font-pixel text-lg">TALOS</span>
          <span className="text-[10px] tracking-widest text-muted-foreground">/OPERATOR</span>
        </a>
        <div className="flex items-center gap-3 px-5 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="hidden sm:inline">{updated ? `UPDATED ${updated.toLocaleTimeString()}` : "CONNECTING…"}</span>
          <span className="flex items-center gap-2 text-foreground">
            <span className={`h-2 w-2 ${status === "ACTIVE" ? "animate-blink bg-accent" : "bg-foreground"}`} />
            {status}
          </span>
        </div>
      </div>

      {/* tab bar */}
      <div className="flex items-stretch overflow-x-auto border-b-2 border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-r-2 border-border px-5 py-3 text-[11px] uppercase tracking-widest transition-colors ${
              tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {`// ${t}`}
          </button>
        ))}
        <div className="hidden flex-1 items-center justify-end px-5 text-[10px] uppercase tracking-widest text-muted-foreground lg:flex">
          ICARUS // DAEDALUS · SUI MAINNET
        </div>
      </div>

      <div className="px-6 py-8 lg:px-10">
        {/* ===== LIVE ===== */}
        {tab === "LIVE" && (
          <div className="space-y-8">
            <SwarmHeartbeat swarm={swarm} />
            <Panel title={`BUDGET LEASH // ${pct}% REMAINING`}>
              <div className="px-5 pt-5">
                <div className="h-3 w-full border-2 border-border">
                  <div className="h-full bg-accent transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="h-64 w-full p-4">
                {budgetSeries.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={budgetSeries} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                      <defs>
                        <linearGradient id="bud" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={ACCENT} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="name" stroke={GRID} tick={{ fill: TICK, fontSize: 10, fontFamily: "var(--font-mono)" }} />
                      <YAxis stroke={GRID} tick={{ fill: TICK, fontSize: 10, fontFamily: "var(--font-mono)" }} width={56} />
                      <Tooltip content={<ChartTip />} cursor={{ stroke: ACCENT, strokeOpacity: 0.3 }} />
                      <Area type="stepAfter" dataKey="remaining" stroke={ACCENT} strokeWidth={2} fill="url(#bud)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">BUDGET HISTORY APPEARS AS ICARUS REBALANCES</div>
                )}
              </div>
            </Panel>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 border-2 border-border">
                <div className="border-b-2 border-border px-5 py-2.5 text-[11px] uppercase tracking-widest">AGENT WORKSHOP // ICARUS · DAEDALUS</div>
                <div className="h-[520px]"><WorkshopScene bare /></div>
              </div>
              <div className="border-2 border-border">
                <div className="border-b-2 border-border px-5 py-2.5 text-[11px] uppercase tracking-widest">EVENT STREAM</div>
                <div className="h-[520px] p-3"><EventStream bare /></div>
              </div>
            </div>
          </div>
        )}

        {/* ===== THOUGHT ===== */}
        {tab === "THOUGHT" && <ThoughtStream />}

        {/* ===== PORTFOLIO ===== */}
        {tab === "PORTFOLIO" && <PortfolioPanel />}

        {/* ===== ON-CHAIN ===== */}
        {tab === "ON-CHAIN" && (
          <Panel title={`ON-CHAIN PROOFS // SUI · WALRUS`}>
            <div className="p-3"><OnchainStream bare /></div>
          </Panel>
        )}

        {/* ===== POLICY ===== */}
        {tab === "POLICY" && (
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <Panel title="AGENT POLICY // THE ON-CHAIN LEASH">
              {[
                { k: "STATUS", v: status },
                { k: "OWNER", v: trunc(policy?.owner) },
                { k: "AGENT", v: trunc(policy?.agent) },
                { k: "REMAINING BUDGET", v: policy?.remaining_budget ?? "—" },
                { k: "PER-TX CAP", v: policy?.per_tx_cap ?? "—" },
                { k: "TOTAL SPENT", v: policy?.total_spent ?? "—" },
                { k: "EXPIRES", v: policy ? new Date(policy.expires_at_ms).toLocaleString() : "—" },
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
                    <span key={p} className="border border-border px-2 py-1 text-[10px] uppercase tracking-wider">{p}</span>
                  ))}
                  {(!policy || policy.protocols.length === 0) && <span className="text-xs text-muted-foreground">—</span>}
                </div>
              </div>
              <a href={`${EXPLORER}/object/${policy?.policyId ?? ""}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border-t-2 border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-foreground hover:text-background">
                VIEW POLICY ON EXPLORER <ArrowUpRight size={14} />
              </a>
            </Panel>

            <Panel title="ENFORCEMENT">
              <div className="space-y-4 p-5 text-xs leading-relaxed text-muted-foreground">
                <p>
                  The agent decides off-chain — but it can only ever spend what this Move policy object permits. Every
                  bound below is checked <span className="text-foreground">on-chain</span>; a violation aborts the
                  transaction.
                </p>
                {[
                  ["BUDGET CEILING", "per-tx cap + remaining budget, decremented on every spend"],
                  ["PROTOCOL SCOPE", "an allowlist — anything off-list is rejected"],
                  ["EXPIRY", "expires_at_ms checked against the on-chain clock"],
                  ["OWNER REVOCATION", "the OwnerCap flips revoked = true; the next spend aborts"],
                ].map(([k, d]) => (
                  <div key={k} className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-accent" />
                    <div>
                      <div className="uppercase tracking-widest text-foreground">{k}</div>
                      <div>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* ===== REPUTATION ===== */}
        {tab === "REPUTATION" && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 border-2 border-border [&>*]:border-r-2 [&>*]:border-border">
              <Stat label="AVG SCORE /100" value={rep ? rep.avg : "—"} accent />
              <Stat label="TOTAL RATINGS" value={rep ? rep.total : "—"} />
            </div>

            <Panel title="DAEDALUS // CRITIC SCORES">
              <div className="h-64 w-full p-4">
                {scoreSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scoreSeries} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="name" stroke={GRID} tick={{ fill: TICK, fontSize: 10, fontFamily: "var(--font-mono)" }} />
                      <YAxis domain={[0, 100]} stroke={GRID} tick={{ fill: TICK, fontSize: 10, fontFamily: "var(--font-mono)" }} width={40} />
                      <Tooltip content={<ChartTip unit="/100" />} cursor={{ stroke: ACCENT, strokeOpacity: 0.3 }} />
                      <Line type="linear" dataKey="score" stroke={ACCENT} strokeWidth={2} dot={{ fill: ACCENT, r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    RATINGS APPEAR AS DAEDALUS JUDGES ICARUS
                  </div>
                )}
              </div>
            </Panel>

            <Panel title="RATINGS LOG">
              {ratings.length === 0 && <Empty />}
              {ratings
                .slice()
                .reverse()
                .map((e, i) => (
                  <div key={e.tx + i} className="flex items-center gap-4 border-b border-border px-5 py-3">
                    <span className="font-pixel text-lg text-accent">{e.data.score}</span>
                    <span className="flex-1 truncate text-xs text-muted-foreground">{e.data.verdict} · re {String(e.data.ref_tx ?? "").slice(0, 8)}…</span>
                    <span className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">{ago(e.timestampMs)}</span>
                    <a href={`${EXPLORER}/tx/${e.tx}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      <ArrowUpRight size={14} />
                    </a>
                  </div>
                ))}
            </Panel>
          </div>
        )}
      </div>
    </main>
  )
}

function SwarmHeartbeat({ swarm }: { swarm: Swarm | null }) {
  const live = Boolean(swarm?.active)
  const brain =
    !swarm || !swarm.provider || swarm.provider === "none"
      ? "HEURISTIC"
      : `${swarm.provider.toUpperCase()}${swarm.model ? ` · ${swarm.model}` : ""}`
  const uptime = swarm?.startedAt ? ago(Date.parse(swarm.startedAt)) : "—"
  const lastTick = swarm?.lastTickAt ? ago(Date.parse(swarm.lastTickAt)) : "—"
  const tick = swarm?.intervalMs ? `${Math.round(swarm.intervalMs / 1000)}s` : "—"
  const cell = "px-5 py-5 border-r-2 border-border"
  return (
    <div className="border-2 border-border">
      <div className="flex items-center justify-between border-b-2 border-border px-5 py-2.5">
        <span className="text-[11px] uppercase tracking-widest">AUTONOMOUS SWARM // HEARTBEAT</span>
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
          <span className={`h-2 w-2 ${live ? "animate-blink bg-accent" : "bg-muted-foreground"}`} />
          {live ? "LIVE" : "IDLE"}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 [&>*]:border-b-2 [&>*]:border-border">
        <div className={cell}>
          <div className="font-pixel text-3xl text-accent">{swarm?.cycles ?? "—"}</div>
          <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">CYCLES RUN</div>
        </div>
        <div className={cell}>
          <div className="font-pixel text-lg">{brain}</div>
          <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">BRAIN</div>
        </div>
        <div className={cell}>
          <div className="font-pixel text-3xl">{uptime}</div>
          <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">UPTIME</div>
        </div>
        <div className={cell}>
          <div className="font-pixel text-3xl">{lastTick}</div>
          <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">LAST TICK</div>
        </div>
        <div className="px-5 py-5">
          <div className="font-pixel text-3xl">{tick}</div>
          <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">INTERVAL</div>
        </div>
      </div>
    </div>
  )
}

function Empty() {
  return <div className="px-5 py-12 text-center text-xs text-muted-foreground">NO EVENTS YET — RUN THE ICARUS RUNTIME.</div>
}
