"use client"

import { Radar, BrainCircuit, Zap, Database, Gavel, ArrowUpRight, Globe, RefreshCw } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const RULE = "3px solid var(--t-ink)"

interface Step {
  id: string
  name: string
  accent: string
  icon: React.ReactNode
  description: string
  tags: string[]
  cells: { label: string; value: React.ReactNode }[]
}

const steps: Step[] = [
  {
    id: "sense",
    name: "Sense",
    accent: "#C68A2A",
    icon: <Radar className="w-4 h-4" />,
    description:
      "Icarus reads live USDC lending APYs from Suilend and Scallop, then loads the on-chain Move policy object — its capped budget, protocol allowlist, and expiry.",
    tags: ["Suilend", "Scallop", "Policy"],
    cells: [
      { label: "Cadence", value: "~30s" },
      { label: "Source", value: "Live" },
      { label: "On-chain", value: "✓" },
      { label: "Reads", value: "APY" },
    ],
  },
  {
    id: "think",
    name: "Think",
    accent: "#C68A2A",
    icon: <BrainCircuit className="w-4 h-4" />,
    description:
      "An LLM-plus-heuristic strategy weighs current yields against the active position and decides whether to hold or rebalance — always within policy bounds.",
    tags: ["LLM", "Heuristic", "Bounded"],
    cells: [
      { label: "Decision", value: "Hold/Move" },
      { label: "Bounded", value: "✓" },
      { label: "Latency", value: "<1s" },
      { label: "Trust", value: "Zero" },
    ],
  },
  {
    id: "act",
    name: "Act",
    accent: "#C68A2A",
    icon: <Zap className="w-4 h-4" />,
    description:
      "If rebalancing, Icarus fires a single atomic PTB that calls agent_policy::authorize_spend on-chain, moving real USDC under the policy's hard limits or reverting whole.",
    tags: ["PTB", "authorize_spend", "USDC"],
    cells: [
      { label: "Atomic", value: "✓" },
      { label: "Gated", value: "Policy" },
      { label: "Asset", value: "USDC" },
      { label: "Revoke", value: "Owner" },
    ],
  },
  {
    id: "record",
    name: "Record",
    accent: "#C68A2A",
    icon: <Database className="w-4 h-4" />,
    description:
      "Every decision — the inputs, the rationale, and the resulting action — is written to Walrus as a durable, verifiable record of why the agent moved.",
    tags: ["Walrus", "Verifiable", "Log"],
    cells: [
      { label: "Store", value: "Walrus" },
      { label: "Durable", value: "✓" },
      { label: "Public", value: "✓" },
      { label: "Audit", value: "Full" },
    ],
  },
  {
    id: "critique",
    name: "Critique",
    accent: "#1F9E8E",
    icon: <Gavel className="w-4 h-4" />,
    description:
      "Daedalus reads Icarus's on-chain events, independently scores each decision, and writes a CriticRating on-chain — building a transparent reputation, averaging 92/100.",
    tags: ["Events", "CriticRating", "Reputation"],
    cells: [
      { label: "Critic", value: "Daedalus" },
      { label: "On-chain", value: "✓" },
      { label: "Avg", value: "92/100" },
      { label: "Independent", value: "✓" },
    ],
  },
]

function BoxScoreCell({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-2.5 px-1 text-center"
      style={{ borderRight: last ? undefined : RULE }}
    >
      <span className="text-[8px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--t-text-muted)" }}>
        {label}
      </span>
      <span
        className="text-sm font-bold mt-0.5 flex items-center gap-1"
        style={{ fontFamily: "var(--t-font-mono)", color: "var(--t-ink)" }}
      >
        {children}
      </span>
    </div>
  )
}

