"use client"

import { motion } from "framer-motion"
import { BlinkDot } from "./blink-dot"

const ease = [0.22, 1, 0.36, 1] as const

/**
 * Inline section divider — same language as SectionHeader but tuned for
 * sitting inside a parent panel (no outer margin, more subtle).
 */
export function SectionDivider({
  name,
  number,
  rightHint,
  className = "",
}: {
  name: string
  number: string
  rightHint?: string
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease }}
      className={`flex items-center gap-3 pt-6 pb-2 ${className}`}
    >
      <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent-color)] font-mono font-bold">
        {`// ${name}`}
      </span>
      <div className="flex-1 border-t border-border/60" />
      <BlinkDot />
      {rightHint && (
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          {rightHint}
        </span>
      )}
      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
        {number}
      </span>
    </motion.div>
  )
}
