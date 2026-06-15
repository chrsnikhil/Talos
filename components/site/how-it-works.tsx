"use client"

import { motion } from "framer-motion"
import { Radar, Brain, Send, Database, Gavel } from "lucide-react"

const ease = [0.22, 1, 0.36, 1] as const

const steps = [
  {
    index: "01",
    icon: Radar,
    title: "SENSE",
    description: "Read live APYs across Suilend and Scallop, plus the current on-chain policy.",
  },
  {
    index: "02",
    icon: Brain,
    title: "THINK",
    description: "Decide whether to hold the position or rebalance into a higher yield.",
  },
  {
    index: "03",
    icon: Send,
    title: "ACT",
    description: "Execute one atomic, policy-gated PTB — bounded by the Move policy on-chain.",
  },
  {
    index: "04",
    icon: Database,
    title: "RECORD",
    description: "Write the decision to Walrus, content-addressed and permanently verifiable.",
  },
  {
    index: "05",
    icon: Gavel,
    title: "CRITIQUE",
    description: "Daedalus independently rates the move on-chain, building reputation.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full border-b-2 border-foreground px-6 py-20 lg:px-12">
      {/* label row */}
      <div className="mb-10 flex items-center gap-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">// SECTION: CYCLE</span>
        <div className="flex-1 border-t border-border" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">003</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease }}
        className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground"
      >
        <span className="h-1.5 w-1.5 bg-accent" /> EVERY ~30 SECONDS
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease }}
        className="mb-12 max-w-2xl font-pixel text-4xl leading-[1.1] tracking-tight sm:text-5xl"
      >
        THE AGENT <span className="text-accent">CYCLE.</span>
      </motion.h2>

      <div className="grid border-2 border-foreground md:grid-cols-5">
        {steps.map((step, i) => {
          const Icon = step.icon
          const borderB = i < steps.length - 1 ? "border-b-2 md:border-b-0" : ""
          const borderR = i < steps.length - 1 ? "md:border-r-2" : ""
          return (
            <motion.div
              key={step.index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease }}
              className={`flex min-h-[220px] flex-col border-foreground p-6 ${borderR} ${borderB}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{step.index}</span>
                <Icon size={18} strokeWidth={2} className="text-accent" />
              </div>
              <h3 className="mt-8 text-base uppercase tracking-wider">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
