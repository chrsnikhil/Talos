"use client"
/**
 * How Talos works — animated bento lifecycle replay.
 * Wraps DecisionLifecycle which replays real rebalance cycles through 6 stages.
 */
import { SectionDivider } from "@/components/talos-dash/section-divider"
import { DecisionLifecycle } from "./decision-lifecycle"

export function HowItWorks() {
  return (
    <section className="w-full px-4 sm:px-6 py-24 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <SectionDivider name="HOW TALOS WORKS" number="002" />

        <h2 className="font-pixel text-4xl sm:text-5xl text-foreground mb-3 mt-4">
          THE AGENT LOOP<span className="text-[var(--accent-color)]">.</span>
        </h2>
        <p className="text-sm font-mono text-muted-foreground max-w-2xl mb-12">
          Icarus runs a tight loop: read the market, pick the best venue, pass the
          policy gate, move real funds, log the decision, get graded. Every step
          is on-chain or verifiably stored. Watch a real cycle replay below.
        </p>

        <DecisionLifecycle />
      </div>
    </section>
  )
}
