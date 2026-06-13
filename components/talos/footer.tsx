"use client"

import { LayoutDashboard, Github, ArrowUp } from "lucide-react"

const links = [
  { href: "#how-it-works", label: "How it works", external: false },
  { href: "#agents", label: "Agents", external: false },
  { href: "#roadmap", label: "Roadmap", external: false },
  { href: "#live", label: "Live", external: false },
  { href: "#stack", label: "Built on Sui", external: false },
  { href: "/dashboard", label: "Dashboard", external: false },
  { href: "https://github.com/chrsnikhil", label: "GitHub", external: true },
]

const PAPER_RULE = "3px solid var(--t-paper)"

export function Footer() {
  return (
    <footer className="relative overflow-hidden pt-20 pb-8" style={{ background: "var(--t-ink)", color: "var(--t-paper)" }}>
      <span
        aria-hidden="true"
        className="vl-rail-vertical hidden lg:block absolute right-8 top-20 z-20 text-3xl"
        style={{ color: "var(--t-paper)", opacity: 0.5 }}
      >
        ΤΑΛΩΣ
      </span>

      <div className="relative z-10 px-5 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* the closing moment — hero display font */}
          <h2 className="mb-6">
            <span
              className="vl-display block text-[clamp(56px,12vw,150px)] leading-[0.82]"
              style={{ color: "var(--t-red)", WebkitTextStroke: "3px var(--t-paper)", paintOrder: "stroke fill" }}
            >
              Talos
            </span>
          </h2>

          <p className="text-base md:text-lg max-w-xl mx-auto mb-10" style={{ color: "rgba(251,249,244,0.7)" }}>
            Two autonomous agents rebalancing real USDC on Sui — bounded by an on-chain Move policy, rated on-chain, zero trust between them.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-14">
            <a
              href="/dashboard"
              className="vl-btn inline-flex items-center gap-2 px-8 py-4 text-sm md:text-base font-extrabold uppercase tracking-[0.12em] text-white"
              style={{ background: "var(--t-red)", borderColor: "var(--t-paper)" }}
            >
              <LayoutDashboard className="w-5 h-5" />
              Launch dashboard
            </a>

            {/* nav links welded into one bordered strip */}
            <div className="flex flex-wrap items-stretch justify-center" style={{ border: PAPER_RULE, overflow: "hidden" }}>
              {links.map((link, i) => (
                <a
                  key={link.label}
                  href={link.href}
                  {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex items-center px-4 h-14 text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.16em] transition-colors hover:bg-[var(--t-red)]"
                  style={{ borderRight: i < links.length - 1 ? PAPER_RULE : undefined, color: "var(--t-paper)" }}
                >
                  {link.label === "GitHub" ? <Github className="w-4 h-4" /> : link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* baseline strip */}
        <div
          className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 pt-7 text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.18em]"
          style={{ borderTop: "2px solid rgba(251,249,244,0.2)" }}
        >
          <span style={{ color: "rgba(251,249,244,0.6)" }}>
            Talos &mdash; Sui Overflow 2026 &middot; Agentic Web
          </span>
          <a
            href="#home"
            className="inline-flex items-center gap-2 px-4 py-2 transition-colors hover:bg-[var(--t-red)]"
            style={{ color: "var(--t-paper)", border: "2px solid rgba(251,249,244,0.4)" }}
          >
            Back to top
            <ArrowUp className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </footer>
  )
}
