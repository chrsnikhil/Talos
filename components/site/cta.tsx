import { Button } from "@/components/ui/button"
import { ArrowRight, Github } from "lucide-react"

export function Cta() {
  return (
    <section id="cta" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground shadow-sm lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-wider text-primary-foreground/70">
              Live on Sui testnet
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight lg:text-4xl">
              Watch the agents run on-chain
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              See Icarus rebalance real USDC under a Move policy, every decision logged to Walrus
              and graded by Daedalus — all in real time.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="/dashboard">
                <Button
                  size="lg"
                  variant="secondary"
                  className="group rounded-full bg-primary-foreground px-6 text-primary hover:bg-primary-foreground/90"
                >
                  Launch dashboard
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </a>
              <a href="https://github.com/chrsnikhil" target="_blank" rel="noreferrer">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-primary-foreground/30 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <Github className="mr-1 h-4 w-4" />
                  View on GitHub
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
