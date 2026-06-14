import { Radar, Brain, Send, Database, Gavel } from "lucide-react"

const steps = [
  {
    index: "01",
    icon: Radar,
    title: "Sense",
    description: "Read live APYs across Suilend and Scallop, plus the current on-chain policy.",
  },
  {
    index: "02",
    icon: Brain,
    title: "Think",
    description: "An LLM/heuristic decides whether to hold the position or rebalance.",
  },
  {
    index: "03",
    icon: Send,
    title: "Act",
    description: "Execute an atomic, policy-gated PTB on-chain — bounded by the Move policy.",
  },
  {
    index: "04",
    icon: Database,
    title: "Record",
    description: "Write the decision to Walrus, content-addressed and verifiable.",
  },
  {
    index: "05",
    icon: Gavel,
    title: "Critique",
    description: "Daedalus independently rates the decision on-chain, building reputation.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Every ~30 seconds
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight lg:text-4xl">
            The agent cycle
          </h2>
          <p className="mt-4 text-muted-foreground">
            Icarus runs a tight loop — sense, think, act, record — and Daedalus closes it by
            grading every move on-chain.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-5">
          {steps.map((step, i) => (
            <div key={step.index} className="relative">
              <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {step.index}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="mt-4 font-semibold tracking-tight text-card-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className="pointer-events-none absolute right-[-12px] top-1/2 hidden h-px w-6 -translate-y-1/2 bg-border md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
