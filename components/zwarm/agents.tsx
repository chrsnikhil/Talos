"use client"

import Image from "next/image"
import { useState } from "react"
import { ArrowUpRight, ArrowRight, RefreshCw } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const RULE = "3px solid var(--t-ink)"

const AGENTS = [
  {
    name: "Icarus",
    glyph: "Ι",
    role: "Executor",
    scope: "Suilend · Scallop",
    accent: "var(--t-red)",
    fg: "#11181D",
    img: "/i-cut.png",
    tint: "rgba(181,137,79,0.12)",
    mandate:
      "Every ~30s it reads live lending APYs, decides, and rebalances real USDC in one atomic PTB — but can only ever spend what its on-chain policy permits.",
    highlights: [
      { title: "Atomic execution", body: "redeem → swap → supply in one all-or-nothing PTB." },
      { title: "Bounded by policy", body: "budget, allowlist, expiry & revocation enforced on-chain." },
    ],
    chips: ["agent_spend", "PTB", "Suilend", "Scallop", "DeepBook", "Walrus"],
    cta: { label: "Watch it trade", href: "/dashboard" },
  },
  {
    name: "Daedalus",
    glyph: "Δ",
    role: "Critic",
    scope: "Watches Icarus",
    accent: "var(--t-navy)",
    fg: "#ffffff",
    img: "/d-cut.png",
    tint: "rgba(79,117,111,0.12)",
    mandate:
      "Independently re-evaluates every decision Icarus makes — from the same Walrus inputs — then writes a tamper-proof rating on-chain. Holds funds for no one.",
    highlights: [
      { title: "Independent audit", body: "its own pass over the same verifiable inputs." },
      { title: "On-chain reputation", body: "CriticRating events build a portable track record." },
    ],
    chips: ["Events", "Walrus", "CriticRating", "Reputation", "dry-run"],
    cta: { label: "See its ratings", href: "/dashboard" },
  },
]

export function Agents() {
  const ref = useScrollReveal()
  const [flipped, setFlipped] = useState<Record<string, boolean>>({})
  const toggle = (name: string) => setFlipped((f) => ({ ...f, [name]: !f[name] }))

  return (
    <section id="agents" ref={ref} className="relative overflow-hidden py-20 md:py-28" style={{ borderBottom: RULE, background: "var(--t-paper)" }}>
      <div aria-hidden="true" className="vl-backdrop-type vl-outline absolute -top-2 right-[-0.04em] z-0 text-[clamp(70px,14vw,220px)]">
        Swarm
      </div>

      <div className="relative z-10 px-5 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="scroll-reveal mb-10 md:mb-14 text-center">
            <span className="vl-badge mb-5">Two agents, zero trust</span>
            <h2 className="vl-display text-[clamp(40px,7vw,92px)] leading-[0.85] mt-5 mb-4" style={{ color: "var(--t-navy)" }}>
              The agents
            </h2>
            <p className="text-base md:text-lg font-medium leading-relaxed max-w-2xl mx-auto" style={{ color: "var(--t-text-muted)" }}>
              One acts, the other independently judges. Hover a card to meet them.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-7 md:gap-10">
            {AGENTS.map((a) => {
              const isFlipped = !!flipped[a.name]
              return (
                <div
                  key={a.name}
                  className="scroll-reveal group [perspective:1400px] h-[500px] md:h-[560px] cursor-pointer select-none"
                  onClick={() => toggle(a.name)}
                >
                  <div
                    className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] ${isFlipped ? "[transform:rotateY(180deg)]" : ""}`}
                  >
                    {/* ── FRONT: just the figure ─────────────────── */}
                    <div
                      className="absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] flex flex-col overflow-hidden"
                      style={{ border: RULE, boxShadow: `12px 12px 0 0 ${a.accent}`, background: "#0A0F13" }}
                    >
                      <span aria-hidden="true" className="absolute right-3 top-3 z-10 vl-rail-vertical text-2xl pointer-events-none" style={{ color: a.accent, opacity: 0.9 }}>
                        {a.glyph}
                      </span>
                      <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.55)" }}>
                        <RefreshCw className="w-3 h-3" /> flip
                      </span>
                      <div className="relative flex-1">
                        <div aria-hidden="true" className="absolute inset-0" style={{ background: `radial-gradient(60% 55% at 50% 60%, ${a.accent} 0%, transparent 62%)`, opacity: 0.28 }} />
                        <Image src={a.img} alt={`${a.name} — ${a.role}`} fill priority className="object-contain object-bottom p-5 select-none" />
                      </div>
                      <div className="flex items-center gap-3 px-5 py-4" style={{ borderTop: RULE, background: a.accent, color: a.fg }}>
                        <span className="vl-display text-3xl md:text-4xl leading-none">{a.name}</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-90">{a.role}</span>
                      </div>
                    </div>

                    {/* ── BACK: the details ──────────────────────── */}
                    <div
                      className="absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col overflow-y-auto"
                      style={{ border: RULE, boxShadow: `12px 12px 0 0 ${a.accent}`, background: "var(--t-bg-card)", color: "var(--t-ink)" }}
                    >
                      <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ borderBottom: RULE, background: a.accent, color: a.fg }}>
                        <span className="vl-display text-2xl leading-none">{a.name}</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] opacity-90">{a.role} · {a.scope}</span>
                      </div>

                      <div className="p-5 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-block w-5 h-[3px]" style={{ background: a.accent, transform: "skewX(-30deg)" }} />
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: a.accent }}>Mandate</span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed mb-5" style={{ color: "var(--t-text-muted)" }}>{a.mandate}</p>

                        <div className="space-y-3 mb-5">
                          {a.highlights.map((h) => (
                            <div key={h.title} className="flex gap-3 items-start">
                              <span className="w-3.5 h-3.5 mt-1 shrink-0" style={{ background: a.accent, transform: "rotate(45deg)", border: "2px solid var(--t-ink)" }} />
                              <div>
                                <h3 className="text-sm font-bold leading-tight" style={{ color: "var(--t-ink)" }}>{h.title}</h3>
                                <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{h.body}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {a.chips.map((c) => (
                            <span key={c} className="vl-chip text-[11px] py-1" style={{ fontFamily: "var(--font-mono)" }}>{c}</span>
                          ))}
                        </div>
                      </div>

                      <a
                        href={a.cta.href}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center gap-2 px-5 py-4 text-xs font-extrabold uppercase tracking-[0.14em] shrink-0"
                        style={{ borderTop: RULE, background: a.accent, color: a.fg }}
                      >
                        {a.cta.label} <ArrowUpRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* connective tissue note */}
          <div className="scroll-reveal mt-12 flex flex-wrap items-center justify-center gap-3 text-xs font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--t-text-muted)" }}>
            <span>Icarus acts</span>
            <ArrowRight className="w-4 h-4" style={{ color: "var(--t-red)" }} />
            <span>on-chain events + Walrus</span>
            <ArrowRight className="w-4 h-4" style={{ color: "var(--t-navy)" }} />
            <span>Daedalus judges</span>
          </div>
        </div>
      </div>
    </section>
  )
}
