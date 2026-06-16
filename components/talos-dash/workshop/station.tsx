"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import { Group, MeshLambertMaterial } from "three"
import type { Station } from "./workshop-state"

/**
 * Detailed voxel workshop stations — each has a distinct silhouette plus
 * small animated parts (blinking LEDs, spinning dish, bobbing gem) so the
 * scene reads as a living workshop from the isometric view.
 */

interface Palette {
  base: string
  body: string
  top: string
  accent: string
  dark: string
}

// All stations share a cohesive blue → cyan → indigo family so the scene reads as
// one "blue" workshop matching the Talos accent (#3b97fb), each station a distinct
// hue within that range for legibility. Dark bases keep them grounded on the navy floor.
const PALETTES: Record<string, Palette> = {
  compute: {
    base: "#13234d",
    body: "#3b5bd0",
    top: "#8ea8ff",
    accent: "#dbe7ff",
    dark: "#0a1018",
  },
  storage: {
    base: "#0c3a4f",
    body: "#1f8fb8",
    top: "#6fd6ee",
    accent: "#d6f6ff",
    dark: "#0a1018",
  },
  keeperhub: {
    base: "#10396e",
    body: "#3b97fb",
    top: "#9cc8ff",
    accent: "#e3f0ff",
    dark: "#0a1018",
  },
  vault: {
    base: "#13294f",
    body: "#2f6bdf",
    top: "#86adff",
    accent: "#dbe7ff",
    dark: "#0a1018",
  },
  inft: {
    base: "#0c3744",
    body: "#17a7c0",
    top: "#71e4f2",
    accent: "#d6fbff",
    dark: "#0a1018",
  },
}

/* ---------------- Animated helper parts ---------------- */

function PulsingLed({
  position,
  color,
  period = 1.2,
  phase = 0,
  size = 0.08,
}: {
  position: [number, number, number]
  color: string
  period?: number
  phase?: number
  size?: number
}) {
  const matRef = useRef<MeshLambertMaterial>(null)
  useFrame(() => {
    const m = matRef.current
    if (!m) return
    const t = performance.now() / 1000
    const blink = 0.5 + 0.5 * Math.sin((t / period + phase) * Math.PI * 2)
    m.emissive.set(color)
    m.emissiveIntensity = blink * 1.4
  })
  return (
    <mesh position={position}>
      <boxGeometry args={[size, size, 0.02]} />
      <meshLambertMaterial ref={matRef} color={color} />
    </mesh>
  )
}

function SpinningDish({
  position,
  palette,
}: {
  position: [number, number, number]
  palette: Palette
}) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    g.rotation.y = performance.now() / 1000
  })
  return (
    <group ref={ref} position={position}>
      {/* Mast */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.08, 0.32, 0.08]} />
        <meshLambertMaterial color={palette.dark} />
      </mesh>
      {/* Dish — angled thin box */}
      <mesh position={[0.18, 0.16, 0]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.4, 0.06, 0.4]} />
        <meshLambertMaterial color={palette.accent} />
      </mesh>
      {/* Dish receiver */}
      <mesh position={[0.22, 0.19, 0]}>
        <boxGeometry args={[0.08, 0.08, 0.08]} />
        <meshLambertMaterial color={palette.top} />
      </mesh>
    </group>
  )
}

function FloatingGem({ palette }: { palette: Palette }) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const t = performance.now() / 1000
    g.rotation.y = t * 0.8
    g.position.y = 1.2 + Math.sin(t * 1.5) * 0.08
  })
  return (
    <group ref={ref}>
      {/* Gem — two rotated boxes faking a faceted crystal */}
      <mesh rotation={[0, 0, 0]}>
        <boxGeometry args={[0.55, 0.3, 0.55]} />
        <meshLambertMaterial color={palette.top} />
      </mesh>
      <mesh position={[0, 0.22, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.4, 0.24, 0.4]} />
        <meshLambertMaterial color={palette.accent} />
      </mesh>
      <mesh position={[0, -0.18, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.35, 0.18, 0.35]} />
        <meshLambertMaterial color={palette.body} />
      </mesh>
    </group>
  )
}

/* ---------------- Station variants ---------------- */

