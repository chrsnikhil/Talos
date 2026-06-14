import { Navbar } from "@/components/site/navbar"
import { Hero } from "@/components/site/hero"
import { Features } from "@/components/site/features"
import { HowItWorks } from "@/components/site/how-it-works"
import { Agents } from "@/components/site/agents"
import { BuiltOnSui } from "@/components/site/built-on-sui"
import { Metrics } from "@/components/site/metrics"
import { Roadmap } from "@/components/site/roadmap"
import { Cta } from "@/components/site/cta"
import { Footer } from "@/components/site/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Agents />
      <BuiltOnSui />
      <Metrics />
      <Roadmap />
      <Cta />
      <Footer />
    </main>
  )
}
