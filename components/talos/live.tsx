"use client"

import { useState, useRef, useEffect } from "react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import { Cpu, Gauge, ShieldCheck, ScrollText, Activity, Star } from "lucide-react"
import { ChevronUp, ChevronDown, Power } from "lucide-react"

const channels = [
  { icon: Cpu, title: "Icarus · rebalance", description: "Executor agent moves real USDC on-chain. Last tx: +4.2% to lending pool, within policy bounds.", accent: "var(--t-red)", tag: "EXECUTING" },
  { icon: Star, title: "Daedalus · rating 92/100", description: "Critic agent scores every decision on-chain. Rolling reputation holds at avg 92/100 across 1,284 calls.", accent: "var(--t-navy)", tag: "RATING" },
  { icon: ShieldCheck, title: "Policy · budget leash", description: "Move policy caps exposure per move. Daily leash 60% drawn — agent throttled, no override possible.", accent: "var(--t-red)", tag: "ENFORCED" },
  { icon: ScrollText, title: "Walrus · decision log", description: "Every rationale and rating pinned to Walrus. Immutable trail of why each USDC move was made.", accent: "var(--t-navy)", tag: "PINNED" },
  { icon: Gauge, title: "Treasury · USDC live", description: "Operator treasury balance streamed from testnet. Two agents, zero trust, one shared ledger.", accent: "var(--t-navy)", tag: "ON-CHAIN" },
  { icon: Activity, title: "Heartbeat · testnet", description: "Swarm health check every block. Icarus proposes, Daedalus rates, the chain settles the truth.", accent: "var(--t-red)", tag: "LIVE" },
]

const RULE = "3px solid var(--t-ink)"

function Knob() {
  return (
    <span className="relative block w-7 h-7 md:w-8 md:h-8 rounded-full" style={{ background: "radial-gradient(circle at 34% 28%, #3a4860, #0a0e16)", border: "2px solid #000", boxShadow: "0 3px 0 0 rgba(0,0,0,0.55)" }}>
      <span className="absolute left-1/2 top-1 -translate-x-1/2 block rounded-full" style={{ width: 2, height: 9, background: "rgba(251,249,244,0.7)" }} />
    </span>
  )
}

