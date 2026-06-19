"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { ArrowRight, Github } from "lucide-react"

const FaultyTerminal = dynamic(() => import("@/components/FaultyTerminal"), { ssr: false })

const ease = [0.22, 1, 0.36, 1] as const

export function Cta() {
  const cardRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "200px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section id="cta" className="w-full border-b border-border/25 px-6 py-20 lg:px-12">
      {/* label row */}
      <div className="mb-10 flex items-center gap-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">// SECTION: LAUNCH</span>
        <div className="flex-1 border-t border-border" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">008</span>
      </div>

      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease }}
        className="relative overflow-hidden bg-black text-foreground"
      >
        {/* faulty terminal background (receives mouse) — only mounted while on screen */}
        <div className="absolute inset-0">
          {inView && (
            <FaultyTerminal
              scale={0.5}
              digitSize={1.4}
              scanlineIntensity={0}
              glitchAmount={1}
              flickerAmount={1}
              noiseAmp={0}
              chromaticAberration={0}
              dither={0}
              curvature={0.2}
              tint="#3b97fb"
              mouseReact
              mouseStrength={0.5}
              brightness={1}
              dpr={1}
              pageLoadAnimation={false}
            />
          )}
        </div>
        {/* readability scrim */}
        <div className="pointer-events-none absolute inset-0 bg-black/40" />

        <div className="pointer-events-none relative z-10 flex items-center justify-between border-b border-white/10 px-5 py-2 text-[10px] uppercase tracking-widest text-foreground/70">
          <span>TALOS://LIVE</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-accent" /> SUI MAINNET
          </span>
        </div>

        <div className="pointer-events-none relative z-10 px-6 py-20 text-center lg:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-pixel text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              WATCH THE<br />AGENTS <span className="text-accent">RUN.</span>
            </h2>
            <p className="mx-auto mt-8 max-w-md text-sm leading-relaxed text-foreground/70">
              See Icarus rebalance real USDC under a Move policy — every decision logged to Walrus
              and graded by Daedalus, in real time.
            </p>

            <div className="mt-10 flex flex-wrap items-stretch justify-center gap-3">
              <a href="/dashboard" className="group pointer-events-auto flex items-stretch bg-foreground text-background">
                <span className="flex w-10 items-center justify-center bg-accent">
                  <ArrowRight size={16} strokeWidth={2} className="text-background transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="px-5 py-3 text-[11px] uppercase tracking-wider">Launch Dashboard</span>
              </a>
              <a
                href="https://github.com/chrsnikhil"
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto flex items-center gap-2 border border-white/20 px-5 py-3 text-[11px] uppercase tracking-wider text-foreground transition-colors hover:bg-foreground hover:text-background"
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
