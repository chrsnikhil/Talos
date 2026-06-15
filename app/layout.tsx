import type React from "react"
import type { Metadata } from "next"

import "./globals.css"

import { Onest, Tourney, Graduate, Noto_Sans_JP, Geist_Mono as V0_Font_Geist_Mono } from "next/font/google"

// Initialize fonts
const _geistMono = V0_Font_Geist_Mono({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
})

const onest = Onest({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-onest",
})

// Display logotype — chamfered tech-sport italic (free stand-in for Good Times,
// the genre of the AKAI-style lettering)
const tourney = Tourney({
  subsets: ["latin"],
  style: ["italic"],
  variable: "--font-tourney",
})

// Collegiate varsity block — the jersey-lettering font
const graduate = Graduate({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-graduate",
})

const notoJP = Noto_Sans_JP({
  weight: ["700", "900"],
  variable: "--font-noto-jp",
  preload: false,
})

export const metadata: Metadata = {
  title: "Chris Nikhil — Web3 & Fullstack Developer",
  description:
    "Portfolio of Chris Nikhil, a Web3 and fullstack developer from Chennai. 2× ETHGlobal winner building smart contracts, DeFi systems, and visually bold web experiences.",
  generator: "ChrisNikhil",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${onest.variable} ${tourney.variable} ${graduate.variable} ${notoJP.variable} font-sans antialiased overflow-x-hidden`}>{children}</body>
    </html>
  )
}
