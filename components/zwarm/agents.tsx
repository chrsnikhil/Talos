"use client"

import Image from "next/image"
import { ArrowUpRight, ArrowRight } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const RULE = "3px solid var(--t-ink)"

const AGENTS = [
  {
    name: "Icarus",
    glyph: "Ι",
    role: "Executor",
    accent: "var(--t-red)",
    fg: "#11181D",
    img: "/i-cut.png",
    vitals: [
      { label: "Role", value: "Executor" },
      { label: "Scope", value: "Suilend · Scallop" },
      { label: "Status", value: "Active", live: true },
    ],
    mandate:
      "Every ~30s it reads live lending APYs, decides with an off-chain LLM, and rebalances real USDC in a single atomic PTB — but can only ever spend what its on-chain policy permits.",
    highlights: [
      { title: "Atomic execution", body: "redeem → swap → supply in one all-or-nothing PTB. No half-rebalanced state." },
      { title: "Bounded by policy", body: "budget cap, protocol allowlist, expiry & owner revocation — enforced on-chain." },
    ],
    chips: ["agent_spend", "PTB", "Suilend", "Scallop", "DeepBook", "Walrus"],
    cta: { label: "Watch it trade", href: "#live" },
  },
  {
    name: "Daedalus",
    glyph: "Δ",
    role: "Critic",
    accent: "var(--t-navy)",
    fg: "#ffffff",
    img: "/d-cut.png",
    vitals: [
      { label: "Role", value: "Critic" },
      { label: "Watches", value: "Icarus" },
      { label: "Status", value: "Active", live: true },
    ],
    mandate:
      "Independently re-evaluates every decision Icarus makes — from the same Walrus-stored inputs — then writes a tamper-proof rating on-chain. Holds funds for no one.",
    highlights: [
      { title: "Independent audit", body: "its own LLM pass over the same verifiable inputs — not Icarus's word." },
      { title: "On-chain reputation", body: "CriticRating events accrue into a portable, tamper-proof track record." },
    ],
    chips: ["Events", "Walrus", "CriticRating", "Reputation", "dry-run"],
    cta: { label: "See its ratings", href: "#live" },
  },
]

