"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Group } from "three"

// ---------------------------------------------------------------------------
// Inline minimal voxel bot — icarus palette, box-geometry only.
// Chosen over the workshop <Bot> because workshop-state + useAgentEvents are
// deeply entangled with SSE event processing, HOME_POSITIONS, linger timers,
// and an Html nameplate; none of that belongs in a standalone wizard overlay.
// ---------------------------------------------------------------------------

const SPEC = {
  body:      "#3b97fb",
  bodyDark:  "#1e3a5f",
  head:      "#5fa8fc",
  visorBand: "#0b1722",
  visorEye:  "#bfe0ff",
  accent:    "#dbeeff",
}

function WizardBot() {
  const groupRef = useRef<Group>(null)
  const [mounted, setMounted] = useState(false)

  // "jumps in" on mount: starts below the frame and bounces up
  useEffect(() => { setMounted(true) }, [])

  useFrame((state) => {
    const g = groupRef.current
    if (!g) return
    const t = state.clock.getElapsedTime()

    // Entry bounce: first ~0.6 s ease up from y=-3 → 0
    if (!mounted) return
    const entryDuration = 0.6
    const entry = Math.min(1, t / entryDuration)
    // overshoot spring: ease-out-back
    const spring = entry < 1
      ? 1 - Math.pow(1 - entry, 3) * (1 + 1.7 * (1 - entry))
      : 1

    // Bot geometry spans y=0..1.66; rest at -0.83 so it's centered at origin
    // Entry: bounce up from 3 units below the resting position
    const REST_Y = -0.83
    const entryDelta = -3 * (1 - spring)

    // Continuous gentle bob
    const bob = Math.sin(t * 2.2) * 0.06

    g.position.y = REST_Y + entryDelta + bob
    g.rotation.y = Math.sin(t * 0.5) * 0.12
  })

  return (
    <group ref={groupRef}>
      {/* FEET */}
      <mesh position={[-0.12, 0.05, 0]}>
        <boxGeometry args={[0.14, 0.1, 0.16]} />
        <meshLambertMaterial color={SPEC.bodyDark} />
      </mesh>
      <mesh position={[0.12, 0.05, 0]}>
        <boxGeometry args={[0.14, 0.1, 0.16]} />
        <meshLambertMaterial color={SPEC.bodyDark} />
      </mesh>

      {/* WAIST */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.42, 0.14, 0.32]} />
        <meshLambertMaterial color={SPEC.bodyDark} />
      </mesh>

      {/* CHEST */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.56, 0.5, 0.44]} />
        <meshLambertMaterial color={SPEC.body} />
      </mesh>

      {/* SHOULDERS */}
      <mesh position={[-0.34, 0.58, 0]}>
        <boxGeometry args={[0.12, 0.22, 0.32]} />
        <meshLambertMaterial color={SPEC.bodyDark} />
      </mesh>
      <mesh position={[0.34, 0.58, 0]}>
        <boxGeometry args={[0.12, 0.22, 0.32]} />
        <meshLambertMaterial color={SPEC.bodyDark} />
      </mesh>

      {/* CHEST PANEL */}
      <mesh position={[0, 0.5, 0.23]}>
        <boxGeometry args={[0.34, 0.28, 0.02]} />
        <meshLambertMaterial color={SPEC.bodyDark} />
      </mesh>
      <mesh position={[0, 0.5, 0.245]}>
        <boxGeometry args={[0.08, 0.08, 0.01]} />
        <meshLambertMaterial color={SPEC.accent} />
      </mesh>

      {/* NECK */}
      <mesh position={[0, 0.83, 0]}>
        <boxGeometry args={[0.22, 0.1, 0.22]} />
        <meshLambertMaterial color={SPEC.bodyDark} />
      </mesh>

      {/* HEAD */}
      <mesh position={[0, 1.08, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.46]} />
        <meshLambertMaterial color={SPEC.head} />
      </mesh>

      {/* VISOR BAND */}
      <mesh position={[0, 1.1, 0.24]}>
        <boxGeometry args={[0.44, 0.14, 0.02]} />
        <meshLambertMaterial color={SPEC.visorBand} />
      </mesh>
      {/* VISOR EYE */}
      <mesh position={[0, 1.1, 0.25]}>
        <boxGeometry args={[0.28, 0.06, 0.01]} />
        <meshLambertMaterial color={SPEC.visorEye} />
      </mesh>

      {/* EAR SENSORS */}
      <mesh position={[-0.26, 1.08, 0]}>
        <boxGeometry args={[0.04, 0.16, 0.12]} />
        <meshLambertMaterial color={SPEC.bodyDark} />
      </mesh>
      <mesh position={[0.26, 1.08, 0]}>
        <boxGeometry args={[0.04, 0.16, 0.12]} />
        <meshLambertMaterial color={SPEC.bodyDark} />
      </mesh>

      {/* ANTENNA ROD */}
      <mesh position={[0, 1.42, 0]}>
        <boxGeometry args={[0.05, 0.24, 0.05]} />
        <meshLambertMaterial color={SPEC.bodyDark} />
      </mesh>
      {/* ANTENNA BULB */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.12, 0.12, 0.12]} />
        <meshLambertMaterial color={SPEC.accent} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Step content
