"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { BlinkDot } from "@/components/talos-dash/blink-dot"

const ease = [0.22, 1, 0.36, 1] as const

export function LandingHero() {
  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-12">
      {/* Top-left section label */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease }}
        className="absolute top-24 left-6 lg:left-12 hidden sm:flex items-center gap-4"
      >
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          {"// SECTION: HERO"}
        </span>
        <div className="w-16 border-t border-border" />
        <BlinkDot />
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          001
        </span>
      </motion.div>

      {/* Headline */}
      <div className="flex flex-col items-center text-center gap-4">
        <motion.h1
          initial={{ opacity: 0, y: 80, filter: "blur(16px)", scale: 0.9 }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
          transition={{ duration: 1, delay: 0.3, ease }}
          className="font-pixel text-[2.75rem] sm:text-7xl lg:text-8xl xl:text-9xl tracking-[-0.04em] sm:tracking-tight text-foreground select-none"
        >
          TALOS<span className="text-[var(--accent-color)]">.</span>
        </motion.h1>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: 0.9, ease }}
          className="flex items-center gap-3 text-[10px] font-mono tracking-[0.25em] uppercase text-[var(--accent-color)] border border-[var(--accent-color)]/40 px-4 py-1.5"
        >
          <span className="font-bold">ICARUS · DAEDALUS</span>
          <span className="h-3 w-px bg-[var(--accent-color)]/40" />
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-1.5 w-1.5 bg-[var(--accent-color)] animate-pulse" />
            LIVE · SUI MAINNET
          </span>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 1.0, ease }}
          className="w-full max-w-xl border-t-2 border-foreground origin-left my-4"
        />

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 1.1, ease }}
          className="flex flex-col items-center gap-3 max-w-2xl"
        >
          <p className="font-pixel text-2xl sm:text-3xl lg:text-4xl text-foreground leading-[1.1] tracking-tight text-center">
            AUTONOMOUS YIELD<span className="text-[var(--accent-color)]">.</span>
            <br />
            <span className="text-[var(--accent-color)]">PROVED ON CHAIN</span>
            <span className="text-foreground">.</span>
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono leading-relaxed text-center max-w-lg">
            Two agents over Sui. LLM-driven rebalancing.
            <br className="hidden sm:inline" />
            <span className="text-foreground"> On-chain Move policy gate. Real USDC, every cycle.</span>
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: 1.4, ease }}
          className="flex items-center gap-3 mt-6 flex-wrap justify-center"
        >
          <Link
            href="/dashboard"
            className="group relative bg-black text-[var(--accent-color)] text-sm font-mono tracking-wider uppercase overflow-hidden cursor-pointer px-7 py-3 border-2 border-[var(--accent-color)] text-center hover:text-background transition-colors duration-500"
          >
            <span className="absolute inset-0 bg-[var(--accent-color)] translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" />
            <span className="relative z-10 font-bold flex items-center gap-2">
              Launch Dashboard
              <ArrowRight
                size={14}
                strokeWidth={2}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </span>
          </Link>
          <a
            href="https://github.com/chrsnikhil/Talos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono tracking-wider uppercase px-7 py-3 border border-[var(--accent-color)]/40 text-muted-foreground hover:text-foreground hover:border-[var(--accent-color)] transition-colors duration-300"
          >
            View on GitHub
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0, duration: 0.6 }}
        className="absolute bottom-8 hidden sm:flex flex-col items-center gap-2"
      >
        <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground/60">SCROLL</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-8 bg-gradient-to-b from-[var(--accent-color)]/60 to-transparent"
        />
      </motion.div>
    </section>
  )
}
