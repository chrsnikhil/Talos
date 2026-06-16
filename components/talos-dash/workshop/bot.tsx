"use client"

import { useEffect, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import { Group } from "three"
import type { AgentId } from "@/lib/talos-dash/events"
import { HOME_POSITIONS, type BotState } from "./workshop-state"

/**
 * Voxel robot characters — boxes only so flat directional lighting carves
 * tonal difference across faces. Silhouette: feet → waist → chest
 * (+ shoulders + chest panel) → neck → helmet (+ visor band) → antenna.
 */

interface BotSpec {
  body: string // chest / main
  bodyDark: string // waist / shoulders / feet
  head: string
  visorBand: string
  visorEye: string
  accent: string // antenna bulb
}

const SPECS: Record<AgentId, BotSpec> = {
  // ICARUS — blue executor
  icarus: {
    body: "#3b97fb",
    bodyDark: "#1e3a5f",
    head: "#5fa8fc",
    visorBand: "#0b1722",
    visorEye: "#bfe0ff",
    accent: "#dbeeff",
  },
  // DAEDALUS — cyan critic (blue family, distinct from Icarus's royal blue)
  daedalus: {
    body: "#22b0c8",
    bodyDark: "#0e3a44",
    head: "#3fcfe6",
    visorBand: "#08151b",
    visorEye: "#caf6ff",
    accent: "#d6fbff",
  },
}

const HOP_PERIOD = 0.32
const HOP_HEIGHT = 0.35

export function Bot({
  state,
  onClick,
  onGroupReady,
}: {
  state: BotState
  onClick: () => void
  onGroupReady?: (agent: AgentId, group: Group | null) => void
}) {
  const groupRef = useRef<Group>(null)
  const initializedRef = useRef(false)

  // Register this bot's group ref with the parent so the camera rig
  // can follow it in agent-focused modes.
  useEffect(() => {
    onGroupReady?.(state.agent, groupRef.current)
    return () => onGroupReady?.(state.agent, null)
  }, [state.agent, onGroupReady])
  // Track latest target via a ref that's updated synchronously every render,
  // so useFrame never reads a stale closure value — this is what fixes the
  // "smooth forward, teleport back" asymmetry.
  const targetRef = useRef<[number, number]>(state.target)
  targetRef.current = state.target
  const [hovered, setHovered] = useState(false)
  const spec = SPECS[state.agent]

  // B3 — interpolated walking flag. Avoids snap when transitioning between
  // hop-y (0.35) and idle-bob-y (0.04). Eased over ~150ms.
  const walkingMixRef = useRef(0)

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) return

    const [tx, tz] = targetRef.current

    // First frame: snap to the agent's HOME position — not the current
    // target. The current target may have been pushed to a station by the
    // SSE replay processing historical events; we want the bots to spawn
    // at the central triangle and only walk out from there for live activity.
    if (!initializedRef.current) {
      const [hx, hz] = HOME_POSITIONS[state.agent]
      g.position.set(hx, 0, hz)
      initializedRef.current = true
      return
    }

    const dx = tx - g.position.x
    const dz = tz - g.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    // B3 — bumped from 4 → 7 so cycle events don't outrun the bot's walks.
    // Most station distances are ~10 units, so walk time ~1.4s instead of ~2.5s.
    const speed = 7
    if (dist > 0.02) {
      const step = Math.min(speed * delta, dist)
      g.position.x += (dx / dist) * step
      g.position.z += (dz / dist) * step
    }

    if (dist > 0.05) {
      g.rotation.y = Math.atan2(dx, dz)
    }

    // B3 — smooth Y between walking-hop and idle-bob over ~150ms instead
    // of snapping when `walking` flips. mixRate ≈ 1 / 0.15s.
    const walkingTarget = dist > 0.15 ? 1 : 0
    const mixRate = 6.7
    walkingMixRef.current +=
      (walkingTarget - walkingMixRef.current) * Math.min(1, delta * mixRate)
    const mix = walkingMixRef.current

    const t = performance.now() / 1000
    const hopPhase = (t % HOP_PERIOD) / HOP_PERIOD
    const hopY = Math.sin(hopPhase * Math.PI) * HOP_HEIGHT
    const idleY = Math.max(0, Math.sin(t * 2 + state.agent.charCodeAt(0)) * 0.04)
    g.position.y = idleY * (1 - mix) + hopY * mix
  })

  const isActive =
    state.task !== null ||
    (state.lastEventTs && Date.now() - state.lastEventTs < 3000)

  return (
    <group
      ref={groupRef}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = "pointer"
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = ""
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {/* Shadow blob */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.1, 0.8]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>

      {/* Activity ring */}
      {isActive && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.72, 24]} />
          <meshBasicMaterial color={spec.accent} transparent opacity={0.85} />
        </mesh>
      )}

      {/* FEET — two small cubes */}
      <mesh position={[-0.12, 0.05, 0]}>
        <boxGeometry args={[0.14, 0.1, 0.16]} />
        <meshLambertMaterial color={spec.bodyDark} />
      </mesh>
      <mesh position={[0.12, 0.05, 0]}>
        <boxGeometry args={[0.14, 0.1, 0.16]} />
        <meshLambertMaterial color={spec.bodyDark} />
      </mesh>

      {/* WAIST — connects feet, darker */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.42, 0.14, 0.32]} />
        <meshLambertMaterial color={spec.bodyDark} />
      </mesh>

      {/* CHEST — main body */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.56, 0.5, 0.44]} />
        <meshLambertMaterial color={spec.body} />
      </mesh>

      {/* SHOULDER blocks */}
      <mesh position={[-0.34, 0.58, 0]}>
        <boxGeometry args={[0.12, 0.22, 0.32]} />
        <meshLambertMaterial color={spec.bodyDark} />
      </mesh>
      <mesh position={[0.34, 0.58, 0]}>
        <boxGeometry args={[0.12, 0.22, 0.32]} />
        <meshLambertMaterial color={spec.bodyDark} />
      </mesh>

      {/* CHEST panel — darker inset on front */}
      <mesh position={[0, 0.5, 0.23]}>
        <boxGeometry args={[0.34, 0.28, 0.02]} />
        <meshLambertMaterial color={spec.bodyDark} />
      </mesh>
      {/* Chest indicator light */}
      <mesh position={[0, 0.5, 0.245]}>
        <boxGeometry args={[0.08, 0.08, 0.01]} />
        <meshLambertMaterial color={spec.accent} />
      </mesh>

      {/* NECK — short connector */}
      <mesh position={[0, 0.83, 0]}>
        <boxGeometry args={[0.22, 0.1, 0.22]} />
        <meshLambertMaterial color={spec.bodyDark} />
      </mesh>

      {/* HEAD — helmet */}
      <mesh position={[0, 1.08, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.46]} />
        <meshLambertMaterial color={spec.head} />
      </mesh>

      {/* VISOR band — horizontal dark strip on front of head */}
      <mesh position={[0, 1.1, 0.24]}>
        <boxGeometry args={[0.44, 0.14, 0.02]} />
        <meshLambertMaterial color={spec.visorBand} />
      </mesh>
      {/* VISOR eye — bright slit inside visor band */}
      <mesh position={[0, 1.1, 0.25]}>
        <boxGeometry args={[0.28, 0.06, 0.01]} />
        <meshLambertMaterial color={spec.visorEye} />
      </mesh>

      {/* SIDE ear/sensor blocks */}
      <mesh position={[-0.26, 1.08, 0]}>
        <boxGeometry args={[0.04, 0.16, 0.12]} />
        <meshLambertMaterial color={spec.bodyDark} />
      </mesh>
      <mesh position={[0.26, 1.08, 0]}>
        <boxGeometry args={[0.04, 0.16, 0.12]} />
        <meshLambertMaterial color={spec.bodyDark} />
      </mesh>

      {/* ANTENNA — thin rod with bright bulb */}
      <mesh position={[0, 1.42, 0]}>
        <boxGeometry args={[0.05, 0.24, 0.05]} />
        <meshLambertMaterial color={spec.bodyDark} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.12, 0.12, 0.12]} />
        <meshLambertMaterial color={spec.accent} />
      </mesh>

      {/* Nameplate */}
      <Html
        position={[0, -0.25, 0]}
        center
        distanceFactor={14}
        style={{ pointerEvents: "none" }}
      >
        <div className="flex flex-col items-center gap-0.5 select-none">
          <span
            className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase whitespace-nowrap"
            style={{ color: spec.accent }}
          >
            {state.agent}
          </span>
          {state.task && (
            <span className="text-[8px] font-mono tracking-[0.1em] uppercase text-muted-foreground bg-black/70 border border-[var(--accent-color)]/30 px-1.5 py-0.5 whitespace-nowrap">
              {state.task}
            </span>
          )}
        </div>
      </Html>

      {hovered && (
        <Html
          position={[0, 1.95, 0]}
          center
          style={{ pointerEvents: "none" }}
        >
          <div className="bg-black/90 backdrop-blur-xl border border-[var(--accent-color)]/60 px-3 py-2 min-w-[160px] shadow-[4px_4px_0px_0px_var(--accent-color)]">
            <div
              className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase"
              style={{ color: spec.accent }}
            >
              {state.agent}.001
            </div>
            <div className="text-[9px] font-mono tracking-[0.1em] uppercase text-muted-foreground mt-1">
              {state.task ? `doing: ${state.task}` : "idle"}
            </div>
            <div className="text-[9px] font-mono tracking-[0.1em] uppercase text-muted-foreground">
              pos: {state.target[0].toFixed(1)}, {state.target[1].toFixed(1)}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
