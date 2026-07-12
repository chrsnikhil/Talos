"use client"

import { useCallback, useEffect, useState, type CSSProperties } from "react"
import { TourBot } from "./tour-bot"
import type { TourStep } from "./tour-steps"

// z above drei <Html> nameplates from the workshop scene (default ~16.7M) so
// they don't bleed through the backdrop onto the tour.
const Z = 16_777_300
const PAD = 8
const CARD_W = 360
const CARD_H = 340
const EASE = "cubic-bezier(0.22,1,0.36,1)"
const DIM = "rgba(13,19,25,0.72)"

export function GuidedTour({
  steps,
  setTab,
  onDone,
}: {
  steps: TourStep[]
  setTab: (t: any) => void
  onDone: () => void
}) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const step = steps[i]
  const total = steps.length
  const isLast = i === total - 1

  const next = useCallback(() => {
    if (i < total - 1) setI(i + 1)
    else onDone()
  }, [i, total, onDone])

  const prev = useCallback(() => {
    if (i > 0) setI(i - 1)
  }, [i])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next()
      else if (e.key === "ArrowLeft") prev()
      else if (e.key === "Escape") onDone()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [next, prev, onDone])

  // Locate + track the current step's target element.
  useEffect(() => {
    if (!step) return
    if (step.tab) setTab(step.tab)

    if (!step.target) {
      setRect(null)
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let attempts = 0

    const query = () =>
      document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null

    // Target may not be mounted yet right after a tab switch — retry briefly.
    const locate = () => {
      if (cancelled) return
      const el = query()
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" })
        setRect(el.getBoundingClientRect())
      } else if (attempts < 10) {
        attempts++
        timer = setTimeout(locate, 120)
      } else {
        setRect(null) // fall back to centered dialog, no spotlight
      }
    }
    locate()

    // Keep the spotlight glued to the target while the page scrolls/resizes
    // (also tracks the smooth scrollIntoView animation).
    const remeasure = () => {
      if (cancelled) return
      const el = query()
      if (el) setRect(el.getBoundingClientRect())
    }
    window.addEventListener("scroll", remeasure, true)
    window.addEventListener("resize", remeasure)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      window.removeEventListener("scroll", remeasure, true)
      window.removeEventListener("resize", remeasure)
    }
  }, [step, setTab])

  if (!mounted || !step) return null

  // ── spotlight geometry ──
  const holeL = rect ? Math.max(0, rect.left - PAD) : 0
  const holeT = rect ? Math.max(0, rect.top - PAD) : 0
  const holeW = rect ? rect.width + PAD * 2 : 0
  const holeH = rect ? rect.height + PAD * 2 : 0

  // ── dialog position ──
  let cardStyle: CSSProperties
  let side: "right" | "left" | "below" | null = null
  if (rect) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left: number
    let top: number
    if (vw - rect.right - 20 >= CARD_W + 20) {
      side = "right"
      left = rect.right + 20
      top = rect.top + rect.height / 2 - CARD_H / 2
    } else if (rect.left - (CARD_W + 20) >= 0) {
      side = "left"
      left = rect.left - (CARD_W + 20)
      top = rect.top + rect.height / 2 - CARD_H / 2
    } else {
      side = "below"
      top = rect.bottom + 16
      left = rect.left + rect.width / 2 - CARD_W / 2
    }
    left = Math.min(Math.max(16, left), Math.max(16, vw - CARD_W - 16))
    top = Math.min(Math.max(16, top), Math.max(16, vh - CARD_H - 16))
    cardStyle = { left, top }
  } else {
    cardStyle = { left: "50%", top: "50%", transform: "translate(-50%,-50%)" }
  }

  const panel: CSSProperties = {
    position: "absolute",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    background: DIM,
    pointerEvents: "auto",
  }

  return (
    <>
      {/* ── overlay: blur everything except the spotlight hole ── */}
      <div className="fixed inset-0" style={{ zIndex: Z, pointerEvents: "none" }}>
        {rect ? (
          <>
            {/* top */}
            <div style={{ ...panel, left: 0, top: 0, right: 0, height: holeT }} />
            {/* bottom */}
            <div style={{ ...panel, left: 0, top: holeT + holeH, right: 0, bottom: 0 }} />
            {/* left */}
            <div style={{ ...panel, left: 0, top: holeT, width: holeL, height: holeH }} />
            {/* right */}
            <div style={{ ...panel, left: holeL + holeW, top: holeT, right: 0, height: holeH }} />
            {/* highlight ring */}
            <div
              style={{
                position: "absolute",
                left: holeL,
                top: holeT,
                width: holeW,
                height: holeH,
                border: "2px solid #3b97fb",
                boxShadow: "0 0 0 2px rgba(59,151,251,0.25), 0 0 24px rgba(59,151,251,0.35)",
                pointerEvents: "none",
                borderRadius: 2,
                transition: `all 260ms ${EASE}`,
              }}
            />
          </>
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              background: "rgba(13,19,25,0.9)",
              pointerEvents: "auto",
            }}
          />
        )}
      </div>

      {/* ── traveling dialog ── */}
      <div
        className="fixed"
        style={{
          ...cardStyle,
          width: CARD_W,
          zIndex: Z + 1,
          transition: `left 300ms ${EASE}, top 300ms ${EASE}`,
        }}
      >
        {/* pointer toward the target */}
        {side && (
          <div
            style={{
              position: "absolute",
              width: 10,
              height: 10,
              background: side === "below" ? "#080e16" : "#0d1319",
              border: "1px solid rgba(59,158,255,0.25)",
              transform: "rotate(45deg)",
              ...(side === "right" ? { left: -5, top: "50%", marginTop: -5 } : {}),
              ...(side === "left" ? { right: -5, top: "50%", marginTop: -5 } : {}),
              ...(side === "below" ? { top: -5, left: "50%", marginLeft: -5 } : {}),
            }}
          />
        )}

        {/* 3D bot */}
        <div
          style={{
            height: 150,
            background: "#080e16",
            border: "1px solid rgba(59,158,255,0.25)",
            borderBottom: "1px solid rgba(59,158,255,0.18)",
            position: "relative",
          }}
        >
          <TourBot />
        </div>

        {/* body */}
        <div
          style={{
            background: "#0d1319",
            border: "1px solid rgba(59,158,255,0.25)",
            borderTop: "none",
            boxShadow: "4px 4px 0 0 #3b9eff",
            padding: "18px 22px",
            position: "relative",
          }}
        >
          {/* step progress */}
          <div className="mb-3 flex items-center gap-1.5">
            {steps.map((_, d) => (
              <span
                key={d}
                style={{
                  display: "block",
                  height: 3,
                  flex: d === i ? "0 0 16px" : "0 0 6px",
                  background: d === i ? "#28d391" : d < i ? "#3b9eff" : "#1e2d3d",
                  transition: "all 0.2s",
                }}
              />
            ))}
            <span
              className="ml-auto text-[9px] font-mono tracking-[0.2em] uppercase"
              style={{ color: "#8b98ab" }}
            >
              {i + 1} / {total}
            </span>
          </div>

          {/* title */}
          <div
            className="mb-2 font-mono text-sm font-bold uppercase tracking-[0.12em]"
            style={{ color: "#3b9eff" }}
          >
            {step.title}
          </div>

          {/* body text */}
          <p
            className="mb-5 font-mono text-sm leading-relaxed"
            style={{ color: "#e8edf2", minHeight: 60 }}
          >
            {step.body}
          </p>

          {/* nav */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={prev}
              disabled={i === 0}
              className="text-[10px] font-mono tracking-[0.2em] uppercase px-4 py-2 border transition-colors"
              style={{
                borderColor: i === 0 ? "#1e2d3d" : "#3b9eff",
                color: i === 0 ? "#3a4450" : "#3b9eff",
                background: "transparent",
                cursor: i === 0 ? "default" : "pointer",
              }}
            >
              ← Back
            </button>

            <button
              onClick={onDone}
              className="text-[10px] font-mono tracking-[0.2em] uppercase transition-colors"
              style={{ color: "#8b98ab", background: "transparent" }}
            >
              Skip
            </button>

            <button
              onClick={next}
              className="text-[10px] font-mono tracking-[0.2em] uppercase px-6 py-2 border transition-colors"
              style={{
                borderColor: "#28d391",
                color: "#0d1319",
                background: "#28d391",
                cursor: "pointer",
                boxShadow: "2px 2px 0 0 #1a8a5e",
              }}
            >
              {isLast ? "Finish" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
