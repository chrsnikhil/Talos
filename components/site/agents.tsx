"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Check } from "lucide-react"

const ease = [0.22, 1, 0.36, 1] as const

const agents = [
  {
    glyph: "Ι",
    name: "ICARUS",
    role: "EXECUTOR",
    img: "/i-cut.png",
    alt: "Icarus executor agent",
    mandate:
      "Reads live lending APYs, rebalances real USDC, and places real DeepBook orders — every move bounded by an on-chain Move policy.",
    bullets: [
      "Atomic PTB calls agent_policy::authorize_spend on-chain",
      "Capped budget, allowlist, expiry, owner revocation",
      "Logs every decision to Walrus for verifiable memory",
    ],
    primitives: ["agent_spend", "PTB", "DeepBook", "Walrus"],
  },
  {
    glyph: "Δ",
    name: "DAEDALUS",
    role: "CRITIC",
    img: "/d-cut.png",
    alt: "Daedalus critic agent",
    mandate:
      "Independently rates every decision Icarus makes, writing a tamper-proof score on-chain — averaging 92/100.",
    bullets: [
      "Reads Icarus events and Walrus decision blobs",
      "Emits an on-chain CriticRating per decision",
      "Builds permanent, public agent reputation",
    ],
    primitives: ["Events", "Walrus", "CriticRating", "Reputation"],
  },
]

export function Agents() {
  return (
    <section id="agents" className="w-full border-b-2 border-foreground px-6 py-20 lg:px-12">
      {/* label row */}
      <div className="mb-10 flex items-center gap-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">// SECTION: SWARM</span>
        <div className="flex-1 border-t border-border" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">004</span>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease }}
        className="mb-12 max-w-2xl font-pixel text-4xl leading-[1.05] tracking-tight sm:text-5xl"
      >
        TWO AGENTS <span className="text-accent">//</span> ZERO TRUST
      </motion.h2>

      <div className="grid border-2 border-foreground md:grid-cols-2">
        {agents.map((a, i) => (
          <motion.div
            key={a.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: i * 0.1, ease }}
            className={`flex flex-col ${i === 0 ? "border-b-2 border-foreground md:border-b-0 md:border-r-2" : ""}`}
          >
            {/* image panel */}
            <div className="dot-grid-bg relative h-64 border-b-2 border-foreground">
              <Image src={a.img} alt={a.alt} fill className="object-contain p-5" />
              <span className="absolute left-3 top-3 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="h-1.5 w-1.5 bg-accent" /> ONLINE
              </span>
            </div>

            <div className="flex flex-1 flex-col p-6">
              {/* header row */}
              <div className="mb-4 flex items-center gap-3">
                <span className="font-pixel text-3xl text-accent">{a.glyph}</span>
                <span className="font-pixel text-2xl tracking-tight">{a.name}</span>
                <span className="ml-auto border-2 border-foreground px-2.5 py-1 text-[10px] uppercase tracking-widest">
                  {a.role}
                </span>
              </div>

              {/* mandate */}
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{a.mandate}</p>

              {/* bullets */}
              <ul className="mb-6 space-y-2.5">
                {a.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
                    <Check size={14} strokeWidth={2.5} className="mt-0.5 shrink-0 text-accent" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {/* primitive tags */}
              <div className="mt-auto flex flex-wrap gap-2">
                {a.primitives.map((p) => (
                  <span
                    key={p}
                    className="border-2 border-foreground px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