// ---------------------------------------------------------------------------

const STEPS = [
  "Meet Talos — your autonomous yield agent.",
  "Sign in with Google — you get an embedded wallet, no seed phrase.",
  "Deposit USDC. Talos hunts the best rate across Scallop, Navi & Kai — every 30s.",
  "You hold the kill-switch: PANIC pulls everything back on-chain, instantly.",
  "Start/Stop anytime. Watch it earn on your dashboard.",
] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingWizard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const total = STEPS.length

  const next = useCallback(() => {
    if (step < total - 1) setStep((s) => s + 1)
    else onDone()
  }, [step, total, onDone])

  const prev = useCallback(() => {
    if (step > 0) setStep((s) => s - 1)
  }, [step])

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

  const isLast = step === total - 1

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      // z above drei <Html> nameplates from the workshop scene (default ~16.7M) so they
      // don't bleed through the backdrop onto the wizard.
      style={{ zIndex: 16_777_300, background: "rgba(13,19,25,0.94)", backdropFilter: "blur(14px)" }}
    >
      {/* Skip */}
      <button
        onClick={onDone}
        className="absolute top-5 right-6 text-[10px] font-mono tracking-[0.2em] uppercase text-[#8b98ab] hover:text-[#28d391] transition-colors"
      >
        skip
      </button>

      {/* Card */}
      <div
        className="relative flex flex-col items-center gap-0"
        style={{ width: 420 }}
      >
        {/* 3D canvas */}
        <div
          style={{
            width: "100%",
            height: 280,
            background: "#080e16",
            border: "1px solid rgba(59,158,255,0.18)",
            borderBottom: "none",
            boxShadow: "0 0 40px rgba(59,150,251,0.08)",
          }}
        >
          {/* Canvas is always a client-side mount — safe in "use client" file */}
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0, 4.5], fov: 30, near: 0.1, far: 100 }}
          >
            <ambientLight intensity={0.8} color="#eaf1ff" />
            <directionalLight position={[3, 6, 4]} intensity={1.2} color="#cfe0ff" />
            <directionalLight position={[-4, 3, -3]} intensity={0.28} color="#9bb8ff" />
            <WizardBot />
          </Canvas>
        </div>

        {/* Caption card */}
        <div
          style={{
            width: "100%",
            background: "#0d1319",
            border: "1px solid rgba(59,158,255,0.25)",
            padding: "24px 28px 20px",
            boxShadow: "4px 4px 0px 0px #3b9eff",
          }}
        >
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <span
                key={i}
                style={{
                  display: "block",
                  height: 3,
                  flex: i === step ? "0 0 20px" : "0 0 8px",
                  background: i === step ? "#28d391" : i < step ? "#3b9eff" : "#1e2d3d",
                  transition: "all 0.2s",
                }}
              />
            ))}
            <span
              className="ml-auto text-[9px] font-mono tracking-[0.2em] uppercase"
              style={{ color: "#8b98ab" }}
            >
              {step + 1} / {total}
            </span>
          </div>

          {/* Step text */}
          <p
            className="text-sm font-mono leading-relaxed mb-6"
            style={{ color: "#e8edf2", minHeight: 44 }}
          >
            {STEPS[step]}
          </p>

          {/* Nav buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={prev}
              disabled={step === 0}
              className="text-[10px] font-mono tracking-[0.2em] uppercase px-4 py-2 border transition-colors"
              style={{
                borderColor: step === 0 ? "#1e2d3d" : "#3b9eff",
                color: step === 0 ? "#3a4450" : "#3b9eff",
                background: "transparent",
                cursor: step === 0 ? "default" : "pointer",
              }}
            >
              ← Back
            </button>

            <button
              onClick={next}
              className="text-[10px] font-mono tracking-[0.2em] uppercase px-6 py-2 border transition-colors"
              style={{
                borderColor: "#28d391",
                color: "#0d1319",
                background: "#28d391",
                cursor: "pointer",
                boxShadow: "2px 2px 0px 0px #1a8a5e",
              }}
            >
              {isLast ? "Get started" : "Next →"}
            </button>
          </div>
        </div>

        {/* Keyboard hint */}
        <p
          className="mt-3 text-[9px] font-mono tracking-[0.15em] uppercase"
          style={{ color: "#3a4a5a" }}
        >
          ← → navigate · esc skip
        </p>
      </div>
    </div>
  )
}
