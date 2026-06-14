const columns = [
  {
    title: "Protocol",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Agents", href: "#agents" },
      { label: "Built on Sui", href: "#stack" },
      { label: "Roadmap", href: "#roadmap" },
    ],
  },
  {
    title: "Live",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Live", href: "#live" },
    ],
  },
  {
    title: "Build",
    links: [
      {
        label: "GitHub",
        href: "https://github.com/chrsnikhil",
        external: true,
      },
      {
        label: "Sui testnet",
        href: "https://faucet.sui.io/",
        external: true,
      },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-xs">
            <span className="text-lg font-semibold tracking-tight">Talos</span>
            <p className="mt-3 text-sm text-muted-foreground">
              Autonomous DeFi agents on Sui, bounded by an on-chain policy.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...(link.external
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="font-mono text-xs text-muted-foreground">
            Talos — Sui Overflow 2026 · Agentic Web
          </p>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              Agents live on testnet
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
