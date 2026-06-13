"use client"

import { ArrowUpRight } from "lucide-react"
import Image from "next/image"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const RULE = "3px solid var(--t-ink)"

interface AgentProfile {
  number: string
  name: string
  image: string
  signature: string
  vitals: { label: string; value: string; live?: boolean }[]
  mandate: React.ReactNode
  highlights: { title: string; description: React.ReactNode }[]
  toolsLabel: string
  tools: string[]
}

const agents: AgentProfile[] = [
  {
    number: "Nº I",
    name: "Icarus",
    image: "/i-cut.png",
    signature: "Icarus ’26",
    vitals: [
      { label: "Role", value: "Executor" },
      { label: "Scope", value: "USDC Yield" },
      { label: "Status", value: "Live", live: true },
    ],
    mandate: (
      <>
        Every ~30s I read live USDC lending APYs across Suilend and Scallop, decide whether to hold or rebalance, then
        move real funds through a single atomic PTB that calls <span className="font-bold">agent_policy::authorize_spend</span> —
        bounded by an on-chain policy: capped budget, protocol allowlist, expiry, owner revocation. Then I log the
        reasoning to Walrus.
      </>
    ),
    highlights: [
      {
        title: "Policy-gated execution",
        description: (
          <>
            Real USDC moves only through an atomic <span className="font-bold">PTB</span>, hard-bounded by an on-chain
            Move policy object — over budget or off-allowlist, the whole transaction reverts.
          </>
        ),
      },
      {
        title: "Autonomous & accountable",
        description:
          "Senses yields, decides with an LLM-plus-heuristic strategy, and records every move to Walrus for a fully verifiable trail.",
      },
    ],
    toolsLabel: "On-chain primitives",
    tools: ["agent_spend", "PTB", "Suilend", "Scallop", "DeepBook", "Walrus"],
  },
  {
    number: "Nº Δ",
    name: "Daedalus",
    image: "/d-cut.png",
    signature: "Daedalus ’26",
    vitals: [
      { label: "Role", value: "Critic" },
      { label: "Scope", value: "Reputation" },
      { label: "Status", value: "Live", live: true },
    ],
    mandate: (
      <>
        I watch Icarus from the outside. Reading its on-chain events, I independently re-score every decision and write
        a <span className="font-bold">CriticRating</span> on-chain — building a transparent reputation that currently
        averages 92/100. Two agents, zero trust: no decision goes unjudged.
      </>
    ),
    highlights: [
      {
        title: "Independent scoring",
        description: (
          <>
            Reads Icarus&apos;s <span className="font-bold">events</span> and dry-runs the alternatives, grading each
            decision on its own merits rather than taking the executor at its word.
          </>
        ),
      },
      {
        title: "On-chain reputation",
        description:
          "Each verdict is written as a CriticRating on-chain, compounding into a public, tamper-proof reputation score for the swarm.",
      },
    ],
    toolsLabel: "On-chain primitives",
    tools: ["Events", "Walrus", "CriticRating", "Reputation", "dry-run"],
  },
]

