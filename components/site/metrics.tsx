"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

const ease = [0.22, 1, 0.36, 1] as const

const stats = [
  { v: "92/100", l: "CRITIC SCORE" },
  { v: "100%", l: "POLICY-ENFORCED" },
  { v: "02", l: "AGENTS // ZERO TRUST" },
  { v: "00", l: "TRUST REQUIRED" },
]

export function Metrics() {
  return (
    <section id="live" className="w-full border-b-2 border-foreground px-6 py-20 lg:px-12">
      {/* label row */}
      <div className="mb-10 flex items-center gap-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">// SECTION: LIVE</span>
        <div className="flex-1 border-t border-border" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">006</span>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease }}
        className="mb-6 max-w-2xl font-pixel text-4xl leading-[1.1] tracking-tight sm:text-5xl"
      >
        PROVEN <span className="text-accent">ON-CHAIN.</span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay: 0.1, ease }}
        className="mb-12 max-w-md text-sm leading-relaxed text-muted-foreground"
      >
        Every number below comes from contracts running right now on Sui testnet — readable by anyone, enforced
        by Move, not asserted in a pitch deck.
      </motion.p>

      {/* stat band */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, delay: 0.15, ease }}
        className="grid grid-cols-2 border-2 border-foreground lg:grid-cols-4"
      >
        {stats.map((s, i) => (
          <div
            key={s.l}
            className={`px-5 py-8 ${i < 3 ? "border-r-0 lg:border-r-2" : ""} ${i < 2 ? "border-b-2 lg:border-b-0" : ""} border-border`}
          >
            <div className="font-pixel text-4xl text-accent">{s.v}</div>
            <div className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, delay: 0.25, ease }}
        className="mt-10 flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between"
      >
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-blink bg-accent" />
          ALL METRICS LIVE FROM SUI TESTNET // WATCH THEM UPDATE
        </p>
        <a href="/dashboard" className="group flex items-stretch bg-foreground text-background w-fit">
          <span className="flex w-10 items-center justify-center bg-accent">
            <ArrowRight size={16} strokeWidth={2} className="text-background transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="px-5 py-3 text-[11px] uppercase tracking-wider">OPEN THE DASHBOARD</span>
        </a>
      </motion.div>
    </section>
  )
}
