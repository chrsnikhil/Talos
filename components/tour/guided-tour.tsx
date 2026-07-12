"use client"

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"
import type { TourStep } from "./tour-steps"
import type { TalosAgentHandle } from "./talos-agent"

// z above drei <Html> nameplates from the workshop scene (default ~16.7M) so
// they don't bleed through the backdrop onto the tour.
const Z = 16_777_300
const PAD = 8
const EASE = "cubic-bezier(0.22,1,0.36,1)"
const DIM = "rgba(13,19,25,0.72)"

// The traveling guide unit: agent canvas (left) + speech bubble (right).
const AGENT_W = 200
const AGENT_H = 240
const GAP = 12
const BUBBLE_W = 340
const UNIT_W = AGENT_W + GAP + BUBBLE_W // ≈552
const UNIT_H = 250

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const agentRef = useRef<TalosAgentHandle | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Mount the REAL demo agent once (three.js loads client-side only via
  // dynamic import); hop on step change; fully dispose on unmount.
  useEffect(() => {
    if (!mounted) return // canvas only renders past the mounted gate
    let cancelled = false
    import("./talos-agent").then((m) => {
      if (cancelled || !canvasRef.current || agentRef.current) return
      agentRef.current = m.createTalosAgent(canvasRef.current)
    })
    return () => {
      cancelled = true
      agentRef.current?.dispose()
      agentRef.current = null
    }
  }, [mounted])

  useEffect(() => {
    agentRef.current?.hop()
  }, [i])

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
        setRect(null) // fall back to centered guide, no spotlight
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

  // ── guide-unit position: adjacent to the spotlight, below-first ──
  // (window reads are safe: we're past the mounted gate, client-only.)
  let unitStyle: CSSProperties
  if (rect) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    let top = rect.bottom + 20
    if (top + UNIT_H > vh - 16) top = rect.top - UNIT_H - 20
    let left = rect.left + rect.width / 2 - UNIT_W / 2
    left = Math.min(Math.max(16, left), Math.max(16, vw - UNIT_W - 16))
    top = Math.min(Math.max(16, top), Math.max(16, vh - UNIT_H - 16))
    unitStyle = { left, top }
  } else {
    unitStyle = { left: "50%", top: "50%", transform: "translate(-50%,-50%)" }
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

      {/* ── traveling guide unit: agent + speech bubble glide together ── */}
      <div
        className="fixed flex items-center"
        style={{
          ...unitStyle,
          width: UNIT_W,
          height: UNIT_H,
          zIndex: Z + 1,
          pointerEvents: "none",
          transition: `left 320ms ${EASE}, top 320ms ${EASE}`,
        }}
      >
        {/* the REAL demo agent, transparent canvas — never blocks the page */}
        <canvas
          ref={canvasRef}
          style={{
            width: AGENT_W,
            height: AGENT_H,
            flex: `0 0 ${AGENT_W}px`,
            pointerEvents: "none",
            display: "block",
          }}
        />

        {/* speech bubble — tail points left at the agent's head */}
        <div
          style={{
            position: "relative",
            marginLeft: GAP,
            maxWidth: BUBBLE_W,
            background: "#0d1319",
            border: "1.5px solid rgba(59,158,255,0.35)",
            boxShadow: "4px 4px 0 0 #3b9eff",
            borderRadius: 14,
            padding: "18px 20px",
            pointerEvents: "auto",
          }}
        >
          {/* tail (outer = border color, inner = bubble bg) */}
          <div
            style={{
              position: "absolute",
              left: -13,
              top: 44,
              width: 0,
              height: 0,
              borderTop: "11px solid transparent",
              borderBottom: "11px solid transparent",
              borderRight: "13px solid rgba(59,158,255,0.35)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -10,
              top: 46,
              width: 0,
              height: 0,
              borderTop: "9px solid transparent",
              borderBottom: "9px solid transparent",
              borderRight: "11px solid #0d1319",
            }}
          />

          {/* title */}
          <div
            className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.15em]"
            style={{ color: "#3b9eff" }}
          >
            {step.title}
          </div>

          {/* body copy */}
          <p
            className="mb-4 font-mono text-sm leading-relaxed"
            style={{ color: "#e8edf2", minHeight: 52 }}
          >
            {step.body}
          </p>

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

          {/* nav */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={prev}
              disabled={i === 0}
              className="text-[10px] font-mono tracking-[0.2em] uppercase px-4 py-2 border transition-colors"
              style={{
                visibility: i === 0 ? "hidden" : "visible",
                borderColor: "#3b9eff",
                color: "#3b9eff",
                background: "transparent",
                cursor: "pointer",
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
              {isLast ? "Let's go 🚀" : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
