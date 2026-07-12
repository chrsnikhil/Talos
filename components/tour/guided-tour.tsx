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
const FRIENDLY = 'var(--font-friendly), ui-rounded, "Segoe UI", system-ui, sans-serif'

// Traveling guide unit: the agent + speech bubble glide together to sit beside
// whatever section is spotlighted (the agent "walks over" to what it explains).
const AGENT_W = 280
const AGENT_H = 300
const GAP = 8
const BUBBLE_W = 400
const UNIT_W = AGENT_W + GAP + BUBBLE_W
const UNIT_H = 320

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
  // Pre-generated per-step voice (public/audio/tour/step-N.mp3). No live TTS.
  const [muted, setMuted] = useState(false)
  const [hasAudio, setHasAudio] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // One <audio> element reused across steps. `hasAudio` flips true only once a
  // clip actually loads, so the mute control is hidden until the pre-generated
  // files exist — the tour deploys/works fine with no audio present.
  useEffect(() => {
    try {
      setMuted(localStorage.getItem("talos_tour_muted") === "1")
    } catch {}
    const a = new Audio()
    a.preload = "auto"
    a.addEventListener("canplay", () => setHasAudio(true))
    audioRef.current = a
    return () => {
      a.pause()
      audioRef.current = null
    }
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

  // Play the current step's pre-generated voice line (autoplay can be blocked
  // before a gesture — swallow it; audio kicks in from the first Continue click).
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.pause()
    a.currentTime = 0
    if (muted) return
    a.src = `/audio/tour/step-${i}.mp3`
    a.play().catch(() => {})
  }, [i, muted])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const nm = !m
      try {
        localStorage.setItem("talos_tour_muted", nm ? "1" : "0")
      } catch {}
      return nm
    })
  }, [])

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
    const clampL = (v: number) => Math.min(Math.max(16, v), Math.max(16, vw - UNIT_W - 16))
    const clampT = (v: number) => Math.min(Math.max(16, v), Math.max(16, vh - UNIT_H - 16))
    // Whole-tab spotlights all span the screen from the top-left, so parking
    // "beside" them lands the agent in the same clamped spot every step. For
    // those, cycle through a rotating set of anchors so it visibly travels/hops
    // between steps. Specific controls (vault cells) keep the beside behaviour.
    const large = rect.width > vw * 0.55 || rect.height > vh * 0.55
    if (large) {
      const A = [
        [0.03, 0.30],
        [0.42, 0.06],
        [0.03, 0.62],
        [0.42, 0.6],
        [0.2, 0.08],
        [0.03, 0.45],
      ]
      const a = A[i % A.length]
      unitStyle = { left: clampL(vw * a[0]), top: clampT(vh * a[1]) }
    } else {
      let top = rect.bottom + 20
      if (top + UNIT_H > vh - 16) top = rect.top - UNIT_H - 20
      unitStyle = { left: clampL(rect.left + rect.width / 2 - UNIT_W / 2), top: clampT(top) }
    }
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
            width: BUBBLE_W,
            fontFamily: FRIENDLY,
            background: "#0d1319",
            border: "1.5px solid rgba(59,158,255,0.4)",
            boxShadow: "5px 5px 0 0 #3b9eff",
            borderRadius: 18,
            padding: "26px 30px",
            pointerEvents: "auto",
          }}
        >
          {/* tail (outer = border color, inner = bubble bg) */}
          <div
            style={{
              position: "absolute",
              left: -15,
              top: "50%",
              marginTop: -13,
              width: 0,
              height: 0,
              borderTop: "13px solid transparent",
              borderBottom: "13px solid transparent",
              borderRight: "15px solid rgba(59,158,255,0.4)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -11,
              top: "50%",
              marginTop: -11,
              width: 0,
              height: 0,
              borderTop: "11px solid transparent",
              borderBottom: "11px solid transparent",
              borderRight: "13px solid #0d1319",
            }}
          />

          {/* mute toggle — only shown once pre-generated voice clips are present */}
          {hasAudio && (
            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute narration" : "Mute narration"}
              style={{
                position: "absolute",
                top: 12,
                right: 14,
                width: 26,
                height: 26,
                display: "grid",
                placeItems: "center",
                color: "#8b98ab",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                pointerEvents: "auto",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                {muted ? (
                  <>
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </>
                ) : (
                  <>
                    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                  </>
                )}
              </svg>
            </button>
          )}

          {/* title + body — keyed so they softly fade/slide in per step */}
          <div key={i} style={{ animation: "tourTextIn 240ms ease-out" }}>
            <div
              className="mb-2.5 text-base font-extrabold uppercase tracking-wide"
              style={{ color: "#3b9eff" }}
            >
              {step.title}
            </div>
            <p
              className="mb-6 text-[17px] font-medium leading-relaxed"
              style={{ color: "#eef2f7", minHeight: 60 }}
            >
              {step.body}
            </p>
          </div>

          {/* step progress */}
          <div className="mb-4 flex items-center gap-1.5">
            {steps.map((_, d) => (
              <span
                key={d}
                style={{
                  display: "block",
                  height: 4,
                  borderRadius: 2,
                  flex: d === i ? "0 0 20px" : "0 0 7px",
                  background: d === i ? "#28d391" : d < i ? "#3b9eff" : "#1e2d3d",
                  transition: "all 0.2s",
                }}
              />
            ))}
            <span className="ml-auto text-[11px] font-semibold tracking-wide" style={{ color: "#8b98ab" }}>
              {i + 1} / {total}
            </span>
          </div>

          {/* nav */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={prev}
              disabled={i === 0}
              className="text-xs font-bold uppercase tracking-wide px-4 py-2.5 border rounded-lg transition-colors"
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
              className="text-xs font-bold uppercase tracking-wide transition-colors"
              style={{ color: "#8b98ab", background: "transparent", cursor: "pointer" }}
            >
              Skip
            </button>

            <button
              onClick={next}
              className="text-xs font-extrabold uppercase tracking-wide px-6 py-2.5 border rounded-lg transition-colors"
              style={{
                borderColor: "#28d391",
                color: "#0d1319",
                background: "#28d391",
                cursor: "pointer",
                boxShadow: "2px 2px 0 0 #1a8a5e",
              }}
            >
              {isLast ? "Let's go" : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
