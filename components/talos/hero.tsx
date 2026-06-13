"use client"

import Image from "next/image"
import { useRef, useState } from "react"
import { ArrowDown, LayoutDashboard, Github } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#agents", label: "Agents" },
  { href: "#live", label: "Live" },
  { href: "#stack", label: "Built on Sui" },
]

const RULE = "3px solid var(--t-ink)"

export function Hero() {
  const sectionRef = useScrollReveal()
  const stageRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)
  const [active, setActive] = useState(false)

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * 2 - 1
    const py = ((e.clientY - r.top) / r.height) * 2 - 1
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      el.style.setProperty("--px", px.toFixed(3))
      el.style.setProperty("--py", py.toFixed(3))
    })
  }

  const resetStage = () => {
    setActive(false)
    const el = stageRef.current
    if (el) {
      el.style.setProperty("--px", "0")
      el.style.setProperty("--py", "0")
    }
  }

  return (
    <section
      id="home"
      ref={sectionRef}
      className="md:min-h-screen flex flex-col overflow-hidden"
      style={{ borderBottom: RULE, background: "var(--t-paper)" }}
    >
      {/* ── Top rail: mark · nav · availability status ──────────── */}
      <div className="flex items-stretch" style={{ borderBottom: RULE, background: "var(--t-paper)" }}>
        <a
          href="#home"
          className="flex items-center gap-1 px-5 md:px-8 py-3.5 text-lg tracking-tight uppercase text-[var(--t-navy)] hover:bg-[var(--t-navy)] hover:text-white transition-colors"
          style={{ borderRight: RULE }}
        >
          <span className="vl-display">TALOS</span>
          <span className="text-[9px] align-super font-sans font-extrabold">®</span>
        </a>

        <nav className="hidden md:flex items-stretch flex-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center px-7 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--t-ink)] hover:bg-[var(--t-navy)] hover:text-white transition-colors"
              style={{ borderRight: RULE }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex-1 md:flex-none" />

        <div
          className="flex items-center gap-2.5 px-5 md:px-8 text-xs font-extrabold uppercase tracking-[0.18em]"
          style={{ borderLeft: RULE, color: "var(--t-ink)" }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ background: "var(--t-orange)" }}
            ></span>
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ background: "var(--t-orange)" }}
            ></span>
          </span>
          <span className="hidden sm:inline">Live on Sui mainnet</span>
          <span className="sm:hidden">Live</span>
        </div>
      </div>

      {/* Mobile nav rail */}
      <nav className="grid grid-cols-4 md:hidden" style={{ borderBottom: RULE, background: "var(--t-paper)" }}>
        {links.map((link, index) => (
          <a
            key={link.href}
            href={link.href}
            className="py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-[var(--t-ink)] active:bg-[var(--t-navy)] active:text-white"
            style={{ borderRight: index < links.length - 1 ? RULE : undefined }}
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* ── Cover stage ──────────────────────────────────────────── */}
      <div
        ref={stageRef}
        data-active={active}
        onMouseEnter={() => setActive(true)}
        onMouseMove={handleMove}
        onMouseLeave={resetStage}
        className="hero-stage scroll-reveal relative flex-1 min-h-[500px] md:min-h-[560px]"
      >
        {/* z-10 · character art — cutout with subtle silver sheen */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center pointer-events-none">
          <div className="hero-figure relative sm:w-[120vw] lg:w-[min(104vw,1120px)]">
            {/* mobile portrait */}
            <Image
              src="/hero-cut.png"
              alt="Icarus and Daedalus"
              width={1086}
              height={1448}
              priority
              className="block sm:hidden w-[78vw] max-w-[380px] h-auto object-contain object-bottom select-none drop-shadow-[6px_8px_0_rgba(16,24,32,0.10)]"
            />
            {/* desktop landscape */}
            <Image
              src="/hero-cut.png"
              alt="Icarus and Daedalus"
              width={1672}
              height={941}
              priority
              className="hidden sm:block w-full h-auto object-contain object-bottom select-none drop-shadow-[6px_8px_0_rgba(16,24,32,0.10)]"
            />
            <div className="hero-sheen absolute inset-0" aria-hidden="true" />
          </div>
        </div>

        {/* z-0 · giant logotype behind the character */}
        <div
          aria-hidden="true"
          className="vl-backdrop-type absolute top-7 md:top-4 left-1/2 -translate-x-1/2 z-0 text-[clamp(110px,27vw,460px)]"
          style={{ WebkitTextStroke: "3px var(--t-ink)", paintOrder: "stroke fill", textShadow: "0.022em 0.022em 0 rgba(16,24,32,0.2)" }}
        >
          TALOS
        </div>

        {/* z-20 · left rail: red Greek — Icarus the executor */}
        <div className="hidden md:flex absolute left-6 lg:left-10 top-6 bottom-6 z-20 flex-col justify-between items-center pointer-events-none">
          <span
            aria-hidden="true"
            className="vl-rail-vertical text-[clamp(40px,5.5vw,84px)] leading-none"
            style={{ color: "var(--t-red)" }}
          >
            ΙΚΑΡΟΣ
          </span>
          <span
            aria-hidden="true"
            className="vl-rail-vertical text-sm lg:text-base"
            style={{ color: "var(--t-red)" }}
          >
            EXECUTOR
          </span>
        </div>

        {/* z-20 · right rail: navy Greek + TALOS seal — Daedalus the critic */}
        <div className="hidden md:flex absolute right-6 lg:right-10 top-6 bottom-6 z-20 flex-col items-center gap-6">
          <span
            aria-hidden="true"
            className="vl-rail-vertical flex-1 text-[clamp(30px,4.2vw,64px)] leading-none pointer-events-none"
            style={{ color: "var(--t-navy)" }}
          >
            ΔΑΙΔΑΛΟΣ
          </span>

          {/* TALOS embroidered seal */}
          <div className="vl-seal w-[78px] lg:w-24 shrink-0 drop-shadow-[4px_4px_0_var(--t-navy)]">
            <Image
              src="/patch.png"
              alt="Talos seal"
              width={1254}
              height={1254}
              className="w-full h-auto rounded-full select-none"
            />
          </div>
        </div>

        {/* mobile kicker (rails collapse) */}
        <div className="md:hidden absolute top-3 inset-x-0 z-20 flex justify-center gap-3 text-[11px] font-black pointer-events-none">
          <span aria-hidden="true" style={{ color: "var(--t-red)", fontFamily: "var(--t-font-jp)" }}>
            ΙΚΑΡΟΣ
          </span>
          <span aria-hidden="true" style={{ color: "var(--t-navy)", fontFamily: "var(--t-font-jp)" }}>
            ΔΑΙΔΑΛΟΣ
          </span>
        </div>

        {/* z-20 · signature, bottom-right like the artist's mark */}
        <span
          aria-hidden="true"
          className="absolute bottom-3 right-5 md:right-32 lg:right-40 z-20 text-lg md:text-xl italic pointer-events-none"
          style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", color: "var(--t-ink)" }}
        >
          ΤΑΛΩΣ &rsquo;26
        </span>

        {/* semantic heading for a11y / SEO */}
        <h1 className="sr-only">Talos — autonomous DeFi agents on Sui</h1>
      </div>

      {/* ── Baseline strip ───────────────────────────────────────── */}
      <div
        className="relative z-30 flex items-center justify-between gap-3 px-5 md:px-12 py-3 text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.16em] sm:tracking-[0.22em]"
        style={{ borderTop: RULE, background: "var(--t-paper)", color: "var(--t-ink)" }}
      >
        <a href="#how-it-works" className="inline-flex items-center gap-2 hover:opacity-60 transition-opacity">
          <span className="sm:hidden">Scroll</span>
          <span className="hidden sm:inline">Scroll to see how it works</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </a>
        <span className="hidden lg:inline" style={{ color: "var(--t-navy)" }}>
          Sui Overflow 2026 &middot; Agentic Web
        </span>
        <span className="flex items-center gap-4">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 hover:opacity-60 transition-opacity"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Launch dashboard
          </a>
          <a
            href="https://github.com/chrsnikhil"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:opacity-60 transition-opacity"
          >
            <Github className="w-3.5 h-3.5" />
            Github
          </a>
        </span>
      </div>
    </section>
  )
}
