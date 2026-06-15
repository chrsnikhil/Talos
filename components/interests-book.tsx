"use client"

import { useRef, useState, useEffect, forwardRef } from "react"
// @ts-expect-error - react-pageflip ships its own types but resolves loosely here
import HTMLFlipBook from "react-pageflip"
import gsap from "gsap"
import { FaCode, FaEthereum, FaVideo, FaDumbbell, FaGamepad, FaBookOpen } from "react-icons/fa"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { StarDoodle, SparkleDoodle, BoltDoodle, RingDoodle } from "@/components/doodles"

const interests = [
  { icon: FaEthereum, title: "Web3 & DeFi", description: "Exploring decentralized protocols, smart contracts, and the future of finance on-chain.", accent: "var(--t-navy)", sfx: "WHOA!" },
  { icon: FaCode, title: "Open Source", description: "Contributing to and building tools that empower the developer community worldwide.", accent: "var(--t-navy)", sfx: "FORK!" },
  { icon: FaVideo, title: "Content Creation", description: "Editing dynamic recaps and promo videos that capture the energy of hackathons and tech events.", accent: "var(--t-navy)", sfx: "CUT!" },
  { icon: FaDumbbell, title: "Fitness", description: "Discipline in the gym fuels clarity in code. Consistent training transformed my lifestyle and focus.", accent: "var(--t-red)", sfx: "PUMP!" },
  { icon: FaGamepad, title: "Gaming", description: "Competitive gaming sharpens strategy and reaction time — skills that translate directly to problem-solving.", accent: "var(--t-navy)", sfx: "GG!" },
  { icon: FaBookOpen, title: "Continuous Learning", description: "Always picking up new frameworks, languages, and paradigms to stay ahead of the curve.", accent: "var(--t-navy)", sfx: "LEVEL UP!" },
]

const RULE = "3px solid var(--t-ink)"
const TOTAL = interests.length + 1

// react-pageflip requires each page to be able to receive a ref
const Page = forwardRef<HTMLDivElement, { children: React.ReactNode; index: number }>(
  function Page({ children, index }, ref) {
    return (
      <div ref={ref} data-page={index} className="vl-page" style={{ border: RULE }}>
        <div className="vl-page-inner">{children}</div>
      </div>
    )
  }
)

function CoverContent() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-8 overflow-hidden" style={{ background: "var(--t-navy)" }}>
      <div aria-hidden="true" className="comic-halftone absolute inset-0" style={{ color: "var(--t-paper)", opacity: 0.12 }} />
      <div aria-hidden="true" className="comic-burst absolute inset-0 opacity-50" />
      <div className="vl-ink-frame vl-ink-frame-light" />

      {/* ink-art doodles */}
      <StarDoodle aria-hidden className="vl-doodle absolute top-7 left-7 w-9 h-9" style={{ color: "var(--t-red)" }} />
      <SparkleDoodle aria-hidden className="vl-doodle absolute bottom-10 right-8 w-8 h-8" style={{ color: "var(--t-paper)", animationDelay: "1.2s" }} />
      <RingDoodle aria-hidden className="vl-doodle absolute top-12 right-10 w-7 h-7" style={{ color: "var(--t-paper)", opacity: 0.6, animationDelay: "0.6s" }} />

      <div className="relative">
        <div className="js-kicker text-[10px] font-extrabold uppercase tracking-[0.3em] mb-3" style={{ color: "rgba(251,249,244,0.7)" }}>Issue № 1</div>
        <h3 className="js-title vl-display text-[clamp(48px,9vw,84px)] leading-[0.82] text-white">Interests</h3>
        <div className="js-desc mt-3 text-xs font-extrabold uppercase tracking-[0.22em]" style={{ color: "rgba(251,249,244,0.85)" }}>Off the Court</div>

        {/* cover emblem */}
        <img src="/patch.png" alt="" aria-hidden className="w-20 h-20 mx-auto mt-7 rounded-full" style={{ border: "2px solid var(--t-paper)" }} />

        <div className="mt-6 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: "rgba(251,249,244,0.7)" }}>
          Drag a corner to flip <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  )
}

