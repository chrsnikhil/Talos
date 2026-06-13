"use client"

import { Wallet, ListChecks, Timer, Ban, ScrollText } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const RULE = "3px solid var(--t-ink)"

const CONSTRAINTS = [
  { icon: Wallet, term: "Budget ceiling", detail: "per_tx_cap + remaining_budget, decremented on-chain on every spend" },
  { icon: ListChecks, term: "Protocol scope", detail: "allowed_protocols allowlist — anything off-list is rejected" },
  { icon: Timer, term: "Expiry", detail: "expires_at_ms checked against the on-chain Clock (0x6)" },
  { icon: Ban, term: "Owner revocation", detail: "OwnerCap flips revoked = true; the next spend aborts instantly" },
  { icon: ScrollText, term: "Activity log", detail: "every action emits a typed event — a permanent on-chain audit trail" },
]

export function Safety() {
  const ref = useScrollReveal()
  return (
    <section
      id="safety"
      ref={ref}
      className="relative overflow-hidden py-20 md:py-28"
      style={{ borderBottom: RULE, background: "var(--t-paper)" }}
    >
      <div aria-hidden="true" className="vl-backdrop-type vl-outline absolute -top-2 right-[-0.04em] z-0 text-[clamp(50px,10vw,160px)]">
        Leash
      </div>
      <span aria-hidden="true" className="vl-rail-vertical hidden lg:block absolute left-6 top-32 z-20 text-3xl" style={{ color: "var(--t-red)" }}>
        ΜΗΔΕΝ ΑΓΑΝ
      </span>

      <div className="relative z-10 px-5 md:px-12">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-start">
          <div className="scroll-reveal-left">
            <span className="vl-badge mb-5">Safety by enforcement, not trust</span>
            <h2 className="vl-display text-[clamp(40px,7vw,84px)] leading-[0.85] mt-5 mb-5" style={{ color: "var(--t-navy)" }}>
              The on-chain leash
            </h2>
            <p className="text-base md:text-lg font-medium leading-relaxed mb-4" style={{ color: "var(--t-text-muted)" }}>
              The LLM decides off-chain — but it can only ever spend what a Move <strong>AgentPolicy</strong> object
              permits. The ceiling, scope, and expiry are enforced by the contract itself.
            </p>
            <p className="text-base md:text-lg font-medium leading-relaxed" style={{ color: "var(--t-ink)" }}>
              Even a hallucinating or compromised agent <strong>physically cannot</strong> exceed its limits — the
              transaction is rejected on-chain. And the owner can pull the plug at any moment.
            </p>
            <div className="mt-7">
              <span className="vl-stamp text-lg">Revocable · Bounded · Auditable</span>
            </div>
          </div>

          <div className="scroll-reveal-right vl-doc bg-[var(--t-bg-card)] overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: RULE, background: "var(--t-navy)" }}>
              <span className="vl-display text-lg text-white">AgentPolicy</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/80" style={{ fontFamily: "var(--font-mono)" }}>
                shared object
              </span>
            </div>
            <div>
              {CONSTRAINTS.map((c) => {
                const Icon = c.icon
                return (
                  <div key={c.term} className="vl-row flex items-start gap-4 px-5 py-4">
                    <Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--t-red)" }} />
                    <div>
                      <div className="text-sm font-extrabold uppercase tracking-wide" style={{ color: "var(--t-ink)" }}>{c.term}</div>
                      <div className="text-xs font-medium leading-snug mt-0.5" style={{ color: "var(--t-text-muted)", fontFamily: "var(--font-mono)" }}>
                        {c.detail}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
