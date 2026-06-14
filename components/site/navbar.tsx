"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Github, Menu, X } from "lucide-react"

const links = [
  { name: "How it works", href: "#how-it-works" },
  { name: "Agents", href: "#agents" },
  { name: "Built on Sui", href: "#stack" },
  { name: "Live", href: "#live" },
  { name: "Roadmap", href: "#roadmap" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-border bg-background/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <a href="#" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-sm font-bold">
            Τ
          </span>
          <span className="text-lg font-semibold tracking-tight">Talos</span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.name} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {l.name}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <a href="https://github.com/chrsnikhil" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </Button>
          </a>
          <a href="/dashboard">
            <Button size="sm" className="rounded-full px-5">
              Launch dashboard
            </Button>
          </a>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border bg-background px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <a key={l.name} href={l.href} onClick={() => setOpen(false)} className="py-1 text-sm text-muted-foreground hover:text-foreground">
                {l.name}
              </a>
            ))}
            <a href="/dashboard" onClick={() => setOpen(false)} className="mt-2">
              <Button className="w-full rounded-full">Launch dashboard</Button>
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
