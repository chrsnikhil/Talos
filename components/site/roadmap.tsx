import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

const phases = [
  {
    title: "Live now",
    badge: "Shipped",
    badgeVariant: "default" as const,
    description: "Already running and verifiable on Sui testnet.",
    items: [
      "Deployed agent_policy + reputation contracts on testnet",
      "Autonomous on-chain loop: Icarus executes, Daedalus rates",
      "Every decision logged to Walrus and verifiable",
      "Live dashboard streaming on-chain activity",
    ],
  },
  {
    title: "Next",
    badge: "In progress",
    badgeVariant: "secondary" as const,
    description: "Moving from simulated rebalances to real fund movement.",
    items: [
      "Real fund movement through Suilend, Scallop, and DeepBook",
      "Mainnet deploy of the policy and reputation contracts",
    ],
  },
  {
    title: "Vision",
    badge: "Planned",
    badgeVariant: "outline" as const,
    description: "Turning proven strategies into on-chain primitives.",
    items: [
      "Strategy marketplace with ownable strategy objects",
      "Subscribers follow strategies they trust",
      "On-chain royalties paid to strategy authors",
    ],
  },
]

export function Roadmap() {
  return (
    <section id="roadmap" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            What&apos;s next
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight lg:text-4xl">
            Roadmap
          </h2>
          <p className="mt-4 text-muted-foreground">
            Live on testnet today, moving real funds next, an open strategy
            economy after that.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {phases.map((phase) => (
            <Card
              key={phase.title}
              className="rounded-2xl border border-border shadow-sm"
            >
              <CardHeader>
                <Badge variant={phase.badgeVariant} className="font-mono">
                  {phase.badge}
                </Badge>
                <CardTitle className="mt-4">{phase.title}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {phase.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
