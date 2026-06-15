"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

const ease = [0.22, 1, 0.36, 1] as const

const stats = [
  { v: "100%", l: "POLICY-ENFORCED" },
  { v: "92/100", l: "CRITIC SCORE" },
  { v: "02", l: "AGENTS // ZERO TRUST" },
  { v: "LIVE", l: "SUI TESTNET" },
]

export function Hero() {
  return (
    <section className="relative w-full border-b border-border/25 px-6 pb-16 pt-28 lg:px-12 lg:pt-32">
      <div className="dot-grid-bg pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative">
        {/* label row */}
        <div className="mb-10 flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">// SECTION: HERO</span>
          <div className="flex-1 border-t border-border" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">001</span>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
              className="mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              <span className="inline-block h-2 w-2 animate-blink bg-accent" />
              SUI OVERFLOW 2026 // AGENTIC WEB
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, ease }}
              className="font-pixel text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
            >
              SENSE.<br />ENFORCE.<br />
              <span className="text-accent">EXECUTE.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease }}
              className="mt-8 max-w-md text-sm leading-relaxed text-muted-foreground"
            >
              A swarm of autonomous agents that move real USDC across Sui lending markets — and can only ever spend
              what an on-chain Move policy permits. The owner revokes in one click.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45, ease }}
              className="mt-9 flex flex-wrap items-stretch gap-3"
            >
              <a href="/dashboard" className="group flex items-stretch bg-foreground text-background">
                <span className="flex w-10 items-center justify-center bg-accent">
                  <ArrowRight size={16} strokeWidth={2} className="text-background transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="px-5 py-3 text-[11px] uppercase tracking-wider">Launch Dashboard</span>
              </a>
              <a
                href="#how-it-works"
                className="glass-card flex items-center px-5 py-3 text-[11px] uppercase tracking-wider transition-colors hover:bg-foreground hover:text-background"
              >
                How it works
              </a>
            </motion.div>
          </div>

          {/* system panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease }}
            className="glass-card"
          >
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-2 text-[10px] uppercase tracking-widest">
              <span>TALOS://SWARM</span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-1.5 w-1.5 bg-accent" /> ONLINE
              </span>
            </div>
            <div className="dot-grid-bg relative aspect-[4/3] w-full">
              <Image src="/hero-cut.png" alt="Icarus and Daedalus" fill priority className="object-contain p-5" />
            </div>
            <div className="grid grid-cols-2 border-t border-border/40 text-[10px] uppercase tracking-widest">
              <span className="border-r border-border/40 px-4 py-2.5">ΙΚΑΡΟΣ // EXECUTOR</span>
              <span className="px-4 py-2.5 text-right">ΔΑΙΔΑΛΟΣ // CRITIC</span>
            </div>
          </motion.div>
        </div>

        {/* stat strip */}
        <div className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l} className="glass-card px-5 py-6">
              <div className="font-pixel text-3xl">{s.v}</div>
              <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
