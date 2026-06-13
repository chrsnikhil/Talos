import { Hero } from "@/components/talos/hero"
import { Marquee } from "@/components/talos/marquee"
import { HowItWorks } from "@/components/talos/how-it-works"
import { Agents } from "@/components/talos/agents"
import { Stack } from "@/components/talos/stack"
import { Live } from "@/components/talos/live"
import { Roadmap } from "@/components/talos/roadmap"
import { Footer } from "@/components/talos/footer"

export default function Home() {
  return (
    <main className="min-h-screen relative" style={{ color: "var(--t-ink)", background: "var(--t-paper)" }}>
      <Hero />
      <Marquee />
      <HowItWorks />
      <Agents />
      <Stack />
      <Live />
      <Roadmap />
      <Footer />
    </main>
  )
}
