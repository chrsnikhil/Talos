"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ArrowUpRight, X, Database } from "lucide-react"
import type { Apy, Decision } from "@/lib/talos-dash/events"
import { EXPLORER, WALRUS } from "@/lib/talos-dash/events"

interface RatingEv { type: string; tx: string; timestampMs: number; data: Record<string, any> }

type Card =
  | { kind: "icarus"; ts: number; d: Decision }
  | { kind: "daedalus"; ts: number; score: number; verdict: string; tx: string }

function ago(ms: number) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function ThoughtStream() {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [ratings, setRatings] = useState<RatingEv[]>([])
  const [detail, setDetail] = useState<Decision | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastTopTs = useRef(0)

  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const [dc, ac] = await Promise.all([
          fetch("/api/talos/decisions", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
          fetch("/api/talos/activity", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        ])
        if (!alive) return
        if (dc?.decisions) setDecisions(dc.decisions)
        if (ac?.events) setRatings(ac.events.filter((e: RatingEv) => e.type === "CriticRating"))
      } catch {
        /* keep last good */
      }
    }
    tick()
    const id = setInterval(tick, 5000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  const cards: Card[] = useMemo(
    () =>
      [
        ...decisions.map((d) => ({ kind: "icarus" as const, ts: Date.parse(d.ts) || 0, d })),
        ...ratings.map((r) => ({
          kind: "daedalus" as const,
          ts: r.timestampMs || 0,
          score: Number(r.data.score),
          verdict: String(r.data.verdict ?? ""),
          tx: r.tx,
        })),
      ].sort((a, b) => b.ts - a.ts),
    [decisions, ratings],
  )

  // Current venue the swarm is holding in: latest decision's destination (REBALANCE target,
  // else where it's holding).
  const holding = useMemo(() => {
    const latest = decisions.slice().sort((a, b) => (Date.parse(b.ts) || 0) - (Date.parse(a.ts) || 0))[0]
    if (!latest) return null
    return (latest.action === "REBALANCE" ? latest.target : latest.from) || latest.target || null
  }, [decisions])

  // Auto-scroll to the newest card whenever a new thought lands (newest is at top).
  const topTs = cards[0]?.ts ?? 0
  useEffect(() => {
    if (topTs && topTs !== lastTopTs.current) {
      lastTopTs.current = topTs
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [topTs])

  return (
    <div className="border-2 border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border px-6 py-3">
        <span className="text-sm uppercase tracking-widest">{`AGENT THOUGHTS // ${cards.length}`}</span>
        <div className="flex items-center gap-3">
          {holding && (
            <span className="flex items-center gap-2 rounded-sm border-2 border-accent bg-accent/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
              <span className="h-2 w-2 animate-blink bg-accent" /> HOLDING · {holding}
            </span>
          )}
          <span className="hidden items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground sm:flex">
            ICARUS · DAEDALUS
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-[68vh] overflow-y-auto no-scrollbar">
        {cards.length === 0 && (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            NO DECISIONS YET — ICARUS LOGS A THOUGHT EVERY TICK.
          </div>
        )}
        {cards.map((c, i) =>
          c.kind === "icarus" ? (
            <IcarusCard key={`i-${c.d.n}`} d={c.d} holding={holding} fresh={i === 0} onOpen={() => setDetail(c.d)} />
          ) : (
            <DaedalusCard key={`d-${c.tx}`} score={c.score} verdict={c.verdict} tx={c.tx} ts={c.ts} fresh={i === 0} />
          ),
        )}
      </div>

      {detail && <DecisionModal d={detail} holding={holding} onClose={() => setDetail(null)} />}
    </div>
  )
}

function venueClass(protocol: string, target?: string, holding?: string | null, best?: string) {
  if (protocol === target) return "border-accent bg-accent/10 text-accent"
  if (holding && protocol === holding) return "border-emerald-400 bg-emerald-400/10 text-emerald-300"
  if (protocol === best) return "border-foreground text-foreground"
  return "border-border text-muted-foreground"
}

function IcarusCard({ d, holding, fresh, onOpen }: { d: Decision; holding: string | null; fresh: boolean; onOpen: () => void }) {
  const rebalance = d.action === "REBALANCE"
  const best = [...(d.apys ?? [])].sort((a: Apy, b: Apy) => b.apy - a.apy)[0]?.protocol
  return (
    <div className={`border-b border-border px-6 py-5 transition-colors ${fresh ? "bg-accent/[0.06]" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="shrink-0 rounded-sm border-2 border-[var(--accent-color)]/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-color)]">ICARUS</span>
        <span className="shrink-0 text-xs uppercase tracking-widest text-muted-foreground">#{d.n}</span>
        <span className={`shrink-0 rounded-sm border-2 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${rebalance ? "border-accent text-accent" : "border-border text-muted-foreground"}`}>{d.action}</span>
        {rebalance && (
          <span className="shrink-0 text-sm font-semibold uppercase tracking-wide text-accent">{d.amount} · {d.from} → {d.target}</span>
        )}
        <span className="ml-auto shrink-0 rounded-sm border border-border px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">{d.by}</span>
        <span className="shrink-0 text-xs uppercase tracking-widest text-muted-foreground">{ago(Date.parse(d.ts))}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(d.apys ?? []).map((a) => (
          <span key={a.protocol} className={`rounded-sm border-2 px-3 py-1.5 text-sm font-medium uppercase tracking-wide ${venueClass(a.protocol, d.target, holding, best)}`}>
            {a.protocol} {a.apy}%{a.protocol === d.target ? " ◀ moved" : holding && a.protocol === holding ? " · holding" : ""}
          </span>
        ))}
      </div>

      {d.reasoning && (
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90"><span className="text-accent">↳ </span>{d.reasoning}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] uppercase tracking-widest">
        {d.txDigest && (
          <a href={`${EXPLORER}/tx/${d.txDigest}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">ON-CHAIN TX <ArrowUpRight size={13} /></a>
        )}
        {d.blobId && (
          <button onClick={onOpen} className="flex items-center gap-1.5 text-accent hover:text-foreground"><Database size={13} /> WALRUS MEMORY</button>
        )}
      </div>
    </div>
  )
}

function DaedalusCard({ score, verdict, tx, ts, fresh }: { score: number; verdict: string; tx: string; ts: number; fresh: boolean }) {
  return (
    <div className={`border-b border-border px-6 py-5 transition-colors ${fresh ? "bg-accent/[0.06]" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="shrink-0 rounded-sm border-2 border-[#f59e0b]/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#f59e0b]">DAEDALUS</span>
        <span className="font-pixel text-3xl text-accent">{score}</span>
        <span className="shrink-0 text-xs uppercase tracking-wider text-muted-foreground">/ 100</span>
        <span className="ml-auto shrink-0 text-xs uppercase tracking-widest text-muted-foreground">{ago(ts)}</span>
      </div>
      {verdict && <p className="mt-3 text-[15px] leading-relaxed text-foreground/90"><span className="text-[#f59e0b]">↳ </span>{verdict}</p>}
      {tx && (
        <div className="mt-3 text-[11px] uppercase tracking-widest">
          <a href={`${EXPLORER}/tx/${tx}`} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1 text-muted-foreground hover:text-foreground">ON-CHAIN RATING <ArrowUpRight size={13} /></a>
        </div>
      )}
    </div>
  )
}

// Walrus memory popup: blurred backdrop, shows the full decision record, then a link out to the raw blob.
function DecisionModal({ d, holding, onClose }: { d: Decision; holding: string | null; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  const best = [...(d.apys ?? [])].sort((a: Apy, b: Apy) => b.apy - a.apy)[0]?.protocol
  const Row = ({ k, v }: { k: string; v: ReactNode }) => (
    <div className="flex justify-between gap-6 border-b border-border/60 py-2.5">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{k}</span>
      <span className="text-right text-sm font-medium text-foreground">{v}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(8,12,17,0.72)", backdropFilter: "blur(10px)" }} onClick={onClose}>
      <div className="w-full max-w-xl border-2 border-accent bg-background shadow-[6px_6px_0_0_var(--accent)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b-2 border-border px-6 py-4">
          <span className="flex items-center gap-2 text-sm uppercase tracking-widest text-accent"><Database size={16} /> WALRUS MEMORY // DECISION #{d.n}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto no-scrollbar px-6 py-4">
          <Row k="action" v={<span className={d.action === "REBALANCE" ? "text-accent" : ""}>{d.action}</span>} />
          {d.action === "REBALANCE" && <Row k="move" v={`${d.amount} · ${d.from} → ${d.target}`} />}
          <Row k="decided by" v={d.by} />
          <Row k="at" v={new Date(Date.parse(d.ts)).toLocaleString()} />
          {holding && <Row k="now holding" v={<span className="text-emerald-300">{holding}</span>} />}
          <div className="py-3">
            <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">venue apys considered</div>
            <div className="flex flex-wrap gap-2">
              {(d.apys ?? []).map((a) => (
                <span key={a.protocol} className={`rounded-sm border-2 px-3 py-1.5 text-sm ${venueClass(a.protocol, d.target, holding, best)}`}>{a.protocol} {a.apy}%</span>
              ))}
            </div>
          </div>
          {d.reasoning && (
            <div className="py-3">
              <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">reasoning</div>
              <p className="text-[15px] leading-relaxed text-foreground/90">{d.reasoning}</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t-2 border-border px-6 py-4 text-xs uppercase tracking-widest">
          {d.blobId && (
            <a href={`${WALRUS}/${d.blobId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-sm border-2 border-accent px-3 py-2 text-accent transition-colors hover:bg-accent hover:text-background">OPEN RAW BLOB ON WALRUS <ArrowUpRight size={14} /></a>
          )}
          {d.txDigest && (
            <a href={`${EXPLORER}/tx/${d.txDigest}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">ON-CHAIN TX <ArrowUpRight size={13} /></a>
          )}
        </div>
      </div>
    </div>
  )
}