export function HowItWorks() {
  const sectionRef = useScrollReveal()

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative overflow-hidden py-20 md:py-28"
      style={{ borderBottom: RULE, background: "var(--t-paper)" }}
    >
      {/* backdrop word */}
      <div aria-hidden="true" className="vl-backdrop-type vl-outline absolute -top-2 right-[-0.04em] z-0 text-[clamp(60px,11vw,180px)]">
        Cycle
      </div>
      {/* right rail */}
      <span
        aria-hidden="true"
        className="vl-rail-vertical hidden lg:block absolute right-6 top-32 z-20 text-3xl"
        style={{ color: "var(--t-red)" }}
      >
        自律機関
      </span>

      <div className="relative z-10 px-5 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="scroll-reveal mb-12 md:mb-16">
            <h2 className="vl-display text-[clamp(40px,7vw,92px)] leading-[0.85] mb-4" style={{ color: "var(--t-navy)" }}>
              How it works
            </h2>
            <p className="text-base md:text-lg font-medium leading-relaxed max-w-2xl" style={{ color: "var(--t-text-muted)" }}>
              The Icarus decision cycle — sense, think, act, record — and Daedalus, watching every move.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
            {steps.map((step, index) => {
              const delayClass = `scroll-delay-${Math.min(index + 1, 6)}`
              return (
                <article
                  key={step.id}
                  className={`scroll-reveal ${delayClass} vl-card bg-white flex flex-col h-full min-h-[340px] relative overflow-hidden`}
                  style={{ borderRadius: "var(--t-border-radius)" }}
                >
                  {/* accent stripe */}
                  <div aria-hidden="true" className="h-1.5 w-full" style={{ background: step.accent }} />

                  {/* big solid step number filling the body */}
                  <span
                    aria-hidden="true"
                    className="vl-display absolute -bottom-12 right-1 text-[190px] leading-none select-none pointer-events-none"
                    style={{ color: "var(--t-navy)", opacity: 0.09 }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  {/* header bar — navy */}
                  <div className="flex items-stretch" style={{ borderBottom: RULE, background: "var(--t-navy)" }}>
                    <h3
                      className="vl-display flex-1 flex items-center px-4 py-3 text-lg leading-none line-clamp-1 text-white"
                      title={step.name}
                    >
                      {step.name}
                    </h3>
                    <span
                      className="flex items-center justify-center px-3 text-white"
                      style={{ borderLeft: "3px solid var(--t-paper)" }}
                      title={step.name}
                    >
                      {step.icon}
                    </span>
                    <span
                      className="group/link flex items-center justify-center px-3 text-white"
                      style={{ borderLeft: "3px solid var(--t-paper)" }}
                      title="Step"
                    >
                      <ArrowUpRight className="w-4 h-4 transition-transform duration-500 group-hover/link:rotate-45" />
                    </span>
                  </div>

                  {/* body */}
                  <div className="p-5 flex-1 relative z-10">
                    <p className="text-sm leading-relaxed font-medium mb-4 line-clamp-3" style={{ color: "var(--t-text-muted)" }}>
                      {step.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {step.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em]"
                          style={{ border: "2px solid var(--t-ink)", color: "var(--t-ink)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* box-score footer */}
                  <div className="grid grid-cols-4 relative z-10" style={{ borderTop: RULE }}>
                    {step.cells.map((cell, ci) => (
                      <BoxScoreCell key={cell.label} label={cell.label} last={ci === step.cells.length - 1}>
                        {cell.value}
                      </BoxScoreCell>
                    ))}
                  </div>
                </article>
              )
            })}

            {/* LOOP card */}
            <article
              className="scroll-reveal scroll-delay-6 vl-card flex flex-col items-center justify-center text-center p-8 min-h-[340px] relative overflow-hidden"
              style={{ borderRadius: "var(--t-border-radius)", background: "var(--t-navy)" }}
            >
              <div className="absolute inset-3 border-2 border-white/70 pointer-events-none" />
              <span className="vl-display text-6xl mb-3 leading-none text-white">LOOP</span>
              <h3 className="text-xl font-bold mb-2 text-white">Two agents, zero trust</h3>
              <p className="text-sm font-medium mb-6 text-white/80 max-w-[260px]">
                The cycle repeats every ~30s on Sui testnet — fully autonomous, fully on-chain.
              </p>
              <a
                href="/dashboard"
                className="vl-btn inline-flex items-center gap-2 px-7 py-3.5 text-sm font-extrabold uppercase tracking-[0.14em] text-white"
                style={{ background: "var(--t-red)", borderColor: "var(--t-paper)" }}
              >
                <Globe className="w-4 h-4" /> Live dashboard
              </a>
            </article>
          </div>

          <div className="scroll-reveal mt-12 flex justify-center">
            <a
              href="https://github.com/chrsnikhil"
              target="_blank"
              rel="noopener noreferrer"
              className="vl-btn inline-flex items-center gap-2 px-8 py-4 text-sm font-extrabold uppercase tracking-[0.14em]"
              style={{ background: "var(--t-bg-card)", color: "var(--t-ink)" }}
            >
              <RefreshCw className="w-5 h-5" />
              See the source
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
