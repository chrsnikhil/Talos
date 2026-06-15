"use client"

import { motion } from "framer-motion"
import { ShieldCheck, Boxes, Database, Award } from "lucide-react"

const ease = [0.22, 1, 0.36, 1] as const

const cells = [
  {
    code: "01",
    icon: ShieldCheck,
    title: "MOVE POLICY OBJECT",
    desc: "An on-chain object caps budget, scope, and expiry. The owner revokes spend authority in one transaction — no agent override.",
  },
  {
    code: "02",
    icon: Boxes,
    title: "PROGRAMMABLE TRANSACTION BLOCKS",
    desc: "A single atomic PTB chains redeem → swap → supply. Either every leg lands or none does — no half-executed positions.",
  },
  {
    code: "03",
    icon: Database,
    title: "WALRUS",
    desc: "Every decision is stored as verifiable memory on Walrus, with the blobId committed on-chain. The reasoning is auditable, not ephemeral.",
  },
  {
    code: "04",
    icon: Award,
    title: "ON-CHAIN REPUTATION",
    desc: "Daedalus writes a tamper-proof CriticRating per decision. Agent reputation is public, permanent, and impossible to forge.",
  },
]

export function BuiltOnSui() {
  return (
    <section id="stack" className="w-full border-b-2 border-foreground px-6 py-20 lg:px-12">
      {/* label row */}
      <div className="mb-10 flex items-center gap-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">// SECTION: SUI</span>
        <div className="flex-1 border-t border-border" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">005</span>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease }}
        className="font-pixel text-4xl leading-[1.05] tracking-tight sm:text-5xl"
      >
        BUILT ON SUI
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay: 0.1, ease }}
        className="mb-12 mt-6 max-w-lg text-sm leading-relaxed text-muted-foreground"
      >
        Sui isn&apos;t the brain — it&apos;s what makes trusting the brain with money safe.
      </motion.p>

      <div className="grid border-2 border-foreground md:grid-cols-2">
        {cells.map((c, i) => {
          const Icon = c.icon
          return (
            <motion.div
              key={c.code}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease }}
              className={`p-6 ${i % 2 === 0 ? "md:border-r-2 md:border-foreground" : ""} ${i < 2 ? "border-b-2 border-foreground" : ""}`}
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center border-2 border-foreground">
                  <Icon size={18} strokeWidth={2} className="text-accent" />
                </span>
                <span className="font-pixel text-lg text-accent">[{c.code}]</span>
              </div>
              <h3 className="mb-3 text-sm uppercase tracking-wider">{c.title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{c.desc}</p>
            </motion.div>
          )
        })}
      </div>

      <p className="mt-8 text-[10px] uppercase tracking-widest text-muted-foreground">
        AGENT_POLICY + REPUTATION // PUBLISHED ON SUI TESTNET
      </p>
    </section>
  )
}
