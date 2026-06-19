"use client"
/**
 * How Talos works — six-step loop:
 * SENSE → DECIDE → AUTHORIZE → EXECUTE → LOG → RATE
 */
import { motion } from "framer-motion"
import { SectionDivider } from "@/components/talos-dash/section-divider"

const ease = [0.22, 1, 0.36, 1] as const

const ACCENT = "var(--accent-color)"

const STEPS = [
  {
    num: "01",
    label: "SENSE",
    color: "#3b97fb",
    description:
      "Icarus reads live USDC lending APYs from Scallop, Navi, and Kai — plus Sui momentum signals — every cycle.",
    detail: "Venue rates polled · Sui price momentum · raw market data",
  },
  {
    num: "02",
    label: "DECIDE",
    color: "#a855f7",
    description:
      "Groq LLM picks the highest-yield destination. Anti-churn threshold prevents pointless micro-rebalances.",
    detail: "Groq inference · grounded context · churn filter applied",
  },
  {
    num: "03",
    label: "AUTHORIZE",
    color: "#f59e0b",
    description:
      "On-chain Move AgentPolicy gate checks budget ceiling, protocol allowlist, and expiry window before any spend.",
    detail: "Move policy object · abort if out of bounds · owner-revocable",
  },
  {
    num: "04",
    label: "EXECUTE",
    color: "#22c55e",
    description:
      "Atomic Programmable Transaction Block rebalances real USDC from the current venue to the optimal one.",
    detail: "PTB atomic · real USDC · Sui mainnet · no testnet",
  },
  {
    num: "05",
    label: "LOG",
    color: "#14b8a6",
    description:
      "Every decision — including reasoning, venue selection, and policy check — is written to Walrus as a content-addressed blob.",
    detail: "Walrus storage · content-addressed · publicly verifiable",
  },
  {
    num: "06",
    label: "RATE",
    color: "#ec4899",
    description:
      "Daedalus agent independently scores the Icarus decision on-chain, providing a tamper-proof critic rating.",
    detail: "Daedalus critic · on-chain score · avg 88.7/100",
  },
] as const

function StepCard({
  step,
  index,
}: {
  step: (typeof STEPS)[number]
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.07, ease }}
      whileHover={{ y: -3 }}
      className="relative bg-black p-5 lg:p-6 flex flex-col gap-4 transition-colors hover:bg-zinc-950"
      style={{
        boxShadow: `inset 4px 0 0 ${step.color}, inset 0 0 80px ${step.color}08`,
      }}
    >
      {/* Step number + label */}
      <div className="flex items-center gap-3">
        <span
          className="font-pixel text-[10px] tracking-[0.2em]"
          style={{ color: step.color, textShadow: `0 0 10px ${step.color}66` }}
        >
          {step.num}
        </span>
        <div className="h-px flex-1 border-t border-border/30" />
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: step.color, boxShadow: `0 0 6px ${step.color}` }}
        />
      </div>

      {/* Label */}
      <div
        className="font-pixel text-2xl sm:text-3xl leading-none"
        style={{ color: step.color, textShadow: `0 0 20px ${step.color}44` }}
      >
        {step.label}
      </div>

      {/* Description */}
      <p className="text-sm font-mono text-muted-foreground leading-relaxed">
        {step.description}
      </p>

      {/* Detail tag */}
      <div className="text-[9px] font-mono tracking-[0.18em] uppercase text-muted-foreground/60 border-t border-border/20 pt-3">
        {step.detail}
      </div>
    </motion.div>
  )
}

export function HowItWorks() {
  return (
    <section className="w-full px-4 sm:px-6 py-24 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <SectionDivider name="HOW TALOS WORKS" number="002" />

        <h2 className="font-pixel text-4xl sm:text-5xl text-foreground mb-3 mt-4">
          THE AGENT LOOP<span className="text-[var(--accent-color)]">.</span>
          <br />
          SIX STEPS<span className="text-[var(--accent-color)]">.</span>
        </h2>
        <p className="text-sm font-mono text-muted-foreground max-w-2xl mb-12">
          Icarus runs a tight loop: read the market, pick the best venue, pass the
          policy gate, move real funds, log the decision, get graded. Every step
          is on-chain or verifiably stored.
        </p>

        {/* Step cards — 3-col on large screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/30 border-2 border-[var(--accent-color)]/40">
          {STEPS.map((step, i) => (
            <StepCard key={step.num} step={step} index={i} />
          ))}
        </div>

        {/* Flow annotation */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground/60">
          {STEPS.map((s, i) => (
            <span key={s.num} className="flex items-center gap-2">
              <span style={{ color: s.color }}>{s.label}</span>
              {i < STEPS.length - 1 && (
                <span className="text-muted-foreground/30">→</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
