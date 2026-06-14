import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const stats = [
  { value: "92/100", label: "avg critic score" },
  { value: "100%", label: "policy-enforced" },
  { value: "2", label: "agents · zero trust" },
  { value: "0", label: "trust required" },
]

export function Metrics() {
  return (
    <section id="live" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Live on Sui testnet
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight lg:text-4xl">
            Proven on-chain, not in a slide
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every number below comes from contracts running right now on Sui
            testnet — readable by anyone, enforced by Move, not asserted in a
            pitch deck.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card p-6 lg:p-8">
              <div className="text-3xl font-semibold tracking-tight lg:text-4xl">
                {stat.value}
              </div>
              <div className="mt-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            All metrics are live from Sui testnet — watch them update as the
            agents run.
          </p>
          <a href="/dashboard">
            <Button className="group rounded-full px-6">
              Open the live dashboard
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </a>
        </div>
      </div>
    </section>
  )
}
