"use client"

import { FileText } from "lucide-react"
import Image from "next/image"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const experiences = [
  {
    period: "2026",
    org: "ETHGlobal",
    title: "Open Agents — Winner",
    description:
      "Won for ZW.ARM — a swarm of autonomous agents that manage your funds and consistently deliver better yield than the market.",
    icon: "https://github.com/ethglobal.png",
    result: "W",
  },
  {
    period: "2026",
    org: "ETHGlobal",
    title: "HackMoney — Winner",
    description:
      "Won for building a Web3-native cybersecurity protocol that mirrors Cloudflare — edge protection and threat mitigation for decentralized apps.",
    icon: "https://github.com/ethglobal.png",
    result: "W",
  },
  {
    period: "Nov 2025",
    org: "X Spaces",
    title: "ViVault Presentation",
    description:
      "Presented ViVault to Vincent Stakeholders on X Spaces. Demonstrated our in-house volatility index and asset rebalancing strategy to 500+ listeners.",
    icon: "https://img.icons8.com/ios-filled/500/twitterx--v1.png",
    result: "W",
  },
  {
    period: "Oct 2025",
    org: "ETH Online",
    title: "Best Vincent App — Winner",
    description:
      "Won Best Vincent App for ViVault, an automated asset rebalancing system powered by our proprietary volatility index. Optimized for risk-adjusted returns.",
    icon: "https://github.com/ethglobal.png",
    result: "W",
  },
  {
    period: "Sep 2025",
    org: "ETH New Delhi",
    title: "Best Use of World Mini Kit — Winner",
    description:
      "Won for building a decentralized Airbnb platform. Enabled gasless authentication and verifiable identity for hosts and guests.",
    icon: "https://github.com/ethglobal.png",
    result: "W",
  },
  {
    period: "May 2025",
    org: "Google",
    title: "Advanced Data Analytics",
    description:
      "Completed the rigorous certification covering Python, SQL, Tableau, and Machine Learning. Analyzed blockchain datasets to predict DeFi market trends.",
    icon: "https://img.icons8.com/color/480/google-logo.png",
    result: "CERT",
  },
]

const RULE = "3px solid var(--t-ink)"
const PAPER = "rgba(251,249,244,"
const ROWLINE = "2px solid color-mix(in srgb, var(--t-ink) 12%, transparent)"

function Row({ exp }: { exp: (typeof experiences)[number] }) {
  const isWin = exp.result === "W"
  return (
    <div className="flex items-center gap-4 md:gap-5 px-6 md:px-8 py-6" style={{ borderBottom: ROWLINE }}>
      <span
        className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-white overflow-hidden"
        style={{ border: "2px solid var(--t-ink)" }}
      >
        <Image
          src={exp.icon || "/placeholder.svg"}
          alt=""
          width={48}
          height={48}
          className="w-7 h-7 object-contain"
        />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] mb-1" style={{ color: "var(--t-navy)" }}>
          {exp.period} · {exp.org}
        </div>
        <h3 className="text-base md:text-lg font-bold leading-tight mb-1" style={{ color: "var(--t-ink)" }}>
          {exp.title}
        </h3>
        <p className="text-xs md:text-sm leading-relaxed" style={{ color: "var(--t-text-muted)" }}>
          {exp.description}
        </p>
      </div>
      <span
        className="vl-display text-sm leading-none px-2.5 py-1.5 shrink-0 text-white self-start"
        style={isWin ? { background: "var(--t-red)" } : { border: "2px solid var(--t-navy)", color: "var(--t-navy)" }}
      >
        {exp.result}
      </span>
    </div>
  )
}

function ScrollList() {
  return (
    <div className="vl-marquee-y">
      <div>
        {experiences.map((exp, i) => (
          <Row key={`a-${i}`} exp={exp} />
        ))}
      </div>
      <div className="vl-marquee-dup" aria-hidden="true">
        {experiences.map((exp, i) => (
          <Row key={`b-${i}`} exp={exp} />
        ))}
      </div>
    </div>
  )
}

export function ExperienceSection() {
  const sectionRef = useScrollReveal()

  return (
    <section
      id="achievements"
      ref={sectionRef}
      className="relative overflow-hidden lg:min-h-[700px]"
      style={{ background: "var(--t-navy)", borderBottom: RULE }}
    >
      <span
        aria-hidden="true"
        className="vl-rail-vertical hidden lg:block absolute left-6 top-10 z-20 text-3xl"
        style={{ color: "var(--t-paper)" }}
      >
        戦績
      </span>

      {/* outline echo — bottom-right, close to (but not touching) the card border */}
      <span
        aria-hidden="true"
        className="vl-display hidden lg:block pointer-events-none select-none absolute bottom-2 lg:right-[53%] xl:right-[55%] z-0 leading-none whitespace-nowrap text-[clamp(48px,5.5vw,92px)]"
        style={{ color: "transparent", WebkitTextStroke: "2px rgba(251,249,244,0.18)" }}
      >
        Achievements
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
              Track Record
            </div>
            <h2 className="vl-display text-[clamp(34px,3.8vw,52px)] leading-[0.9] tracking-[-0.01em] mb-5" style={{ color: "var(--t-paper)" }}>
              Achievements
            </h2>
            <p className="leading-relaxed text-sm md:text-base max-w-md mb-8" style={{ color: `${PAPER}0.72)` }}>
              Four ETHGlobal wins and counting. A track record of building, shipping, and securing decentralized
              applications — from hackathon podiums to production protocols.
            </p>

            {/* 4× banner — full row */}
            <div className="inline-flex items-stretch mb-5" style={{ border: "3px solid var(--t-paper)" }}>
              <div className="flex flex-col items-center justify-center px-7 py-3" style={{ background: "var(--t-red)", borderRight: "3px solid var(--t-paper)" }}>
                <span className="vl-display text-5xl md:text-6xl leading-none text-white">4×</span>
              </div>
              <div className="flex items-center px-5" style={{ background: "var(--t-red)" }}>
                <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-white leading-tight">
                  ETHGlobal
                  <br />
                  Winner
                </span>
              </div>
            </div>

            <div>
              <a href="/Chris%20Nikhil%20Resume.pdf" download="Chris Nikhil Resume.pdf" className="inline-block">
                <span
                  className="vl-btn inline-flex items-center justify-center gap-2 py-4 px-7 text-sm font-extrabold uppercase tracking-[0.14em]"
                  style={{ background: "var(--t-paper)", color: "var(--t-ink)", borderColor: "var(--t-paper)", boxShadow: "6px 6px 0 0 var(--t-red)" }}
                >
                  <FileText className="w-4 h-4" />
                  See full resume
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
