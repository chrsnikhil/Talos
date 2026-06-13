"use client"

import { Hero } from "@/components/zwarm/hero"
import { Marquee } from "@/components/zwarm/marquee"
import { HowItWorks } from "@/components/zwarm/how-it-works"
import { Agents } from "@/components/zwarm/agents"
import { Safety } from "@/components/zwarm/safety"
import { Performance } from "@/components/zwarm/performance"
import { BuiltOnSui } from "@/components/zwarm/built-on-sui"
import { Roadmap } from "@/components/zwarm/roadmap"
import { Footer } from "@/components/zwarm/footer"

export default function Home() {
  return (
    <main className="min-h-screen relative" style={{ color: "var(--t-ink)", background: "var(--t-paper)" }}>
      <Hero />
      <Marquee />
      <HowItWorks />
      <Agents />
      <Safety />
      <Performance />
      <BuiltOnSui />
      <Roadmap />
      <Footer />
    </main>
  )
}
