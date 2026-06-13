"use client"

import { Boxes, Users, Coins } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const RULE = "3px solid var(--t-ink)"

const NEXT = [
  {
    icon: Boxes,
    title: "Strategies as ownable objects",
    body: "Each strategy becomes a Move object — its encrypted intelligence on Walrus, gated by Seal. The object is the agent; hold it, run it.",
  },
  {
    icon: Users,
    title: "A swarm you can subscribe to",
    body: "Beta agents subscribe to a published strategy and run it on their own wallet — copy-trading autonomous agents, on-chain.",
  },
  {
    icon: Coins,
    title: "Royalties to curators",
    body: "Yield splits 80/20 to subscriber and curator via a shared vault, settled atomically in a PTB. A real creator economy for strategies.",
  },
]

export function Roadmap() {
  const ref = useScrollReveal()
  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-20 md:py-28"
      style={{ borderBottom: RULE, background: "var(--t-navy)", color: "var(--t-ink)" }}
    >
      <div
        aria-hidden="true"
        className="vl-backdrop-type absolute -top-2 left-[-0.04em] z-0 text-[clamp(50px,10vw,170px)]"
        style={{ color: "transparent", WebkitTextStroke: "3px rgba(251,249,244,0.18)" }}
      >
        Next
      </div>

      <div className="relative z-10 px-5 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="scroll-reveal mb-12 md:mb-16">
            <span className="vl-badge mb-5" style={{ background: "var(--t-paper)" }}>Roadmap</span>
            <h2 className="vl-display text-[clamp(40px,7vw,92px)] leading-[0.85] mt-5 mb-4 text-white">Where this goes</h2>
            <p className="text-base md:text-lg font-medium leading-relaxed max-w-2xl text-white/75">
              The autonomous agent wallet is the foundation. Next: turn strategies into a composable, ownable
              marketplace on Sui.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-7">
            {NEXT.map((n, i) => {
              const Icon = n.icon
              return (
                <article
                  key={n.title}
                  className={`scroll-reveal scroll-delay-${i + 1} vl-card bg-[var(--t-bg-card)] flex flex-col`}
                  style={{ color: "var(--t-ink)" }}
                >
                  <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: RULE }}>
                    <Icon className="w-5 h-5" style={{ color: "var(--t-red)" }} />
                    <h3 className="vl-display text-lg leading-tight">{n.title}</h3>
                  </div>
                  <p className="p-5 text-sm font-medium leading-relaxed flex-1" style={{ color: "var(--t-text-muted)" }}>
                    {n.body}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
