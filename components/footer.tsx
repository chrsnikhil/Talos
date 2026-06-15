"use client"

import { Mail, Github, Linkedin, ArrowUp } from "lucide-react"
import { FaXTwitter } from "react-icons/fa6"

const socials = [
  { href: "https://github.com/chrsnikhil", icon: Github, label: "GitHub" },
  { href: "https://www.linkedin.com/in/chris-nikhil-6883ba290/", icon: Linkedin, label: "LinkedIn" },
  { href: "https://x.com/chrsnikhil", icon: FaXTwitter, label: "X" },
]

const PAPER_RULE = "3px solid var(--t-paper)"

export function Footer() {
  return (
    <footer className="relative overflow-hidden pt-20 pb-8" style={{ background: "var(--t-ink)", color: "var(--t-paper)" }}>
      <span
        aria-hidden="true"
        className="vl-rail-vertical hidden lg:block absolute right-8 top-20 z-20 text-3xl"
        style={{ color: "var(--t-paper)", opacity: 0.5 }}
      >
        契約
      </span>

      <div className="relative z-10 px-5 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* the closing moment — hero display font */}
          <h2 className="mb-6">
            <span
              className="vl-display block text-[clamp(56px,12vw,150px)] leading-[0.82]"
              style={{ color: "var(--t-red)", WebkitTextStroke: "3px var(--t-paper)", paintOrder: "stroke fill" }}
            >
              Let&apos;s Connect
            </span>
          </h2>

          <p className="text-base md:text-lg max-w-xl mx-auto mb-10" style={{ color: "rgba(251,249,244,0.7)" }}>
            Have a project in mind, a hackathon to win, or just want to talk Web3? My inbox is always open.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-14">
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=chrsnikhil@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
              className="vl-btn inline-flex items-center gap-2 px-8 py-4 text-sm md:text-base font-extrabold uppercase tracking-[0.12em] text-white"
              style={{ background: "var(--t-red)", borderColor: "var(--t-paper)" }}
            >
              <Mail className="w-5 h-5" />
              chrsnikhil@gmail.com
            </a>

            {/* socials welded into one bordered strip */}
            <div className="flex items-stretch" style={{ border: PAPER_RULE, overflow: "hidden" }}>
              {socials.map((social, i) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-14 h-14 flex items-center justify-center transition-colors hover:bg-[var(--t-red)]"
                  style={{ borderRight: i < socials.length - 1 ? PAPER_RULE : undefined, color: "var(--t-paper)" }}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* baseline strip */}
        <div
          className="max-w-5xl mx-auto flex items-center justify-center pt-7 text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.18em]"
          style={{ borderTop: "2px solid rgba(251,249,244,0.2)" }}
        >
          <a
            href="#home"
            className="inline-flex items-center gap-2 px-4 py-2 transition-colors hover:bg-[var(--t-red)]"
            style={{ color: "var(--t-paper)", border: "2px solid rgba(251,249,244,0.4)" }}
          >
            Back to top
            <ArrowUp className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </footer>
  )
}