function AgentCard({ agent, delay }: { agent: AgentProfile; delay: string }) {
  return (
    <div
      className={`scroll-reveal ${delay} relative overflow-hidden`}
      style={{ border: RULE, boxShadow: "14px 14px 0 0 var(--t-navy)", background: "var(--t-bg-card)" }}
    >
      {/* paper face */}
      <div className="grid md:grid-cols-[clamp(360px,32%,520px)_1fr]">
        {/* ── Photo panel ─────────────────────────────── */}
        <div className="relative flex flex-col" style={{ background: "var(--t-ink)" }}>
          {/* angled red flash across the top corner */}
          <div
            aria-hidden="true"
            className="absolute -top-2 -left-2 w-44 h-12 z-10 origin-top-left"
            style={{ background: "var(--t-red)", transform: "rotate(-6deg)", borderBottom: "3px solid var(--t-ink)" }}
          />
          <span
            aria-hidden="true"
            className="absolute top-1.5 left-3 z-20 text-[10px] font-extrabold uppercase tracking-[0.22em] text-white origin-top-left"
            style={{ transform: "rotate(-6deg)" }}
          >
            Agent &apos;26
          </span>

          <div className="relative flex-1 min-h-[400px] z-[1]">
            <Image src={agent.image} alt={agent.name} fill priority className="object-cover object-top" />
          </div>

          {/* nameplate — №I + name, same italic display font */}
          <div className="relative z-[2] flex items-baseline gap-3 md:gap-4 px-5 py-4 text-white" style={{ borderTop: RULE, background: "var(--t-ink)" }}>
            <span className="vl-display text-4xl md:text-5xl leading-none">{agent.number}</span>
            <span className="vl-display text-2xl md:text-3xl leading-none whitespace-nowrap">{agent.name}</span>
          </div>
        </div>

        {/* ── Stats panel ─────────────────────────────── */}
        <div className="md:border-l-[3px] border-black flex flex-col">
          {/* vitals header */}
          <div className="grid grid-cols-1 sm:grid-cols-3" style={{ borderBottom: RULE }}>
            {agent.vitals.map((v) => (
              <div
                key={v.label}
                className="px-5 py-4 max-sm:border-b-[3px] sm:border-r-[3px] border-black last:border-0"
                style={{ borderColor: "var(--t-ink)" }}
              >
                <div className="text-[9px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--t-text-muted)" }}>
                  {v.label}
                </div>
                <div className="text-sm md:text-base font-bold flex items-center gap-1.5 mt-1" style={{ color: "var(--t-ink)" }}>
                  {v.live && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "var(--t-orange)" }} />
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--t-orange)" }} />
                    </span>
                  )}
                  {v.value}
                </div>
              </div>
            ))}
          </div>

          {/* mandate */}
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block w-6 h-[3px]" style={{ background: "var(--t-red)", transform: "skewX(-30deg)" }} />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: "var(--t-red)" }}>
                Mandate
              </span>
            </div>
            <p className="text-base md:text-lg leading-relaxed font-medium max-w-3xl" style={{ color: "var(--t-text-muted)" }}>
              {agent.mandate}
            </p>
          </div>

          {/* attribute rows — 2-up to use the width */}
          <div className="grid sm:grid-cols-2" style={{ borderTop: RULE }}>
            {agent.highlights.map((item) => (
              <div
                key={item.title}
                className="flex gap-3 items-start p-6 md:p-7 max-sm:border-b-[3px] sm:border-r-[3px] border-black last:border-0"
                style={{ borderColor: "var(--t-ink)" }}
              >
                <span className="w-4 h-4 mt-1 flex-shrink-0" style={{ background: "var(--t-navy)", transform: "rotate(45deg)", border: "2px solid var(--t-ink)" }} />
                <div>
                  <h3 className="text-base md:text-lg font-bold mb-1" style={{ color: "var(--t-ink)" }}>
                    {item.title}
                  </h3>
                  <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* tools */}
          <div className="p-6 md:px-8 md:py-7" style={{ borderTop: RULE }}>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3" style={{ color: "var(--t-text-muted)" }}>
              {agent.toolsLabel}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {agent.tools.map((tech) => (
                <span key={tech} className="vl-chip">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* footer */}
          <div className="mt-auto flex items-center justify-between gap-4 px-6 md:px-8 py-5" style={{ borderTop: RULE }}>
            <span
              aria-hidden="true"
              className="text-lg italic"
              style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", color: "var(--t-ink)" }}
            >
              {agent.signature}
            </span>
            <a
              href="/dashboard"
              className="vl-btn inline-flex items-center gap-2 px-7 py-3.5 text-xs font-extrabold uppercase tracking-[0.14em] text-white"
              style={{ background: "var(--t-navy)" }}
            >
              <ArrowUpRight className="w-4 h-4" />
              Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Agents() {
  const sectionRef = useScrollReveal()

  return (
    <section
      id="agents"
      ref={sectionRef}
      className="relative overflow-hidden py-20 md:py-28"
      style={{ borderBottom: RULE, background: "var(--t-paper)" }}
    >
      <div aria-hidden="true" className="vl-backdrop-type vl-outline absolute -top-4 right-[-0.04em] z-0 text-[clamp(90px,18vw,300px)]">
        Agents
      </div>
      <span
        aria-hidden="true"
        className="vl-rail-vertical hidden lg:block absolute left-6 top-32 z-20 text-3xl"
        style={{ color: "var(--t-navy)" }}
      >
        二体の自律体
      </span>

      <div className="relative z-10 px-5 md:px-10">
        <div className="max-w-[1560px] mx-auto">
          <div className="scroll-reveal mb-10">
            <h2 className="vl-display text-[clamp(40px,7vw,92px)] leading-[0.85]" style={{ color: "var(--t-navy)" }}>
              The agents
            </h2>
          </div>

          {/* Two profile cards — identical brutalist card design, stacked */}
          <div className="flex flex-col gap-12">
            {agents.map((agent, i) => (
              <AgentCard key={agent.name} agent={agent} delay={`scroll-delay-${i + 1}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
