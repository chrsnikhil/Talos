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

// Traveling guide unit: the agent + speech bubble glide together to sit beside
// whatever section is spotlighted (the agent "walks over" to what it explains).
const AGENT_W = 240
const AGENT_H = 280
const GAP = 8
const BUBBLE_W = 330
const UNIT_W = AGENT_W + GAP + BUBBLE_W
const UNIT_H = 290

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

  // Locate + track the step's target. Robustness: a specific control (e.g.
  // vault-deposit) may not be mounted yet when we switch tabs — the vault loads
  // async. So while we wait, we focus the tab's whole container (data-tour=
  // "tab-<tab>") so the section is highlighted instead of blurring EVERYTHING,
  // then upgrade to the exact control as soon as it appears.
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

    const tabKey = step.tab ? step.tab.toLowerCase().replace(/[^a-z]/g, "") : null
    const fallbackSel = tabKey ? `[data-tour="tab-${tabKey}"]` : null
    const qSpecific = () =>
      document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null
    const qFallback = () =>
      fallbackSel ? (document.querySelector(fallbackSel) as HTMLElement | null) : null

    const locate = () => {
      if (cancelled) return
      const specific = qSpecific()
      if (specific) {
        // Locked onto the real control.
        specific.scrollIntoView({ block: "center", behavior: "smooth" })
        setRect(specific.getBoundingClientRect())
        return
      }
      // Not ready — spotlight the tab container meanwhile so the section is
      // focused (not blurred), and keep polling for the exact control.
      const fb = qFallback()
      if (fb) setRect(fb.getBoundingClientRect())
      if (attempts < 24) {
        attempts++
        timer = setTimeout(locate, 150)
      } else if (!fb) {
        setRect(null) // truly nothing to focus → full blur fallback
      }
    }
    locate()

    // Keep the spotlight glued to whatever we're focusing while the page
    // scrolls/resizes (tracks the smooth scrollIntoView animation too).
    const remeasure = () => {
      if (cancelled) return
      const el = qSpecific() || qFallback()
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

  // ── traveling unit position: beside the spotlight (below-first), clamped ──
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

      {/* text fade-in on step change */}
      <style>{`@keyframes tourTextIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }`}</style>

      {/* ── traveling unit: agent (left) + speech bubble (right) glide together ── */}
      <div
        className="fixed flex items-center"
        style={{
          ...unitStyle,
          width: UNIT_W,
          height: UNIT_H,
          zIndex: Z + 1,
          pointerEvents: "none",
          transition: `left 340ms ${EASE}, top 340ms ${EASE}`,
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
              top: "50%",
              marginTop: -11,
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
              top: "50%",
              marginTop: -9,
              width: 0,
              height: 0,
              borderTop: "9px solid transparent",
              borderBottom: "9px solid transparent",
              borderRight: "11px solid #0d1319",
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
      </div>
    </>
  )
}
