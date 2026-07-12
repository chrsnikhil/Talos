"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import type { TourStep } from "./tour-steps"
import type { TalosAgentHandle } from "./talos-agent"

// z above drei <Html> nameplates from the workshop scene (default ~16.7M) so
// they don't bleed through the backdrop onto the tour.
const Z = 16_777_300
const PAD = 8
const EASE = "cubic-bezier(0.22,1,0.36,1)"
// Dim, NOT blur. backdrop-filter: blur() over the dashboard must re-run the
// blur every frame the backdrop changes — and the backdrop here animates
// continuously (recharts, live data, the LIVE tab's WebGL WorkshopScene), so
// it recomposited most of the viewport on every single frame. A flat rgba dim
// painted once via one huge box-shadow spread composites almost for free.
const DIM = "rgba(13,19,25,0.78)"
const FRIENDLY = 'var(--font-friendly), ui-rounded, "Segoe UI", system-ui, sans-serif'

// Traveling guide unit: the agent + speech bubble glide together to sit beside
// whatever section is spotlighted (the agent "walks over" to what it explains).
const AGENT_W = 280
const AGENT_H = 300
const GAP = 8
const BUBBLE_W = 400
const UNIT_W = AGENT_W + GAP + BUBBLE_W
const UNIT_H = 320

// Hoisted static styles — rect-tracking re-renders must not allocate fresh
// style objects for elements that never change (keeps reconciliation trivial).
const CANVAS_STYLE: CSSProperties = {
  width: AGENT_W,
  height: AGENT_H,
  flex: `0 0 ${AGENT_W}px`,
  pointerEvents: "none",
  display: "block",
}
// Invisible hit-blockers: the old blur panels doubled as click shields around
// the hole. The dim is now a box-shadow (which can't catch pointer events), so
// four transparent divs keep the exact same "outside the hole is inert,
// inside stays clickable" behaviour. They never animate — geometry only
// updates when the measured rect actually changes.
const BLOCK: CSSProperties = { position: "absolute", pointerEvents: "auto" }

