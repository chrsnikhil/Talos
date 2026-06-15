"use client"

import { useEffect, useRef } from "react"
import { SiSui, SiBitcoin, SiEthereum, SiNextdotjs, SiSolidity, SiTypescript } from "react-icons/si"
import { FaLaptopCode, FaVideo, FaEdit } from "react-icons/fa"
import { GiBasketballBall } from "react-icons/gi"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const skills = [
  { label: "Sui", icon: SiSui },
  { label: "Bitcoin", icon: SiBitcoin },
  { label: "Ethereum", icon: SiEthereum },
  { label: "NextJS", icon: SiNextdotjs },
  { label: "Solidity", icon: SiSolidity },
  { label: "TypeScript", icon: SiTypescript },
  { label: "Fullstack Development", icon: FaLaptopCode },
  { label: "Editing", icon: FaEdit },
  { label: "VideoGraphy", icon: FaVideo },
]

const mantra = ["Build", "Ship", "Iterate", "Win Hackathons", "Stay Curious", "Lift Heavy", "Repeat"]

const RULE = "3px solid var(--t-ink)"

/**
 * Arena jumbotron ticker. Both bands drift on their own; scrolling adds
 * velocity so they scrub with the page (and reverse on scroll-up). Hovering
 * eases the whole thing almost to a stop so items can be read.
 */
export function LogoMarquee() {
  const sectionRef = useScrollReveal()
  const skillsTrackRef = useRef<HTMLDivElement>(null)
  const mantraTrackRef = useRef<HTMLDivElement>(null)
  const hoverRef = useRef(false)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let raf = 0
    let pos = 0
    let lastY = window.scrollY
    let velocity = 0
    let speedFactor = 1
    let lastTime = performance.now()

    const applyTransform = (el: HTMLDivElement | null, direction: 1 | -1) => {
      if (!el) return
      const half = el.scrollWidth / 2
      if (half <= 0) return
      const x = (((pos * direction) % half) + half) % half
      el.style.transform = `translate3d(${-x}px, 0, 0)`
    }

    const loop = (now: number) => {
      const dt = Math.min(now - lastTime, 64) / 16.67
      lastTime = now

      const y = window.scrollY
      velocity = velocity * 0.92 + (y - lastY) * 0.08
      lastY = y

      const targetSpeed = hoverRef.current ? 0.12 : 1
      speedFactor += (targetSpeed - speedFactor) * 0.08

      pos += (1.1 + velocity * 0.45) * speedFactor * dt

      applyTransform(skillsTrackRef.current, 1)
      applyTransform(mantraTrackRef.current, -1)
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      ref={sectionRef}
      className="overflow-hidden"
      style={{ borderBottom: RULE }}
      onMouseEnter={() => { hoverRef.current = true }}
      onMouseLeave={() => { hoverRef.current = false }}
    >
      <div className="scroll-reveal">
        {/* Announcements band — red, reverse direction */}
        <div
          className="overflow-hidden py-3"
          style={{ background: "var(--t-red)", color: "#fff", borderBottom: RULE }}
        >
          <div ref={mantraTrackRef} className="flex w-max items-center will-change-transform">
            {[...mantra, ...mantra, ...mantra, ...mantra, ...mantra, ...mantra].map((word, index) => (
              <div key={index} className="flex items-center">
                <span className="vl-display px-5 text-lg md:text-xl whitespace-nowrap">{word}</span>
                <GiBasketballBall className="h-4 w-4 shrink-0" style={{ color: "var(--t-silver)" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Starting lineup band — navy, forward direction, hover inverts to red */}
        <div className="overflow-hidden py-6" style={{ background: "var(--t-navy)", color: "var(--t-paper)" }}>
          <div ref={skillsTrackRef} className="flex w-max items-center will-change-transform">
            {[...skills, ...skills, ...skills, ...skills].map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="group mx-2 flex items-center gap-3 px-5 py-2 cursor-default whitespace-nowrap transition-colors duration-200 hover:bg-[var(--t-red)] hover:text-white">
                  <item.icon className="h-8 w-8 shrink-0" />
                  <span className="vl-display text-2xl md:text-3xl">{item.label}</span>
                </div>
                <span className="text-xs font-black" style={{ color: "var(--t-silver)" }}>
                  ★
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
