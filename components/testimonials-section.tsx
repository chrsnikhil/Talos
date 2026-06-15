"use client"

import { Zap, MessageSquare, Target } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const attributes = [
  { icon: Zap, label: "Ships fast", grade: "A+" },
  { icon: MessageSquare, label: "Communicates clearly", grade: "A+" },
  { icon: Target, label: "Product-first mindset", grade: "A+" },
]

const RULE = "3px solid var(--t-ink)"

export function TestimonialsSection() {
  const sectionRef = useScrollReveal()

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-20 md:py-28"
      style={{ borderBottom: RULE, background: "var(--t-paper)" }}
    >
      <div aria-hidden="true" className="vl-backdrop-type vl-outline absolute -top-4 right-[-0.04em] z-0 text-[clamp(90px,18vw,300px)]">
        Why Me
      </div>
      <span
        aria-hidden="true"
        className="vl-rail-vertical hidden lg:block absolute left-6 top-32 z-20 text-3xl"
        style={{ color: "var(--t-red)" }}
      >
        偵察
      </span>

      <div className="relative z-10 px-5 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="scroll-reveal mb-10 text-center">
            <h2 className="vl-display text-[clamp(40px,7vw,92px)] leading-[0.85]" style={{ color: "var(--t-navy)" }}>
              Why Hire Me
            </h2>
          </div>

          {/* report document */}
          <div className="scroll-reveal scroll-delay-1 vl-doc relative overflow-visible">
            {/* letterhead */}
            <div className="flex items-center justify-between gap-3 px-5 md:px-7 py-4" style={{ borderBottom: RULE }}>
              <span className="text-[10px] md:text-xs font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--t-red)" }}>
                The Pitch
              </span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.14em]" style={{ fontFamily: "var(--t-font-mono)", color: "var(--t-text-muted)" }}>
                Chris Nikhil
              </span>
            </div>

            {/* graded attributes */}
            <div>
              {attributes.map((attr) => (
                <div key={attr.label} className="vl-row grid grid-cols-[56px_1fr_64px] md:grid-cols-[72px_1fr_88px] items-stretch">
                  <div className="flex items-center justify-center" style={{ borderRight: RULE, background: "color-mix(in srgb, var(--t-navy) 5%, transparent)" }}>
                    <attr.icon className="w-5 h-5" style={{ color: "var(--t-navy)" }} strokeWidth={2.5} />
                  </div>
                  <div className="flex items-center px-4 md:px-6 py-4 text-sm md:text-base font-bold" style={{ color: "var(--t-ink)" }}>
                    {attr.label}
                  </div>
                  <div className="flex items-center justify-center" style={{ borderLeft: RULE, background: "var(--t-red)" }}>
                    <span className="vl-display text-2xl md:text-3xl text-white">{attr.grade}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* scout's summary */}
            <div className="p-6 md:p-8" style={{ borderTop: RULE }}>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3" style={{ color: "var(--t-text-muted)" }}>
                Summary
              </div>
              <p className="text-sm md:text-base leading-relaxed mb-5" style={{ color: "var(--t-ink)" }}>
                I combine deep technical expertise with a product-first mindset. Whether it&apos;s optimizing complex
                systems for performance or building intuitive user interfaces from scratch, I focus on delivering
                tangible results. I communicate clearly, ship fast, and care about the details that matter to your users.
              </p>
              <div className="font-bold text-base md:text-lg" style={{ color: "var(--t-ink)" }}>
                Ready to build?
              </div>
              <div className="text-sm" style={{ color: "var(--t-text-muted)" }}>
                Let&apos;s create something exceptional.
              </div>
            </div>

            {/* verdict stamp */}
            <div
              aria-hidden="true"
              className="absolute -bottom-6 right-5 md:right-10 z-20 rotate-[-8deg] flex flex-col items-center px-4 py-1.5"
              style={{ border: "3px double var(--t-red)", color: "var(--t-red)", background: "color-mix(in srgb, var(--t-red) 6%, transparent)" }}
            >
              <span className="text-[8px] font-extrabold uppercase tracking-[0.3em] pb-0.5 mb-0.5 w-full text-center" style={{ borderBottom: "1.5px solid var(--t-red)" }}>
                Verdict
              </span>
              <span className="vl-display text-lg md:text-2xl leading-none">Strong Hire</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
