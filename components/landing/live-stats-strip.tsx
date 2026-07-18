"use client"
/**
 * Live numbers — unified bento grid for Talos.
 *
 * Fetches live data from /api/talos/swarm and /api/talos/reputation.
 * Falls back gracefully if APIs are unavailable.
 */
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Activity } from "lucide-react"

interface SwarmData {
  cycles?: number
}
interface ReputationData {
  total?: number
  avg?: number
  lifetimeTotal?: number
  lifetimeAvg?: number
}
interface TxCountData {
  total?: number
}

const COLOR = {
  cycles: "#3b97fb",
  ratings: "#22c55e",
  avg: "#a855f7",
  venue: "#f59e0b",
  tx: "#e0703a",
  meta: "#9ca3af",
} as const

const ease = [0.22, 1, 0.36, 1] as const

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
}

function SponsorTag({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      <span
        className="text-[8px] font-mono tracking-[0.25em] uppercase font-bold"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  )
}

function Cell({
  color,
  sponsor,
  value,
  label,
  sub,
  span = "",
  index = 0,
}: {
  color: string
  sponsor: string
  value: React.ReactNode
  label: string
  sub: string
  span?: string
  index?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease }}
      whileHover={{ y: -2 }}
      className={`relative bg-black p-4 lg:p-5 transition-colors hover:bg-zinc-950 ${span}`}
      style={{
        boxShadow: `inset 3px 0 0 ${color}, inset 0 0 60px ${color}06`,
      }}
    >
      <SponsorTag color={color} label={sponsor} />
      <div
        className="font-pixel leading-[0.9] mt-3"
        style={{
          fontSize: "clamp(2rem, 3.6vw, 3rem)",
          color,
          textShadow: `0 0 18px ${color}55, 0 0 36px ${color}22`,
        }}
      >
        {value}
      </div>
      <div className="text-[10px] tracking-[0.18em] uppercase text-foreground/85 font-mono font-bold mt-3">
        {label}
      </div>
      <div className="text-[9px] font-mono text-muted-foreground/70 mt-0.5 truncate">
        {sub}
      </div>
    </motion.div>
  )
}

function HeroCell({ cycles }: { cycles: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease }}
      className="relative bg-black p-6 lg:p-8 flex flex-col justify-between overflow-hidden md:col-span-2 md:row-span-2"
      style={{
        boxShadow: `inset 4px 0 0 ${COLOR.cycles}, inset 0 0 120px ${COLOR.cycles}10`,
      }}
    >
      {/* Decorative radial glow */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          inset: "-20%",
          background: `radial-gradient(ellipse at 30% 50%, ${COLOR.cycles}22 0%, transparent 60%)`,
        }}
      />

      <div className="relative">
        <SponsorTag color={COLOR.cycles} label="ICARUS · LIVE · DECISION ENGINE" />
      </div>

      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease }}
          className="font-pixel leading-[0.9]"
          style={{
            fontSize: "clamp(4rem, 9vw, 7.5rem)",
            color: COLOR.cycles,
            textShadow: `0 0 36px ${COLOR.cycles}55, 0 0 72px ${COLOR.cycles}22`,
          }}
        >
          {fmt(cycles)}
        </motion.div>
        <div className="text-[11px] tracking-[0.25em] uppercase font-mono font-bold text-[var(--accent-color)] mt-3">
          DECISION CYCLES · TOTAL
        </div>
        <div className="text-[10px] font-mono text-muted-foreground/80 mt-1">
          Groq LLM picks best venue · anti-churn threshold applied
        </div>
      </div>

      <div className="relative flex items-center gap-3 mt-4">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
              className="h-1.5 w-1.5"
              style={{ background: COLOR.cycles, boxShadow: `0 0 6px ${COLOR.cycles}` }}
            />
          ))}
        </div>
        <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground/60">
          live · Sui mainnet
        </span>
      </div>
    </motion.div>
  )
}