function InterestContent({ it, num }: { it: (typeof interests)[number]; num: number }) {
  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: "var(--t-bg-card)" }}>
      <div className="vl-ink-frame" />

      {/* art panel */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden" style={{ borderBottom: RULE }}>
        <div aria-hidden="true" className="comic-halftone absolute inset-0" style={{ color: it.accent, opacity: 0.22 }} />
        <div aria-hidden="true" className="comic-burst absolute inset-0" />

        {/* starburst behind the icon */}
        <StarDoodle aria-hidden className="absolute w-44 h-44 md:w-56 md:h-56 opacity-10" style={{ color: it.accent }} />

        <it.icon className="js-art relative w-24 h-24 md:w-32 md:h-32" style={{ color: it.accent }} />

        {/* ink doodles */}
        <SparkleDoodle aria-hidden className="vl-doodle absolute top-5 right-6 w-7 h-7" style={{ color: it.accent }} />
        <BoltDoodle aria-hidden className="vl-doodle absolute bottom-6 left-5 w-6 h-8" style={{ color: "var(--t-ink)", opacity: 0.55, animationDelay: "0.8s" }} />

        <div className="absolute top-3 left-3 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider" style={{ background: "var(--t-bg-card)", border: "2px solid var(--t-ink)", color: "var(--t-ink)" }}>
          № {String(num).padStart(2, "0")}
        </div>
        <span className="js-sfx vl-display absolute bottom-3 right-3 text-lg md:text-xl px-2 py-0.5 text-white" style={{ background: it.accent, border: "2px solid var(--t-ink)", boxShadow: "3px 3px 0 0 var(--t-ink)", transform: "rotate(-5deg)" }}>
          {it.sfx}
        </span>
      </div>

      {/* narration */}
      <div className="p-5 md:p-7">
        <h3 className="js-title inline-flex items-center gap-2 text-xl md:text-2xl font-bold mb-2.5" style={{ color: "var(--t-ink)" }}>
          <span className="inline-block w-3.5 h-3.5 rotate-45 shrink-0" style={{ background: it.accent, border: "2px solid var(--t-ink)" }} />
          {it.title}
        </h3>
        <p className="js-desc text-sm md:text-base leading-relaxed" style={{ color: "var(--t-text-muted)" }}>{it.description}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className="inline-block flex-1 h-[2px]" style={{ background: "color-mix(in srgb, var(--t-ink) 18%, transparent)" }} />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: "var(--t-text-muted)" }}>{num} / {interests.length}</span>
        </div>
      </div>
    </div>
  )
}

export default function InterestsBook() {
  const bookRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)

  const animatePage = (i: number) => {
    const root = containerRef.current
    if (!root) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const sel = (c: string) => root.querySelector(`[data-page="${i}"] ${c}`)
    const targets = [sel(".js-art"), sel(".js-title"), sel(".js-desc"), sel(".js-sfx"), sel(".js-kicker")].filter(Boolean) as Element[]
    if (reduce) { gsap.set(targets, { opacity: 1, clearProps: "transform" }); return }

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
    if (sel(".js-kicker")) tl.fromTo(sel(".js-kicker"), { y: -14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 })
    if (sel(".js-art")) tl.fromTo(sel(".js-art"), { scale: 0.5, rotate: -10, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.55, ease: "back.out(1.7)" }, sel(".js-kicker") ? "-=0.2" : 0)
    tl.fromTo(sel(".js-title"), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, "-=0.25")
    tl.fromTo(sel(".js-desc"), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, "-=0.3")
    if (sel(".js-sfx")) tl.fromTo(sel(".js-sfx"), { scale: 0, rotate: -24, opacity: 0 }, { scale: 1, rotate: -5, opacity: 1, duration: 0.5, ease: "back.out(2.2)" }, "-=0.2")
  }

  // animate the cover once the book has mounted
  useEffect(() => {
    const t = setTimeout(() => animatePage(0), 250)
    return () => clearTimeout(t)
  }, [])

  const onFlip = (e: { data: number }) => {
    setPage(e.data)
    animatePage(e.data)
  }

  const flipNext = () => bookRef.current?.pageFlip()?.flipNext()
  const flipPrev = () => bookRef.current?.pageFlip()?.flipPrev()

  return (
    <div className="flex flex-col items-center">
      <div ref={containerRef} className="w-full max-w-[840px] mx-auto flex justify-center">
        <HTMLFlipBook
          width={380}
          height={506}
          size="stretch"
          minWidth={300}
          maxWidth={420}
          minHeight={400}
          maxHeight={560}
          maxShadowOpacity={0.6}
          showCover={false}
          mobileScrollSupport
          drawShadow
          flippingTime={1000}
          usePortrait
          ref={bookRef}
          onFlip={onFlip}
          className=""
          style={{}}
          startPage={0}
          clickEventForward
          useMouseEvents
          swipeDistance={30}
          showPageCorners={false}
          disableFlipByClick={false}
        >
          <Page index={0}>
            <CoverContent />
          </Page>
          {interests.map((it, i) => (
            <Page key={it.title} index={i + 1}>
              <InterestContent it={it} num={i + 1} />
            </Page>
          ))}
        </HTMLFlipBook>
      </div>

      {/* controls */}
      <div className="flex items-center gap-5 mt-8">
        <button
          onClick={flipPrev}
          disabled={page === 0}
          aria-label="Previous page"
          className="vl-btn flex items-center justify-center w-12 h-12 disabled:opacity-35 disabled:pointer-events-none"
          style={{ background: "var(--t-bg-card)", color: "var(--t-ink)" }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-extrabold uppercase tracking-[0.2em] min-w-[80px] text-center" style={{ fontFamily: "var(--t-font-mono)", color: "var(--t-ink)" }}>
          {page === 0 ? "Cover" : `${page} / ${interests.length}`}
        </span>
        <button
          onClick={flipNext}
          disabled={page === TOTAL - 1}
          aria-label="Next page"
          className="vl-btn flex items-center justify-center w-12 h-12 disabled:opacity-35 disabled:pointer-events-none text-white"
          style={{ background: "var(--t-red)", borderColor: "var(--t-ink)" }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
