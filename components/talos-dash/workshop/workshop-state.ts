"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAgentEvents } from "@/lib/talos-dash/use-agent-events"
import type { AgentEvent, AgentId } from "@/lib/talos-dash/events"

export type StationId = "scallop" | "navi" | "kai" | "sui" | "walrus" | "policy"
export type MeshId = "compute" | "storage" | "dispatch" | "vault" | "shrine"

export interface Station {
  id: StationId
  meshId: MeshId
  label: string
  subLabel: string
  position: [number, number] // [x, z]
}

export const STATIONS: Station[] = [
  { id: "scallop", meshId: "dispatch", label: "SCALLOP", subLabel: "USDC lending", position: [-8, -6] },
  { id: "navi", meshId: "compute", label: "NAVI", subLabel: "USDC lending", position: [8, -6] },
  { id: "kai", meshId: "storage", label: "KAI", subLabel: "USDC lending", position: [-8, 6] },
  { id: "sui", meshId: "vault", label: "SUI · 7K", subLabel: "volatile rotation", position: [8, 6] },
  { id: "walrus", meshId: "shrine", label: "WALRUS", subLabel: "decision log", position: [0, -9] },
  { id: "policy", meshId: "compute", label: "POLICY", subLabel: "on-chain leash", position: [0, 9] },
]

export const HOME_POSITIONS: Record<AgentId, [number, number]> = {
  icarus: [-2, 1],
  daedalus: [2, 1],
}

const DOCK_DISTANCE = 2.4
const LATERAL_OFFSET: Record<AgentId, number> = {
  icarus: 0,
  daedalus: 0.95,
}

function dockPosition(stationPos: [number, number], agent: AgentId): [number, number] {
  const [sx, sz] = stationPos
  const len = Math.sqrt(sx * sx + sz * sz) || 1
  const nx = -sx / len
  const nz = -sz / len
  const px = sx + nx * DOCK_DISTANCE
  const pz = sz + nz * DOCK_DISTANCE
  // perpendicular lateral offset so two bots at one station don't overlap
  return [px + -nz * LATERAL_OFFSET[agent], pz + nx * LATERAL_OFFSET[agent]]
}

interface EventBehavior {
  target: StationId | "home"
  task: string
  linger: number
}

const EVENT_BEHAVIOR: Record<string, EventBehavior> = {
  REBALANCE: { target: "sui", task: "rotating funds", linger: 2500 },
  SPEND: { target: "policy", task: "authorizing spend", linger: 2000 },
  HOLD: { target: "walrus", task: "logging to walrus", linger: 1200 },
  RATING: { target: "policy", task: "rating decision", linger: 2000 },
  PolicyCreated: { target: "policy", task: "policy created", linger: 1500 },
  ToppedUp: { target: "policy", task: "top-up", linger: 1500 },
  ExpiryExtended: { target: "policy", task: "expiry extended", linger: 1500 },
  PolicyRevoked: { target: "policy", task: "revoked", linger: 1500 },
  ReputationCreated: { target: "policy", task: "reputation init", linger: 1500 },
}

export interface BotState {
  agent: AgentId
  target: [number, number]
  task: string | null
  lastEventTs: number | null
  broadcastTo: AgentId[]
}

const DEFAULT_STATE: Record<AgentId, BotState> = {
  icarus: { agent: "icarus", target: HOME_POSITIONS.icarus, task: null, lastEventTs: null, broadcastTo: [] },
  daedalus: { agent: "daedalus", target: HOME_POSITIONS.daedalus, task: null, lastEventTs: null, broadcastTo: [] },
}

function interpretEvent(e: AgentEvent): Array<{ agent: AgentId; behavior: EventBehavior }> {
  const base = EVENT_BEHAVIOR[e.type]
  if (!base) return []
  const target = (e.station as StationId) ?? base.target
  const task =
    (e.type === "REBALANCE" || e.type === "SPEND") && e.station
      ? `→ ${e.station}`
      : base.task
  return [{ agent: e.agent, behavior: { ...base, target, task } }]
}