function ComputeTower({ palette }: { palette: Palette }) {
  return (
    <group>
      {/* Chunky base */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[1.9, 0.22, 1.7]} />
        <meshLambertMaterial color={palette.dark} />
      </mesh>
      {/* Main tower */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[1.4, 0.85, 1.3]} />
        <meshLambertMaterial color={palette.body} />
      </mesh>
      {/* Side vent strips */}
      {[-0.71, 0.71].map((x) => (
        <group key={x}>
          {[0.55, 0.7, 0.85].map((y) => (
            <mesh key={y} position={[x, y, 0]}>
              <boxGeometry args={[0.02, 0.04, 0.8]} />
              <meshLambertMaterial color={palette.dark} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Front display panel */}
      <mesh position={[0, 0.72, 0.66]}>
        <boxGeometry args={[0.9, 0.46, 0.02]} />
        <meshLambertMaterial color={palette.dark} />
      </mesh>
      {/* Display screen glow */}
      <mesh position={[0, 0.78, 0.672]}>
        <boxGeometry args={[0.7, 0.28, 0.01]} />
        <meshLambertMaterial color={palette.top} />
      </mesh>
      {/* Front LED row */}
      <PulsingLed position={[-0.32, 0.5, 0.672]} color={palette.accent} period={1.0} phase={0} size={0.06} />
      <PulsingLed position={[-0.16, 0.5, 0.672]} color={palette.accent} period={1.0} phase={0.2} size={0.06} />
      <PulsingLed position={[0, 0.5, 0.672]} color={palette.accent} period={1.0} phase={0.4} size={0.06} />
      <PulsingLed position={[0.16, 0.5, 0.672]} color={palette.accent} period={1.0} phase={0.6} size={0.06} />
      <PulsingLed position={[0.32, 0.5, 0.672]} color={palette.accent} period={1.0} phase={0.8} size={0.06} />
      {/* Processor heatsink grid on top */}
      <mesh position={[0, 1.18, 0]}>
        <boxGeometry args={[1.0, 0.08, 1.0]} />
        <meshLambertMaterial color={palette.dark} />
      </mesh>
      {[
        [-0.22, 1.3, -0.22],
        [0.22, 1.3, -0.22],
        [-0.22, 1.3, 0.22],
        [0.22, 1.3, 0.22],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshLambertMaterial color={palette.top} />
        </mesh>
      ))}
      {/* Top antenna */}
      <mesh position={[0, 1.65, 0]}>
        <boxGeometry args={[0.06, 0.4, 0.06]} />
        <meshLambertMaterial color={palette.dark} />
      </mesh>
      <mesh position={[0, 1.92, 0]}>
        <boxGeometry args={[0.14, 0.14, 0.14]} />
        <meshLambertMaterial color={palette.accent} />
      </mesh>
    </group>
  )
}

function StorageRack({ palette }: { palette: Palette }) {
  return (
    <group>
      {/* Frame base */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[1.9, 0.12, 1.2]} />
        <meshLambertMaterial color={palette.dark} />
      </mesh>
      {/* Side rails */}
      {[-0.88, 0.88].map((x) => (
        <mesh key={x} position={[x, 0.7, 0]}>
          <boxGeometry args={[0.08, 1.3, 1.15]} />
          <meshLambertMaterial color={palette.dark} />
        </mesh>
      ))}
      {/* Six server units stacked */}
      {[0.25, 0.45, 0.65, 0.85, 1.05, 1.25].map((y, i) => (
        <group key={y}>
          {/* Unit body */}
          <mesh position={[0, y, 0]}>
            <boxGeometry args={[1.6, 0.16, 1.05]} />
            <meshLambertMaterial color={i % 2 === 0 ? palette.body : palette.top} />
          </mesh>
          {/* Front dark strip */}
          <mesh position={[0, y, 0.53]}>
            <boxGeometry args={[1.5, 0.08, 0.02]} />
            <meshLambertMaterial color={palette.dark} />
          </mesh>
          {/* Status LED per unit (varied phase) */}
          <PulsingLed
            position={[-0.65, y, 0.54]}
            color={palette.accent}
            period={0.8 + i * 0.2}
            phase={i * 0.3}
            size={0.05}
          />
          {/* Second activity LED */}
          <PulsingLed
            position={[0.65, y, 0.54]}
            color={palette.top}
            period={1.5}
            phase={i * 0.5}
            size={0.05}
          />
        </group>
      ))}
      {/* Top plate + cooling cross */}
      <mesh position={[0, 1.46, 0]}>
        <boxGeometry args={[1.9, 0.1, 1.2]} />
        <meshLambertMaterial color={palette.dark} />
      </mesh>
      <mesh position={[0, 1.52, 0]}>
        <boxGeometry args={[1.2, 0.04, 0.08]} />
        <meshLambertMaterial color={palette.top} />
      </mesh>
      <mesh position={[0, 1.52, 0]}>
        <boxGeometry args={[0.08, 0.04, 0.8]} />
        <meshLambertMaterial color={palette.top} />
      </mesh>
    </group>
  )
}

function KeeperhubDispatcher({ palette }: { palette: Palette }) {
  return (
    <group>
      {/* Ramp / entrance step */}
      <mesh position={[0, 0.08, 0.82]}>
        <boxGeometry args={[1.0, 0.1, 0.4]} />
        <meshLambertMaterial color={palette.dark} />
      </mesh>
      {/* Main building */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.9, 0.95, 1.4]} />
        <meshLambertMaterial color={palette.body} />
      </mesh>
      {/* Dark base trim */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[2.0, 0.08, 1.5]} />
        <meshLambertMaterial color={palette.dark} />
      </mesh>
      {/* Front monitor screen */}
      <mesh position={[0, 0.55, 0.71]}>
        <boxGeometry args={[1.2, 0.55, 0.02]} />
        <meshLambertMaterial color={palette.dark} />
      </mesh>
      <mesh position={[0, 0.55, 0.72]}>
        <boxGeometry args={[1.05, 0.4, 0.01]} />
        <meshLambertMaterial color={palette.accent} />
      </mesh>
      {/* Screen scan lines (darker rows) */}
      <mesh position={[0, 0.62, 0.73]}>
        <boxGeometry args={[1.0, 0.03, 0.005]} />
        <meshLambertMaterial color={palette.body} />
      </mesh>
      <mesh position={[0, 0.5, 0.73]}>
        <boxGeometry args={[1.0, 0.03, 0.005]} />
        <meshLambertMaterial color={palette.body} />
      </mesh>
      <mesh position={[0, 0.42, 0.73]}>
        <boxGeometry args={[1.0, 0.03, 0.005]} />
        <meshLambertMaterial color={palette.body} />
      </mesh>
      {/* Side vent pipes */}
      {[-0.96, 0.96].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.35, 0]}>
            <boxGeometry args={[0.08, 0.55, 0.1]} />
            <meshLambertMaterial color={palette.dark} />
          </mesh>
          <mesh position={[x, 0.7, 0]}>
            <boxGeometry args={[0.14, 0.1, 0.14]} />
            <meshLambertMaterial color={palette.top} />
          </mesh>
        </group>
      ))}
      {/* Roof */}
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[2.0, 0.12, 1.5]} />
        <meshLambertMaterial color={palette.top} />
      </mesh>
      {/* Warning light */}
      <PulsingLed position={[-0.7, 1.14, 0]} color="#ef4444" period={0.8} phase={0} size={0.12} />
      {/* Spinning satellite dish */}
      <SpinningDish position={[0.55, 1.14, 0]} palette={palette} />
      {/* Small static antennas */}
      <mesh position={[-0.4, 1.2, -0.3]}>
        <boxGeometry args={[0.05, 0.3, 0.05]} />
        <meshLambertMaterial color={palette.dark} />
      </mesh>
      <mesh position={[-0.4, 1.4, -0.3]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshLambertMaterial color={palette.accent} />
      </mesh>
    </group>
  )
}

