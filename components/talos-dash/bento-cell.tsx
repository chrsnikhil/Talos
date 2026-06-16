"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

const ease = [0.22, 1, 0.36, 1] as const

/**
 * BentoCell — the signature bordered card with a 4px offset accent shadow.
 *
 * When `bare` is true, the card framing is removed — the component renders
 * inline without its own border / shadow / background / padding. Use this
 * when the cell sits inside a parent panel that already provides framing.
 */
export function BentoCell({
  children,
  className = "",
  delay = 0,
  bare = false,
}: {
  children: ReactNode
  className?: string
  delay?: number
  bare?: boolean
}) {
  if (bare) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ delay, duration: 0.5, ease }}
        className={className}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay, duration: 0.5, ease }}
      className={`relative border border-[var(--accent-color)]/20 bg-black/60 backdrop-blur-sm p-6 ${className}`}
      style={{
        boxShadow: "4px 4px 0px 0px var(--accent-color)",
      }}
    >
      {children}
    </motion.div>
  )
}