export function Live() {
  const sectionRef = useScrollReveal()
  const [channel, setChannel] = useState(0)
  const [staticOn, setStaticOn] = useState(false)
  const [tuneKey, setTuneKey] = useState(0)
  const [powered, setPowered] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const change = (next: number) => {
    if (!powered) return
    const idx = (next + channels.length) % channels.length
    setStaticOn(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setChannel(idx)
      setTuneKey((k) => k + 1)
      setStaticOn(false)
    }, 240)
  }

  const togglePower = () => {
    setPowered((p) => {
      const on = !p
      if (on) {
        setStaticOn(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => { setTuneKey((k) => k + 1); setStaticOn(false) }, 280)
      } else {
        setStaticOn(false)
      }
      return on
    })
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const ch = channels[channel]
  const Icon = ch.icon

  return (
    <section
      id="live"
      ref={sectionRef}
      className="relative overflow-hidden py-20 md:py-28"
      style={{ borderBottom: RULE, background: "var(--t-paper)" }}
    >
      <div aria-hidden="true" className="vl-backdrop-type vl-outline absolute -bottom-4 right-[-0.04em] z-0 text-[clamp(80px,16vw,260px)]">
        Live
      </div>
      <span aria-hidden="true" className="vl-rail-vertical hidden lg:block absolute left-6 top-32 z-20 text-3xl" style={{ color: "var(--t-navy)" }}>
        ΤΑΛΩΣ
      </span>

      <div className="relative z-10 px-5 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="scroll-reveal mb-12 text-center">
            <h2 className="vl-display text-[clamp(40px,7vw,92px)] leading-[0.85] mb-4" style={{ color: "var(--t-navy)" }}>
              Watch it run
            </h2>
            <p className="text-base md:text-lg font-medium leading-relaxed max-w-2xl mx-auto" style={{ color: "var(--t-text-muted)" }}>
              Change the channel — six live facets of the swarm running on Sui testnet.
            </p>
          </div>

          {/* ── CRT television ─────────────────────────────────── */}
          <div className="scroll-reveal scroll-delay-1 flex flex-col items-center">
            <div className="relative w-full max-w-[680px]">
              {/* rabbit-ear antenna */}
              <svg aria-hidden="true" width="180" height="92" viewBox="0 0 180 92" className="absolute left-1/2 -translate-x-1/2 -top-[80px] z-0">
                <line x1="90" y1="92" x2="44" y2="12" stroke="#101820" strokeWidth="5" strokeLinecap="round" />
                <line x1="90" y1="92" x2="136" y2="12" stroke="#101820" strokeWidth="5" strokeLinecap="round" />
                <circle cx="44" cy="10" r="7" fill="#101820" />
                <circle cx="136" cy="10" r="7" fill="#101820" />
              </svg>

              {/* body */}
              <div
                className="relative z-10 w-full p-4 md:p-5 flex gap-3 md:gap-4"
                style={{ background: "var(--t-ink)", border: RULE, borderRadius: 22, boxShadow: "var(--vl-shadow)" }}
              >
                {/* screen column */}
                <div className="flex-1 min-w-0">
                  <div
                    className="crt-screen relative overflow-hidden"
                    style={{ aspectRatio: "4 / 3", background: "#0b0f17", borderRadius: 14, border: "3px solid #000" }}
                  >
                {powered && (
                  <>
                    {/* per-channel glow */}
                    <div aria-hidden="true" className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 42%, color-mix(in srgb, ${ch.accent} 45%, transparent), transparent 60%)` }} />

                    {/* content */}
                    <div key={tuneKey} className="crt-tune relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-6 md:px-10">
                      <Icon className="w-16 h-16 md:w-24 md:h-24 mb-5" style={{ color: "var(--t-paper)" }} />
                      <h3 className="vl-display text-2xl md:text-4xl leading-[0.9] mb-3" style={{ color: "var(--t-paper)" }}>
                        {ch.title}
                      </h3>
                      <p className="text-xs md:text-sm leading-relaxed max-w-md" style={{ color: "rgba(251,249,244,0.72)" }}>
                        {ch.description}
                      </p>
                    </div>

                    {/* OSD: channel number + tag */}
                    <div key={`osd-${tuneKey}`} className="crt-osd absolute top-3 left-3 md:top-4 md:left-4 z-20 flex items-center gap-2 text-[11px] md:text-sm font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--t-paper)", fontFamily: "var(--t-font-mono)" }}>
                      CH {String(channel + 1).padStart(2, "0")}
                    </div>
                    <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20 flex items-center gap-1.5 text-[10px] md:text-xs font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--t-paper)" }}>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70" style={{ background: "var(--t-red)" }} />
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--t-red)" }} />
                      </span>
                      {ch.tag}
                    </div>
                  </>
                )}
                {!powered && (
                  <div className="relative z-10 w-full h-full flex items-center justify-center">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.32em]" style={{ color: "rgba(251,249,244,0.4)" }}>Standby</span>
                  </div>
                )}

                {/* CRT overlays */}
                <div aria-hidden="true" className="crt-scanlines absolute inset-0 z-30 pointer-events-none" />
                <div aria-hidden="true" className="crt-vignette absolute inset-0 z-30 pointer-events-none" style={{ borderRadius: 12 }} />
                <div aria-hidden="true" className="crt-flick absolute inset-0 z-30 pointer-events-none" />
                {staticOn && <div aria-hidden="true" className="crt-static absolute inset-0 z-40 pointer-events-none" />}
                  </div>

                  {/* speaker grille + brand */}
                  <div className="flex items-center gap-2 mt-3 px-1">
                    <span className="vl-display text-sm md:text-base" style={{ color: "var(--t-paper)" }}>TALOS<span className="text-[8px] align-super">®</span></span>
                    <span className="text-[7px] font-extrabold uppercase tracking-[0.28em] hidden sm:inline" style={{ color: "rgba(251,249,244,0.32)", fontFamily: "var(--t-font-mono)" }}>Testnet · Sui</span>
                    <div className="flex-1 flex items-center gap-1 justify-end">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <span key={i} className="block w-1 h-3 md:h-4 rounded-full" style={{ background: "rgba(251,249,244,0.15)" }} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* control column: tuner knobs + power */}
                <div className="flex flex-col items-center justify-center gap-3.5 shrink-0 pl-3" style={{ borderLeft: "2px solid rgba(251,249,244,0.12)" }}>
                  <span className="text-[7px] font-extrabold uppercase tracking-[0.2em]" style={{ color: "rgba(251,249,244,0.4)", fontFamily: "var(--t-font-mono)" }}>SUI</span>
                  <Knob />
                  <Knob />
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <span className="block w-3 h-3 rounded-full" style={{ background: powered ? "var(--t-red)" : "rgba(251,249,244,0.2)", boxShadow: powered ? "0 0 8px 1px var(--t-red)" : "none" }} />
                    <span className="text-[7px] font-extrabold uppercase tracking-[0.2em]" style={{ color: "rgba(251,249,244,0.5)" }}>PWR</span>
                  </div>
                </div>
              </div>

              {/* feet */}
              <div className="relative z-0 flex justify-between w-[58%] mx-auto">
                <span className="block" style={{ width: 44, height: 18, background: "var(--t-ink)", borderRadius: "0 0 10px 10px", transform: "skewX(12deg)" }} />
                <span className="block" style={{ width: 44, height: 18, background: "var(--t-ink)", borderRadius: "0 0 10px 10px", transform: "skewX(-12deg)" }} />
              </div>
            </div>

            {/* ── FPV 3D remote + hand ──────────────────────────── */}
            <div className="tv-remote-stage relative -mt-2 md:-mt-3 w-full flex justify-center">
              <div
                className="tv-remote w-[290px] md:w-[330px] px-5 py-7 select-none"
                style={{
                  background: "linear-gradient(180deg,#26314a 0%,#161d2c 55%,#0a0e18 100%)",
                  border: RULE,
                  borderRadius: 34,
                  borderTop: "3px solid rgba(251,249,244,0.18)",
                  boxShadow: "0 18px 0 -3px #080b12, 0 22px 0 -3px #000, 0 40px 44px -14px rgba(0,0,0,0.6)",
                }}
              >
                {/* top row: IR · brand · power */}
                <div className="flex items-center justify-between mb-5">
                  <span className="block w-9 h-2 rounded-full" style={{ background: "rgba(251,249,244,0.22)" }} />
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.3em]" style={{ color: "rgba(251,249,244,0.5)", fontFamily: "var(--t-font-mono)" }}>TALOS-RC1</span>
                  <button
                    onClick={togglePower}
                    aria-label="Power"
                    className="rbtn w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: "var(--t-red)", border: "2px solid var(--t-ink)", color: "#fff" }}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>

                {/* channel pad */}
                <div className="text-[9px] font-extrabold uppercase tracking-[0.28em] text-center mb-2.5" style={{ color: "rgba(251,249,244,0.4)" }}>Channel</div>
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  {channels.map((c, i) => (
                    <button
                      key={c.title}
                      onClick={() => change(i)}
                      aria-label={`Channel ${i + 1}: ${c.title}`}
                      className="rbtn h-12 rounded-xl text-sm font-extrabold"
                      style={
                        i === channel && powered
                          ? { background: "var(--t-red)", color: "#fff", border: "2px solid var(--t-ink)", fontFamily: "var(--t-font-mono)" }
                          : { background: "var(--t-bg-card)", color: "var(--t-ink)", border: "2px solid var(--t-ink)", fontFamily: "var(--t-font-mono)" }
                      }
                    >
                      {String(i + 1).padStart(2, "0")}
                    </button>
                  ))}
                </div>

                {/* CH rocker */}
                <div className="flex items-center gap-2.5 mb-4">
                  <button
                    onClick={() => change(channel - 1)}
                    aria-label="Channel down"
                    className="rbtn flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em]"
                    style={{ background: "var(--t-bg-card)", color: "var(--t-ink)", border: "2px solid var(--t-ink)" }}
                  >
                    <ChevronDown className="w-4 h-4" /> CH
                  </button>
                  <button
                    onClick={() => change(channel + 1)}
                    aria-label="Channel up"
                    className="rbtn flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white"
                    style={{ background: "var(--t-navy)", border: "2px solid var(--t-ink)" }}
                  >
                    CH <ChevronUp className="w-4 h-4" />
                  </button>
                </div>

                {/* grip ridges + model */}
                <div className="flex flex-col items-center gap-1.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className="block rounded-full" style={{ width: "52%", height: 3, background: "rgba(251,249,244,0.1)" }} />
                  ))}
                  <span className="mt-1 text-[7px] font-extrabold uppercase tracking-[0.3em]" style={{ color: "rgba(251,249,244,0.3)", fontFamily: "var(--t-font-mono)" }}>Model TALOS-RC1 · IR</span>
                </div>
              </div>

            </div>

            {/* ── Launch dashboard CTA ──────────────────────────── */}
            <a
              href="/dashboard"
              className="vl-btn inline-flex items-center gap-2 mt-10 px-8 py-4 text-sm md:text-base font-extrabold uppercase tracking-[0.12em] text-white"
              style={{ background: "var(--t-red)", borderColor: "var(--t-ink)" }}
            >
              <Activity className="w-5 h-5" />
              Launch dashboard
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
