"use client"

import Image from "next/image"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const focusAreas = ["AI Agents", "LLM Pipelines", "Next.js", "TypeScript", "Product Engineering"]

const RULE = "3px solid var(--t-ink)"
const TILE_SHADOW = "7px 7px 0 0 var(--t-navy)"

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div
      className="text-[10px] font-extrabold uppercase tracking-[0.22em] mb-2"
      style={{ color: light ? "rgba(251,249,244,0.7)" : "var(--t-text-muted)" }}
    >
      {children}
    </div>
  )
}

export function CareerSection() {
  const sectionRef = useScrollReveal()

  return (
    <section
      id="career"
      ref={sectionRef}
      className="relative overflow-hidden py-20 md:py-28"
      style={{ borderBottom: RULE, background: "var(--t-paper)" }}
    >
      <div aria-hidden="true" className="vl-backdrop-type vl-outline absolute -bottom-8 right-[-0.04em] z-0 text-[clamp(120px,24vw,400px)]">
        Career
      </div>
      <span
        aria-hidden="true"
        className="vl-rail-vertical hidden lg:block absolute right-6 top-32 z-20 text-3xl"
        style={{ color: "var(--t-red)" }}
      >
        現役
      </span>

      <div className="relative z-10 px-5 md:px-10">
        <div className="max-w-[1560px] mx-auto">
          <div className="scroll-reveal mb-10 text-center">
            <h2 className="vl-display text-[clamp(40px,7vw,92px)] leading-[0.85]" style={{ color: "var(--t-navy)" }}>
              Career
            </h2>
          </div>

          {/* ── Unconventional bento ───────────────────────────── */}
          <div className="scroll-reveal scroll-delay-1 grid grid-cols-1 md:grid-cols-4 auto-rows-[minmax(132px,auto)] gap-5">
            {/* LOGO — emphasis, clean sharp tile, spans 2×2 */}
            <div
              className="md:col-span-2 md:row-span-2 relative overflow-hidden flex flex-col items-center justify-center text-center px-8 py-12"
              style={{ border: RULE, boxShadow: "10px 10px 0 0 var(--t-navy)", background: "var(--t-bg-card)" }}
            >
              {/* angled red accent slash, bottom-left */}
              <div
                aria-hidden="true"
                className="absolute -bottom-6 -left-10 w-56 h-12"
                style={{ background: "var(--t-red)", transform: "rotate(-8deg)" }}
              />
              <span aria-hidden="true" className="vl-rail-vertical absolute top-5 right-5 text-xl" style={{ color: "var(--t-red)" }}>
                契約
              </span>

              <Eyebrow>Company</Eyebrow>
              <Image
                src="/logos/tenori-logo.png"
                alt="Tenorilabs"
                width={480}
                height={270}
                className="w-[min(78%,320px)] h-auto object-contain my-2"
              />
              <div className="relative mt-4 text-[11px] font-extrabold uppercase tracking-[0.28em]" style={{ color: "var(--t-ink)" }}>
                Tenorilabs · AI Lab
              </div>
            </div>

            {/* ROLE — navy emphasis */}
            <div className="md:col-span-2 flex flex-col justify-center px-7 py-7" style={{ border: RULE, background: "var(--t-navy)", boxShadow: TILE_SHADOW }}>
              <Eyebrow light>Role</Eyebrow>
              <div className="vl-display text-2xl md:text-[34px] leading-[0.95] text-white">AI FullStack Engineer</div>
            </div>

            {/* TERM */}
            <div className="md:col-span-2 flex flex-col justify-center px-6 py-7" style={{ border: RULE, background: "var(--t-bg-card)", boxShadow: TILE_SHADOW }}>
              <Eyebrow>Term</Eyebrow>
              <div className="flex items-center gap-2 text-base md:text-lg font-bold" style={{ color: "var(--t-ink)" }}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "var(--t-orange)" }} />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "var(--t-orange)" }} />
                </span>
                2026 — Present
              </div>
              <div className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--t-text-muted)" }}>
                Current role
              </div>
            </div>

            {/* DUTIES */}
            <div className="md:col-span-2 flex flex-col justify-center px-7 py-7" style={{ border: RULE, background: "var(--t-bg-card)", boxShadow: TILE_SHADOW }}>
              <Eyebrow>What I Do</Eyebrow>
              <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--t-text-muted)" }}>
                Building AI-powered products end to end at Tenorilabs — from agent systems and LLM pipelines to the
                polished fullstack interfaces people actually use.
              </p>
            </div>

            {/* RIDERS */}
            <div className="md:col-span-2 flex flex-col justify-center px-7 py-7" style={{ border: RULE, background: "var(--t-bg-card)", boxShadow: TILE_SHADOW }}>
              <Eyebrow>Focus Areas</Eyebrow>
              <div className="flex flex-wrap gap-2.5">
                {focusAreas.map((area) => (
                  <span key={area} className="vl-chip">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
