// Guided-tour step definitions. `target` is a data-tour attribute value to
// spotlight; null means no spotlight (full-screen blur, intro/outro). `expr`
// is the corner agent's facial expression for the step.

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
    title: "Hey, I'm Icarus",
    body: "👋 I'll be running your vault. Give me 30 seconds and I'll show you around. (← → to move, Esc to skip.)",
    expr: "happy",
  },
  {
    tab: "VAULT",
    target: "vault-chart",
    title: "Your money at work",
    body: "This is us versus the boring protocols. See my line riding on top? That gap is yours to keep.",
    expr: "proud",
  },
  {
    tab: "VAULT",
    target: "vault-balance",
    title: "Your stash",
    body: "Everything you've deposited — plus anything still sitting idle — lives right here.",
    expr: "happy",
  },
  {
    tab: "VAULT",
    target: "vault-deposit",
    title: "Feed me USDC",
    body: "Drop some USDC in here and I'll put it to work in about 30 seconds. No pressure. 😄",
    expr: "excited",
  },
  {
    tab: "VAULT",
    target: "vault-agent",
    title: "My on/off switch",
    body: "Flip me off and I won't touch a thing. You're always the boss.",
    expr: "happy",
  },
  {
    tab: "VAULT",
    target: "vault-policy",
    title: "My leash",
    body: "This is the leash you keep me on. I can only spend what you allow — and the chain enforces it, not me.",
    expr: "proud",
  },
  {
    tab: "VAULT",
    target: "vault-panic",
    title: "The big red button",
    body: "Emergency? Smash PANIC and I pull everything back on-chain, instantly. Always your call.",
    expr: "alert",
  },
  {
    tab: "VAULT",
    target: "vault-wallet",
    title: "Your wallet",
    body: "Your own wallet — no seed phrase to lose. There's even a hook to boss me around from Claude.",
    expr: "happy",
  },
  {
    tab: "LIVE",
    target: "tab-live",
    title: "Watch us work",
    body: "Swing by here anytime to watch me and Daedalus rebalancing, live on mainnet.",
    expr: "happy",
  },
  {
    tab: "THOUGHT",
    target: "tab-thought",
    title: "See me think",
    body: "Curious why I moved your funds? I show my reasoning — and log every call to Walrus.",
    expr: "thinking",
  },
  {
    tab: "PORTFOLIO",
    target: "tab-portfolio",
    title: "Where it's parked",
    body: "This is exactly where your money is sitting right now, venue by venue.",
    expr: "happy",
  },
  {
    tab: "ON-CHAIN",
    target: "tab-onchain",
    title: "Receipts, not promises",
    body: "Don't just trust me — every move is proven on Sui. Go check.",
    expr: "proud",
  },
  {
    tab: "POLICY",
    target: "tab-policy",
    title: "The full leash",
    body: "Budget, caps, expiry — the whole policy. All on-chain, all yours to set.",
    expr: "proud",
  },
  {
    tab: "REPUTATION",
    target: "tab-reputation",
    title: "Earning your trust",
    body: "Daedalus grades my every move. I earn your trust one good call at a time.",
    expr: "proud",
  },
  {
    tab: null,
    target: null,
    title: "That's the tour!",
    body: "You're all set. Deposit whenever you're ready and I've got it from here. 🚀",
    expr: "celebrate",
  },
]
