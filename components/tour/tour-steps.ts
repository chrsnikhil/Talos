// Guided-tour step definitions. `target` is a data-tour attribute value to
// spotlight; null means a centered dialog with no spotlight (intro/outro).

export type TourStep = {
  tab: "VAULT" | "LIVE" | "THOUGHT" | "PORTFOLIO" | "ON-CHAIN" | "POLICY" | "REPUTATION" | null
  target: string | null
  title: string
  body: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    tab: null,
    target: null,
    title: "Meet Talos",
    body: "Hey — I'm Talos, your autonomous yield agent. Let me show you your command deck. (← → to move, Esc to skip.)",
  },
  {
    tab: "VAULT",
    target: "vault-chart",
    title: "Your money at work",
    body: "This is you versus the raw protocols. My line rides the best venue every tick — you keep the spread.",
  },
  {
    tab: "VAULT",
    target: "vault-balance",
    title: "Vault balance",
    body: "Your deposited USDC and anything sitting idle live right here.",
  },
  {
    tab: "VAULT",
    target: "vault-deposit",
    title: "Deposit",
    body: "Drop in USDC and I put it to work across Scallop, Navi & Kai — usually within 30 seconds.",
  },
  {
    tab: "VAULT",
    target: "vault-agent",
    title: "The autonomy switch",
    body: "Start or Stop me anytime. Stopped, I touch nothing — you're fully in the driver's seat.",
  },
  {
    tab: "VAULT",
    target: "vault-policy",
    title: "The on-chain leash",
    body: "I can only ever spend what you allow. This budget is enforced by the chain, not by trust.",
  },
  {
    tab: "VAULT",
    target: "vault-panic",
    title: "The kill-switch",
    body: "One tap on PANIC pulls everything back on-chain, instantly. Your escape hatch, always.",
  },
  {
    tab: "VAULT",
    target: "vault-wallet",
    title: "Your wallet + Claude",
    body: "A non-custodial embedded wallet — no seed phrase — plus the Claude MCP endpoint to drive me from chat.",
  },
  {
    tab: "LIVE",
    target: "tab-live",
    title: "Live from the swarm",
    body: "Every action Icarus & Daedalus take, streaming in as it happens on mainnet.",
  },
  {
    tab: "THOUGHT",
    target: "tab-thought",
    title: "Watch me think",
    body: "The actual reasoning behind each rebalance — and every decision is logged to Walrus.",
  },
  {
    tab: "PORTFOLIO",
    target: "tab-portfolio",
    title: "Where your capital sits",
    body: "A live breakdown of exactly which venues hold your funds right now.",
  },
  {
    tab: "ON-CHAIN",
    target: "tab-onchain",
    title: "Proof, not vibes",
    body: "Every decision is anchored on Sui and Walrus — independently verifiable.",
  },
  {
    tab: "POLICY",
    target: "tab-policy",
    title: "The full leash",
    body: "Budget, per-tx caps, allowed protocols, expiry — the complete policy, enforced on-chain.",
  },
  {
    tab: "REPUTATION",
    target: "tab-reputation",
    title: "Earning trust",
    body: "A critic scores every move I make. Good agents build reputation over time.",
  },
  {
    tab: null,
    target: null,
    title: "That's the deck",
    body: "You're all set. Deposit whenever you're ready and I'll take it from here.",
  },
]
