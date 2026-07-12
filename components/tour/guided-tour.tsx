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

// Corner guide (Duolingo-style): the agent is parked in the bottom-left,
// peeking into the viewport; only the speech bubble text + spotlight change
// per step. Slightly negative offsets clip the agent into the corner.
const AGENT_W = 260
const AGENT_H = 300
const AGENT_LEFT = -18
const AGENT_BOTTOM = -28
const BUBBLE_W = 340
const BUBBLE_LEFT = 220
const BUBBLE_BOTTOM = 210

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
  // Latest step's expression — applied when the agent finishes mounting
  // (the dynamic import resolves after the first step effect runs).
  const exprRef = useRef<TourStep["expr"]>("happy")

  useEffect(() => {
    setMounted(true)
  }, [])

  // Mount the REAL demo agent once (three.js loads client-side only via
  // dynamic import); fully dispose on unmount.
  useEffect(() => {
    if (!mounted) return // canvas only renders past the mounted gate
    let cancelled = false
    import("./talos-agent").then((m) => {
      if (cancelled || !canvasRef.current || agentRef.current) return
      agentRef.current = m.createTalosAgent(canvasRef.current)
      agentRef.current.setExpression(exprRef.current)
    })
    return () => {
      cancelled = true
      agentRef.current?.dispose()
      agentRef.current = null
    }
  }, [mounted])

  const step = steps[i]

  // Per-step expression + a little hop.
  useEffect(() => {
    if (!step) return
    exprRef.current = step.expr
    agentRef.current?.setExpression(step.expr)
    agentRef.current?.hop()
  }, [step])
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
        setRect(null) // fall back to full-screen blur, no spotlight
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

      {/* text fade-in on step change */}
      <style>{`@keyframes tourTextIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }`}</style>

      {/* ── corner agent: parked bottom-left, peeking into the viewport ── */}
      <canvas
        ref={canvasRef}
        className="fixed"
        style={{
          left: AGENT_LEFT,
          bottom: AGENT_BOTTOM,
          width: AGENT_W,
          height: AGENT_H,
          zIndex: Z + 1,
          pointerEvents: "none",
          display: "block",
        }}
      />

      {/* ── speech bubble: fixed up-and-right of the agent, tail pointing
             down-left at its head; only the text changes per step ── */}
      <div
        className="fixed"
        style={{
          left: BUBBLE_LEFT,
          bottom: BUBBLE_BOTTOM,
          maxWidth: BUBBLE_W,
          background: "#0d1319",
          border: "1.5px solid rgba(59,158,255,0.35)",
          boxShadow: "4px 4px 0 0 #3b9eff",
          borderRadius: 14,
          padding: "18px 20px",
          zIndex: Z + 1,
          pointerEvents: "auto",
        }}
      >
        {/* tail (outer = border color, inner = bubble bg) — down-left at the agent */}
        <div
          style={{
            position: "absolute",
            left: 14,
            bottom: -14,
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "17px solid transparent",
            borderTop: "14px solid rgba(59,158,255,0.35)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 17,
            bottom: -10,
            width: 0,
            height: 0,
            borderLeft: "4px solid transparent",
            borderRight: "14px solid transparent",
            borderTop: "11px solid #0d1319",
          }}
        />

        {/* title + body — keyed so they softly fade/slide in per step */}
        <div key={i} style={{ animation: "tourTextIn 240ms ease-out" }}>
          <div
            className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.15em]"
            style={{ color: "#3b9eff" }}
          >
            {step.title}
          </div>

          <p
            className="mb-4 font-mono text-sm leading-relaxed"
            style={{ color: "#e8edf2", minHeight: 52 }}
          >
            {step.body}
          </p>
        </div>

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
    </>
  )
}
