"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, RefreshCw } from "lucide-react"

const EXPLORER = "https://suiscan.xyz/mainnet"

interface Position { venue: string; label: string; amountUsd: number; kind: string }
interface Portfolio {
  address: string
  totalUsd: number
  positions: Position[]
  currentVenue: string
  blendedApy: number | null
  lastRebalance: { from: string; to: string; amount: number; ts: string; txDigest?: string } | null
  history: Array<{ ts: number; from: string; to: string; txDigest?: string }>
  error?: string
}

const trunc = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—")
function ago(ms: number) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export function PortfolioPanel() {
  const [p, setP] = useState<Portfolio | null>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch("/api/talos/portfolio", { cache: "no-store" })
      const data = await r.json()
      setP(data)
    } catch {
      /* keep last good */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 90_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="space-y-8">
      <div className="border-2 border-border">
        <div className="flex items-center justify-between border-b-2 border-border px-5 py-2.5">
          <span className="text-[11px] uppercase tracking-widest">PORTFOLIO // SUI MAINNET · LIVE</span>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-40">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> REFRESH
          </button>
        </div>

        {p?.error && (
          <div className="border-b-2 border-destructive/40 bg-destructive/10 px-5 py-3 text-xs text-destructive">ERR // {p.error}</div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 [&>*]:border-b-2 [&>*]:border-r-2 [&>*]:border-border">
          <div className="px-5 py-6">
            <div className="font-pixel text-3xl text-accent">{p ? `$${p.totalUsd}` : "—"}</div>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">TOTAL VALUE</div>
          </div>
          <div className="px-5 py-6">
            <div className="font-pixel text-3xl">{p?.currentVenue ?? "—"}</div>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">CURRENT VENUE</div>
          </div>
          <div className="px-5 py-6">
            <div className="font-pixel text-3xl text-accent">{p?.blendedApy != null ? `${p.blendedApy}%` : "—"}</div>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">CURRENT APY</div>
          </div>
          <div className="px-5 py-6">
            <div className="font-mono text-sm text-foreground break-all">{trunc(p?.address)}</div>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">AGENT WALLET</div>
          </div>
        </div>
      </div>

      <div className="border-2 border-border">
        <div className="border-b-2 border-border px-5 py-2.5 text-[11px] uppercase tracking-widest">POSITIONS</div>
        {(p?.positions ?? []).map((pos) => (
          <div key={pos.venue} className="flex items-center gap-4 border-b border-border px-5 py-3">
            <span className="shrink-0 border border-border px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">{pos.kind}</span>
            <span className="flex-1 text-xs text-foreground">{pos.label}</span>
            <span className="font-mono text-sm text-accent">${pos.amountUsd}</span>
          </div>
        ))}
        {(!p || p.positions.length === 0) && <div className="px-5 py-12 text-center text-xs text-muted-foreground">NO POSITIONS.</div>}
      </div>

      <div className="border-2 border-border">
        <div className="border-b-2 border-border px-5 py-2.5 text-[11px] uppercase tracking-widest">REBALANCE HISTORY</div>
        {(p?.history ?? []).map((h, i) => (
          <div key={`${h.txDigest}-${i}`} className="flex items-center gap-4 border-b border-border px-5 py-3">
            <span className="flex-1 truncate text-xs text-muted-foreground">→ {h.to}</span>
            <span className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">{ago(h.ts)}</span>
            {h.txDigest && (
              <a href={`${EXPLORER}/tx/${h.txDigest}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><ArrowUpRight size={14} /></a>
            )}
          </div>
        ))}
        {(!p || p.history.length === 0) && <div className="px-5 py-12 text-center text-xs text-muted-foreground">NO REBALANCES YET.</div>}
      </div>
    </div>
  )
}
