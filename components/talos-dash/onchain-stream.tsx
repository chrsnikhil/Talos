"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { useAgentEvents } from "@/lib/talos-dash/use-agent-events"
import type { AgentEvent } from "@/lib/talos-dash/events"

/**
 * On-chain proof stream — a verifiable subset of the live event feed.
 *
 * Filters events to those carrying a hash you can click and verify on a
 * block explorer. Color-coded by destination chain (SUI or WALRUS) so
 * you can see at a glance what proof is on which chain.
 *
 * Auto-scrolls to the latest entry. Each row is a single anchor that
 * opens the explorer in a new tab.
 */

type ChainCategory = "sui" | "walrus"

interface ChainTag { category: ChainCategory; label: string; color: string; bg: string; border: string }

const CHAINS: Record<ChainCategory, ChainTag> = {
  sui: { category: "sui", label: "SUI", color: "#3b97fb", bg: "rgba(59,151,251,0.10)", border: "rgba(59,151,251,0.40)" },
  walrus: { category: "walrus", label: "WALRUS", color: "#22d3ee", bg: "rgba(34,211,238,0.10)", border: "rgba(34,211,238,0.40)" },
}

function classify(e: AgentEvent): ChainTag | null {
  const url = e.explorer || ""
  if (url.includes("suiscan")) return CHAINS.sui
  if (e.txHash) return CHAINS.sui
  if (url.includes("walrus") || e.blobId) return CHAINS.walrus
  return null
}

function resolveUrl(e: AgentEvent): string | null {
  return e.explorer ?? (e.blobId ? `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${e.blobId}` : null)
}

const FILTERS: { key: "all" | ChainCategory; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "sui", label: "SUI" },
  { key: "walrus", label: "WALRUS" },
]

const AGENT_GLYPH = { icarus: "I", daedalus: "D" } as const
const AGENT_NAME = { icarus: "ICARUS", daedalus: "DAEDALUS" } as const

function shortHash(h: string): string {
  if (h.length < 16) return h
  return `${h.slice(0, 10)}…${h.slice(-6)}`
}

/** Human-readable header per event type. */
function headerFor(type: string): string {
  switch (type) {
    case "REBALANCE":
      return "SUI · REBALANCE TX"
    case "HOLD":
      return "SUI · HOLD DECISION"
    case "SPEND":
      return "SUI · SPEND AUTHORIZED"
    case "RATING":
      return "DAEDALUS · CRITIC RATING"
    case "WALRUS_STORE":
      return "WALRUS · DECISION BLOB STORED"
    case "WALRUS_LOAD":
      return "WALRUS · DECISION BLOB READ"
    default:
      return type.replace(/_/g, " ")
  }
}

/** One-line plain-English description for the card body. */
function describe(type: string, detail: string): string {
  switch (type) {
    case "REBALANCE":
      return `Rebalance executed on-chain via SUI transaction. ${detail}`
    case "WALRUS_STORE":
      return `Decision blob persisted to Walrus with verifiable blob ID. ${detail}`
    case "WALRUS_LOAD":
      return `Decision blob retrieved from Walrus storage. ${detail}`
    case "SPEND":
      return `Spend authorized and executed on-chain. ${detail}`
    case "RATING":
      return `Critic agent rating recorded on-chain. ${detail}`
    default:
      return detail
  }
}

function dedupeKey(e: AgentEvent): string {
  return `${e.timestamp}:${e.agent}:${e.type}:${e.txHash || e.blobId || e.detail.slice(0, 40)}`
}

