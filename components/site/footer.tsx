"use client"

const columns = [
  {
    title: "PROTOCOL",
    links: [
      { label: "HOW IT WORKS", href: "#how-it-works" },
      { label: "AGENTS", href: "#agents" },
      { label: "BUILT ON SUI", href: "#stack" },
      { label: "ROADMAP", href: "#roadmap" },
    ],
  },
  {
    title: "LIVE",
    links: [
      { label: "DASHBOARD", href: "/dashboard" },
      { label: "LIVE", href: "#live" },
    ],
  },
  {
    title: "BUILD",
    links: [
      { label: "GITHUB", href: "https://github.com/chrsnikhil", external: true },
      { label: "SUI TESTNET", href: "https://faucet.sui.io/", external: true },
    ],
  },
]

export function Footer() {
  return (
    <footer className="w-full border-t border-border/25">
      <div className="grid grid-cols-1 lg:grid-cols-4">
        {/* brand */}
        <div className="border-b border-border/25 px-6 py-12 lg:border-b-0 lg:border-r lg:border-border/25 lg:px-12">
          <span className="font-pixel text-2xl tracking-tight">TALOS</span>
          <p className="mt-4 max-w-xs text-[11px] uppercase leading-relaxed tracking-wider text-muted-foreground">
            AUTONOMOUS DEFI AGENTS ON SUI // BOUNDED BY AN ON-CHAIN POLICY
          </p>
        </div>

        {/* link columns */}
        {columns.map((column, i) => (
          <div
            key={column.title}
            className={`border-b border-border/25 px-6 py-12 lg:border-b-0 lg:px-8 ${i < 2 ? "lg:border-r lg:border-border/25" : ""}`}
          >
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground">{column.title}</h3>
            <ul className="mt-5 space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* bottom bar */}
      <div className="flex flex-col items-start justify-between gap-4 border-t border-border/25 px-6 py-5 sm:flex-row sm:items-center lg:px-12">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          TALOS // SUI OVERFLOW 2026 // AGENTIC WEB
        </p>
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-blink bg-accent" />
          AGENTS LIVE ON TESTNET
        </p>
      </div>
    </footer>
  )
}
