"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"

const ease = [0.22, 1, 0.36, 1] as const

const phases = [
  {
    chip: "SHIPPED",
    title: "LIVE NOW",
    items: [
      "Deployed agent_policy + reputation contracts on testnet",
      "Autonomous on-chain loop: Icarus executes, Daedalus rates",
      "Real DeepBook orders placed on-chain",
      "Every decision logged to Walrus and verifiable",
      "Live dashboard streaming on-chain activity",
    ],
  },
  {
    chip: "IN PROGRESS",
    title: "NEXT",
    items: [
      "Real Suilend + Scallop fund movement",
      "Mainnet deploy of policy and reputation contracts",
    ],
  },
  {
    chip: "PLANNED",
    title: "VISION",
    items: [
      "Strategy marketplace with ownable strategy objects",
      "Subscribers follow strategies they trust",
      "On-chain royalties paid to strategy authors",
    ],
  },
]

export function Roadmap() {
  return (
    <section id="roadmap" className="w-full border-b-2 border-foreground px-6 py-20 lg:px-12">
      {/* label row */}
      <div className="mb-10 flex items-center gap-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">// SECTION: ROADMAP</span>
        <div className="flex-1 border-t border-border" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">007</span>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease }}
        className="mb-12 max-w-2xl font-pixel text-4xl leading-[1.1] tracking-tight sm:text-5xl"
      >
        ROAD<span className="text-accent">MAP.</span>
      </motion.h2>

      <div className="grid grid-cols-1 border-2 border-foreground md:grid-cols-3">
        {phases.map((p, i) => {
          const borderR = i < 2 ? "md:border-r-2" : ""
          const borderB = i < 2 ? "border-b-2 md:border-b-0" : ""
          return (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease }}
              className={`flex flex-col border-foreground p-6 sm:p-8 ${borderR} ${borderB}`}
            >
              <span className="flex w-fit items-center gap-1.5 border-2 border-foreground px-2.5 py-1 text-[10px] uppercase tracking-widest">
                <span className="h-1.5 w-1.5 bg-accent" />
                {p.chip}
              </span>
              <h3 className="mt-6 text-lg uppercase tracking-wider">{p.title}</h3>
              <ul className="mt-6 space-y-3">
                {p.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                    <Check size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