// setRect guard: getBoundingClientRect() returns a new object every call, so
// the 150ms locate poll + per-scroll remeasure were re-rendering the whole
// overlay/unit/bubble tree even when nothing moved. Only accept real changes.
const sameRect = (a: DOMRect | null, b: DOMRect) =>
  a !== null && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height

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
  // Web Audio: decode each clip once and play off the main thread, so playback
  // can't hitch the agent's WebGL render or the CSS glide. (An <audio> element's
  // per-play decode on the main thread was causing the transition choppiness.)
  const ctxRef = useRef<AudioContext | null>(null)
  const buffersRef = useRef<(AudioBuffer | null)[]>([])
  const srcRef = useRef<AudioBufferSourceNode | null>(null)
  // Live values for async decode callbacks + the onended handler.
  const iRef = useRef(0)
  const mutedRef = useRef(false)
  const playRef = useRef<(n: number) => void>(() => {})
  iRef.current = i
  mutedRef.current = muted
  // Play step n's clip. When it ENDS NATURALLY, auto-advance so the narration is
  // never cut off — the tour paces itself to the voice. Manual Back/Continue
  // override at any time (they supersede srcRef so onended won't double-advance).
  playRef.current = (n: number) => {
    const ctx = ctxRef.current
    if (!ctx) return
    try {
      srcRef.current?.stop()
    } catch {}
    srcRef.current = null
    if (mutedRef.current) return
    const buf = buffersRef.current[n]
    if (!buf) return // not decoded yet — the decode callback will start it
    if (ctx.state === "suspended") ctx.resume().catch(() => {})
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.onended = () => {
      if (srcRef.current !== src) return // superseded by manual nav → don't advance
      srcRef.current = null
      setI((p) => (p < steps.length - 1 ? p + 1 : p))
    }
    src.start()
    srcRef.current = src
  }

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
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    ctxRef.current = ctx
    buffersRef.current = steps.map(() => null)
    let cancelled = false
    // Fetch + decode every clip once (decode runs off the main thread).
    steps.forEach((_, n) => {
      fetch(`/audio/tour/step-${n}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("missing"))))
        .then((buf) => ctx.decodeAudioData(buf))
        .then((audio) => {
          if (cancelled) return
          buffersRef.current[n] = audio
          if (n === 0) setHasAudio(true)
          // If this clip is the step we're already on and nothing is playing,
          // start it now (fixes the race where step 0 decodes after we land).
          if (n === iRef.current && !srcRef.current && !mutedRef.current) playRef.current(n)
        })
        .catch(() => {})
    })
    return () => {
      cancelled = true
      try {
        srcRef.current?.stop()
      } catch {}
      srcRef.current = null
      ctx.close().catch(() => {})
      ctxRef.current = null
    }
  }, [steps])

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

  // Play the current step's voice line on step / mute change (autoplay can be
  // blocked before a gesture — swallow it; audio kicks in from the first click).
  useEffect(() => {
    playRef.current(i)
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
  // "tab-<tab>") so the section is highlighted instead of dimming EVERYTHING,
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
    // Whole-tab targets scroll TOP-aligned (see locate below). The dashboard's
    // sticky top bar + tab bar (~104px) would swallow the content's top edge
    // after block:"start", so nudge back down by a hair more than their height.
    const isTabTarget = step.target.startsWith("tab-")
    const STICKY_OFFSET = 112
    const qSpecific = () =>
      document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null
    const qFallback = () =>
      fallbackSel ? (document.querySelector(fallbackSel) as HTMLElement | null) : null

    // Skip no-op re-renders: the poll + scroll remeasure fire constantly but
    // the rect rarely actually changes.
    const apply = (r: DOMRect) => setRect((p) => (sameRect(p, r) ? p : r))

    // Track the target's OWN size changes. Some targets settle/grow AFTER we
    // first measure them — the perf chart card is sized to the controls column
    // (a ResizeObserver in vault-bento), and the LIVE tab's 3D workshop + event
    // stream fill in — and window scroll/resize never fires for that, so the
    // highlight would otherwise lock to the initial, too-small rect.
    let ro: ResizeObserver | null = null
    const observe = (el: HTMLElement) => {
      if (ro) return // already watching the active target
      ro = new ResizeObserver(() => {
        if (!cancelled) apply(el.getBoundingClientRect())
      })
      ro.observe(el)
    }

    const locate = () => {
      if (cancelled) return
      const specific = qSpecific()
      if (specific) {
        // Locked onto the real control. Scroll INSTANTLY (not smooth): a smooth
        // scroll fires a scroll event every frame → a re-measure/re-render storm
        // that re-targets the unit's glide each frame and makes it stutter.
        // Whole-tab targets TOP-align instead of centering: centering parks the
        // content's bottom right in the agent's reserved bottom band, so the
        // event stream tail / [live] line got dimmed even when the section fit
        // the viewport. Top-aligned (just under the sticky bars), content that
        // fits sits fully inside the hole with the agent in the clear space
        // below it; only genuinely tall sections spill past the agent's band.
        if (isTabTarget) {
          specific.scrollIntoView({ block: "start", behavior: "auto" })
          window.scrollBy(0, -STICKY_OFFSET) // instant, one remeasure — not smooth
        } else {
          specific.scrollIntoView({ block: "center", behavior: "auto" })
        }
        apply(specific.getBoundingClientRect())
        if (ro) ro.disconnect(), (ro = null) // re-observe the real control (may replace the fallback)
        observe(specific)
        return
      }
      // Not ready — spotlight the tab container meanwhile so the section is
      // focused (not dimmed), and keep polling for the exact control.
      const fb = qFallback()
      if (fb) {
        apply(fb.getBoundingClientRect())
        observe(fb)
      }
      if (attempts < 24) {
        attempts++
        timer = setTimeout(locate, 150)
      } else if (!fb) {
        setRect(null) // truly nothing to focus → full dim fallback
      }
    }
    locate()

    // Keep the spotlight glued to the target on manual scroll/resize, coalesced
    // to one measure per frame so it can't flood re-renders.
    let raf = 0
    const remeasure = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (cancelled) return
        const el = qSpecific() || qFallback()
        if (el) apply(el.getBoundingClientRect())
      })
    }
    window.addEventListener("scroll", remeasure, { passive: true, capture: true })
    window.addEventListener("resize", remeasure)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      if (raf) cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener("scroll", remeasure, true)
      window.removeEventListener("resize", remeasure)
    }
  }, [step, setTab])

  // ── speech bubble — memoized so rect-only re-renders (scroll tracking, the
  // locate poll) hand React the identical element and skip the whole subtree.
  const bubble = useMemo(() => {
    if (!step) return null
    return (
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
                transition: "flex-basis 0.2s, background-color 0.2s",
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
    )
  }, [step, i, total, isLast, muted, hasAudio, toggleMute, next, prev, onDone, steps])

  if (!mounted || !step) return null

  // ── spotlight geometry (viewport-clamped; may be shrunk below to reserve
  // the agent's lane) ──
  // Clamp the hole to the viewport. A target taller/wider than the screen
  // (the whole-tab steps: THOUGHT/PORTFOLIO/ON-CHAIN/REPUTATION) measures a
  // rect that extends past the viewport after scrollIntoView centers it, and
  // an unclamped hole draws the cut-out + ring partly off-screen — a ring
  // with its top/bottom missing. Framing just the visible portion, ring flush
  // to the viewport edges, reads correctly as "this whole section". The click
  // shields inherit the same clamped geometry.
  const vw = window.innerWidth
  const vh = window.innerHeight
  const EDGE = 8
  let holeL = 0
  let holeT = 0
  let holeW = 0
  let holeH = 0
  if (rect) {
    holeL = Math.max(EDGE, rect.left - PAD)
    holeT = Math.max(EDGE, rect.top - PAD)
    holeW = Math.max(0, Math.min(vw - EDGE, rect.right + PAD) - holeL)
    holeH = Math.max(0, Math.min(vh - EDGE, rect.bottom + PAD) - holeT)
  }

  // ── traveling unit position: beside the spotlight (below-first), clamped ──
  // Always expressed as translate3d(x, y) so the glide runs purely on the
  // compositor: animating left/top forces a full layout+paint on every frame
  // (very janky over a heavy dashboard); transform never touches layout.
  let unitX: number
  let unitY: number
  if (rect) {
    const clampL = (v: number) => Math.min(Math.max(16, v), Math.max(16, vw - UNIT_W - 16))
    const clampT = (v: number) => Math.min(Math.max(16, v), Math.max(16, vh - UNIT_H - 16))
    // Whole-tab spotlights fill most of the viewport, so any free-floating
    // anchor would drop the (688px-wide) unit right on top of the content it's
    // presenting. Instead: dock the unit flush to a viewport edge/corner —
    // rotating per step so it still visibly travels — and RESERVE that lane by
    // shrinking the spotlight hole on the docking side. The band the unit sits
    // in stays dimmed, so the unit can never cover highlighted content.
    // Specific controls (vault cells) keep the beside-the-rect behaviour.
    // Classify by the step's TARGET, not the rect's size: only genuine
    // whole-tab spotlights (target "tab-*") get the dock + lane-shrink path.
    // The old size test (rect wider/taller than 55% of the viewport)
    // misclassified the wide vault performance chart as a whole-tab step and
    // its "top" lane-shrink cut off the chart header + trend line.
    const isTab = !!step.target && step.target.startsWith("tab-")
    const LANE_GAP = 12
    const MIN_HOLE = 100
    if (isTab) {
      // Always dock the agent along the BOTTOM band, rotating the horizontal
      // position per step so it still visibly travels between tabs. Top-docking
      // was cutting off section headers (e.g. the LIVE tab's workshop header +
      // controls) — bottom-only keeps the TOP of every section highlighted.
      const HDOCKS: Array<"left" | "center" | "right"> = ["left", "center", "right"]
      const h = HDOCKS[i % HDOCKS.length]
      unitX = clampL(h === "left" ? 16 : h === "right" ? vw - UNIT_W - 16 : (vw - UNIT_W) / 2)
      unitY = clampT(vh - UNIT_H - 16)
      // Reserve the bottom band (agent sits over dimmed page below the content,
      // never over highlighted content). Skipped if it would crush the hole to
      // a sliver — a slight overlap degrades better than no visible highlight.
      // No-op when the content already fits above the band: with tab targets
      // scrolled top-aligned (see the locate effect), a section that fits the
      // viewport (LIVE/POLICY) has hole bottom ≤ unitY - LANE_GAP, so the
      // Math.min keeps the full content bottom and nothing gets shaved.
      const newBottom = Math.max(Math.min(holeT + holeH, unitY - LANE_GAP), holeT)
      if (newBottom - holeT >= MIN_HOLE) holeH = newBottom - holeT
    } else {
      // Small targets (vault cells): sit beside the hole WITHOUT covering it.
      // The old below-else-above flip could clamp the unit right on top of the
      // target (vault-balance sits at the top of the right column: "below"
      // overflows the viewport, "above" clamps back down over the cell). Try
      // below → above → left → right, clamping each candidate first and
      // rejecting any that still intersects the hole; e.g. vault-balance ends
      // up to the LEFT, over the dimmed chart.
      const holeR = holeL + holeW
      const holeB = holeT + holeH
      const clear = (x: number, y: number) =>
        x + UNIT_W <= holeL - GAP ||
        x >= holeR + GAP ||
        y + UNIT_H <= holeT - GAP ||
        y >= holeB + GAP
      const cx = clampL(holeL + holeW / 2 - UNIT_W / 2)
      const cy = clampT(holeT + holeH / 2 - UNIT_H / 2)
      const candidates: Array<[number, number]> = [
        [cx, clampT(holeB + 20)], // below
        [cx, clampT(holeT - UNIT_H - 20)], // above
        [clampL(holeL - UNIT_W - 20), cy], // left
        [clampL(holeR + 20), cy], // right
      ]
      const pick = candidates.find(([x, y]) => clear(x, y))
      if (pick) {
        unitX = pick[0]
        unitY = pick[1]
      } else {
        // Oversized control (the vault performance chart spans nearly the
        // full viewport width): no beside-candidate can clear the hole. Dock
        // the unit into the BOTTOM band and shrink ONLY the bottom of the
        // hole to reserve it. The chart's important content — the header and
        // the agent trend line — rides across the TOP, so sacrificing a
        // bottom strip (older data / x-axis) is fine; NEVER top-shrink a
        // vault control. Same MIN_HOLE guard as the tab path: on tiny
        // viewports a slight overlap degrades better than no highlight.
        unitX = clampL((vw - UNIT_W) / 2)
        unitY = clampT(vh - UNIT_H - 16)
        const newBottom = Math.max(Math.min(holeT + holeH, unitY - LANE_GAP), holeT)
        if (newBottom - holeT >= MIN_HOLE) holeH = newBottom - holeT
      }
    }
  } else {
    // centered fallback (same as the old translate(-50%,-50%) placement)
    unitX = Math.max(16, (vw - UNIT_W) / 2)
    unitY = Math.max(16, (vh - UNIT_H) / 2)
  }

  return (
    <>
      {/* ── overlay: dim everything except the spotlight hole ── */}
      <div
        className="fixed inset-0"
        style={{ zIndex: Z, pointerEvents: "none", contain: "layout paint" }}
      >
        {rect ? (
          <>
            {/* the cut-out: one element sitting over the hole whose huge
                box-shadow spread dims the entire rest of the viewport. Unlike
                the old backdrop-filter panels this never recomputes while the
                dashboard animates underneath — it's painted once per rect
                change and just composites. (Snaps to the new hole instantly,
                exactly like the old panels did; only the ring glides.) */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: holeW,
                height: holeH,
                transform: `translate3d(${holeL}px, ${holeT}px, 0)`,
                borderRadius: 2,
                boxShadow: `0 0 0 9999px ${DIM}`,
                pointerEvents: "none",
              }}
            />
            {/* invisible click shields (box-shadow can't catch pointer events) */}
            <div style={{ ...BLOCK, left: 0, top: 0, right: 0, height: holeT }} />
            <div style={{ ...BLOCK, left: 0, top: holeT + holeH, right: 0, bottom: 0 }} />
            <div style={{ ...BLOCK, left: 0, top: holeT, width: holeL, height: holeH }} />
            <div style={{ ...BLOCK, left: holeL + holeW, top: holeT, right: 0, height: holeH }} />
            {/* highlight ring — glides on its own compositor layer via
                transform (never `transition: all` / left/top, which relayout
                every frame) */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: holeW,
                height: holeH,
                transform: `translate3d(${holeL}px, ${holeT}px, 0)`,
                border: "2px solid #3b97fb",
                boxShadow: "0 0 0 2px rgba(59,151,251,0.25), 0 0 24px rgba(59,151,251,0.35)",
                pointerEvents: "none",
                borderRadius: 2,
                transition: `transform 260ms ${EASE}, width 260ms ${EASE}, height 260ms ${EASE}`,
                willChange: "transform",
              }}
            />
          </>
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(13,19,25,0.9)",
              pointerEvents: "auto",
            }}
          />
        )}
      </div>

      {/* text fade-in on step change */}
      <style>{`@keyframes tourTextIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }`}</style>

      {/* ── traveling unit: agent (left) + speech bubble (right) glide together.
          Anchored at 0,0 and moved ONLY via transform so the 340ms glide is
          fully GPU-composited — zero layout, zero repaint of the page. ── */}
      <div
        className="fixed flex items-center"
        style={{
          left: 0,
          top: 0,
          width: UNIT_W,
          height: UNIT_H,
          zIndex: Z + 1,
          pointerEvents: "none",
          transform: `translate3d(${unitX}px, ${unitY}px, 0)`,
          transition: `transform 340ms ${EASE}`,
          willChange: "transform",
        }}
      >
        {/* the REAL demo agent, transparent canvas — never blocks the page */}
        <canvas ref={canvasRef} style={CANVAS_STYLE} />
        {bubble}
      </div>
    </>
  )
}
