// Guided-tour step definitions. `target` is a data-tour attribute value to
// spotlight; null means no spotlight (full-screen dim, intro/outro). `expr`
// is the agent's facial expression for the step. Copy is professional and
// straightforward — kept in sync with the spoken lines in scripts/gen-tour-voice.mjs.

import type { ExpressionName } from "./talos-agent"

export type TourStep = {
  tab: "VAULT" | "LIVE" | "THOUGHT" | "PORTFOLIO" | "ON-CHAIN" | "POLICY" | "REPUTATION" | null
  target: string | null
  title: string
  body: string
  expr: ExpressionName
}

export const TOUR_STEPS: TourStep[] = [
  {
    tab: null,
    target: null,
    title: "Welcome to Talos",
    body: "Welcome to Talos. I'll walk you through your dashboard and how everything works.",
    expr: "happy",
  },
  {
    tab: "VAULT",
    target: "vault-chart",
    title: "Performance",
    body: "This chart compares my performance against each lending protocol. I continuously route your funds to the highest-yielding venue.",
    expr: "proud",
  },
  {
    tab: "VAULT",
    target: "vault-balance",
    title: "Vault balance",
    body: "Here is your vault balance — your deposited USDC, along with any idle funds.",
    expr: "happy",
  },
  {
    tab: "VAULT",
    target: "vault-deposit",
    title: "Deposit",
    body: "To begin, deposit USDC here. I'll put it to work across Scallop, Navi, and Kai within about 30 seconds.",
    expr: "happy",
  },
  {
    tab: "VAULT",
    target: "vault-agent",
    title: "Agent control",
    body: "You can pause or resume me at any time. While paused, I take no action on your funds.",
    expr: "happy",
  },
  {
    tab: "VAULT",
    target: "vault-policy",
    title: "On-chain policy",
    body: "My activity is bounded by an on-chain policy. I can only operate within the limits you set.",
    expr: "proud",
  },
  {
    tab: "VAULT",
    target: "vault-panic",
    title: "Emergency withdrawal",
    body: "In an emergency, this control returns all of your funds on-chain, immediately.",
    expr: "alert",
  },
  {
    tab: "VAULT",
    target: "vault-wallet",
    title: "Your wallet",
    body: "This is your embedded, non-custodial wallet. You can also connect me to Claude using the provided endpoint.",
    expr: "happy",
  },
  {
    tab: "LIVE",
    target: "tab-live",
    title: "Live activity",
    body: "The live view shows every action the agents take, in real time.",
    expr: "happy",
  },
  {
    tab: "THOUGHT",
    target: "tab-thought",
    title: "Agent reasoning",
    body: "Here you can review the reasoning behind each rebalance. Every decision is recorded to Walrus.",
    expr: "thinking",
  },
  {
    tab: "PORTFOLIO",
    target: "tab-portfolio",
    title: "Portfolio",
    body: "The portfolio view shows exactly where your capital is allocated right now.",
    expr: "happy",
  },
  {
    tab: "ON-CHAIN",
    target: "tab-onchain",
    title: "On-chain proof",
    body: "Every action is verifiable on-chain. You can confirm each transaction on Sui.",
    expr: "proud",
  },
  {
    tab: "POLICY",
    target: "tab-policy",
    title: "Policy",
    body: "This is your full policy: budget, per-transaction limits, approved protocols, and expiry.",
    expr: "proud",
  },
  {
    tab: "REPUTATION",
    target: "tab-reputation",
    title: "Reputation",
    body: "Each decision is independently scored by a critic agent, building a track record over time.",
    expr: "proud",
  },
  {
    tab: null,
    target: null,
    title: "You're all set",
    body: "That completes the overview. You can deposit whenever you're ready. Thank you.",
    expr: "happy",
  },
]
