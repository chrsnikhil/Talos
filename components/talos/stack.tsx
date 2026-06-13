"use client"

import { ExternalLink } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const pillars = [
  {
    period: "On-chain",
    org: "Move",
    title: "Move policy object",
    description:
      "The leash, enforced on-chain — a compromised agent can't exceed its bounds. Budget cap, protocol allowlist, expiry, and owner revocation live in the agent_policy module.",
    result: "LEASH",
  },
  {
    period: "Atomic",
    org: "Sui",
    title: "Programmable Transaction Blocks",
    description:
      "Atomic redeem→swap→supply. A rebalance either lands whole or not at all — no half-executed positions, no stranded funds between protocols.",
    result: "PTB",
  },
  {
    period: "Verifiable",
    org: "Walrus",
    title: "Walrus agent memory",
    description:
      "Every decision verifiable. Icarus and Daedalus write their reasoning and outcomes to Walrus, so the swarm's memory is auditable rather than trusted.",
    result: "MEM",
  },
  {
    period: "Reputation",
    org: "On-chain",
    title: "On-chain reputation",
    description:
      "Tamper-proof critic ratings. Daedalus scores each of Icarus's moves as a CriticRating object — current average 92/100 — so reputation is earned, not claimed.",
    result: "92",
  },
  {
    period: "Testnet",
    org: "Sui",
    title: "Deployed package",
    description:
      "agent_policy and reputation Move modules are published as a live package on Sui testnet, driving the autonomous loop you see on the dashboard today.",
    result: "LIVE",
  },
  {
    period: "Verified",
    org: "Move",
    title: "11 Move unit tests",
    description:
      "The policy and reputation logic is covered by 11 passing Move unit tests — bounds, revocation, and rating math are checked before a single real USDC moves.",
    result: "11",
  },
]

const RULE = "3px solid var(--t-ink)"
const PAPER = "rgba(251,249,244,"
const ROWLINE = "2px solid color-mix(in srgb, var(--t-ink) 12%, transparent)"

function Row({ pillar }: { pillar: (typeof pillars)[number] }) {
  const isWin = pillar.result === "92"
  return (
    <div className="flex items-center gap-4 md:gap-5 px-6 md:px-8 py-6" style={{ borderBottom: ROWLINE }}>
      <span
        className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-white overflow-hidden vl-display text-sm"
        style={{ border: "2px solid var(--t-ink)", color: "var(--t-navy)" }}
      >
        {pillar.org.slice(0, 2).toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] mb-1" style={{ color: "var(--t-navy)" }}>
          {pillar.period} · {pillar.org}
        </div>
        <h3 className="text-base md:text-lg font-bold leading-tight mb-1" style={{ color: "var(--t-ink)" }}>
          {pillar.title}
        </h3>
        <p className="text-xs md:text-sm leading-relaxed" style={{ color: "var(--t-text-muted)" }}>
          {pillar.description}
        </p>
      </div>
      <span
        className="vl-display text-sm leading-none px-2.5 py-1.5 shrink-0 text-white self-start"
        style={isWin ? { background: "var(--t-red)" } : { border: "2px solid var(--t-navy)", color: "var(--t-navy)" }}
      >
        {pillar.result}
      </span>
    </div>
  )
}

function ScrollList() {
  return (
    <div className="vl-marquee-y">
      <div>
        {pillars.map((pillar, i) => (
          <Row key={`a-${i}`} pillar={pillar} />
        ))}
      </div>
      <div className="vl-marquee-dup" aria-hidden="true">
        {pillars.map((pillar, i) => (
          <Row key={`b-${i}`} pillar={pillar} />
        ))}
      </div>
    </div>
  )
}

export function Stack() {
  const sectionRef = useScrollReveal()

  return (
    <section
      id="stack"
      ref={sectionRef}
      className="relative overflow-hidden lg:min-h-[700px]"
      style={{ background: "var(--t-navy)", borderBottom: RULE }}
    >
      <span
        aria-hidden="true"
        className="vl-rail-vertical hidden lg:block absolute left-6 top-10 z-20 text-3xl"
        style={{ color: "var(--t-paper)" }}
      >
        基盤
      </span>

      {/* outline echo — bottom-right, close to (but not touching) the card border */}
      <span
        aria-hidden="true"
        className="vl-display hidden lg:block pointer-events-none select-none absolute bottom-2 lg:right-[53%] xl:right-[55%] z-0 leading-none whitespace-nowrap text-[clamp(48px,5.5vw,92px)]"
        style={{ color: "transparent", WebkitTextStroke: "2px rgba(251,249,244,0.18)" }}
      >
        Built on Sui
      </span>

      {/* ── Desktop: full-bleed scrolling card pinned to the right ── */}
      <div className="vl-marquee-col hidden lg:block absolute inset-y-0 right-0 w-[52%] xl:w-[54%] overflow-hidden bg-white" style={{ borderLeft: RULE }}>
        <ScrollList />
      </div>

      {/* ── Left content ─────────────────────────────────────────── */}
      <div className="relative z-10 px-5 md:px-12 py-16 lg:py-20 lg:min-h-[700px] flex items-center">
        <div className="scroll-reveal-left relative lg:w-[46%] xl:w-[44%]">
          <div className="relative z-10">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.28em] mb-4" style={{ color: "var(--t-red)" }}>
              Why Sui
            </div>
            <h2 className="vl-display text-[clamp(34px,3.8vw,52px)] leading-[0.9] tracking-[-0.01em] mb-5" style={{ color: "var(--t-paper)" }}>
              Built on Sui
            </h2>
            <p className="leading-relaxed text-sm md:text-base max-w-md mb-8" style={{ color: `${PAPER}0.72)` }}>
              Sui isn&apos;t the brain — it&apos;s what makes trusting an autonomous brain with real money safe. The
              policy object, PTBs, Walrus, and on-chain reputation are the rails the swarm can&apos;t step off.
            </p>

            {/* 92/100 banner — full row */}
            <div className="inline-flex items-stretch mb-5" style={{ border: "3px solid var(--t-paper)" }}>
              <div className="flex flex-col items-center justify-center px-7 py-3" style={{ background: "var(--t-red)", borderRight: "3px solid var(--t-paper)" }}>
                <span className="vl-display text-5xl md:text-6xl leading-none text-white">92</span>
              </div>
              <div className="flex items-center px-5" style={{ background: "var(--t-red)" }}>
                <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-white leading-tight">
                  Avg Critic
                  <br />
                  Rating
                </span>
              </div>
            </div>

            <div>
              <a href="https://github.com/chrsnikhil" target="_blank" rel="noopener noreferrer" className="inline-block">
                <span
                  className="vl-btn inline-flex items-center justify-center gap-2 py-4 px-7 text-sm font-extrabold uppercase tracking-[0.14em]"
                  style={{ background: "var(--t-paper)", color: "var(--t-ink)", borderColor: "var(--t-paper)", boxShadow: "6px 6px 0 0 var(--t-red)" }}
                >
                  <ExternalLink className="w-4 h-4" />
                  View the Move modules
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile: scrolling card below the header ──────────────── */}
      <div className="vl-marquee-col lg:hidden relative z-10 mx-5 mb-16 overflow-hidden bg-white h-[560px]" style={{ border: RULE, boxShadow: "8px 8px 0 0 var(--t-paper)" }}>
        <ScrollList />
      </div>
    </section>
  )
}