function VaultSafe({ palette }: { palette: Palette }) {
  const dialRef = useRef<Group>(null)
  useFrame(() => {
    const g = dialRef.current
    if (!g) return
    g.rotation.z = Math.sin(performance.now() / 1400) * 0.8
  })

  return (
    <group>
      {/* Stepped base — wider at bottom */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[2.1, 0.14, 1.55]} />
        <meshLambertMaterial color={palette.dark} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[1.9, 0.1, 1.4]} />
        <meshLambertMaterial color={palette.accent} />
      </mesh>
      {/* Main safe body */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[1.7, 0.95, 1.25]} />
        <meshLambertMaterial color={palette.body} />
      </mesh>
      {/* Door — inset slightly */}
      <mesh position={[0, 0.7, 0.64]}>
        <boxGeometry args={[1.3, 0.8, 0.04]} />
        <meshLambertMaterial color={palette.top} />
      </mesh>
      {/* Corner rivets */}
      {[
        [-0.55, 0.35, 0.67],
        [0.55, 0.35, 0.67],
        [-0.55, 1.05, 0.67],
        [0.55, 1.05, 0.67],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[0.1, 0.1, 0.05]} />
          <meshLambertMaterial color={palette.accent} />
        </mesh>
      ))}
      {/* Dial — rotates */}
      <group ref={dialRef} position={[0, 0.7, 0.68]}>
        <mesh>
          <boxGeometry args={[0.28, 0.28, 0.06]} />
          <meshLambertMaterial color={palette.accent} />
        </mesh>
        <mesh position={[0, 0.1, 0.03]}>
          <boxGeometry args={[0.04, 0.08, 0.02]} />
          <meshLambertMaterial color={palette.body} />
        </mesh>
      </group>
      {/* Handle bar below dial */}
      <mesh position={[0, 0.4, 0.68]}>
        <boxGeometry args={[0.4, 0.06, 0.04]} />
        <meshLambertMaterial color={palette.accent} />
      </mesh>
      <mesh position={[-0.18, 0.4, 0.7]}>
        <boxGeometry args={[0.08, 0.1, 0.06]} />
        <meshLambertMaterial color={palette.accent} />
      </mesh>
      <mesh position={[0.18, 0.4, 0.7]}>
        <boxGeometry args={[0.08, 0.1, 0.06]} />
        <meshLambertMaterial color={palette.accent} />
      </mesh>
      {/* Top cornice */}
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[1.9, 0.12, 1.35]} />
        <meshLambertMaterial color={palette.top} />
      </mesh>
      {/* Coin stacks beside vault */}
      <group position={[-1.25, 0, 0.3]}>
        {[0.12, 0.22, 0.32].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <boxGeometry args={[0.3, 0.08, 0.3]} />
            <meshLambertMaterial color={palette.accent} />
          </mesh>
        ))}
      </group>
      <group position={[1.25, 0, 0.3]}>
        {[0.12, 0.22].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <boxGeometry args={[0.3, 0.08, 0.3]} />
            <meshLambertMaterial color={palette.accent} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function InftShrine({ palette }: { palette: Palette }) {
  return (
    <group>
      {/* 3-tier pedestal */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.7, 0.2, 1.7]} />
        <meshLambertMaterial color={palette.dark} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.3, 0.2, 1.3]} />
        <meshLambertMaterial color={palette.base} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.9, 0.2, 0.9]} />
        <meshLambertMaterial color={palette.body} />
      </mesh>
      {/* Glowing center rim on top tier */}
      <mesh position={[0, 0.61, 0]}>
        <boxGeometry args={[0.92, 0.02, 0.92]} />
        <meshLambertMaterial color={palette.accent} />
      </mesh>
      {/* 4 corner plinths with LEDs on top */}
      {[
        [-0.55, 0, -0.55],
        [0.55, 0, -0.55],
        [-0.55, 0, 0.55],
        [0.55, 0, 0.55],
      ].map(([x, , z], i) => (
        <group key={i}>
          <mesh position={[x, 0.2, z]}>
            <boxGeometry args={[0.12, 0.4, 0.12]} />
            <meshLambertMaterial color={palette.dark} />
          </mesh>
          <PulsingLed
            position={[x, 0.44, z + 0.065]}
            color={palette.accent}
            period={1.6}
            phase={i * 0.25}
            size={0.1}
          />
        </group>
      ))}
      {/* Floating, rotating gem */}
      <FloatingGem palette={palette} />
    </group>
  )
}

