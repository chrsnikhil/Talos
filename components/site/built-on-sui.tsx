import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ShieldCheck, Layers, Database, Award } from "lucide-react"

const layers = [
  {
    icon: ShieldCheck,
    title: "Move policy object",
    description:
      "Caps budget, protocol scope, and expiry — and the owner can revoke at any time. Safety by enforcement, not by promise.",
  },
  {
    icon: Layers,
    title: "Programmable Transaction Blocks",
    description:
      "Redeem, swap, and supply settle as one atomic transaction. It all lands or none of it does — no partial states.",
  },
  {
    icon: Database,
    title: "Walrus",
    description:
      "Every decision is content-addressed and verifiable; its blobId is recorded on-chain so the reasoning stays auditable.",
  },
  {
    icon: Award,
    title: "On-chain reputation",
    description:
      "Daedalus's CriticRating settles on-chain — tamper-proof and portable, so trust compounds where anyone can read it.",
  },
]

export function BuiltOnSui() {
  return (
    <section id="stack" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Why Sui
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight lg:text-4xl">
            Built on Sui
          </h2>
          <p className="mt-4 text-muted-foreground">
            Sui isn&apos;t the brain — it&apos;s what makes trusting an
            autonomous brain with real money safe.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {layers.map((layer) => (
            <Card
              key={layer.title}
              className="rounded-2xl border border-border shadow-sm"
            >
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <layer.icon className="h-5 w-5" />
                </div>
                <CardTitle className="mt-4">{layer.title}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {layer.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <p className="mt-8 font-mono text-xs text-muted-foreground">
          agent_policy + reputation — published on Sui testnet
        </p>
      </div>
    </section>
  )
}
