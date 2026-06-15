"use client"

import { motion } from "framer-motion"
import { Lock, Layers, Database, Network } from "lucide-react"

const ease = [0.22, 1, 0.36, 1] as const

const cells = [
  {
    n: "[01]",
    icon: Lock,
    title: "ON-CHAIN LEASH",
    body: "Budget, protocol allowlist, expiry, and owner revocation are enforced inside a Move policy object. A compromised agent physically cannot exceed its bounds — not a guideline, an invariant.",
  },
  {
    n: "[02]",
    icon: Layers,
    title: "ATOMIC EXECUTION",
    body: "Redeem, swap, and supply collapse into a single all-or-nothing PTB. No partial states, no stranded funds — every rebalance lands whole or none of it does.",
  },
  {
    n: "[03]",
    icon: Database,
    title: "VERIFIABLE MEMORY",
    body: "Every decision is content-addressed on Walrus before it acts. The reasoning is permanent, auditable, and tamper-evident long after the move runs.",
  },
  {
    n: "[04]",
    icon: Network,
    title: "ZERO-TRUST SWARM",
    body: "Daedalus reads each of Icarus's moves on-chain and rates it independently, averaging 92/100. Two agents that don't trust each other — the critic never takes the executor's word.",
  },
]

export function Features() {
  return (
    <section className="w-full border-b-2 border-foreground px-6 py-20 lg:px-12">
      {/* label row */}
      <div className="mb-10 flex items-center gap-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">// SECTION: CAPABILITIES</span>
        <div className="flex-1 border-t border-border" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">002</span>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease }}
        className="mb-12 max-w-2xl font-pixel text-4xl leading-[1.1] tracking-tight sm:text-5xl"
      >
        SAFETY BY <span className="text-accent">ENFORCEMENT.</span>
      </motion.h2>

      <div className="grid grid-cols-1 border-2 border-foreground md:grid-cols-2">
        {cells.map((c, i) => {
          const Icon = c.icon
          const borderR = i % 2 === 0 ? "md:border-r-2" : ""
          const borderB = i < 2 ? "border-b-2" : "border-b-2 md:border-b-0"
          const lastNoB = i === 3 ? "border-b-0" : ""
          return (
            <motion.div
              key={c.n}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease }}
              className={`flex min-h-[280px] flex-col border-foreground p-6 sm:p-8 ${borderR} ${borderB} ${lastNoB}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{c.n}</span>
                <Icon size={20} strokeWidth={2} className="text-accent" />
              </div>
              <h3 className="mt-8 text-lg uppercase tracking-wider">{c.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
