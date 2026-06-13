"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

const plans = [
  {
    name: "Live now",
    description: "Running autonomously on Sui testnet",
    phase: "Testnet",
    features: [
      "agent_policy + reputation contracts deployed",
      "Autonomous on-chain agent loop",
      "Icarus rebalances USDC under a Move policy",
      "Daedalus rates every decision on-chain",
      "Walrus-logged verifiable decisions",
      "Live dashboard at /dashboard",
    ],
    cta: "View the dashboard",
    href: "/dashboard",
    popular: true,
  },
  {
    name: "Next",
    description: "Real fund movement and mainnet",
    phase: "In progress",
    features: [
      "Live Suilend execution",
      "Live Scallop execution",
      "DeepBook routing",
      "Real USDC moved across markets",
      "Policy-bounded position limits",
      "Mainnet deployment",
    ],
    cta: "Follow on GitHub",
    href: "https://github.com/chrsnikhil",
    popular: false,
  },
  {
    name: "Vision",
    description: "An open marketplace for agent strategies",
    phase: "Planned",
    features: [
      "Ownable strategy objects",
      "Publish and share strategies",
      "Subscribers follow live agents",
      "On-chain royalties for authors",
      "Composable multi-agent swarms",
      "Permissionless strategy listing",
    ],
    cta: "Follow on GitHub",
    href: "https://github.com/chrsnikhil",
    popular: false,
  },
];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="pricing" className="relative py-32 lg:py-40 border-t border-foreground/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="max-w-3xl mb-20">
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase block mb-6">
            Roadmap
          </span>
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl tracking-tight text-foreground mb-6">
            From testnet
            <br />
            <span className="text-stroke">to a swarm</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl">
            Live on Sui testnet today. Real execution and a strategy marketplace ahead.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center gap-4 mb-16">
          <span
            className={`text-sm transition-colors ${
              !isAnnual ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Testnet
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative w-14 h-7 bg-foreground/10 rounded-full p-1 transition-colors hover:bg-foreground/20"
          >
            <div
              className={`w-5 h-5 bg-foreground rounded-full transition-transform duration-300 ${
                isAnnual ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </button>
          <span
            className={`text-sm transition-colors ${
              isAnnual ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Mainnet
          </span>
          {isAnnual && (
            <span className="ml-2 px-2 py-1 bg-foreground text-primary-foreground text-xs font-mono">
              Planned
            </span>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-px bg-foreground/10">
          {plans.map((plan, idx) => (
            <div
              key={plan.name}
              className={`relative p-8 lg:p-12 bg-background ${
                plan.popular ? "md:-my-4 md:py-12 lg:py-16 border-2 border-foreground" : ""
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-8 px-3 py-1 bg-foreground text-primary-foreground text-xs font-mono uppercase tracking-widest">
                  Shipped
                </span>
              )}

              {/* Plan Header */}
              <div className="mb-8">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-3xl text-foreground mt-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              {/* Phase */}
              <div className="mb-8 pb-8 border-b border-foreground/10">
                <span className="font-display text-4xl text-foreground">{plan.phase}</span>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-10">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={plan.href}
                className={`w-full py-4 flex items-center justify-center gap-2 text-sm font-medium transition-all group ${
                  plan.popular
                    ? "bg-foreground text-primary-foreground hover:bg-foreground/90"
                    : "border border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5"
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <p className="mt-12 text-center text-sm text-muted-foreground">
          Every decision is policy-bounded, critic-rated, and logged to Walrus.{" "}
          <a href="/dashboard" className="underline underline-offset-4 hover:text-foreground transition-colors">
            Watch the agents live
          </a>
        </p>
      </div>
    </section>
  );
}
