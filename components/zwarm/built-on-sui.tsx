"use client"

import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const RULE = "3px solid var(--t-ink)"

const STACK = [
  { primitive: "Move policy object", role: "Caps budget + protocol scope + expiry; owner can revoke. Safety by enforcement." },
  { primitive: "Programmable Transaction Blocks", role: "Redeem → swap → supply as one atomic transaction. No half-rebalanced state." },
  { primitive: "Walrus", role: "Every decision content-addressed and verifiable; blobId recorded on-chain." },
  { primitive: "On-chain reputation", role: "Daedalus's critic ratings settle on-chain — tamper-proof, portable." },
  { primitive: "Suilend · Scallop · DeepBook", role: "The yield substrate + swap leg the agent composes across." },
  { primitive: "Enoki zkLogin", role: "OAuth onboarding for the owner; agents use dedicated keypairs." },
]

export function BuiltOnSui() {
  const ref = useScrollReveal()
  return (
    <section
      id="stack"
      ref={ref}
      className="relative overflow-hidden py-20 md:py-28"
      style={{ borderBottom: RULE, background: "var(--t-paper)" }}
    >
      <div aria-hidden="true" className="vl-backdrop-type vl-outline absolute -top-2 right-[-0.04em] z-0 text-[clamp(48px,9vw,150px)]">
        On Sui
      </div>
      <span aria-hidden="true" className="vl-rail-vertical hidden lg:block absolute right-6 top-32 z-20 text-3xl" style={{ color: "var(--t-navy)" }}>
        ΤΕΧΝΗ
      </span>

      <div className="relative z-10 px-5 md:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="scroll-reveal mb-12">
            <span className="vl-badge mb-5">Sui isn't the brain — it's what makes the brain safe</span>
            <h2 className="vl-display text-[clamp(40px,7vw,92px)] leading-[0.85] mt-5 mb-4" style={{ color: "var(--t-navy)" }}>
              Built on Sui
            </h2>
            <p className="text-base md:text-lg font-medium leading-relaxed max-w-2xl" style={{ color: "var(--t-text-muted)" }}>
              The LLM reasons off-chain. Sui makes the agent safer and more composable — at the custody, control, and
              verification layers, not the cognition layer.
            </p>
          </div>

          <div className="scroll-reveal vl-doc bg-[var(--t-bg-card)] overflow-hidden">
            {STACK.map((s) => (
              <div key={s.primitive} className="vl-row grid sm:grid-cols-[minmax(0,260px)_1fr]">
                <div
                  className="vl-display text-base px-5 py-4 flex items-center"
                  style={{ color: "var(--t-ink)", background: "var(--t-navy)" }}
                >
                  {s.primitive}
                </div>
                <div className="px-5 py-4 text-sm font-medium leading-relaxed flex items-center" style={{ color: "var(--t-ink)" }}>
                  {s.role}
                </div>
              </div>
            ))}
          </div>

          <p className="scroll-reveal mt-5 text-xs font-medium" style={{ color: "var(--t-text-muted)", fontFamily: "var(--font-mono)" }}>
            Mainnet Package ID: <span style={{ color: "var(--t-navy)" }}>published at deploy</span>
          </p>
        </div>
      </div>
    </section>
  )
}
