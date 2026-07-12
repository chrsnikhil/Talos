// Guided-tour step definitions. `target` is a data-tour attribute value to
// spotlight; null means a centered guide with no spotlight (intro/outro).

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
    title: "Hey, I'm Icarus",
    body: "👋 I'll be running your vault. Give me 30 seconds and I'll show you around. (← → to move, Esc to skip.)",
  },
  {
    tab: "VAULT",
    target: "vault-chart",
    title: "Your money at work",
    body: "This is us versus the boring protocols. See my line riding on top? That gap is yours to keep.",
  },
  {
    tab: "VAULT",
    target: "vault-balance",
    title: "Your stash",
    body: "Everything you've deposited — plus anything still sitting idle — lives right here.",
  },
  {
    tab: "VAULT",
    target: "vault-deposit",
    title: "Feed me USDC",
    body: "Drop some USDC in here and I'll put it to work in about 30 seconds. No pressure. 😄",
  },
  {
    tab: "VAULT",
    target: "vault-agent",
    title: "My on/off switch",
    body: "Flip me off and I won't touch a thing. You're always the boss.",
  },
  {
    tab: "VAULT",
    target: "vault-policy",
    title: "My leash",
    body: "This is the leash you keep me on. I can only spend what you allow — and the chain enforces it, not me.",
  },
  {
    tab: "VAULT",
    target: "vault-panic",
    title: "The big red button",
    body: "Emergency? Smash PANIC and I pull everything back on-chain, instantly. Always your call.",
  },
  {
    tab: "VAULT",
    target: "vault-wallet",
    title: "Your wallet",
    body: "Your own wallet — no seed phrase to lose. There's even a hook to boss me around from Claude.",
  },
  {
    tab: "LIVE",
    target: "tab-live",
    title: "Watch us work",
    body: "Swing by here anytime to watch me and Daedalus rebalancing, live on mainnet.",
  },
  {
    tab: "THOUGHT",
    target: "tab-thought",
    title: "See me think",
    body: "Curious why I moved your funds? I show my reasoning — and log every call to Walrus.",
  },
  {
    tab: "PORTFOLIO",
    target: "tab-portfolio",
    title: "Where it's parked",
    body: "This is exactly where your money is sitting right now, venue by venue.",
  },
  {
    tab: "ON-CHAIN",
    target: "tab-onchain",
    title: "Receipts, not promises",
    body: "Don't just trust me — every move is proven on Sui. Go check.",
  },
  {
    tab: "POLICY",
    target: "tab-policy",
    title: "The full leash",
    body: "Budget, caps, expiry — the whole policy. All on-chain, all yours to set.",
  },
  {
    tab: "REPUTATION",
    target: "tab-reputation",
    title: "Earning your trust",
    body: "Daedalus grades my every move. I earn your trust one good call at a time.",
  },
  {
    tab: null,
    target: null,
    title: "That's the tour!",
    body: "You're all set. Deposit whenever you're ready and I've got it from here. 🚀",
  },
]
