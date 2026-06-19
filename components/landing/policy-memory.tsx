"use client"
/**
 * PolicyMemory — the trust layer of the landing page.
 *
 * Two-pillar layout (POLICY · MEMORY) telling the Talos story of:
 *   1. On-chain Move AgentPolicy "leash" — budget ceiling, protocol
 *      allowlist, expiry, owner-revocation. Every spend checked on-chain,
 *      violations abort.
 *   2. Walrus decision memory — every decision content-addressed and
 *      stored, publicly verifiable.
 *
 * Uses the same section styling language as the rest of the landing page.
 */
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SectionDivider } from "@/components/talos-dash/section-divider"

const ease = [0.22, 1, 0.36, 1] as const
const POLICY_COLOR = "#f59e0b"
const MEMORY_COLOR = "#14b8a6"
const ACCENT = "var(--accent-color)"

// Animated check phases for policy gate demo
const POLICY_CHECKS = [
  { id: "budget", label: "BUDGET CEILING", detail: "≤ configured USDC limit per tx" },
  { id: "allowlist", label: "PROTOCOL ALLOWLIST", detail: "Scallop / Navi / Kai only" },
  { id: "expiry", label: "EXPIRY WINDOW", detail: "policy not expired on-chain" },
  { id: "owner", label: "OWNER NOT REVOKED", detail: "revocation flag checked" },
] as const