export function useWorkshopState() {
  const events = useAgentEvents(300)
  const [bots, setBots] = useState<Record<AgentId, BotState>>(DEFAULT_STATE)
  const consumedRef = useRef<Set<string>>(new Set())
  const initialReplayDoneRef = useRef(false)
  const pendingRef = useRef<AgentEvent[]>([])
  const processorRunningRef = useRef(false)
  const queuedTargetRef = useRef<Record<AgentId, [number, number]>>({
    icarus: HOME_POSITIONS.icarus,
    daedalus: HOME_POSITIONS.daedalus,
  })
  const lingerTimersRef = useRef<Record<AgentId, ReturnType<typeof setTimeout> | null>>({
    icarus: null,
    daedalus: null,
  })
  const COOLDOWN_MS = 1500
  const lastTargetChangeRef = useRef<Record<AgentId, number>>({ icarus: 0, daedalus: 0 })

  const processOne = useCallback((e: AgentEvent) => {
    const mutations = interpretEvent(e)
    if (mutations.length === 0) return

    for (const { agent, behavior } of mutations) {
      const station = behavior.target === "home" ? null : STATIONS.find((s) => s.id === behavior.target)
      const targetPos: [number, number] = station
        ? dockPosition(station.position, agent)
        : HOME_POSITIONS[agent]

      const cur = queuedTargetRef.current[agent]
      const sameTarget = cur[0] === targetPos[0] && cur[1] === targetPos[1]

      if (sameTarget) {
        const prev = lingerTimersRef.current[agent]
        if (prev) clearTimeout(prev)
        setBots((c) => ({ ...c, [agent]: { ...c[agent], task: behavior.task, lastEventTs: e.timestamp } }))
        if (behavior.target !== "home") {
          lingerTimersRef.current[agent] = setTimeout(() => {
            queuedTargetRef.current[agent] = HOME_POSITIONS[agent]
            setBots((c2) => ({ ...c2, [agent]: { ...c2[agent], target: HOME_POSITIONS[agent], task: null } }))
          }, behavior.linger + 1500)
        }
        continue
      }

      const sinceLastChange = Date.now() - lastTargetChangeRef.current[agent]
      if (sinceLastChange < COOLDOWN_MS) {
        setBots((c) => ({ ...c, [agent]: { ...c[agent], task: behavior.task, lastEventTs: e.timestamp } }))
        continue
      }

      const prev = lingerTimersRef.current[agent]
      if (prev) clearTimeout(prev)
      lastTargetChangeRef.current[agent] = Date.now()
      queuedTargetRef.current[agent] = targetPos
      setBots((c) => ({
        ...c,
        [agent]: { ...c[agent], target: targetPos, task: behavior.task, lastEventTs: e.timestamp },
      }))

      if (behavior.target !== "home") {
        lingerTimersRef.current[agent] = setTimeout(() => {
          queuedTargetRef.current[agent] = HOME_POSITIONS[agent]
          setBots((c) => ({ ...c, [agent]: { ...c[agent], target: HOME_POSITIONS[agent], task: null } }))
        }, behavior.linger + 1500)
      }
    }
  }, [])

  const drain = useCallback(() => {
    if (processorRunningRef.current) return
    processorRunningRef.current = true
    const tick = () => {
      const e = pendingRef.current.shift()
      if (!e) {
        processorRunningRef.current = false
        return
      }
      processOne(e)
      if (pendingRef.current.length > 0) requestAnimationFrame(tick)
      else processorRunningRef.current = false
    }
    requestAnimationFrame(tick)
  }, [processOne])

  useEffect(() => {
    if (!initialReplayDoneRef.current) {
      for (const e of events) consumedRef.current.add(e.id)
      initialReplayDoneRef.current = true
      return
    }
    let added = false
    for (const e of events) {
      if (consumedRef.current.has(e.id)) continue
      consumedRef.current.add(e.id)
      pendingRef.current.push(e)
      added = true
    }
    if (added) drain()
  }, [events, drain])

  return useMemo(() => Object.values(bots), [bots])
}
