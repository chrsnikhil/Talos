"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Menu, X } from "lucide-react"

const links = [
  { name: "HOW IT WORKS", href: "#how-it-works" },
  { name: "AGENTS", href: "#agents" },
  { name: "BUILT ON SUI", href: "#stack" },
  { name: "LIVE", href: "#live" },
  { name: "ROADMAP", href: "#roadmap" },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b-2 border-border transition-colors ${
        scrolled ? "bg-background" : "bg-background/95"
      }`}
    >
      <nav className="flex items-stretch justify-between">
        <a href="#" className="flex items-center gap-2 border-r-2 border-border px-5 py-4">
          <span className="font-pixel text-xl tracking-tight">TALOS</span>
          <span className="text-[10px] tracking-widest text-muted-foreground">/SUI</span>
        </a>

        <div className="hidden flex-1 items-stretch lg:flex">
          {links.map((l) => (
            <a
              key={l.name}
              href={l.href}
              className="flex items-center border-r-2 border-border px-5 text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              {l.name}
            </a>
          ))}
        </div>

        <div className="flex items-stretch">
          <a
            href="https://github.com/chrsnikhil"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center border-l-2 border-border px-5 text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground md:flex"
          >
            GITHUB
          </a>
          <a href="/dashboard" className="group hidden items-center bg-foreground text-background md:flex">
            <span className="flex h-full w-10 items-center justify-center bg-accent">
              <ArrowRight size={16} strokeWidth={2} className="text-background transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="px-5 text-[11px] uppercase tracking-wider">Launch Dashboard</span>
          </a>
          <button className="border-l-2 border-border px-4 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t-2 border-border bg-background lg:hidden">
          {links.map((l) => (
            <a
              key={l.name}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block border-b-2 border-border px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground hover:bg-foreground hover:text-background"
            >
              {l.name}
            </a>
          ))}
          <a href="/dashboard" onClick={() => setOpen(false)} className="group flex items-center bg-foreground text-background">
            <span className="flex h-10 w-10 items-center justify-center bg-accent">
              <ArrowRight size={16} className="text-background" />
            </span>
            <span className="px-5 text-[11px] uppercase tracking-wider">Launch Dashboard</span>
          </a>
        </div>
      )}
    </header>
  )
}