function PolicyPillar() {
  const [activeCheck, setActiveCheck] = useState<number>(0)
  const [passing, setPassing] = useState<boolean>(true)

  // Cycle through checks
  useEffect(() => {
    const id = setInterval(() => {
      setActiveCheck((c) => {
        const next = (c + 1) % POLICY_CHECKS.length
        // Simulate an occasional abort scenario on the last check for drama
        setPassing(next !== POLICY_CHECKS.length - 1 || Math.random() > 0.25)
        return next
      })
    }, 1800)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease }}
      className="relative bg-black p-6 lg:p-8 flex flex-col gap-6 border-2 border-[var(--accent-color)]/40 overflow-hidden"
      style={{ boxShadow: `inset 4px 0 0 ${POLICY_COLOR}, inset 0 0 120px ${POLICY_COLOR}08` }}
    >
      {/* Background glow */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          inset: "-30%",
          background: `radial-gradient(ellipse at 20% 30%, ${POLICY_COLOR}18 0%, transparent 60%)`,
        }}
      />

      {/* Header */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="h-2 w-2"
            style={{ background: POLICY_COLOR, boxShadow: `0 0 8px ${POLICY_COLOR}` }}
          />
          <span
            className="text-[10px] font-mono tracking-[0.25em] uppercase font-bold"
            style={{ color: POLICY_COLOR }}
          >
            ON-CHAIN POLICY
          </span>
        </div>
        <h3
          className="font-pixel text-3xl sm:text-4xl leading-none mt-2"
          style={{ color: POLICY_COLOR, textShadow: `0 0 24px ${POLICY_COLOR}44` }}
        >
          POLICY<br />GATE
        </h3>
        <p className="text-sm font-mono text-muted-foreground leading-relaxed mt-4 max-w-sm">
          Every Icarus spend passes through an on-chain Move{" "}
          <span className="text-foreground font-bold">AgentPolicy</span> object. If
          any check fails, the transaction aborts — no exceptions, no overrides.
        </p>
      </div>

      {/* Live gate simulation */}
      <div className="relative border border-border/30 bg-zinc-950/60 p-4">
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: POLICY_COLOR }}
          />
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground/70">
            GATE REPLAY · LIVE
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {POLICY_CHECKS.map((check, i) => {
            const isActive = i === activeCheck
            const isDone = i < activeCheck
            const isFailed = isActive && !passing

            return (
              <motion.div
                key={check.id}
                className="flex items-center gap-3 py-1.5 px-2"
                style={{
                  background: isActive ? `${POLICY_COLOR}10` : "transparent",
                  borderLeft: isActive ? `2px solid ${POLICY_COLOR}` : "2px solid transparent",
                }}
              >
                {/* Status indicator */}
                <div className="shrink-0 w-4 h-4 flex items-center justify-center">
                  {isDone ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-[10px] font-mono font-bold text-green-400"
                    >
                      ✓
                    </motion.span>
                  ) : isActive ? (
                    isFailed ? (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-[10px] font-mono font-bold text-red-400"
                      >
                        ✗
                      </motion.span>
                    ) : (
                      <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: POLICY_COLOR }}
                      />
                    )
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className="text-[9px] font-mono tracking-[0.18em] uppercase font-bold"
                    style={{ color: isDone ? "#22c55e" : isActive ? POLICY_COLOR : "#52525b" }}
                  >
                    {check.label}
                  </div>
                  <div className="text-[8px] font-mono text-muted-foreground/50 mt-0.5 truncate">
                    {check.detail}
                  </div>
                </div>

                {isDone && (
                  <span className="text-[8px] font-mono text-green-400/70 tracking-wider">
                    PASS
                  </span>
                )}
                {isActive && isFailed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[8px] font-mono text-red-400 tracking-wider font-bold"
                  >
                    ABORT
                  </motion.span>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Result line */}
        <AnimatePresence>
          {activeCheck === POLICY_CHECKS.length - 1 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-3 pt-3 border-t border-border/30 text-[9px] font-mono tracking-[0.2em] uppercase font-bold"
              style={{ color: passing ? "#22c55e" : "#f87171" }}
            >
              {passing ? "→ EXECUTE PTB" : "→ TX ABORTED · POLICY VIOLATED"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Policy properties */}
      <div className="relative grid grid-cols-2 gap-2">
        {[
          { k: "OBJECT TYPE", v: "AgentPolicy" },
          { k: "ENFORCEMENT", v: "On-chain Move" },
          { k: "REVOCATION", v: "Owner-only" },
          { k: "SCOPE", v: "Per-transaction" },
        ].map(({ k, v }) => (
          <div key={k} className="border border-border/20 p-2.5 bg-zinc-950/40">
            <div className="text-[8px] font-mono tracking-[0.2em] uppercase text-muted-foreground/60">{k}</div>
            <div className="text-[10px] font-mono font-bold text-foreground mt-0.5">{v}</div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// Rolling log of fake-but-realistic Walrus memory entries
const LOG_ENTRIES = [
  { hash: "7a3f…e912", venue: "SCALLOP", score: 91, action: "HOLD" },
  { hash: "b2d1…40cc", venue: "NAVI", score: 85, action: "REBALANCE" },
  { hash: "f509…1a3e", venue: "SCALLOP", score: 88, action: "HOLD" },
  { hash: "3c8b…72fd", venue: "KAI", score: 93, action: "REBALANCE" },
  { hash: "9e4a…d067", venue: "SCALLOP", score: 87, action: "HOLD" },
  { hash: "1d7c…55ab", venue: "NAVI", score: 90, action: "HOLD" },
] as const

function MemoryPillar() {
  const [visibleCount, setVisibleCount] = useState<number>(3)

  useEffect(() => {
    const id = setInterval(() => {
      setVisibleCount((c) => (c >= LOG_ENTRIES.length ? 3 : c + 1))
    }, 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease }}
      className="relative bg-black p-6 lg:p-8 flex flex-col gap-6 border-2 border-[var(--accent-color)]/40 overflow-hidden"
      style={{ boxShadow: `inset 4px 0 0 ${MEMORY_COLOR}, inset 0 0 120px ${MEMORY_COLOR}08` }}
    >
      {/* Background glow */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          inset: "-30%",
          background: `radial-gradient(ellipse at 80% 30%, ${MEMORY_COLOR}18 0%, transparent 60%)`,
        }}
      />

      {/* Header */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="h-2 w-2"
            style={{ background: MEMORY_COLOR, boxShadow: `0 0 8px ${MEMORY_COLOR}` }}
          />
          <span
            className="text-[10px] font-mono tracking-[0.25em] uppercase font-bold"
            style={{ color: MEMORY_COLOR }}
          >
            WALRUS MEMORY
          </span>
        </div>
        <h3
          className="font-pixel text-3xl sm:text-4xl leading-none mt-2"
          style={{ color: MEMORY_COLOR, textShadow: `0 0 24px ${MEMORY_COLOR}44` }}
        >
          DECISION<br />LOG
        </h3>
        <p className="text-sm font-mono text-muted-foreground leading-relaxed mt-4 max-w-sm">
          Every Icarus decision — reasoning, venue, policy outcome — is written to{" "}
          <span className="text-foreground font-bold">Walrus</span> as a content-addressed
          blob. Immutable, verifiable, forever.
        </p>
      </div>

      {/* Scrolling log */}
      <div className="relative border border-border/30 bg-zinc-950/60 p-4 flex flex-col gap-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: MEMORY_COLOR }}
          />
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground/70">
            WALRUS BLOB STREAM
          </span>
        </div>

        <AnimatePresence>
          {LOG_ENTRIES.slice(0, visibleCount).map((entry, i) => (
            <motion.div
              key={entry.hash}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease }}
              className="flex items-center gap-3 py-1.5 border-b border-border/10 last:border-0"
            >
              <span
                className="text-[8px] font-mono"
                style={{ color: MEMORY_COLOR, opacity: 0.7 }}
              >
                {entry.hash}
              </span>
              <span className="text-[8px] font-mono tracking-wider text-foreground/80 font-bold">
                {entry.venue}
              </span>
              <span
                className="text-[8px] font-mono ml-auto"
                style={{ color: entry.action === "REBALANCE" ? "#f59e0b" : "#22c55e" }}
              >
                {entry.action}
              </span>
              <span className="text-[8px] font-mono text-muted-foreground/60">
                {entry.score}/100
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Memory properties */}
      <div className="relative grid grid-cols-2 gap-2">
        {[
          { k: "STORAGE", v: "Walrus" },
          { k: "ADDRESSING", v: "Content-hash" },
          { k: "VISIBILITY", v: "Public" },
          { k: "PERMANENCE", v: "Immutable" },
        ].map(({ k, v }) => (
          <div key={k} className="border border-border/20 p-2.5 bg-zinc-950/40">
            <div className="text-[8px] font-mono tracking-[0.2em] uppercase text-muted-foreground/60">{k}</div>
            <div className="text-[10px] font-mono font-bold text-foreground mt-0.5">{v}</div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function PolicyMemory() {
  return (
    <section className="w-full px-4 sm:px-6 py-24 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <SectionDivider name="TRUST INFRASTRUCTURE" number="004" />

        <h2 className="font-pixel text-4xl sm:text-5xl text-foreground mb-3 mt-4">
          LEASH<span className="text-[var(--accent-color)]">.</span>
          <br />
          MEMORY<span className="text-[var(--accent-color)]">.</span>
        </h2>
        <p className="text-sm font-mono text-muted-foreground max-w-2xl mb-12">
          Talos is autonomous, but it is not unchecked. An on-chain policy gate
          enforces hard constraints on every action. Walrus stores every decision
          for anyone to verify — forever.
        </p>

        {/* Two pillars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PolicyPillar />
          <MemoryPillar />
        </div>

        {/* Bottom note */}
        <div className="mt-6 border border-border/20 bg-black/40 p-4 flex items-center gap-4">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="h-2 w-2 shrink-0"
            style={{ background: ACCENT, boxShadow: `0 0 8px var(--accent-color)` }}
          />
          <p className="text-[10px] font-mono text-muted-foreground/80 leading-relaxed">
            The policy object is deployed on Sui mainnet and enforced at the VM level — not in application code.
            Walrus blobs are content-addressed: the hash of the stored data is the address.
            Neither can be silently altered after the fact.
          </p>
        </div>
      </div>
    </section>
  )
}
