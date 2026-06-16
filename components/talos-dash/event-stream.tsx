"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { BentoCell } from "./bento-cell"
import { useAgentEvents } from "@/lib/talos-dash/use-agent-events"
import type { AgentEvent, AgentId } from "@/lib/talos-dash/events"

const AGENT_META: Record<AgentId, { glyph: string; label: string; color: string }> = {
  icarus: { glyph: "I", label: "ICARUS", color: "var(--accent-color)" },
  daedalus: { glyph: "D", label: "DAEDALUS", color: "#f59e0b" },
}

type FilterKey = "all" | "icarus" | "daedalus"

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "icarus", label: "ICARUS" },
  { key: "daedalus", label: "DAEDALUS" },
]

export function EventStream({ bare = false }: { bare?: boolean } = {}) {
  const events = useAgentEvents(250)
  const [filter, setFilter] = useState<FilterKey>("all")
  const scrollRef = useRef<HTMLDivElement>(null)

  const filtered =
    filter === "all" ? events : events.filter((e) => e.agent === filter)

  // Auto-scroll to bottom on new event
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filtered.length])

  return (
    <BentoCell delay={0} bare={bare} className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent-color)] font-mono font-bold">
          LIVE EVENT STREAM
        </span>
        <div className="flex-1 border-t border-border min-w-[20px]" />
        <span className="h-1.5 w-1.5 bg-[var(--accent-color)] animate-blink" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          {events.length} EVENTS
        </span>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTERS.map((f) => {
          const active = filter === f.key
          const count =
            f.key === "all"
              ? events.length
              : events.filter((e) => e.agent === f.key).length
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-[10px] font-mono tracking-[0.2em] uppercase px-3 py-1.5 border transition-colors ${
                active
                  ? "border-[var(--accent-color)] text-[var(--accent-color)] bg-[var(--accent-color)]/5"
                  : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {f.label}
              <span className="ml-2 opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Log — grows to fill column height (matches voxel scene side-by-side).
          min-h-0 is required so the flex child can shrink past its content
          and let overflow-y-auto kick in. */}
      <div
        ref={scrollRef}
        className="border border-border/40 bg-black/80 p-4 font-mono text-[12px] leading-relaxed space-y-0.5 flex-1 min-h-0 overflow-y-auto no-scrollbar"
      >
        {filtered.length === 0 && (
          <div className="text-muted-foreground text-[11px] italic">
            waiting for events…{" "}
            <span className="text-foreground">the Icarus runtime is starting…</span>
          </div>
        )}
        {filtered.map((e) => {
          const meta = AGENT_META[e.agent]
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-start gap-3 whitespace-pre"
            >
              <span className="text-muted-foreground/70 shrink-0">
                [{e.time}]
              </span>
              <span
                className="font-bold shrink-0 w-4 text-center"
                style={{ color: meta.color }}
                title={meta.label}
              >
                {meta.glyph}
              </span>
              <span className="text-foreground font-bold shrink-0 min-w-[16ch]">
                {e.type.padEnd(16)}
              </span>
              <span className="text-foreground/70 truncate flex-1 min-w-0">
                {e.detail}
              </span>
              {e.explorer && (
                <a
                  href={e.explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={
                    e.txHash
                      ? `tx ${e.txHash}`
                      : e.blobId
                        ? `blob ${e.blobId}`
                        : "view on explorer"
                  }
                  className="shrink-0 text-[var(--accent-color)] hover:text-foreground transition-colors flex items-center gap-0.5"
                >
                  <span className="text-[10px] tracking-widest uppercase">
                    {e.txHash ? "TX" : "BLOB"}
                  </span>
                  <ArrowUpRight size={11} strokeWidth={2} />
                </a>
              )}
            </motion.div>
          )
        })}
        {/* Blinking caret */}
        <div className="flex items-center gap-3 pt-1.5">
          <span className="text-muted-foreground/70">[live]</span>
          <span className="text-[var(--accent-color)]">
            _<span className="animate-blink">|</span>
          </span>
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-3 flex items-center justify-between text-[9px] font-mono tracking-[0.15em] uppercase text-muted-foreground">
        <span>streaming from talos · live</span>
        <span>I icarus · D daedalus</span>
      </div>
    </BentoCell>
  )
}
