import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Lock, Zap, Database, Gavel } from "lucide-react"

const pillars = [
  {
    icon: Lock,
    title: "On-chain leash",
    description:
      "Budget, protocol allowlist, expiry, and owner revocation are enforced by a Move policy object. A compromised agent physically can't exceed its bounds.",
  },
  {
    icon: Zap,
    title: "Atomic execution",
    description:
      "Redeem, swap, and supply happen in a single all-or-nothing PTB. No partial states, no stranded funds — it all lands or none of it does.",
  },
  {
    icon: Database,
    title: "Verifiable memory",
    description:
      "Every decision is content-addressed on Walrus, so the agents' reasoning is auditable and tamper-evident long after it runs.",
  },
  {
    icon: Gavel,
    title: "Zero-trust swarm",
    description:
      "Daedalus independently rates each of Icarus's decisions on-chain — two agents that don't trust each other, averaging 92/100.",
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Why it&apos;s different
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight lg:text-4xl">
            Built for trustless autonomy
          </h2>
          <p className="mt-4 text-muted-foreground">
            Talos doesn&apos;t ask you to trust an agent. It puts the agents on rails the chain
            enforces — so safety comes from code, not promises.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar) => (
            <Card key={pillar.title} className="rounded-2xl border-border shadow-sm">
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <pillar.icon className="h-5 w-5" />
                </div>
                <CardTitle className="mt-4">{pillar.title}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {pillar.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
