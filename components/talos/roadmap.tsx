"use client"

import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const liveItems = [
  "agent_policy + reputation deployed to testnet",
  "Autonomous Icarus rebalancing loop",
  "Daedalus on-chain critic ratings",
  "Live dashboard + Walrus-logged decisions",
]

const RULE = "3px solid var(--t-ink)"
const TILE_SHADOW = "7px 7px 0 0 var(--t-navy)"

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div
      className="text-[10px] font-extrabold uppercase tracking-[0.22em] mb-2"
      style={{ color: light ? "rgba(251,249,244,0.7)" : "var(--t-text-muted)" }}
    >
      {children}
    </div>
  )
}

export function Roadmap() {
  const sectionRef = useScrollReveal()

  return (
    <section
      id="roadmap"
      ref={sectionRef}
      className="relative overflow-hidden py-20 md:py-28"
      style={{ borderBottom: RULE, background: "var(--t-paper)" }}
    >
      <div aria-hidden="true" className="vl-backdrop-type vl-outline absolute -bottom-8 right-[-0.04em] z-0 text-[clamp(120px,24vw,400px)]">
        Roadmap
      </div>
      <span
        aria-hidden="true"
        className="vl-rail-vertical hidden lg:block absolute right-6 top-32 z-20 text-3xl"
        style={{ color: "var(--t-red)" }}
      >
        航路
      </span>

      <div className="relative z-10 px-5 md:px-10">
        <div className="max-w-[1560px] mx-auto">
          <div className="scroll-reveal mb-10 text-center">
            <h2 className="vl-display text-[clamp(40px,7vw,92px)] leading-[0.85]" style={{ color: "var(--t-navy)" }}>
              Roadmap
            </h2>
          </div>

          {/* ── Unconventional bento ───────────────────────────── */}
          <div className="scroll-reveal scroll-delay-1 grid grid-cols-1 md:grid-cols-4 auto-rows-[minmax(132px,auto)] gap-5">
            {/* LIVE NOW — emphasis, clean sharp tile, spans 2×2 */}
            <div
              className="md:col-span-2 md:row-span-2 relative overflow-hidden flex flex-col items-center justify-center text-center px-8 py-12"
              style={{ border: RULE, boxShadow: "10px 10px 0 0 var(--t-navy)", background: "var(--t-bg-card)" }}
            >
              {/* angled red accent slash, bottom-left */}
              <div
                aria-hidden="true"
                className="absolute -bottom-6 -left-10 w-56 h-12"
                style={{ background: "var(--t-red)", transform: "rotate(-8deg)" }}
              />
              <span aria-hidden="true" className="vl-rail-vertical absolute top-5 right-5 text-xl" style={{ color: "var(--t-red)" }}>
                稼働
              </span>

              <Eyebrow>Phase 01</Eyebrow>
              <div className="vl-display text-3xl md:text-5xl leading-[0.9] my-2" style={{ color: "var(--t-navy)" }}>
                Live now
              </div>
              <div className="relative mt-4 text-[11px] font-extrabold uppercase tracking-[0.28em]" style={{ color: "var(--t-ink)" }}>
                Sui Testnet · Shipped
              </div>
            </div>

            {/* LIVE NOW — phase summary, navy emphasis */}
            <div className="md:col-span-2 flex flex-col justify-center px-7 py-7" style={{ border: RULE, background: "var(--t-navy)", boxShadow: TILE_SHADOW }}>
              <Eyebrow light>Phase 01 — Live now</Eyebrow>
              <div className="vl-display text-2xl md:text-[34px] leading-[0.95] text-white">Autonomous swarm, on-chain</div>
            </div>

            {/* NEXT — status */}
            <div className="md:col-span-2 flex flex-col justify-center px-6 py-7" style={{ border: RULE, background: "var(--t-bg-card)", boxShadow: TILE_SHADOW }}>
              <Eyebrow>Phase 02 — Next</Eyebrow>
              <div className="flex items-center gap-2 text-base md:text-lg font-bold" style={{ color: "var(--t-ink)" }}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "var(--t-orange)" }} />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "var(--t-orange)" }} />
                </span>
                Real fund movement
              </div>
              <div className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--t-text-muted)" }}>
                Suilend · Scallop · DeepBook → Mainnet
              </div>
            </div>

            {/* LIVE NOW — detail bullets */}
            <div className="md:col-span-2 flex flex-col justify-center px-7 py-7" style={{ border: RULE, background: "var(--t-bg-card)", boxShadow: TILE_SHADOW }}>
              <Eyebrow>What&apos;s live</Eyebrow>
              <ul className="text-sm md:text-base leading-relaxed space-y-1.5" style={{ color: "var(--t-text-muted)" }}>
                {liveItems.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span style={{ color: "var(--t-red)" }}>—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* VISION */}
            <div className="md:col-span-2 flex flex-col justify-center px-7 py-7" style={{ border: RULE, background: "var(--t-bg-card)", boxShadow: TILE_SHADOW }}>
              <Eyebrow>Phase 03 — Vision</Eyebrow>
              <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--t-text-muted)" }}>
                A strategy marketplace — ownable on-chain strategy objects, subscribers, and royalties paid to the
                authors whose agents consistently earn the best critic ratings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