export function OnchainStream({ bare = false }: { bare?: boolean } = {}) {
  const liveEvents = useAgentEvents(500)
  const [filter, setFilter] = useState<"all" | ChainCategory>("all")

  // Dedupe and sort oldest-first so auto-scroll lands on the latest.
  const allEvents = useMemo(() => {
    const map = new Map<string, AgentEvent>()
    for (const e of liveEvents) map.set(dedupeKey(e), e)
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp)
  }, [liveEvents])

  // Filter to events with on-chain proof
  const tagged = allEvents
    .map((e) => ({ e, tag: classify(e) }))
    .filter(
      (x): x is { e: AgentEvent; tag: ChainTag } =>
        x.tag !== null && (filter === "all" || x.tag.category === filter),
    )

  const counts = {
    all: allEvents.filter((e) => classify(e) !== null).length,
    sui: allEvents.filter((e) => classify(e)?.category === "sui").length,
    walrus: allEvents.filter((e) => classify(e)?.category === "walrus").length,
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [tagged.length])

  const wrapperClass = bare
    ? "relative w-full"
    : "relative w-full border border-[var(--accent-color)]/20 bg-black/60 backdrop-blur-sm p-5"
  const wrapperStyle = bare ? undefined : { boxShadow: "4px 4px 0px 0px var(--accent-color)" }

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent-color)] font-mono font-bold">
          ON-CHAIN PROOF STREAM
        </span>
        <div className="flex-1 border-t border-border min-w-[20px]" />
        <span className="h-1.5 w-1.5 bg-[var(--accent-color)] animate-blink" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          {counts.all} VERIFIABLE
        </span>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTERS.map((f) => {
          const active = filter === f.key
          const count = counts[f.key]
          const tag = f.key !== "all" ? CHAINS[f.key as ChainCategory] : null
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-[10px] font-mono tracking-[0.2em] uppercase px-3 py-1.5 border transition-colors ${
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{
                borderColor: active && tag ? tag.color : active ? "var(--accent-color)" : "rgba(255,255,255,0.15)",
                background: active && tag ? tag.bg : active ? "rgba(234,88,12,0.05)" : "transparent",
                color: active && tag ? tag.color : undefined,
              }}
            >
              {f.label}
              <span className="ml-2 opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* List */}
      <div
        ref={scrollRef}
        className="border border-border/40 bg-black/80 p-3 sm:p-4 h-[34rem] overflow-y-auto no-scrollbar space-y-3"
      >
        {tagged.length === 0 && (
          <div className="text-muted-foreground text-[11px] italic py-12 text-center font-mono">
            no on-chain proofs yet — waiting for cycle execution to produce a tx…
          </div>
        )}
        {tagged.map(({ e, tag }) => {
          const hash = e.txHash || e.blobId || ""
          const isTx = Boolean(e.txHash)
          const hashLabel = isTx ? "TX HASH" : "BLOB ID"
          const displayHash = hash
          const linkUrl = resolveUrl(e)
          const hasLink = Boolean(linkUrl)
          return (
            <motion.a
              key={e.id}
              href={linkUrl ?? undefined}
              target={hasLink ? "_blank" : undefined}
              rel={hasLink ? "noopener noreferrer" : undefined}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              title={hash ? `${isTx ? "TX" : "BLOB"}  ${hash}` : hasLink ? "view on explorer" : "no explorer link for this event"}
              className={`group block border-2 p-4 sm:p-5 transition-all ${hasLink ? "hover:bg-white/[0.03] hover:translate-y-[-1px] cursor-pointer" : "cursor-default opacity-90"}`}
              style={{
                borderColor: tag.border,
                background: tag.bg,
                boxShadow: `3px 3px 0px 0px ${tag.color}33`,
              }}
            >
              {/* Top meta row */}
              <div className="flex items-center gap-3 mb-2.5 flex-wrap">
                <span
                  className="text-[10px] font-mono font-bold tracking-[0.25em] uppercase px-2 py-0.5 border shrink-0"
                  style={{ color: tag.color, borderColor: tag.color }}
                >
                  {tag.label}
                </span>
                <span
                  className="text-foreground font-bold shrink-0 text-base"
                  title={AGENT_NAME[e.agent as keyof typeof AGENT_NAME] ?? e.agent}
                >
                  {AGENT_GLYPH[e.agent as keyof typeof AGENT_GLYPH] ?? e.agent[0].toUpperCase()}
                </span>
                <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
                  {AGENT_NAME[e.agent as keyof typeof AGENT_NAME] ?? e.agent.toUpperCase()}
                </span>
                <span className="flex-1" />
                <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/80 font-mono shrink-0">
                  [{e.time}]
                </span>
              </div>

              {/* Big header — the event type as a human-readable title */}
              <h3
                className="font-mono font-bold text-sm sm:text-base tracking-[0.05em] mb-2"
                style={{ color: tag.color }}
              >
                {headerFor(e.type)}
              </h3>

              {/* Description body */}
              <p className="text-xs sm:text-[13px] font-mono text-foreground/80 leading-relaxed mb-3 break-words">
                {describe(e.type, e.detail)}
              </p>

              {/* Hash / blob id footer */}
              {displayHash && (
                <div className="flex items-center gap-2 pt-2 border-t border-foreground/10">
                  <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-mono shrink-0">
                    {hashLabel}
                  </span>
                  <span
                    className="text-[11px] font-mono truncate flex-1 min-w-0 opacity-80 group-hover:opacity-100 transition-opacity"
                    style={{ color: tag.color }}
                  >
                    {shortHash(displayHash)}
                  </span>
                  {hasLink ? (
                    <span
                      className="shrink-0 flex items-center gap-1 text-[10px] font-mono font-bold tracking-[0.2em] uppercase opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                      style={{ color: tag.color }}
                    >
                      VERIFY
                      <ArrowUpRight size={12} strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span className="shrink-0 text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground/60">
                      NO LINK
                    </span>
                  )}
                </div>
              )}
            </motion.a>
          )
        })}

        {/* Blinking caret */}
        <div className="flex items-center gap-3 pt-2 px-1 font-mono text-[11px]">
          <span className="text-muted-foreground/70">[live]</span>
          <span className="text-[var(--accent-color)]">
            _<span className="animate-blink">|</span>
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-mono tracking-[0.15em] uppercase text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2" style={{ background: CHAINS.sui.color }} />
          SUI · SUISCAN
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2" style={{ background: CHAINS.walrus.color }} />
          WALRUS · BLOB AGGREGATOR
        </span>
        <span className="flex-1" />
        <span>{"// click any row to verify on chain"}</span>
      </div>
    </div>
  )
}
