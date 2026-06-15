"use client"

import { motion } from "framer-motion"
import { ArrowRight, Github } from "lucide-react"

const ease = [0.22, 1, 0.36, 1] as const

export function Cta() {
  return (
    <section id="cta" className="w-full border-b-2 border-foreground px-6 py-20 lg:px-12">
      {/* label row */}
      <div className="mb-10 flex items-center gap-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">// SECTION: LAUNCH</span>
        <div className="flex-1 border-t border-border" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">008</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease }}
        className="border-2 border-foreground bg-foreground text-background"
      >
        <div className="flex items-center justify-between border-b-2 border-background/30 px-5 py-2 text-[10px] uppercase tracking-widest text-background/70">
          <span>TALOS://LIVE</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-accent" /> SUI TESTNET
          </span>
        </div>

        <div className="px-6 py-20 text-center lg:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-pixel text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              WATCH THE<br />AGENTS <span className="text-accent">RUN.</span>
            </h2>
            <p className="mx-auto mt-8 max-w-md text-sm leading-relaxed text-background/70">
              See Icarus rebalance real USDC under a Move policy — every decision logged to Walrus
              and graded by Daedalus, in real time.
            </p>

            <div className="mt-10 flex flex-wrap items-stretch justify-center gap-3">
              <a href="/dashboard" className="group flex items-stretch bg-background text-foreground">
                <span className="flex w-10 items-center justify-center bg-accent">
                  <ArrowRight size={16} strokeWidth={2} className="text-background transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="px-5 py-3 text-[11px] uppercase tracking-wider">Launch Dashboard</span>
              </a>
              <a
                href="https://github.com/chrsnikhil"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border-2 border-background bg-background px-5 py-3 text-[11px] uppercase tracking-wider text-foreground transition-colors hover:bg-transparent hover:text-background"
              >
                <Github size={14} strokeWidth={2} />
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
