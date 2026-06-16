"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Group, Vector3 } from "three"
import { BlinkDot } from "../blink-dot"
import { Bot } from "./bot"
import { StationBlock } from "./station"
import { STATIONS, useWorkshopState } from "./workshop-state"
import { useAgentEvents } from "@/lib/talos-dash/use-agent-events"
import type { AgentId } from "@/lib/talos-dash/events"

interface WorkshopSceneProps {
  onAgentClick?: (agent: AgentId) => void
  bare?: boolean
  height?: number
}

type CameraMode = "overview" | "auto" | AgentId

const MODES: { id: CameraMode; label: string }[] = [
  { id: "overview", label: "OVERVIEW" },
  { id: "auto", label: "AUTO" },
  { id: "icarus", label: "ICARUS" },
  { id: "daedalus", label: "DAEDALUS" },
]

// Auto-focus tuning. The camera sticks to whichever agent is "active"
// (recent events). Once that agent goes quiet, it switches to another
// active one — or falls back to overview if everyone's idle.
const AUTO_BUSY_MS = 3_000        // event within this window = "still busy"
const AUTO_DWELL_MIN_MS = 2_500   // never switch sooner than this
const AUTO_RECENT_MS = 10_000     // other-agent event within this window = candidate
const AUTO_IDLE_FALLBACK_MS = 12_000 // all agents quiet this long → overview

const OVERVIEW_POS = new Vector3(12, 30, 30)
const OVERVIEW_LOOK = new Vector3(0, 0, 0)
// Chase-cam offset from the bot's position (above + diagonal behind).
const FOLLOW_OFFSET = new Vector3(6, 9, 9)

/**
 * Runs inside <Canvas>. Every frame, eases the camera toward a desired
 * position + lookAt target. Uses frame-rate-independent exponential
 * smoothing so the motion is smooth regardless of framerate, and the
 * lookAt is decoupled from the bot's vertical hop so the camera doesn't
 * pitch every time the bot jumps.
 *
 * POS_RATE < LOOK_RATE means the camera glides into place slightly slower
 * than it rotates to track the subject — reads as cinematic rather than
 * snappy when switching modes.
 */
const POS_RATE = 2.2
const LOOK_RATE = 3.5

/** CameraRig only accepts resolved targets — "auto" is resolved upstream
 *  to whichever agent is currently focused. */
type CameraTarget = "overview" | AgentId

function CameraRig({
  mode,
  botRefs,
}: {
  mode: CameraTarget
  botRefs: React.MutableRefObject<Record<AgentId, Group | null>>
}) {
  const { camera } = useThree()
  const desiredPos = useRef(new Vector3())
  const desiredLook = useRef(new Vector3())
  const smoothedLook = useRef(new Vector3(0, 0, 0))

  useFrame((_, delta) => {
    if (mode === "overview") {
      desiredPos.current.copy(OVERVIEW_POS)
      desiredLook.current.copy(OVERVIEW_LOOK)
    } else {
      const g = botRefs.current[mode]
      if (!g) return
      const bp = g.position
      // Use absolute Y for camera height and fixed Y for lookAt so the
      // bot's hop doesn't shake the camera.
      desiredPos.current.set(
        bp.x + FOLLOW_OFFSET.x,
        FOLLOW_OFFSET.y,
        bp.z + FOLLOW_OFFSET.z,
      )
      desiredLook.current.set(bp.x, 0.6, bp.z)
    }

    const posT = 1 - Math.exp(-delta * POS_RATE)
    const lookT = 1 - Math.exp(-delta * LOOK_RATE)
    camera.position.lerp(desiredPos.current, posT)
    smoothedLook.current.lerp(desiredLook.current, lookT)
    camera.lookAt(smoothedLook.current)
  })

  return null
}

