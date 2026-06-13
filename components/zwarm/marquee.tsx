"use client"

const ITEMS = [
  "SUILEND",
  "SCALLOP",
  "DEEPBOOK V3",
  "WALRUS",
  "MOVE",
  "PTBs",
  "ON-CHAIN POLICY",
  "USDC",
  "SUI MAINNET",
  "VERIFIABLE MEMORY",
]

const RULE = "3px solid var(--t-ink)"

export function Marquee() {
  const group = (
    <div className="flex shrink-0 items-center">
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center">
          <span className="vl-display px-7 py-4 text-xl md:text-2xl whitespace-nowrap">{item}</span>
          <span aria-hidden="true" className="text-xl md:text-2xl" style={{ color: "var(--t-red)" }}>
            ✦
          </span>
        </span>
      ))}
    </div>
  )

  return (
    <div
      className="overflow-hidden"
      style={{ borderBottom: RULE, background: "var(--t-navy)", color: "var(--t-ink)" }}
    >
      <div className="flex animate-marquee">
        {group}
        {group}
      </div>
    </div>
  )
}
