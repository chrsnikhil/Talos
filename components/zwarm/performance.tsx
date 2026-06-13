"use client"

import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const RULE = "3px solid var(--t-ink)"

// Placeholder until the agents are live on mainnet — wire to GET /api/public/stats.
const STATS = [
  { label: "Cycles fired", value: "—" },
  { label: "Confirmed txs", value: "—" },
  { label: "Time-weighted APY", value: "—" },
  { label: "Optimal pick rate", value: "—" },
]

export function Performance() {
  const ref = useScrollReveal()
  return (
    <section
      id="live"
      ref={ref}
      className="relative overflow-hidden py-20 md:py-28"
      style={{ borderBottom: RULE, background: "var(--t-paper)" }}
    >
      <div aria-hidden="true" className="vl-backdrop-type vl-outline absolute -top-2 left-[-0.04em] z-0 text-[clamp(56px,11vw,180px)]">
        Live
      </div>

      <div className="relative z-10 px-5 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="scroll-reveal mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="vl-badge mb-5">Real money, on mainnet</span>
              <h2 className="vl-display text-[clamp(40px,7vw,92px)] leading-[0.85] mt-5" style={{ color: "var(--t-navy)" }}>
                Live performance
              </h2>
            </div>
            <a
              href="#"
              className="vl-btn inline-flex items-center gap-2 px-7 py-3.5 text-sm font-extrabold uppercase tracking-[0.14em] text-[#11181D]"
              style={{ background: "var(--t-red)" }}
            >
              Open the dashboard
            </a>
          </div>

          {/* box-score stat strip */}
          <div className="scroll-reveal vl-card bg-[var(--t-bg-card)] grid grid-cols-2 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className="flex flex-col items-center justify-center py-10 px-4 text-center"
                style={{
                  borderRight: i < STATS.length - 1 ? RULE : undefined,
                  borderBottom: i < 2 ? RULE : undefined,
                }}
              >
                <span className="vl-display text-[clamp(34px,5vw,60px)] leading-none" style={{ color: "var(--t-ink)" }}>
                  {s.value}
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] mt-3" style={{ color: "var(--t-text-muted)" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <p className="scroll-reveal mt-5 text-xs font-medium" style={{ color: "var(--t-text-muted)", fontFamily: "var(--font-mono)" }}>
            Streams live from <span style={{ color: "var(--t-navy)" }}>GET /api/public/stats</span> once Icarus is deployed to Sui mainnet.
          </p>
        </div>
      </div>
    </section>
  )
}