export function WorkshopScene({
  onAgentClick,
  bare = false,
  height = 520,
}: WorkshopSceneProps) {
  const bots = useWorkshopState()
  const events = useAgentEvents(100)
  const [cameraMode, setCameraMode] = useState<CameraMode>("overview")
  // Auto-mode focus. Separate from cameraMode so the user-visible button
  // stays "AUTO" while the actual camera target rotates underneath.
  const [autoFocus, setAutoFocus] = useState<CameraMode>("overview")
  const botRefs = useRef<Record<AgentId, Group | null>>({
    icarus: null,
    daedalus: null,
  })

  // Compute "most recent event timestamp per agent" from the live events
  // stream. Cheap — events array is capped at 100. Memoized so we don't
  // recompute on every render.
  const lastEventTsByAgent = useMemo(() => {
    const m: Record<AgentId, number> = { icarus: 0, daedalus: 0 }
    for (const e of events) {
      if (e.timestamp > (m[e.agent] || 0)) m[e.agent] = e.timestamp
    }
    return m
  }, [events])

  // Stash live data in refs so the auto-focus interval reads fresh values
  // without re-triggering the effect on every event arrival. Without this,
  // useEffect re-fired 2-5x per second (events update lastEventTsByAgent),
  // tearing down + recreating the interval each tick. Result: the state
  // machine thrashed and switched agents far too eagerly. THE BUG.
  const lastEventTsRef = useRef(lastEventTsByAgent)
  const autoFocusRef = useRef<CameraMode>(autoFocus)
  const focusedSinceRef = useRef<number>(Date.now())
  useEffect(() => {
    lastEventTsRef.current = lastEventTsByAgent
  }, [lastEventTsByAgent])
  useEffect(() => {
    autoFocusRef.current = autoFocus
    focusedSinceRef.current = Date.now()
  }, [autoFocus])

  // Auto-focus state machine: pick the most recently active agent, stick
  // to it while it's busy, switch to a different active agent once the
  // current one goes quiet. Falls back to overview when everyone's idle.
  useEffect(() => {
    if (cameraMode !== "auto") return
    const tick = () => {
      const now = Date.now()
      const agents: AgentId[] = ["icarus", "daedalus"]
      const ages = agents.map((a) => ({
        agent: a,
        age: now - (lastEventTsRef.current[a] || 0),
      }))

      const allIdle = ages.every((x) => x.age > AUTO_IDLE_FALLBACK_MS)
      if (allIdle) {
        setAutoFocus((prev) => (prev === "overview" ? prev : "overview"))
        return
      }

      // Currently focused on an agent — stay if they're still busy.
      if (autoFocusRef.current !== "overview" && autoFocusRef.current !== "auto") {
        const currentAge = now - (lastEventTsRef.current[autoFocusRef.current as AgentId] || 0)
        const dwellMs = now - focusedSinceRef.current
        if (currentAge < AUTO_BUSY_MS) return
        // Honor minimum dwell so we never switch a fraction of a second
        // after landing on someone (otherwise camera flickers between
        // multiple busy agents).
        if (dwellMs < AUTO_DWELL_MIN_MS) return
      }

      // Pick whichever OTHER agent has the most recent event within the
      // recency window. If we're currently focused, exclude self so we
      // actually rotate.
      const candidates = ages
        .filter((x) => x.agent !== autoFocusRef.current)
        .filter((x) => x.age < AUTO_RECENT_MS)
        .sort((a, b) => a.age - b.age) // freshest first

      if (candidates.length > 0) {
        setAutoFocus(candidates[0].agent)
      } else if (autoFocusRef.current === "overview") {
        // No "other" candidates, but we're on overview — pick the freshest
        // overall to seed the rotation.
        const freshest = [...ages].sort((a, b) => a.age - b.age)[0]
        if (freshest && freshest.age < AUTO_RECENT_MS) {
          setAutoFocus(freshest.agent)
        }
      }
    }

    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [cameraMode])

  // Reset autoFocus to overview whenever auto-mode is exited so re-entering
  // starts cleanly instead of resuming the prior focus instantly.
  useEffect(() => {
    if (cameraMode !== "auto") setAutoFocus("overview")
  }, [cameraMode])

  // Resolve user-visible cameraMode → actual target the rig follows.
  // "auto" gets resolved to whichever agent the auto-focus state machine
  // currently picked (or "overview" if everyone's idle).
  const effectiveMode: CameraTarget =
    cameraMode === "auto"
      ? (autoFocus === "auto" ? "overview" : (autoFocus as CameraTarget))
      : (cameraMode as CameraTarget)

  const registerBotGroup = useCallback(
    (agent: AgentId, group: Group | null) => {
      botRefs.current[agent] = group
    },
    [],
  )

  const outerClass = bare
    ? "relative w-full overflow-hidden"
    : "relative w-full border border-[var(--accent-color)]/20 bg-black/60 backdrop-blur-sm overflow-hidden"
  const outerStyle = bare
    ? undefined
    : { boxShadow: "4px 4px 0px 0px var(--accent-color)" }

  return (
    <div className={outerClass} style={outerStyle}>
      {!bare && (
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border/50 bg-black/40">
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent-color)] font-mono font-bold">
            AGENT WORKSHOP · LIVE
          </span>
          <div className="flex-1 border-t border-border" />
          <BlinkDot />
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
            2 AGENTS · {STATIONS.length} STATIONS · {events.length} EVT
          </span>
        </div>
      )}

      <div
        style={{ height, background: "#1a1612" }}
        className="relative w-full border border-border/40"
      >
        <Canvas
          dpr={[1, 2]}
          camera={{
            position: [12, 30, 30],
            fov: 26,
            near: 0.1,
            far: 1000,
          }}
          onCreated={({ camera }) => {
            camera.lookAt(0, 0, 0)
          }}
        >
          <CameraRig mode={effectiveMode} botRefs={botRefs} />

          {/* Lighting */}
          <ambientLight intensity={0.75} color="#fff8ee" />
          <directionalLight
            position={[10, 20, 8]}
            intensity={1.1}
            color="#ffe8c4"
          />
          <directionalLight
            position={[-10, 8, -6]}
            intensity={0.3}
            color="#c4d4ff"
          />

          {/* Ground */}
          <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[80, 80]} />
            <meshLambertMaterial color="#1a1612" />
          </mesh>

          {/* Grid */}
          <gridHelper
            args={[80, 40, "#ea580c", "#2a1608"]}
            position={[0, 0.01, 0]}
          />

          {/* Stations */}
          {STATIONS.map((s) => (
            <StationBlock key={s.id} station={s} />
          ))}

          {/* Bots */}
          {bots.map((b) => (
            <Bot
              key={b.agent}
              state={b}
              onClick={() => onAgentClick?.(b.agent)}
              onGroupReady={registerBotGroup}
            />
          ))}
        </Canvas>

        {/* Camera mode switcher — top-right overlay */}
        <div className="absolute top-3 right-3 z-10 flex gap-1 bg-black/60 backdrop-blur-sm border border-border/40 p-1">
          {MODES.map((m) => {
            const active = cameraMode === m.id
            return (
              <button
                key={m.id}
                onClick={() => setCameraMode(m.id)}
                className={`text-[9px] font-mono font-bold tracking-[0.2em] uppercase px-2.5 py-1 border transition-colors ${
                  active
                    ? "border-[var(--accent-color)] text-[var(--accent-color)] bg-[var(--accent-color)]/10"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            )
          })}
        </div>

        <div className="absolute top-3 left-3 text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground/70 pointer-events-none">
          {cameraMode === "overview" && "WORKSHOP · VOXEL · LIVE"}
          {cameraMode === "auto" &&
            (effectiveMode === "overview"
              ? "AUTO · IDLE · WAITING"
              : `AUTO · TRACKING ${effectiveMode.toUpperCase()}`)}
          {cameraMode !== "overview" &&
            cameraMode !== "auto" &&
            `TRACKING · ${cameraMode.toUpperCase()}`}
        </div>
        <div className="absolute bottom-3 right-3 text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground/70 pointer-events-none">
          WORLD · ∞
        </div>
      </div>

      {!bare && (
        <div className="flex flex-wrap items-center gap-6 px-6 py-3 border-t border-border/50 bg-black/40">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-[#ea580c]" />
            <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-muted-foreground">
              ICARUS · executor
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-white" />
            <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-muted-foreground">
              DAEDALUS · critic
            </span>
          </div>
          <div className="flex-1" />
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            {"// hover · click to open"}
          </span>
        </div>
      )}
    </div>
  )
}