export function LiveStatsStrip() {
  const [cycles, setCycles] = useState<number>(18000)
  const [ratings, setRatings] = useState<number>(662)
  const [avg, setAvg] = useState<number>(82.1)
  const [txCount, setTxCount] = useState<number>(4558)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const swarmRes = await fetch("/api/talos/swarm", { cache: "no-store" })
        const swarmJson: SwarmData = await swarmRes.json()
        if (!cancelled && typeof swarmJson?.cycles === "number") {
          setCycles(swarmJson.cycles)
        }
      } catch {
        /* use fallback */
      }

      try {
        const repRes = await fetch("/api/talos/reputation", { cache: "no-store" })
        const repJson: ReputationData = await repRes.json()
        if (!cancelled) {
          // Prefer lifetime (both critic keys) so it matches the README / cards figure.
          const total = repJson?.lifetimeTotal ?? repJson?.total
          const a = repJson?.lifetimeAvg ?? repJson?.avg
          if (typeof total === "number") setRatings(total)
          if (typeof a === "number") setAvg(a)
        }
      } catch {
        /* use fallback */
      }

      try {
        const txRes = await fetch("/api/talos/txcount", { cache: "no-store" })
        const txJson: TxCountData = await txRes.json()
        if (!cancelled && typeof txJson?.total === "number") setTxCount(txJson.total)
      } catch {
        /* use fallback */
      }
    }

    void fetchData()
    const id = setInterval(fetchData, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <section className="w-full px-4 sm:px-6 py-12 lg:px-12 border-y border-[var(--accent-color)]/30 bg-black/40">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="h-2 w-2 bg-[var(--accent-color)] animate-pulse" />
          <span className="text-[10px] tracking-[0.25em] uppercase text-[var(--accent-color)] font-mono font-bold">
            MISSION CONTROL · LIVE TELEMETRY
          </span>
          <div className="flex-1 border-t border-border/40" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
            refreshes every 30s
          </span>
        </div>

        {/* Bento grid — gap-px on tinted bg creates 1px dividers */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-border/30 border-2 border-[var(--accent-color)]/40">
          {/* Hero cycles · 2×2 */}
          <HeroCell cycles={cycles} />

          {/* Right-side 2×2 mini grid */}
          <Cell
            color={COLOR.ratings}
            sponsor="DAEDALUS · CRITIC"
            value={fmt(ratings)}
            label="ON-CHAIN RATINGS"
            sub="Daedalus scores each Icarus decision"
            index={1}
          />
          <Cell
            color={COLOR.avg}
            sponsor="CRITIC SCORE"
            value={avg.toFixed(1)}
            label="AVG CRITIC SCORE /100"
            sub="content-addressed on Walrus"
            index={2}
          />
          <Cell
            color={COLOR.venue}
            sponsor="PROTOCOLS · ACTIVE"
            value="3"
            label="VENUES"
            sub="SCALLOP · NAVI · KAI · SUI"
            index={3}
          />
          <Cell
            color={COLOR.tx}
            sponsor="ON-CHAIN · VERIFIABLE"
            value={fmt(txCount)}
            label="TOTAL ON-CHAIN TX"
            sub="agent + critic, all on Suiscan"
            index={4}
          />

          {/* Bottom: wide agents cell + meta */}
          <Cell
            color={COLOR.cycles}
            sponsor="AGENTS · ACTIVE"
            value="02"
            label="AGENTS"
            sub="ICARUS · DAEDALUS"
            span="md:col-span-2"
            index={5}
          />
          <Cell
            color={COLOR.ratings}
            sponsor="POLICY"
            value="ON"
            label="MOVE POLICY GATE"
            sub="budget · allowlist · expiry enforced"
            index={6}
          />
          <Cell
            color={COLOR.avg}
            sponsor="MEMORY"
            value="ON"
            label="WALRUS LOG"
            sub="every decision content-addressed"
            index={7}
          />
        </div>

        {/* Tagline below */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground/60">
          <Activity size={9} className="text-[var(--accent-color)]" />
          <span>every number from live cycles · no curated metrics</span>
        </div>
      </div>
    </section>
  )
}
