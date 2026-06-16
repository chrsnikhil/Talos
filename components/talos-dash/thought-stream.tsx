"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight } from "lucide-react"
import type { Apy, Decision } from "@/lib/talos-dash/events"
import { EXPLORER, WALRUS } from "@/lib/talos-dash/events"

interface RatingEv { type: string; tx: string; timestampMs: number; data: Record<string, any> }

type Card =
  | { kind: "icarus"; ts: number; d: Decision }
  | { kind: "daedalus"; ts: number; score: number; verdict: string; tx: string }

function ago(ms: number) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export function ThoughtStream() {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [ratings, setRatings] = useState<RatingEv[]>([])

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

  const cards: Card[] = [
    ...decisions.map((d) => ({ kind: "icarus" as const, ts: Date.parse(d.ts) || 0, d })),
    ...ratings.map((r) => ({
      kind: "daedalus" as const,
      ts: r.timestampMs || 0,
      score: Number(r.data.score),
      verdict: String(r.data.verdict ?? ""),
      tx: r.tx,
    })),
  ].sort((a, b) => b.ts - a.ts)

  return (
    <div className="border-2 border-border">
      <div className="flex items-center justify-between border-b-2 border-border px-5 py-2.5">
        <span className="text-[11px] uppercase tracking-widest">{`AGENT THOUGHTS // ${cards.length} ENTRIES`}</span>
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="h-2 w-2 animate-blink bg-accent" />
          ICARUS · DAEDALUS
        </span>
      </div>
      {cards.length === 0 && (
        <div className="px-5 py-12 text-center text-xs text-muted-foreground">
          NO DECISIONS YET — ICARUS LOGS A THOUGHT EVERY TICK.
        </div>
      )}
      {cards.map((c) =>
        c.kind === "icarus" ? <IcarusCard key={`i-${c.d.n}`} d={c.d} /> : <DaedalusCard key={`d-${c.tx}`} score={c.score} verdict={c.verdict} tx={c.tx} ts={c.ts} />,
      )}
    </div>
  )
}

function IcarusCard({ d }: { d: Decision }) {
  const rebalance = d.action === "REBALANCE"
  const best = [...(d.apys ?? [])].sort((a: Apy, b: Apy) => b.apy - a.apy)[0]?.protocol
  return (
    <div className="border-b border-border px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="shrink-0 border border-[var(--accent-color)]/50 px-2 py-1 text-[9px] uppercase tracking-wider text-[var(--accent-color)]">ICARUS</span>
        <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">#{d.n}</span>
        <span className={`shrink-0 border px-2 py-1 text-[9px] uppercase tracking-wider ${rebalance ? "border-accent text-accent" : "border-border text-muted-foreground"}`}>{d.action}</span>
        {rebalance && <span className="shrink-0 text-[10px] uppercase tracking-widest text-accent">{d.amount} · {d.from} → {d.target}</span>}
        <span className="ml-auto shrink-0 border border-border px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">{d.by}</span>
        <span className="hidden shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">{ago(Date.parse(d.ts))}</span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {(d.apys ?? []).map((a) => {
          const isTarget = a.protocol === d.target
          const isBest = a.protocol === best
          return (
            <span key={a.protocol} className={`border px-2 py-1 text-[10px] uppercase tracking-wider ${isTarget ? "border-accent text-accent" : isBest ? "border-foreground text-foreground" : "border-border text-muted-foreground"}`}>
              {a.protocol} {a.apy}%{isTarget ? " ◀" : ""}
            </span>
          )
        })}
      </div>
      {d.reasoning && (
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground"><span className="text-foreground">↳ </span>{d.reasoning}</p>
      )}
      {(d.blobId || d.txDigest) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-widest">
          {d.txDigest && (
            <a href={`${EXPLORER}/tx/${d.txDigest}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">ON-CHAIN TX <ArrowUpRight size={12} /></a>
          )}
          {d.blobId && (
            <a href={`${WALRUS}/${d.blobId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground" title="Decision record on Walrus">WALRUS MEMORY <ArrowUpRight size={12} /></a>
          )}
        </div>
      )}
    </div>
  )
}

function DaedalusCard({ score, verdict, tx, ts }: { score: number; verdict: string; tx: string; ts: number }) {
  return (
    <div className="border-b border-border px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="shrink-0 border border-[#f59e0b]/50 px-2 py-1 text-[9px] uppercase tracking-wider text-[#f59e0b]">DAEDALUS</span>
        <span className="font-pixel text-lg text-accent">{score}</span>
        <span className="shrink-0 text-[9px] uppercase tracking-wider text-muted-foreground">/ 100</span>
        <span className="ml-auto hidden shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">{ago(ts)}</span>
      </div>
      {verdict && <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground"><span className="text-foreground">↳ </span>{verdict}</p>}
      {tx && (
        <div className="mt-2.5 text-[10px] uppercase tracking-widest">
          <a href={`${EXPLORER}/tx/${tx}`} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1 text-muted-foreground hover:text-foreground">ON-CHAIN RATING <ArrowUpRight size={12} /></a>
        </div>
      )}
    </div>
  )
}
