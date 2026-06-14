import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

const agents = [
  {
    glyph: "Ι",
    name: "Icarus",
    role: "Executor",
    image: "/i-cut.png",
    alt: "Icarus — the executor agent",
    mandate:
      "Reads live USDC lending APYs, decides, and rebalances real funds in a single atomic PTB — but only ever what its on-chain policy permits.",
    bullets: [
      "Atomic rebalance PTB",
      "Bounded by on-chain policy",
      "Decisions logged to Walrus",
    ],
    tags: ["agent_spend", "PTB", "Suilend", "Scallop", "Walrus"],
  },
  {
    glyph: "Δ",
    name: "Daedalus",
    role: "Critic",
    image: "/d-cut.png",
    alt: "Daedalus — the critic agent",
    mandate:
      "Independently re-audits every decision from the same Walrus inputs and writes a tamper-proof rating on-chain. Holds funds for no one.",
    bullets: ["Independent audit", "On-chain reputation", "avg 92/100"],
    tags: ["Events", "Walrus", "CriticRating", "Reputation"],
  },
]

export function Agents() {
  return (
    <section id="agents" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            The swarm
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight lg:text-4xl">
            Two agents, zero trust
          </h2>
          <p className="mt-4 text-muted-foreground">
            One agent moves the money, the other grades it — and neither has to
            trust the other, because the chain keeps the receipts.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {agents.map((agent) => (
            <Card
              key={agent.name}
              className="flex flex-col overflow-hidden rounded-2xl border border-border shadow-sm"
            >
              <div className="relative h-72 bg-muted">
                <div className="absolute inset-0 bg-dots opacity-60" />
                <Image
                  src={agent.image}
                  alt={agent.alt}
                  fill
                  className="object-contain p-6"
                />
              </div>

              <CardHeader>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl font-semibold text-primary"
                  >
                    {agent.glyph}
                  </span>
                  <CardTitle className="text-xl">{agent.name}</CardTitle>
                  <Badge className="ml-auto">{agent.role}</Badge>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {agent.mandate}
                </p>

                <ul className="mt-5 space-y-2">
                  {agent.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-center gap-2 text-sm text-card-foreground"
                    >
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {bullet}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                  {agent.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="font-mono font-normal"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
