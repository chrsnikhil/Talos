import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, ShieldCheck } from "lucide-react"

const stats = [
  { value: "100%", label: "policy-enforced" },
  { value: "92/100", label: "critic score" },
  { value: "2", label: "agents · zero trust" },
  { value: "Live", label: "on Sui testnet" },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_60%,transparent_100%)]" />
      <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-32 lg:px-8 lg:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Sui Overflow 2026 · Agentic Web
            </div>

            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Autonomous agents,
              <br />
              <span className="text-primary">on a chain-enforced leash.</span>
            </h1>

            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Talos is a swarm of autonomous agents that move real USDC across Sui lending markets — and can only ever
              spend what an on-chain Move policy permits. The owner can revoke them in one click.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="/dashboard">
                <Button size="lg" className="group rounded-full px-6">
                  Launch dashboard
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </a>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="rounded-full px-6">
                  How it works
                </Button>
              </a>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Safety by enforcement — not trust.
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="absolute inset-0 bg-dots opacity-60" />
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src="/hero-cut.png"
                  alt="Icarus and Daedalus — the Talos agents"
                  fill
                  priority
                  className="object-contain p-6"
                />
              </div>
              <div className="relative flex items-center justify-between border-t border-border px-5 py-3 font-mono text-xs text-muted-foreground">
                <span>ΙΚΑΡΟΣ · executor</span>
                <span>ΔΑΙΔΑΛΟΣ · critic</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card px-5 py-6">
              <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
