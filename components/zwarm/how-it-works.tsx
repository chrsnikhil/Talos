"use client"

import { Radar, BrainCircuit, Zap, Database, Gavel } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const RULE = "3px solid var(--t-ink)"

const STEPS = [
  {
    icon: Radar,
    title: "Sense",
    body: "Icarus reads live USDC supply APYs on Suilend and Scallop — gaslessly, via on-chain dev-inspect — plus its current position and policy budget.",
  },
  {
    icon: BrainCircuit,
    title: "Think",
    body: "It packages position + APYs + constraints into a prompt. An off-chain LLM returns a structured decision: hold, or rebalance to a target protocol — with reasoning.",
  },
  {
    icon: Zap,
    title: "Act",
    body: "On a rebalance it fires one atomic PTB: agent_spend (policy-gated) → redeem → DeepBook swap → supply. All-or-nothing — no half-rebalanced state.",
  },
  {
    icon: Database,
    title: "Record",
    body: "The full decision is written to Walrus as a content-addressed blob; the blobId is recorded on-chain in the emitted event. Verifiable, auditable memory.",
  },
  {
    icon: Gavel,
    title: "Critique",
    body: "Daedalus independently re-evaluates the decision from the same Walrus inputs and writes an on-chain reputation rating. No agent trusts another.",
  },
]

export function HowItWorks() {
  const ref = useScrollReveal()
  return (
    <section
      id="how"
      ref={ref}
      className="relative overflow-hidden py-20 md:py-28"
      style={{ borderBottom: RULE, background: "var(--t-paper)" }}
    >
      <div aria-hidden="true" className="vl-backdrop-type vl-outline absolute -top-2 left-[-0.04em] z-0 text-[clamp(60px,12vw,190px)]">
        Cycle
      </div>
      <span aria-hidden="true" className="vl-rail-vertical hidden lg:block absolute right-6 top-32 z-20 text-3xl" style={{ color: "var(--t-red)" }}>
        ΚΥΚΛΟΣ
      </span>

      <div className="relative z-10 px-5 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="scroll-reveal mb-12 md:mb-16">
            <span className="vl-badge mb-5">Every 30 seconds</span>
            <h2 className="vl-display text-[clamp(40px,7vw,92px)] leading-[0.85] mt-5 mb-4" style={{ color: "var(--t-navy)" }}>
              How it works
            </h2>
            <p className="text-base md:text-lg font-medium leading-relaxed max-w-2xl" style={{ color: "var(--t-text-muted)" }}>
              One autonomous loop, five steps. The LLM decides; Sui enforces, records, and audits.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <article
                  key={step.title}
                  className={`scroll-reveal scroll-delay-${Math.min(i + 1, 6)} vl-card bg-[var(--t-bg-card)] flex flex-col relative overflow-hidden`}
                >
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: RULE, background: "var(--t-navy)" }}>
                    <Icon className="w-5 h-5 text-white" />
                    <span className="vl-display text-2xl leading-none text-white/90">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="p-5 flex-1">
                    <h3 className="vl-display text-xl mb-2" style={{ color: "var(--t-ink)" }}>{step.title}</h3>
                    <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--t-text-muted)" }}>{step.body}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
