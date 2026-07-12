import type React from "react"
import type { Metadata } from "next"
import { JetBrains_Mono, Nunito } from "next/font/google"
import { GeistPixelGrid } from "geist/font/pixel"
import "./globals.css"

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })
// Friendly rounded sans — used for the onboarding mascot's speech bubble.
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-friendly" })

export const metadata: Metadata = {
  title: "TALOS — Autonomous DeFi agents on Sui",
  description:
    "TALOS is a swarm of autonomous AI agents that manage real USDC on Sui, bounded by an on-chain Move policy they physically cannot exceed. Sui Overflow 2026, Agentic Web.",
  generator: "Talos",
  // Explicit icons so clients (incl. the Claude MCP connector) show the Talos mark
  // instead of falling back to the Azure host domain's brand. app/{icon.svg,favicon.ico}
  // are also served automatically; these links make them discoverable in the HTML.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${jetbrainsMono.variable} ${GeistPixelGrid.variable} ${nunito.variable}`} suppressHydrationWarning>
      <body className="font-mono antialiased overflow-x-hidden">{children}</body>
    </html>
  )
}