export function Agents() {
  const ref = useScrollReveal()
  return (
    <section
      id="agents"
      ref={ref}
      className="relative overflow-hidden py-20 md:py-28"
      style={{ borderBottom: RULE, background: "var(--t-paper)" }}
    >
      <div aria-hidden="true" className="vl-backdrop-type vl-outline absolute -top-2 right-[-0.04em] z-0 text-[clamp(70px,14vw,220px)]">
        Swarm
      </div>
      <span aria-hidden="true" className="vl-rail-vertical hidden lg:block absolute left-6 top-32 z-20 text-3xl" style={{ color: "var(--t-navy)" }}>
        二人組
      </span>

      <div className="relative z-10 px-5 md:px-10">
        <div className="max-w-[1560px] mx-auto">
          <div className="scroll-reveal mb-10 md:mb-14">
            <span className="vl-badge mb-5">Two agents, zero trust</span>
            <h2 className="vl-display text-[clamp(40px,7vw,92px)] leading-[0.85] mt-5 mb-4" style={{ color: "var(--t-navy)" }}>
              The agents
            </h2>
            <p className="text-base md:text-lg font-medium leading-relaxed max-w-2xl" style={{ color: "var(--t-text-muted)" }}>
              One acts, the other independently judges — coordinating through verifiable on-chain data, not trust.
            </p>
          </div>

          <div className="space-y-12 md:space-y-16">
            {AGENTS.map((a, idx) => (
              <article
                key={a.name}
                className={`scroll-reveal scroll-delay-${idx + 1} relative overflow-hidden`}
                style={{ border: RULE, boxShadow: `14px 14px 0 0 ${a.accent}`, background: "var(--t-bg-card)" }}
              >
                <div className="grid md:grid-cols-[clamp(340px,30%,480px)_1fr]">
                  {/* ── Figure panel ─────────────────────────── */}
                  <div className="relative flex flex-col" style={{ background: "#0A0F13" }}>
                    {/* angled accent flash */}
                    <div
                      aria-hidden="true"
                      className="absolute -top-2 -left-2 w-48 h-12 z-10 origin-top-left"
                      style={{ background: a.accent, transform: "rotate(-6deg)", borderBottom: "3px solid var(--t-ink)" }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 left-3 z-20 text-[10px] font-extrabold uppercase tracking-[0.22em] origin-top-left"
                      style={{ transform: "rotate(-6deg)", color: a.fg }}
                    >
                      {a.role} &apos;26
                    </span>

                    <div className="relative flex-1 min-h-[400px] md:min-h-[460px] z-[1]">
                      {/* accent glow */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0"
                        style={{ background: `radial-gradient(60% 55% at 50% 62%, ${a.accent} 0%, transparent 62%)`, opacity: 0.28 }}
                      />
                      <Image src={a.img} alt={`${a.name} — ${a.role}`} fill priority className="object-contain object-bottom p-4" />
                    </div>

                    {/* nameplate — glyph + name */}
                    <div className="relative z-[2] flex items-baseline gap-3 md:gap-4 px-5 py-4 text-white" style={{ borderTop: RULE, background: "#0A0F13" }}>
                      <span className="vl-display text-4xl md:text-5xl leading-none" style={{ color: a.accent }}>
                        {a.glyph}
                      </span>
                      <span className="vl-display text-2xl md:text-3xl leading-none whitespace-nowrap">{a.name}</span>
                    </div>
                  </div>

                  {/* ── Stats panel ──────────────────────────── */}
                  <div className="md:border-l-[3px] flex flex-col" style={{ color: "var(--t-ink)", borderColor: "var(--t-ink)" }}>
                    {/* vitals */}
                    <div className="grid grid-cols-1 sm:grid-cols-3" style={{ borderBottom: RULE }}>
                      {a.vitals.map((v) => (
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
                        <span className="inline-block w-6 h-[3px]" style={{ background: a.accent, transform: "skewX(-30deg)" }} />
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: a.accent }}>
                          Mandate
                        </span>
                      </div>
                      <p className="text-base md:text-lg leading-relaxed font-medium max-w-3xl" style={{ color: "var(--t-text-muted)" }}>
                        {a.mandate}
                      </p>
                    </div>

                    {/* capabilities */}
                    <div className="grid sm:grid-cols-2" style={{ borderTop: RULE }}>
                      {a.highlights.map((item) => (
                        <div
                          key={item.title}
                          className="flex gap-3 items-start p-6 md:p-7 max-sm:border-b-[3px] sm:border-r-[3px] border-black last:border-0"
                          style={{ borderColor: "var(--t-ink)" }}
                        >
                          <span className="w-4 h-4 mt-1 flex-shrink-0" style={{ background: a.accent, transform: "rotate(45deg)", border: "2px solid var(--t-ink)" }} />
                          <div>
                            <h3 className="text-base md:text-lg font-bold mb-1" style={{ color: "var(--t-ink)" }}>
                              {item.title}
                            </h3>
                            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
                              {item.body}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* primitives */}
                    <div className="p-6 md:px-8 md:py-7" style={{ borderTop: RULE }}>
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3" style={{ color: "var(--t-text-muted)" }}>
                        On-chain primitives
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {a.chips.map((c) => (
                          <span key={c} className="vl-chip" style={{ fontFamily: "var(--font-mono)" }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* footer */}
                    <div className="mt-auto flex items-center justify-between gap-4 px-6 md:px-8 py-5" style={{ borderTop: RULE }}>
                      <span aria-hidden="true" className="vl-display text-base md:text-lg tracking-[0.12em]" style={{ color: a.accent }}>
                        {a.name === "Icarus" ? "ΙΚΑΡΟΣ" : "ΔΑΙΔΑΛΟΣ"}
                      </span>
                      <a
                        href={a.cta.href}
                        className="vl-btn inline-flex items-center gap-2 px-7 py-3.5 text-xs font-extrabold uppercase tracking-[0.14em]"
                        style={{ background: a.accent, color: a.fg }}
                      >
                        {a.cta.label} <ArrowUpRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            ))}
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
