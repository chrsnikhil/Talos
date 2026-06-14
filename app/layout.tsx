import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Talos — Autonomous DeFi agents on Sui",
  description:
    "Talos is a swarm of autonomous AI agents that manage real USDC on Sui, bounded by an on-chain Move policy they physically cannot exceed. Sui Overflow 2026, Agentic Web.",
  generator: "Talos",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased overflow-x-hidden`}>
        {children}
      </body>
    </html>
  )
}
