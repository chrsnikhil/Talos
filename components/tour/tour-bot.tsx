"use client"

import { useEffect, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Group } from "three"

// ---------------------------------------------------------------------------
// Inline minimal voxel bot — icarus palette, box-geometry only.
// Extracted from the retired onboarding wizard so the guided tour can reuse it.
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

export function TourBot() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 4.5], fov: 30, near: 0.1, far: 100 }}
    >
      <ambientLight intensity={0.8} color="#eaf1ff" />
      <directionalLight position={[3, 6, 4]} intensity={1.2} color="#cfe0ff" />
      <directionalLight position={[-4, 3, -3]} intensity={0.28} color="#9bb8ff" />
      <WizardBot />
    </Canvas>
  )
}
