"use client"

import { Linkedin } from "lucide-react"
import Image from "next/image"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const techStack = [
  "Solidity",
  "Move",
  "TypeScript",
  "Next.js",
  "React",
  "Three.js",
  "Tailwind",
  "Node.js",
  "Python",
  "SQL",
]

const highlights = [
  {
    title: "Web3 & Fullstack Expert",
    description:
      "Building comprehensive solutions that bridge the gap between traditional web technologies and decentralized protocols.",
  },
  {
    title: "Smart Contract Specialist",
    description: (
      <>
        Specialized in writing secure smart contracts in <span className="font-bold">Solidity</span> and{" "}
        <span className="font-bold">Move</span> for complex DeFi and volatility index systems.
      </>
    ),
  },
]

const vitals = [
  { label: "Position", value: "AI / Web3 / Fullstack" },
  { label: "Hometown", value: "Chennai, IN" },
  { label: "Status", value: "Active", live: true },
]

const RULE = "3px solid var(--t-ink)"

export function AboutSection() {
  const sectionRef = useScrollReveal()

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative overflow-hidden py-20 md:py-28"
      style={{ borderBottom: RULE, background: "var(--t-paper)" }}
    >
      <div aria-hidden="true" className="vl-backdrop-type vl-outline absolute -top-4 right-[-0.04em] z-0 text-[clamp(90px,18vw,300px)]">
        About
      </div>
      <span
        aria-hidden="true"
        className="vl-rail-vertical hidden lg:block absolute left-6 top-32 z-20 text-3xl"
        style={{ color: "var(--t-navy)" }}
      >
        選手紹介
      </span>

      <div className="relative z-10 px-5 md:px-10">
        <div className="max-w-[1560px] mx-auto">
          <div className="scroll-reveal mb-10">
            <h2 className="vl-display text-[clamp(40px,7vw,92px)] leading-[0.85]" style={{ color: "var(--t-navy)" }}>
              About Me
            </h2>
          </div>

          {/* Profile card — clean sharp rectangle, hard navy shadow */}
          <div
            className="scroll-reveal scroll-delay-1 relative overflow-hidden"
            style={{ border: RULE, boxShadow: "14px 14px 0 0 var(--t-navy)", background: "var(--t-bg-card)" }}
          >
            {/* paper face */}
              <div className="grid md:grid-cols-[clamp(360px,32%,520px)_1fr]">
                {/* ── Photo panel ─────────────────────────────── */}
                <div className="relative flex flex-col" style={{ background: "var(--t-ink)" }}>
                  {/* angled red flash across the top corner */}
                  <div
                    aria-hidden="true"
                    className="absolute -top-2 -left-2 w-44 h-12 z-10 origin-top-left"
                    style={{ background: "var(--t-red)", transform: "rotate(-6deg)", borderBottom: "3px solid var(--t-ink)" }}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 left-3 z-20 text-[10px] font-extrabold uppercase tracking-[0.22em] text-white origin-top-left"
                    style={{ transform: "rotate(-6deg)" }}
                  >
                    Profile &apos;26
                  </span>

                  <div className="relative flex-1 min-h-[400px] z-[1]">
                    <Image src="/one.png" alt="Chris Nikhil" fill priority className="object-cover object-top" />
                  </div>

                  {/* nameplate — №10 + name, same italic display font */}
                  <div className="relative z-[2] flex items-baseline gap-3 md:gap-4 px-5 py-4 text-white" style={{ borderTop: RULE, background: "var(--t-ink)" }}>
                    <span className="vl-display text-4xl md:text-5xl leading-none">№10</span>
                    <span className="vl-display text-2xl md:text-3xl leading-none whitespace-nowrap">Chris Nikhil</span>
                  </div>
                </div>

                {/* ── Stats panel ─────────────────────────────── */}
                <div className="md:border-l-[3px] border-black flex flex-col">
                  {/* vitals header */}
                  <div className="grid grid-cols-1 sm:grid-cols-3" style={{ borderBottom: RULE }}>
                    {vitals.map((v, i) => (
                      <div
                        key={v.label}
                        className="px-5 py-4 max-sm:border-b-[3px] sm:border-r-[3px] border-black last:border-0"
                        style={{ borderColor: "var(--t-ink)" }}
                      >
                        <div className="text-[9px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--t-text-muted)" }}>
                          {v.label}
                        </div>
                        <div className="text-sm md:text-base font-bold flex items-center gap-1.5 mt-1" style={{ color: "var(--t-ink)" }}>
                          {v.live && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "var(--t-orange)" }} />
                              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--t-orange)" }} />
                            </span>
                          )}
                          {v.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* scout's notes */}
                  <div className="p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-block w-6 h-[3px]" style={{ background: "var(--t-red)", transform: "skewX(-30deg)" }} />
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: "var(--t-red)" }}>
                        Bio
                      </span>
                    </div>
                    <p className="text-base md:text-lg leading-relaxed font-medium max-w-3xl" style={{ color: "var(--t-text-muted)" }}>
                      I believe in the power of decentralization to reshape digital ownership and interaction. Building
                      transparent, permissionless, and efficient systems isn&apos;t just about code—it&apos;s about crafting the
                      infrastructure for the next generation of the internet.
                    </p>
                  </div>

                  {/* attribute rows — 2-up to use the width */}
                  <div className="grid sm:grid-cols-2" style={{ borderTop: RULE }}>
                    {highlights.map((item, i) => (
                      <div
                        key={item.title}
                        className="flex gap-3 items-start p-6 md:p-7 max-sm:border-b-[3px] sm:border-r-[3px] border-black last:border-0"
                        style={{ borderColor: "var(--t-ink)" }}
                      >
                        <span className="w-4 h-4 mt-1 flex-shrink-0" style={{ background: "var(--t-navy)", transform: "rotate(45deg)", border: "2px solid var(--t-ink)" }} />
                        <div>
                          <h3 className="text-base md:text-lg font-bold mb-1" style={{ color: "var(--t-ink)" }}>
                            {item.title}
                          </h3>
                          <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* tools */}
                  <div className="p-6 md:px-8 md:py-7" style={{ borderTop: RULE }}>
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3" style={{ color: "var(--t-text-muted)" }}>
                      Tools I reach for
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {techStack.map((tech) => (
                        <span key={tech} className="vl-chip">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* footer */}
                  <div className="mt-auto flex items-center justify-between gap-4 px-6 md:px-8 py-5" style={{ borderTop: RULE }}>
                    <span
                      aria-hidden="true"
                      className="text-lg italic"
                      style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", color: "var(--t-ink)" }}
                    >
                      C.Nikhil &rsquo;26
                    </span>
                    <a
                      href="https://www.linkedin.com/in/chris-nikhil-6883ba290/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vl-btn inline-flex items-center gap-2 px-7 py-3.5 text-xs font-extrabold uppercase tracking-[0.14em] text-white"
                      style={{ background: "var(--t-navy)" }}
                    >
                      <Linkedin className="w-4 h-4" />
                      Connect
                    </a>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    </section>
  )
}
