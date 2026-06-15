import Dither from "@/components/Dither"
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
    <main className="relative min-h-screen text-foreground">
      {/* animated dithered wave background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <Dither
          waveColor={[0.12549019607843137, 0.3607843137254902, 0.44313725490196076]}
          disableAnimation={false}
          enableMouseInteraction={false}
          mouseRadius={0.6}
          colorNum={3}
          pixelSize={2}
          waveAmplitude={0.35}
          waveFrequency={10}
          waveSpeed={0.05}
          pixelRatio={0.4}
        />
        <div className="absolute inset-0 bg-background/50" />
      </div>

      <div className="relative z-10">
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
      </div>
    </main>
  )
}
