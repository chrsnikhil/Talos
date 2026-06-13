"use client"

import Image from "next/image"
import { ArrowDown, Github, PlayCircle, ArrowUpRight } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const links = [
  { href: "#how", label: "How it works" },
  { href: "#agents", label: "Agents" },
  { href: "#safety", label: "Safety" },
  { href: "#live", label: "Live" },
  { href: "#stack", label: "Built on Sui" },
]

const RULE = "3px solid var(--t-ink)"

export function Hero() {
  const sectionRef = useScrollReveal()

  return (
    <section
      id="home"
      ref={sectionRef}
      className="flex flex-col overflow-hidden"
      style={{ borderBottom: RULE, background: "var(--t-paper)" }}
    >
      {/* ── Top rail: mark · nav · live status · actions ────────── */}
      <div className="flex items-stretch" style={{ borderBottom: RULE, background: "var(--t-paper)" }}>
        <a
          href="#home"
          className="flex items-center gap-1 px-5 md:px-8 py-3.5 text-lg tracking-tight uppercase text-[var(--t-navy)] hover:bg-[var(--t-navy)] hover:text-white transition-colors"
          style={{ borderRight: RULE }}
        >
          <span className="vl-display">TALOS</span>
          <span className="text-[9px] align-super font-sans font-extrabold">®</span>
        </a>

        <nav className="hidden lg:flex items-stretch">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center px-5 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--t-ink)] hover:bg-[var(--t-navy)] hover:text-white transition-colors"
              style={{ borderRight: RULE }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex-1" />

        {/* live status */}
        <div
          className="hidden md:flex items-center gap-2.5 px-5 text-xs font-extrabold uppercase tracking-[0.18em]"
          style={{ borderLeft: RULE, color: "var(--t-ink)" }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "var(--t-orange)" }} />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "var(--t-orange)" }} />
          </span>
          <span className="hidden lg:inline">Live on Sui mainnet</span>
        </div>

        {/* actions — in the header bar */}
        <a
          href="#how"
          className="hidden md:inline-flex items-center gap-2 px-5 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--t-ink)] hover:bg-[var(--t-navy)] hover:text-white transition-colors"
          style={{ borderLeft: RULE }}
        >
          <PlayCircle className="w-4 h-4" /> Watch demo
        </a>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 md:px-6 text-xs font-extrabold uppercase tracking-[0.16em] text-[#11181D] hover:brightness-105 transition-all"
          style={{ borderLeft: RULE, background: "var(--t-red)" }}
        >
          Launch <span className="hidden sm:inline">dashboard</span> <ArrowUpRight className="w-4 h-4" />
        </a>
      </div>

      {/* Mobile nav rail */}
      <nav className="grid grid-cols-5 lg:hidden" style={{ borderBottom: RULE, background: "var(--t-paper)" }}>
        {links.map((link, index) => (
          <a
            key={link.href}
            href={link.href}
            className="py-3 text-center text-[8px] font-extrabold uppercase tracking-wider text-[var(--t-ink)] active:bg-[var(--t-navy)] active:text-white"
            style={{ borderRight: index < links.length - 1 ? RULE : undefined }}
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* ── Hero canvas — the swarm ─────────────────────────────── */}
      <div className="scroll-reveal relative flex-1 min-h-[560px] md:min-h-[82vh] overflow-hidden" style={{ background: "var(--t-paper)" }}>
        {/* z-0 · background — soft spotlight behind the figures */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background: [
              "radial-gradient(130% 120% at 50% 42%, transparent 56%, rgba(16,24,32,0.07) 100%)",
              "radial-gradient(56% 64% at 50% 56%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0) 60%)",
              "radial-gradient(36% 46% at 36% 60%, rgba(181,137,79,0.13) 0%, transparent 64%)",
              "radial-gradient(36% 46% at 64% 60%, rgba(79,117,111,0.13) 0%, transparent 64%)",
            ].join(", "),
          }}
        />

        {/* z-[1] · giant TALOS title behind the figures */}
        <div
          aria-hidden="true"
          className="vl-backdrop-type absolute top-[9%] md:top-[11%] left-1/2 -translate-x-1/2 z-[1] text-[clamp(60px,15vw,230px)]"
          style={{
            WebkitTextStroke: "3px var(--t-ink)",
            color: "transparent",
            paintOrder: "stroke fill",
            textShadow: "0.02em 0.02em 0 rgba(16,24,32,0.16)",
          }}
        >
          TALOS
        </div>

        {/* z-10 · cutout figures, anchored bottom-center */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center pointer-events-none">
          <Image
            src="/hero-cut.png"
            alt="Icarus and Daedalus — the Talos agents"
            width={1672}
            height={941}
            priority
            className="w-[min(94vw,840px)] h-auto object-contain object-bottom select-none drop-shadow-[6px_8px_0_rgba(16,24,32,0.12)]"
          />
        </div>

        {/* z-30 · top kicker */}
        <div className="absolute top-4 md:top-6 left-1/2 -translate-x-1/2 z-30">
          <span className="vl-badge">Sui Overflow 2026 — Agentic Web</span>
        </div>

        {/* z-20 · left rail — ΙΚΑΡΟΣ (red) */}
        <div className="hidden md:flex absolute left-4 lg:left-8 inset-y-0 z-20 flex-col justify-center items-center pointer-events-none">
          <span className="vl-rail-vertical text-[clamp(22px,3vw,46px)] leading-none" style={{ color: "var(--t-red)" }}>
            ΙΚΑΡΟΣ
          </span>
        </div>

        {/* z-20 · right rail — ΔΑΙΔΑΛΟΣ (navy) */}
        <div className="hidden md:flex absolute right-4 lg:right-8 inset-y-0 z-20 flex-col justify-center items-center pointer-events-none">
          <span className="vl-rail-vertical text-[clamp(20px,2.6vw,40px)] leading-none" style={{ color: "var(--t-navy)" }}>
            ΔΑΙΔΑΛΟΣ
          </span>
        </div>

        {/* z-30 · nameplates */}
        <div className="absolute bottom-5 inset-x-4 md:inset-x-12 z-30 flex items-end justify-between gap-3">
          <span
            className="inline-flex flex-col px-4 py-2 text-[#11181D]"
            style={{ background: "var(--t-red)", border: RULE, boxShadow: "5px 5px 0 0 var(--t-ink)" }}
          >
            <span className="vl-display text-lg md:text-2xl leading-none">Icarus</span>
            <span className="text-[9px] md:text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-90 mt-1">
              Executor · chases the yield
            </span>
          </span>
          <span
            className="inline-flex flex-col items-end text-right px-4 py-2 text-white"
            style={{ background: "var(--t-navy)", border: RULE, boxShadow: "5px 5px 0 0 var(--t-ink)" }}
          >
            <span className="vl-display text-lg md:text-2xl leading-none">Daedalus</span>
            <span className="text-[9px] md:text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-90 mt-1">
              Critic · holds the leash
            </span>
          </span>
        </div>
      </div>

      {/* ── Baseline strip ──────────────────────────────────────── */}
      <div
        className="relative z-30 flex items-center justify-between gap-3 px-5 md:px-12 py-3 text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.16em] sm:tracking-[0.22em]"
        style={{ borderTop: RULE, background: "var(--t-paper)", color: "var(--t-ink)" }}
      >
        <a href="#how" className="inline-flex items-center gap-2 hover:opacity-60 transition-opacity">
          <span className="sm:hidden">Scroll</span>
          <span className="hidden sm:inline">Scroll — how it works</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </a>
        <span className="hidden lg:inline" style={{ color: "var(--t-navy)" }}>
          Icarus chases yield · Daedalus watches · the chain holds the leash
        </span>
        <a
          href="https://github.com/chrsnikhil"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:opacity-60 transition-opacity"
        >
          <Github className="w-3.5 h-3.5" />
          Github
        </a>
      </div>
    </section>
  )
}