function StationVariant({ id, palette }: { id: string; palette: Palette }) {
  if (id === "compute") return <ComputeTower palette={palette} />
  if (id === "storage") return <StorageRack palette={palette} />
  if (id === "keeperhub") return <KeeperhubDispatcher palette={palette} />
  if (id === "vault") return <VaultSafe palette={palette} />
  return <InftShrine palette={palette} />
}

export function StationBlock({ station }: { station: Station }) {
  const [x, z] = station.position
  const palette = PALETTES[station.meshId]

  return (
    <group position={[x, 0, z]}>
      {/* Base pad — darker tile under the station */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[3.2, 0.06, 3.2]} />
        <meshLambertMaterial color={palette.base} />
      </mesh>
      {/* Pad rim — thin bright frame */}
      <mesh position={[0, 0.061, 0]}>
        <boxGeometry args={[3.3, 0.02, 3.3]} />
        <meshLambertMaterial color={palette.accent} />
      </mesh>
      <mesh position={[0, 0.062, 0]}>
        <boxGeometry args={[3.1, 0.022, 3.1]} />
        <meshLambertMaterial color={palette.base} />
      </mesh>

      {/* Station variant */}
      <StationVariant id={station.meshId} palette={palette} />

      {/* Floating label */}
      <Html
        position={[0, 2.3, 0]}
        center
        distanceFactor={14}
        style={{ pointerEvents: "none" }}
      >
        <div className="flex flex-col items-center gap-0.5 select-none">
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-[var(--accent-color)] font-bold whitespace-nowrap bg-black/80 border border-[var(--accent-color)]/40 px-2 py-0.5">
            {station.label}
          </span>
          <span className="text-[8px] font-mono tracking-[0.15em] uppercase text-muted-foreground whitespace-nowrap">
            {station.subLabel}
          </span>
        </div>
      </Html>
    </group>
  )
}
