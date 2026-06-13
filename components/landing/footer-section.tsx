"use client";

import { ArrowUpRight } from "lucide-react";
import { TalosOrbit } from "./talos-orbit";

const footerLinks = {
  Protocol: [
    { name: "How it works", href: "#how-it-works" },
    { name: "Agents", href: "#developers" },
    { name: "Roadmap", href: "#pricing" },
    { name: "Live", href: "#metrics" },
  ],
  Agents: [
    { name: "How it works", href: "#how-it-works" },
    { name: "Icarus & Daedalus", href: "#developers" },
    { name: "Walrus memory", href: "#developers" },
    { name: "Dashboard", href: "/dashboard" },
  ],
  Build: [
    { name: "GitHub", href: "https://github.com/chrsnikhil" },
    { name: "Sui testnet", href: "#metrics" },
    { name: "Sui Overflow 2026", href: "#", badge: "Live" },
    { name: "Dashboard", href: "/dashboard" },
  ],
  Safety: [
    { name: "On-chain policy", href: "#security" },
    { name: "Critic ratings", href: "#security" },
    { name: "Security", href: "#security" },
  ],
};

const socialLinks = [
  { name: "GitHub", href: "https://github.com/chrsnikhil" },
  { name: "Dashboard", href: "/dashboard" },
];

export function FooterSection() {
  return (
    <footer className="relative border-t border-foreground/10">
      {/* Animated wave background */}
      <div className="absolute inset-0 h-64 opacity-20 pointer-events-none overflow-hidden">
        <TalosOrbit className="w-full h-full text-foreground" />
      </div>
      
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Main Footer */}
        <div className="py-16 lg:py-24">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-12 lg:gap-8">
            {/* Brand Column */}
            <div className="col-span-2">
              <a href="#" className="inline-flex items-center gap-2 mb-6">
                <span className="text-2xl font-display">Talos</span>
                <span className="text-xs text-muted-foreground font-mono">Sui</span>
              </a>

              <p className="text-muted-foreground leading-relaxed mb-8 max-w-xs">
                Autonomous DeFi agents on Sui, bounded by an on-chain Move policy and rated by an on-chain critic.
              </p>

              {/* Social Links */}
              <div className="flex gap-6">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
                  >
                    {link.name}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h3 className="text-sm font-medium mb-6">{title}</h3>
                <ul className="space-y-4">
                  {links.map((link) => (
                    <li key={link.name}>
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
                      >
                        {link.name}
                        {"badge" in link && link.badge && (
                          <span className="text-xs px-2 py-0.5 bg-foreground text-background rounded-full">
                            {link.badge}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-8 border-t border-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Talos — Sui Overflow 2026 · Agentic Web
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Agents live on testnet
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
