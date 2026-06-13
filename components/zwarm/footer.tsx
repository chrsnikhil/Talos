"use client"

import { Github, PlayCircle, ArrowUpRight } from "lucide-react"

const RULE = "3px solid var(--t-ink)"

const LINKS = [
  { label: "Dashboard", href: "#live", icon: ArrowUpRight },
  { label: "Demo video", href: "#", icon: PlayCircle },
  { label: "GitHub", href: "https://github.com/chrsnikhil", icon: Github },
]

export function Footer() {
  return (
    <footer style={{ background: "var(--t-paper)", color: "var(--t-ink)" }}>
      {/* big call to action */}
      <div className="relative overflow-hidden px-5 md:px-12 py-20 md:py-28 text-center" style={{ borderBottom: RULE }}>
        <div aria-hidden="true" className="vl-backdrop-type vl-outline absolute inset-0 flex items-center justify-center z-0 text-[clamp(70px,18vw,300px)]">
          TALOS
        </div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="vl-display text-[clamp(32px,6vw,64px)] leading-[0.9] mb-6" style={{ color: "var(--t-navy)" }}>
            Watch the agents fly
          </h2>
          <p className="text-base md:text-lg font-medium mb-8" style={{ color: "var(--t-text-muted)" }}>
            Real USDC, on Sui mainnet, on a leash the chain enforces.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {LINKS.map((l) => {
              const Icon = l.icon
              return (
                <a
                  key={l.label}
                  href={l.href}
                  target={l.href.startsWith("http") ? "_blank" : undefined}
                  rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="vl-btn inline-flex items-center gap-2 px-7 py-3.5 text-sm font-extrabold uppercase tracking-[0.14em]"
                  style={{ background: l.label === "Dashboard" ? "var(--t-red)" : "var(--t-bg-card)", color: l.label === "Dashboard" ? "#11181D" : "var(--t-ink)" }}
                >
                  <Icon className="w-4 h-4" /> {l.label}
                </a>
              )
            })}
          </div>
        </div>
      </div>

      {/* baseline */}
      <div className="px-5 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.16em]">
        <span style={{ color: "var(--t-navy)" }}>Talos — Sui Overflow 2026 · Agentic Web</span>
        <span style={{ color: "var(--t-text-muted)" }}>
          Autonomous agents on a leash the chain enforces · Sui mainnet
        </span>
      </div>
    </footer>
  )
}
