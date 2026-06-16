# Talos Dashboard Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port ZW.ARM's LIVE (voxel + event stream), THOUGHT, PORTFOLIO, and ON-CHAIN dashboard surfaces into the Talos Sui dashboard, re-skinned to Talos's theme.

**Architecture:** A single client-side event adapter (`useAgentEvents`) synthesizes a unified `AgentEvent` stream from Talos's existing `/api/talos/decisions` + `/api/talos/activity` endpoints. The voxel workshop (2 bots, 6 Sui stations), event stream, and on-chain proof stream all consume that adapter. THOUGHT renders decision/rating cards; PORTFOLIO reads a new server endpoint that aggregates on-chain balances. No backend/swarm changes except the new portfolio route.

**Tech Stack:** Next.js (app router) · React · TypeScript · three.js / @react-three/fiber / drei (already installed) · framer-motion · Tailwind. Tests via Node's built-in runner through the installed `tsx` loader (`node --import tsx --test`). Package manager: `pnpm`.

**Reference source (verbatim ports fetched from):** `https://raw.githubusercontent.com/chrsnikhil/ZW.ARM/main/<path>`

**Spec:** `docs/superpowers/specs/2026-06-16-talos-dashboard-port-design.md`

---

## File Structure

**New:**
- `lib/talos-dash/events.ts` — pure types + mapping functions (decision/activity → AgentEvent)
- `lib/talos-dash/events.test.ts` — unit tests for the mappers
- `lib/talos-dash/use-agent-events.ts` — singleton polling hook
- `components/talos-dash/bento-cell.tsx`, `section-divider.tsx`, `blink-dot.tsx` — ported wrappers
- `components/talos-dash/workshop/{workshop-state.ts,bot.tsx,station.tsx,scene.tsx}` — voxel
- `components/talos-dash/event-stream.tsx` — live event log
- `components/talos-dash/thought-stream.tsx` — decision/rating cards
- `components/talos-dash/portfolio-panel.tsx` — read-only portfolio
- `components/talos-dash/onchain-stream.tsx` — proof rows
- `app/api/talos/portfolio/route.ts` — on-chain balance aggregator

**Modified:**
- `app/globals.css` — add `--accent-color` alias
- `app/dashboard/page.tsx` — new tab set, lazy workshop, fold heartbeat/budget into LIVE

---

## Task 1: Theme enabler + ported wrappers

**Files:**
- Modify: `app/globals.css`
- Create: `components/talos-dash/blink-dot.tsx`, `components/talos-dash/bento-cell.tsx`, `components/talos-dash/section-divider.tsx`

- [ ] **Step 1: Add the `--accent-color` alias to both theme blocks in globals.css**

In `app/globals.css`, the `:root` block contains `--accent: 20 90% 45%;` (line ~8) and the dark block contains `--accent: 213 94% 60%;` (line ~23). Add an alias line immediately after EACH `--accent-foreground:` declaration in those two blocks:

```css
  --accent-color: hsl(var(--accent));
```

This makes every ported `var(--accent-color)` reference resolve to the Talos accent (blue in dark theme).

- [ ] **Step 2: Create `components/talos-dash/blink-dot.tsx`**

```tsx
export function BlinkDot({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 bg-[var(--accent-color)] animate-blink ${className}`}
    />
  )
}
```

- [ ] **Step 3: Create `components/talos-dash/bento-cell.tsx`**

Fetch `components/ui/bento-cell.tsx` from the reference source and save verbatim to `components/talos-dash/bento-cell.tsx`. It only references `var(--accent-color)` + literal classes, so it themes automatically. No edits needed.

- [ ] **Step 4: Create `components/talos-dash/section-divider.tsx`**

Fetch `components/ui/section-divider.tsx` from the reference source and save to `components/talos-dash/section-divider.tsx`, changing ONLY the import line:

```tsx
import { BlinkDot } from "./blink-dot"
```

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no errors referencing the new files).

- [ ] **Step 6: Commit**

```bash
git add app/globals.css components/talos-dash/blink-dot.tsx components/talos-dash/bento-cell.tsx components/talos-dash/section-divider.tsx
git commit -m "feat(dash): theme alias + ported bento/divider/blink wrappers"
```

---

## Task 2: Event types + pure mappers (TDD)

**Files:**
- Create: `lib/talos-dash/events.ts`
- Test: `lib/talos-dash/events.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/talos-dash/events.test.ts`:

```ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { decisionToEvent, activityToEvent, mergeEvents, type Decision, type Ev } from "./events"

test("decisionToEvent maps a REBALANCE to an icarus event with tx explorer + station", () => {
  const d: Decision = {
    n: 5, ts: "2026-06-16T04:07:50.000Z", apys: [{ protocol: "navi", apy: 6.28 }],
    from: "sui", action: "REBALANCE", target: "navi", amount: 100,
    reasoning: "navi > sui", by: "groq", txDigest: "ABC", blobId: "BLOB",
  }
  const e = decisionToEvent(d)
  assert.equal(e.agent, "icarus")
  assert.equal(e.type, "REBALANCE")
  assert.equal(e.id, "dec-5")
  assert.equal(e.station, "navi")
  assert.equal(e.txHash, "ABC")
  assert.equal(e.explorer, "https://suiscan.xyz/mainnet/tx/ABC")
})

test("decisionToEvent maps a HOLD to walrus explorer when no tx", () => {
  const d: Decision = {
    n: 6, ts: "2026-06-16T04:08:00.000Z", apys: [], from: "navi",
    action: "HOLD", target: "navi", amount: 0, reasoning: "holding", by: "groq",
    txDigest: null, blobId: "B2",
  }
  const e = decisionToEvent(d)
  assert.equal(e.type, "HOLD")
  assert.equal(e.station, undefined)
  assert.equal(e.explorer, "https://aggregator.walrus-testnet.walrus.space/v1/blobs/B2")
})

test("activityToEvent routes CriticRating to daedalus, SpendAuthorized to icarus", () => {
  const rating: Ev = { type: "CriticRating", tx: "T1", timestampMs: 1, data: { score: 85, verdict: "ok" } }
  const spend: Ev = { type: "SpendAuthorized", tx: "T2", timestampMs: 2, data: { amount: 100, protocol: "navi", remaining: 9000 } }
  const r = activityToEvent(rating)
  const s = activityToEvent(spend)
  assert.equal(r.agent, "daedalus")
  assert.equal(r.type, "RATING")
  assert.equal(r.station, "policy")
  assert.equal(s.agent, "icarus")
  assert.equal(s.type, "SPEND")
  assert.equal(s.station, "navi")
})

test("mergeEvents dedupes by id and sorts ascending by timestamp", () => {
  const d: Decision = { n: 1, ts: "2026-06-16T00:00:02.000Z", apys: [], from: "navi", action: "HOLD", target: "navi", amount: 0, reasoning: "x", by: "groq", txDigest: null, blobId: null }
  const a: Ev = { type: "SpendAuthorized", tx: "T", timestampMs: 1000, data: { amount: 1, protocol: "navi", remaining: 0 } }
  const merged = mergeEvents([d, d], [a])
  assert.equal(merged.length, 2)
  assert.ok(merged[0].timestamp <= merged[1].timestamp)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --import tsx --test lib/talos-dash/events.test.ts`
Expected: FAIL (`Cannot find module './events'`).

- [ ] **Step 3: Implement `lib/talos-dash/events.ts`**

```ts
export type AgentId = "icarus" | "daedalus"

export interface AgentEvent {
  id: string
  agent: AgentId
  type: string
  detail: string
  timestamp: number
  time: string
  /** Talos venue/station key this event should move a bot to (overrides EVENT_BEHAVIOR). */
  station?: string
  txHash?: string
  blobId?: string
  explorer?: string
}

export interface Apy { protocol: string; apy: number }
export interface Decision {
  n: number
  ts: string
  apys: Apy[]
  from: string
  action: string
  target: string
  amount: number
  reasoning: string
  by: string
  status?: string
  txDigest?: string | null
  blobId?: string | null
}
export interface Ev { type: string; tx: string; timestampMs: number; data: Record<string, any> }

export const EXPLORER = "https://suiscan.xyz/mainnet"
export const WALRUS = "https://aggregator.walrus-testnet.walrus.space/v1/blobs"

const VENUES = new Set(["scallop", "navi", "kai", "sui"])

function fmtTime(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function decisionToEvent(d: Decision): AgentEvent {
  const ts = Date.parse(d.ts) || 0
  const isRebal = d.action === "REBALANCE"
  const detail = isRebal
    ? `${d.amount} ${d.from}→${d.target}: ${d.reasoning}`
    : d.reasoning || "hold"
  return {
    id: `dec-${d.n}`,
    agent: "icarus",
    type: isRebal ? "REBALANCE" : "HOLD",
    detail,
    timestamp: ts,
    time: fmtTime(ts),
    station: isRebal && VENUES.has(d.target) ? d.target : undefined,
    txHash: d.txDigest ?? undefined,
    blobId: d.blobId ?? undefined,
    explorer: d.txDigest
      ? `${EXPLORER}/tx/${d.txDigest}`
      : d.blobId
        ? `${WALRUS}/${d.blobId}`
        : undefined,
  }
}

export function activityToEvent(e: Ev): AgentEvent {
  const d = e.data || {}
  let type = e.type
  let detail = ""
  let station: string | undefined
  let agent: AgentId = "icarus"
  switch (e.type) {
    case "SpendAuthorized":
      type = "SPEND"
      detail = `${d.amount} → ${d.protocol} · remaining ${d.remaining}`
      station = VENUES.has(d.protocol) ? d.protocol : "policy"
      break
    case "CriticRating":
      type = "RATING"
      agent = "daedalus"
      detail = `${d.score}/100 · ${d.verdict}`
      station = "policy"
      break
    case "PolicyCreated":
      detail = `budget ${d.budget} · per-tx ${d.per_tx_cap}`
      station = "policy"
      break
    case "ToppedUp":
      detail = `+${d.added} · remaining ${d.remaining}`
      station = "policy"
      break
    case "ExpiryExtended":
      detail = `new expiry ${d.new_expires_at_ms}`
      station = "policy"
      break
    case "PolicyRevoked":
      detail = "agent disabled by owner"
      station = "policy"
      break
    case "ReputationCreated":
      detail = "reputation ledger created"
      station = "policy"
      break
    default:
      detail = ""
  }
  return {
    id: `ev-${e.tx}-${e.type}`,
    agent,
    type,
    detail,
    timestamp: e.timestampMs || 0,
    time: fmtTime(e.timestampMs || 0),
    station,
    txHash: e.tx || undefined,
    explorer: e.tx ? `${EXPLORER}/tx/${e.tx}` : undefined,
  }
}

export function mergeEvents(decisions: Decision[], activity: Ev[]): AgentEvent[] {
  const out = new Map<string, AgentEvent>()
  for (const d of decisions) {
    const e = decisionToEvent(d)
    out.set(e.id, e)
  }
  for (const a of activity) {
    const e = activityToEvent(a)
    out.set(e.id, e)
  }
  return [...out.values()].sort((a, b) => a.timestamp - b.timestamp)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --import tsx --test lib/talos-dash/events.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/talos-dash/events.ts lib/talos-dash/events.test.ts
git commit -m "feat(dash): event adapter types + pure mappers with tests"
```

---

## Task 3: Singleton polling hook

**Files:**
- Create: `lib/talos-dash/use-agent-events.ts`

- [ ] **Step 1: Implement `lib/talos-dash/use-agent-events.ts`**

```ts
"use client"

import { useSyncExternalStore } from "react"
import { mergeEvents, type AgentEvent, type Decision, type Ev } from "./events"

const POLL_INTERVAL_MS = 1500
const HISTORY_CAP = 500
const EMPTY: AgentEvent[] = []

let history: AgentEvent[] = EMPTY
const seen = new Set<string>()
const listeners = new Set<() => void>()
let pollTimer: ReturnType<typeof setInterval> | null = null
let inflight = false

function notify() {
  for (const l of listeners) l()
}

async function poll() {
  if (typeof window === "undefined" || inflight) return
  inflight = true
  try {
    const [dRes, aRes] = await Promise.all([
      fetch("/api/talos/decisions", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/api/talos/activity", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
    const decisions: Decision[] = dRes?.decisions ?? []
    const activity: Ev[] = aRes?.events ?? []
    const merged = mergeEvents(decisions, activity)
    let added = false
    let next = history
    for (const e of merged) {
      if (seen.has(e.id)) continue
      seen.add(e.id)
      next = next.length >= HISTORY_CAP ? [...next.slice(1), e] : [...next, e]
      added = true
    }
    if (added) {
      history = next
      notify()
    }
  } finally {
    inflight = false
  }
}

function start() {
  if (pollTimer) return
  poll()
  pollTimer = setInterval(poll, POLL_INTERVAL_MS)
}

function stop() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  if (listeners.size === 1) start()
  return () => {
    listeners.delete(cb)
    if (listeners.size === 0) stop()
  }
}

function getSnapshot() {
  return history
}
function getServerSnapshot() {
  return EMPTY
}

/** Shared live event feed (ascending by time). Optional `limit` returns the newest N. */
export function useAgentEvents(limit?: number): AgentEvent[] {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  if (limit && all.length > limit) return all.slice(all.length - limit)
  return all
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/talos-dash/use-agent-events.ts
git commit -m "feat(dash): singleton event polling hook"
```

---

## Task 4: Workshop state (stations, roster, event→station mapping)

**Files:**
- Create: `components/talos-dash/workshop/workshop-state.ts`

- [ ] **Step 1: Implement `components/talos-dash/workshop/workshop-state.ts`**

This is adapted from the reference `components/workshop/workshop-state.ts`. The state-machine hook body (processOne/drain/BRANCH 1-3) is preserved; the roster (2 agents), stations (6 Sui venues with a `meshId`), and `EVENT_BEHAVIOR` are Talos-specific. Write the full file:

```ts
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAgentEvents } from "@/lib/talos-dash/use-agent-events"
import type { AgentEvent, AgentId } from "@/lib/talos-dash/events"

export type StationId = "scallop" | "navi" | "kai" | "sui" | "walrus" | "policy"
export type MeshId = "compute" | "storage" | "keeperhub" | "vault" | "inft"

export interface Station {
  id: StationId
  meshId: MeshId
  label: string
  subLabel: string
  position: [number, number] // [x, z]
}

export const STATIONS: Station[] = [
  { id: "scallop", meshId: "keeperhub", label: "SCALLOP", subLabel: "USDC lending", position: [-8, -6] },
  { id: "navi", meshId: "compute", label: "NAVI", subLabel: "USDC lending", position: [8, -6] },
  { id: "kai", meshId: "storage", label: "KAI", subLabel: "USDC lending", position: [-8, 6] },
  { id: "sui", meshId: "vault", label: "SUI · 7K", subLabel: "volatile rotation", position: [8, 6] },
  { id: "walrus", meshId: "inft", label: "WALRUS", subLabel: "decision log", position: [0, -9] },
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
  HOLD: { target: "home", task: "surveying yields", linger: 1000 },
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
  return [{ agent: e.agent, behavior: { ...base, target } }]
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
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (note: `bot.tsx`/`station.tsx`/`scene.tsx` don't exist yet; if tsc reports missing imports they come from later tasks — verify no errors originate IN `workshop-state.ts` itself).

- [ ] **Step 3: Commit**

```bash
git add components/talos-dash/workshop/workshop-state.ts
git commit -m "feat(dash): workshop state — 2 bots, 6 Sui stations, event mapping"
```

---

## Task 5: Bot mesh (2-agent specs)

**Files:**
- Create: `components/talos-dash/workshop/bot.tsx`

- [ ] **Step 1: Copy the reference bot**

Fetch `components/workshop/bot.tsx` from the reference source, save to `components/talos-dash/workshop/bot.tsx`.

- [ ] **Step 2: Fix the imports (top of file)**

Replace:
```tsx
import type { AgentId } from "@/lib/events"
import { HOME_POSITIONS, type BotState } from "./workshop-state"
```
with:
```tsx
import type { AgentId } from "@/lib/talos-dash/events"
import { HOME_POSITIONS, type BotState } from "./workshop-state"
```

- [ ] **Step 3: Replace the `SPECS` record (3 agents → 2)**

Replace the entire `const SPECS: Record<AgentId, BotSpec> = { ... }` block with:

```tsx
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
  // DAEDALUS — amber critic
  daedalus: {
    body: "#f59e0b",
    bodyDark: "#78350f",
    head: "#fbbf24",
    visorBand: "#1c1917",
    visorEye: "#fde68a",
    accent: "#fef3c7",
  },
}
```

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS for `bot.tsx` (scene.tsx still missing is fine).

- [ ] **Step 5: Commit**

```bash
git add components/talos-dash/workshop/bot.tsx
git commit -m "feat(dash): voxel bot mesh with Icarus/Daedalus specs"
```

---

## Task 6: Station mesh (mesh-by-meshId)

**Files:**
- Create: `components/talos-dash/workshop/station.tsx`

- [ ] **Step 1: Copy the reference station**

Fetch `components/workshop/station.tsx` from the reference source, save to `components/talos-dash/workshop/station.tsx`.

- [ ] **Step 2: Fix the import**

Replace `import type { Station } from "./workshop-state"` (unchanged path — already correct). Confirm it reads:
```tsx
import type { Station } from "./workshop-state"
```

- [ ] **Step 3: Switch mesh selection from `station.id` to `station.meshId`**

In `StationBlock`, replace:
```tsx
  const palette = PALETTES[station.id]
```
with:
```tsx
  const palette = PALETTES[station.meshId]
```
and replace:
```tsx
      <StationVariant id={station.id} palette={palette} />
```
with:
```tsx
      <StationVariant id={station.meshId} palette={palette} />
```

(The `PALETTES` keys and `StationVariant` switch already use the mesh ids `compute|storage|keeperhub|vault|inft`, so no other change is needed. The base-pad palette now also keys off `meshId`.)

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS for `station.tsx`.

- [ ] **Step 5: Commit**

```bash
git add components/talos-dash/workshop/station.tsx
git commit -m "feat(dash): voxel station mesh keyed by meshId"
```

---

## Task 7: Workshop scene (2-agent camera modes)

**Files:**
- Create: `components/talos-dash/workshop/scene.tsx`

- [ ] **Step 1: Copy the reference scene**

Fetch `components/workshop/scene.tsx` from the reference source, save to `components/talos-dash/workshop/scene.tsx`.

- [ ] **Step 2: Fix imports**

Replace the import block lines:
```tsx
import { BlinkDot } from "../ui/blink-dot"
import { Bot } from "./bot"
import { StationBlock } from "./station"
import { STATIONS, useWorkshopState } from "./workshop-state"
import { useAgentEvents } from "@/lib/hooks/use-agent-events"
import type { AgentId } from "@/lib/events"
```
with:
```tsx
import { BlinkDot } from "../blink-dot"
import { Bot } from "./bot"
import { StationBlock } from "./station"
import { STATIONS, useWorkshopState } from "./workshop-state"
import { useAgentEvents } from "@/lib/talos-dash/use-agent-events"
import type { AgentId } from "@/lib/talos-dash/events"
```

- [ ] **Step 3: Replace the camera `MODES` array (drop beta/gamma, add daedalus)**

Replace:
```tsx
const MODES: { id: CameraMode; label: string }[] = [
  { id: "overview", label: "OVERVIEW" },
  { id: "auto", label: "AUTO" },
  { id: "alpha", label: "ALPHA" },
  { id: "beta", label: "BETA" },
  { id: "gamma", label: "GAMMA" },
]
```
with:
```tsx
const MODES: { id: CameraMode; label: string }[] = [
  { id: "overview", label: "OVERVIEW" },
  { id: "auto", label: "AUTO" },
  { id: "icarus", label: "ICARUS" },
  { id: "daedalus", label: "DAEDALUS" },
]
```

- [ ] **Step 4: Build + lint to surface any remaining agent-id references**

Run: `pnpm exec tsc --noEmit`
Expected: PASS. If tsc flags any remaining `"alpha"|"beta"|"gamma"` literals in `scene.tsx` (e.g. a hardcoded `botRefs` initializer or auto-focus candidate list), replace them with `"icarus"|"daedalus"` accordingly. Re-run until clean.

- [ ] **Step 5: Commit**

```bash
git add components/talos-dash/workshop/scene.tsx
git commit -m "feat(dash): voxel scene with Icarus/Daedalus camera modes"
```

---

## Task 8: Event stream component

**Files:**
- Create: `components/talos-dash/event-stream.tsx`

- [ ] **Step 1: Copy the reference event stream**

Fetch `components/ui/event-stream.tsx` from the reference source, save to `components/talos-dash/event-stream.tsx`.

- [ ] **Step 2: Fix the events import**

Ensure the hook + types import from the Talos adapter:
```tsx
import { useAgentEvents } from "@/lib/talos-dash/use-agent-events"
import type { AgentEvent, AgentId } from "@/lib/talos-dash/events"
```
(Replace any `@/lib/hooks/use-agent-events` / `@/lib/events` paths. Keep all other imports.)

- [ ] **Step 3: Replace `AGENT_META` and `FILTERS` (3 agents → 2)**

Replace the `AGENT_META` record with:
```tsx
const AGENT_META: Record<AgentId, { glyph: string; label: string; color: string }> = {
  icarus: { glyph: "I", label: "ICARUS", color: "var(--accent-color)" },
  daedalus: { glyph: "D", label: "DAEDALUS", color: "#f59e0b" },
}
```
and the `FILTERS` array with:
```tsx
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "icarus", label: "ICARUS" },
  { key: "daedalus", label: "DAEDALUS" },
]
```

- [ ] **Step 4: Fix the `FilterKey` type and the empty-state hint**

If `FilterKey` is declared as a union of `"all" | "alpha" | "beta" | "gamma"`, change it to:
```tsx
type FilterKey = "all" | "icarus" | "daedalus"
```
If the empty state references `npx tsx scripts/alpha-cycle.ts`, change it to `the Icarus runtime is starting…`.

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/talos-dash/event-stream.tsx
git commit -m "feat(dash): live event stream (Icarus/Daedalus)"
```

---

## Task 9: Thought stream (decision + rating cards)

**Files:**
- Create: `components/talos-dash/thought-stream.tsx`

- [ ] **Step 1: Implement `components/talos-dash/thought-stream.tsx`**

A self-contained component: fetches `/api/talos/decisions` (rich Icarus cards with APY survey + reasoning) and `/api/talos/activity` (Daedalus `CriticRating` cards), merges them time-descending, color-codes per agent, links to Suiscan/Walrus. Talos-themed.

```tsx
"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight } from "lucide-react"
import type { Apy, Decision } from "@/lib/talos-dash/events"
import { EXPLORER, WALRUS } from "@/lib/talos-dash/events"

interface RatingEv { type: string; tx: string; timestampMs: number; data: Record<string, any> }

type Card =
  | { kind: "icarus"; ts: number; d: Decision }
  | { kind: "daedalus"; ts: number; score: number; verdict: string; tx: string }

function ago(ms: number) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export function ThoughtStream() {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [ratings, setRatings] = useState<RatingEv[]>([])

  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const [dc, ac] = await Promise.all([
          fetch("/api/talos/decisions", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
          fetch("/api/talos/activity", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        ])
        if (!alive) return
        if (dc?.decisions) setDecisions(dc.decisions)
        if (ac?.events) setRatings(ac.events.filter((e: RatingEv) => e.type === "CriticRating"))
      } catch {
        /* keep last good */
      }
    }
    tick()
    const id = setInterval(tick, 5000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  const cards: Card[] = [
    ...decisions.map((d) => ({ kind: "icarus" as const, ts: Date.parse(d.ts) || 0, d })),
    ...ratings.map((r) => ({
      kind: "daedalus" as const,
      ts: r.timestampMs || 0,
      score: Number(r.data.score),
      verdict: String(r.data.verdict ?? ""),
      tx: r.tx,
    })),
  ].sort((a, b) => b.ts - a.ts)

  return (
    <div className="border-2 border-border">
      <div className="flex items-center justify-between border-b-2 border-border px-5 py-2.5">
        <span className="text-[11px] uppercase tracking-widest">{`AGENT THOUGHTS // ${cards.length} ENTRIES`}</span>
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="h-2 w-2 animate-blink bg-accent" />
          ICARUS · DAEDALUS
        </span>
      </div>
      {cards.length === 0 && (
        <div className="px-5 py-12 text-center text-xs text-muted-foreground">
          NO DECISIONS YET — ICARUS LOGS A THOUGHT EVERY TICK.
        </div>
      )}
      {cards.map((c) =>
        c.kind === "icarus" ? <IcarusCard key={`i-${c.d.n}`} d={c.d} /> : <DaedalusCard key={`d-${c.tx}`} score={c.score} verdict={c.verdict} tx={c.tx} ts={c.ts} />,
      )}
    </div>
  )
}

function IcarusCard({ d }: { d: Decision }) {
  const rebalance = d.action === "REBALANCE"
  const best = [...(d.apys ?? [])].sort((a: Apy, b: Apy) => b.apy - a.apy)[0]?.protocol
  return (
    <div className="border-b border-border px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="shrink-0 border border-[var(--accent-color)]/50 px-2 py-1 text-[9px] uppercase tracking-wider text-[var(--accent-color)]">ICARUS</span>
        <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">#{d.n}</span>
        <span className={`shrink-0 border px-2 py-1 text-[9px] uppercase tracking-wider ${rebalance ? "border-accent text-accent" : "border-border text-muted-foreground"}`}>{d.action}</span>
        {rebalance && <span className="shrink-0 text-[10px] uppercase tracking-widest text-accent">{d.amount} · {d.from} → {d.target}</span>}
        <span className="ml-auto shrink-0 border border-border px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">{d.by}</span>
        <span className="hidden shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">{ago(Date.parse(d.ts))}</span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {(d.apys ?? []).map((a) => {
          const isTarget = a.protocol === d.target
          const isBest = a.protocol === best
          return (
            <span key={a.protocol} className={`border px-2 py-1 text-[10px] uppercase tracking-wider ${isTarget ? "border-accent text-accent" : isBest ? "border-foreground text-foreground" : "border-border text-muted-foreground"}`}>
              {a.protocol} {a.apy}%{isTarget ? " ◀" : ""}
            </span>
          )
        })}
      </div>
      {d.reasoning && (
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground"><span className="text-foreground">↳ </span>{d.reasoning}</p>
      )}
      {(d.blobId || d.txDigest) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-widest">
          {d.txDigest && (
            <a href={`${EXPLORER}/tx/${d.txDigest}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">ON-CHAIN TX <ArrowUpRight size={12} /></a>
          )}
          {d.blobId && (
            <a href={`${WALRUS}/${d.blobId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground" title="Decision record on Walrus">WALRUS MEMORY <ArrowUpRight size={12} /></a>
          )}
        </div>
      )}
    </div>
  )
}

function DaedalusCard({ score, verdict, tx, ts }: { score: number; verdict: string; tx: string; ts: number }) {
  return (
    <div className="border-b border-border px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="shrink-0 border border-[#f59e0b]/50 px-2 py-1 text-[9px] uppercase tracking-wider text-[#f59e0b]">DAEDALUS</span>
        <span className="font-pixel text-lg text-accent">{score}</span>
        <span className="shrink-0 text-[9px] uppercase tracking-wider text-muted-foreground">/ 100</span>
        <span className="ml-auto hidden shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">{ago(ts)}</span>
      </div>
      {verdict && <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground"><span className="text-foreground">↳ </span>{verdict}</p>}
      <div className="mt-2.5 text-[10px] uppercase tracking-widest">
        <a href={`${EXPLORER}/tx/${tx}`} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1 text-muted-foreground hover:text-foreground">ON-CHAIN RATING <ArrowUpRight size={12} /></a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/talos-dash/thought-stream.tsx
git commit -m "feat(dash): THOUGHT stream — Icarus decisions + Daedalus ratings"
```

---

## Task 10: Portfolio API route

**Files:**
- Create: `app/api/talos/portfolio/route.ts`

- [ ] **Step 1: Inspect an existing Talos route for conventions**

Read `app/api/talos/policy/route.ts` to copy its runtime export style, RPC/client usage, and error-shape (`{ error }`). Reuse the same `AGENT_ADDRESS`/RPC source it uses (`lib/talos/config` or `lib/talos/public`).

- [ ] **Step 2: Implement `app/api/talos/portfolio/route.ts`**

Reads on-chain balances via `suix_getAllBalances` and derives positions. USDC type and decimals match `lib/talos/sevenk.ts`. Coin types: SUI `0x2::sui::SUI`; USDC `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC`. Lending receipt coins are matched by symbol substring (scallop/navi/kai) since exact types vary; everything USDC-denominated is treated 1:1, SUI valued via `getSuiPrice()`.

```ts
import { getSuiPrice } from "@7kprotocol/sdk-ts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const RPC = process.env.SUI_RPC || "https://fullnode.mainnet.sui.io:443"
const AGENT =
  process.env.TALOS_AGENT_ADDRESS ||
  "0x1f0455e5fb79711dff710e04aa9a7ea4dbb582b77a3a5452fcc61be1cb80ea7f"

const SUI_TYPE = "0x2::sui::SUI"
const USDC_TYPE = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"

interface Balance { coinType: string; totalBalance: string }

async function rpc(method: string, params: any[]) {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  })
  if (!r.ok) throw new Error(`rpc ${method} ${r.status}`)
  const j = await r.json()
  if (j.error) throw new Error(j.error.message || "rpc error")
  return j.result
}

export async function GET() {
  try {
    const [balances, price, decisionsRes, activityRes] = await Promise.all([
      rpc("suix_getAllBalances", [AGENT]) as Promise<Balance[]>,
      getSuiPrice().catch(() => 0),
      fetch(`${process.env.DASHBOARD_SELF_URL || "http://127.0.0.1:3000"}/api/talos/decisions`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      fetch(`${process.env.DASHBOARD_SELF_URL || "http://127.0.0.1:3000"}/api/talos/activity`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
    ])

    const byType = new Map(balances.map((b) => [b.coinType, b.totalBalance]))
    const sui = Number(byType.get(SUI_TYPE) ?? "0") / 1e9
    const usdc = Number(byType.get(USDC_TYPE) ?? "0") / 1e6
    const suiUsd = sui * (price || 0)

    const lending: Array<{ venue: string; label: string; amountUsd: number; kind: "lending" }> = []
    for (const b of balances) {
      const t = b.coinType.toLowerCase()
      const amt = Number(b.totalBalance)
      if (amt <= 0) continue
      if (t.includes("scallop")) lending.push({ venue: "scallop", label: "SCALLOP", amountUsd: amt / 1e6, kind: "lending" })
      else if (t.includes("navi") && t.includes("usdc")) lending.push({ venue: "navi", label: "NAVI", amountUsd: amt / 1e6, kind: "lending" })
      else if (t.includes("kai") && t.includes("usdc")) lending.push({ venue: "kai", label: "KAI", amountUsd: amt / 1e6, kind: "lending" })
    }

    const positions = [
      { venue: "sui", label: "SUI (gas + strategy)", amountUsd: +suiUsd.toFixed(2), kind: "volatile" as const },
      { venue: "usdc", label: "USDC (cash)", amountUsd: +usdc.toFixed(2), kind: "cash" as const },
      ...lending.map((l) => ({ ...l, amountUsd: +l.amountUsd.toFixed(2) })),
    ].filter((p) => p.amountUsd > 0)

    const totalUsd = +positions.reduce((s, p) => s + p.amountUsd, 0).toFixed(2)

    const decisions: any[] = decisionsRes?.decisions ?? []
    const latest = decisions[0]
    const currentVenue = latest?.target ?? latest?.from ?? "—"
    const apys: any[] = latest?.apys ?? []
    const cur = apys.find((a) => a.protocol === currentVenue)
    const blendedApy = cur ? cur.apy : null

    const events: any[] = activityRes?.events ?? []
    const spends = events.filter((e) => e.type === "SpendAuthorized")
    const lastSpend = spends[0]
    const lastRebalance = lastSpend
      ? { from: "—", to: lastSpend.data?.protocol ?? "—", amount: Number(lastSpend.data?.amount ?? 0), ts: new Date(lastSpend.timestampMs).toISOString(), txDigest: lastSpend.tx }
      : null
    const history = spends.slice(0, 20).map((e) => ({ ts: e.timestampMs, from: "—", to: e.data?.protocol ?? "—", txDigest: e.tx }))

    return Response.json({ address: AGENT, totalUsd, positions, currentVenue, blendedApy, lastRebalance, history })
  } catch (e: any) {
    return Response.json({ error: String(e?.message ?? e) }, { status: 200 })
  }
}
```

- [ ] **Step 3: Verify the route compiles and responds**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.
Then run `pnpm dev`, and in another shell: `curl -s http://localhost:3000/api/talos/portfolio | head -c 400`
Expected: JSON with `address`, `positions`, `totalUsd` (or an `{ error }` if RPC unreachable locally — acceptable; the panel handles it).

- [ ] **Step 4: Commit**

```bash
git add app/api/talos/portfolio/route.ts
git commit -m "feat(dash): /api/talos/portfolio on-chain balance aggregator"
```

---

## Task 11: Portfolio panel (read-only)

**Files:**
- Create: `components/talos-dash/portfolio-panel.tsx`

- [ ] **Step 1: Implement `components/talos-dash/portfolio-panel.tsx`**

Talos-themed, read-only, consuming `/api/talos/portfolio`. No deposit/withdraw.

```tsx
"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, RefreshCw } from "lucide-react"

const EXPLORER = "https://suiscan.xyz/mainnet"

interface Position { venue: string; label: string; amountUsd: number; kind: string }
interface Portfolio {
  address: string
  totalUsd: number
  positions: Position[]
  currentVenue: string
  blendedApy: number | null
  lastRebalance: { from: string; to: string; amount: number; ts: string; txDigest?: string } | null
  history: Array<{ ts: number; from: string; to: string; txDigest?: string }>
  error?: string
}

const trunc = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—")
function ago(ms: number) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export function PortfolioPanel() {
  const [p, setP] = useState<Portfolio | null>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch("/api/talos/portfolio", { cache: "no-store" })
      const data = await r.json()
      setP(data)
    } catch {
      /* keep last good */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 90_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="space-y-8">
      <div className="border-2 border-border">
        <div className="flex items-center justify-between border-b-2 border-border px-5 py-2.5">
          <span className="text-[11px] uppercase tracking-widest">PORTFOLIO // SUI MAINNET · LIVE</span>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-40">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> REFRESH
          </button>
        </div>

        {p?.error && (
          <div className="border-b-2 border-destructive/40 bg-destructive/10 px-5 py-3 text-xs text-destructive">ERR // {p.error}</div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 [&>*]:border-b-2 [&>*]:border-r-2 [&>*]:border-border">
          <div className="px-5 py-6">
            <div className="font-pixel text-3xl text-accent">{p ? `$${p.totalUsd}` : "—"}</div>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">TOTAL VALUE</div>
          </div>
          <div className="px-5 py-6">
            <div className="font-pixel text-3xl">{p?.currentVenue ?? "—"}</div>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">CURRENT VENUE</div>
          </div>
          <div className="px-5 py-6">
            <div className="font-pixel text-3xl text-accent">{p?.blendedApy != null ? `${p.blendedApy}%` : "—"}</div>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">CURRENT APY</div>
          </div>
          <div className="px-5 py-6">
            <div className="font-mono text-sm text-foreground break-all">{trunc(p?.address)}</div>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">AGENT WALLET</div>
          </div>
        </div>
      </div>

      <div className="border-2 border-border">
        <div className="border-b-2 border-border px-5 py-2.5 text-[11px] uppercase tracking-widest">POSITIONS</div>
        {(p?.positions ?? []).map((pos) => (
          <div key={pos.venue} className="flex items-center gap-4 border-b border-border px-5 py-3">
            <span className="shrink-0 border border-border px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">{pos.kind}</span>
            <span className="flex-1 text-xs text-foreground">{pos.label}</span>
            <span className="font-mono text-sm text-accent">${pos.amountUsd}</span>
          </div>
        ))}
        {(!p || p.positions.length === 0) && <div className="px-5 py-12 text-center text-xs text-muted-foreground">NO POSITIONS.</div>}
      </div>

      <div className="border-2 border-border">
        <div className="border-b-2 border-border px-5 py-2.5 text-[11px] uppercase tracking-widest">REBALANCE HISTORY</div>
        {(p?.history ?? []).map((h, i) => (
          <div key={`${h.txDigest}-${i}`} className="flex items-center gap-4 border-b border-border px-5 py-3">
            <span className="flex-1 truncate text-xs text-muted-foreground">→ {h.to}</span>
            <span className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">{ago(h.ts)}</span>
            {h.txDigest && (
              <a href={`${EXPLORER}/tx/${h.txDigest}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><ArrowUpRight size={14} /></a>
            )}
          </div>
        ))}
        {(!p || p.history.length === 0) && <div className="px-5 py-12 text-center text-xs text-muted-foreground">NO REBALANCES YET.</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/talos-dash/portfolio-panel.tsx
git commit -m "feat(dash): read-only portfolio panel"
```

---

## Task 12: On-chain proof stream

**Files:**
- Create: `components/talos-dash/onchain-stream.tsx`

- [ ] **Step 1: Copy the reference onchain stream**

Fetch `components/ui/onchain-stream.tsx` from the reference source, save to `components/talos-dash/onchain-stream.tsx`.

- [ ] **Step 2: Fix the events import**

Set the hook + types import to:
```tsx
import { useAgentEvents } from "@/lib/talos-dash/use-agent-events"
import type { AgentEvent } from "@/lib/talos-dash/events"
```

- [ ] **Step 3: Replace the `CHAINS` map and `classify()` with SUI + WALRUS**

Replace the `type ChainCategory`, `CHAINS` record, and the `classify()` function with:

```tsx
type ChainCategory = "sui" | "walrus"

interface ChainTag { category: ChainCategory; label: string; color: string; bg: string; border: string }

const CHAINS: Record<ChainCategory, ChainTag> = {
  sui: { category: "sui", label: "SUI", color: "#3b97fb", bg: "rgba(59,151,251,0.10)", border: "rgba(59,151,251,0.40)" },
  walrus: { category: "walrus", label: "WALRUS", color: "#22d3ee", bg: "rgba(34,211,238,0.10)", border: "rgba(34,211,238,0.40)" },
}

function classify(e: AgentEvent): ChainTag | null {
  const url = e.explorer || ""
  if (url.includes("suiscan")) return CHAINS.sui
  if (e.txHash) return CHAINS.sui
  if (url.includes("walrus") || e.blobId) return CHAINS.walrus
  return null
}
```

- [ ] **Step 4: Fix the URL resolver if present**

If the file has a `resolveUrl(e)` helper referencing `storagescan-galileo`/`basescan`, replace its body to return `e.explorer` directly:
```tsx
function resolveUrl(e: AgentEvent): string | null {
  return e.explorer ?? (e.blobId ? `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${e.blobId}` : null)
}
```
(Keep the surrounding component/render code; only the chain classification + URL resolution change.)

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/talos-dash/onchain-stream.tsx
git commit -m "feat(dash): on-chain proof stream (SUI + Walrus)"
```

---

## Task 13: Wire the dashboard page

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add imports + lazy workshop at the top of `app/dashboard/page.tsx`**

After the existing `"use client"` and React imports, add:
```tsx
import dynamic from "next/dynamic"
import { EventStream } from "@/components/talos-dash/event-stream"
import { ThoughtStream } from "@/components/talos-dash/thought-stream"
import { PortfolioPanel } from "@/components/talos-dash/portfolio-panel"
import { OnchainStream } from "@/components/talos-dash/onchain-stream"

const WorkshopScene = dynamic(
  () => import("@/components/talos-dash/workshop/scene").then((m) => m.WorkshopScene),
  { ssr: false, loading: () => <div className="flex h-[520px] items-center justify-center border-2 border-border text-xs uppercase tracking-widest text-muted-foreground">loading workshop…</div> },
)
```

- [ ] **Step 2: Replace the `TABS` tuple**

Replace:
```tsx
const TABS = ["OVERVIEW", "THOUGHTS", "ACTIVITY", "POLICY", "REPUTATION"] as const
```
with:
```tsx
const TABS = ["LIVE", "THOUGHT", "PORTFOLIO", "ON-CHAIN", "POLICY", "REPUTATION"] as const
```
and change the initial tab state `useState<Tab>("OVERVIEW")` to `useState<Tab>("LIVE")`.

- [ ] **Step 3: Replace the OVERVIEW + THOUGHTS + ACTIVITY tab blocks with LIVE + THOUGHT + PORTFOLIO + ON-CHAIN**

Remove the three JSX blocks `{tab === "OVERVIEW" && (...)}`, `{tab === "THOUGHTS" && (...)}`, and `{tab === "ACTIVITY" && (...)}`. In their place insert:

```tsx
{/* ===== LIVE ===== */}
{tab === "LIVE" && (
  <div className="space-y-8">
    <SwarmHeartbeat swarm={swarm} />
    <Panel title={`BUDGET LEASH // ${pct}% REMAINING`}>
      <div className="px-5 pt-5">
        <div className="h-3 w-full border-2 border-border">
          <div className="h-full bg-accent transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="h-64 w-full p-4">
        {budgetSeries.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={budgetSeries} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="bud" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" stroke={GRID} tick={{ fill: TICK, fontSize: 10, fontFamily: "var(--font-mono)" }} />
              <YAxis stroke={GRID} tick={{ fill: TICK, fontSize: 10, fontFamily: "var(--font-mono)" }} width={56} />
              <Tooltip content={<ChartTip />} cursor={{ stroke: ACCENT, strokeOpacity: 0.3 }} />
              <Area type="stepAfter" dataKey="remaining" stroke={ACCENT} strokeWidth={2} fill="url(#bud)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">BUDGET HISTORY APPEARS AS ICARUS REBALANCES</div>
        )}
      </div>
    </Panel>
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 border-2 border-border">
        <div className="border-b-2 border-border px-5 py-2.5 text-[11px] uppercase tracking-widest">AGENT WORKSHOP // ICARUS · DAEDALUS</div>
        <div className="h-[520px]"><WorkshopScene bare /></div>
      </div>
      <div className="border-2 border-border">
        <div className="border-b-2 border-border px-5 py-2.5 text-[11px] uppercase tracking-widest">EVENT STREAM</div>
        <div className="h-[520px] p-3"><EventStream bare /></div>
      </div>
    </div>
  </div>
)}

{/* ===== THOUGHT ===== */}
{tab === "THOUGHT" && <ThoughtStream />}

{/* ===== PORTFOLIO ===== */}
{tab === "PORTFOLIO" && <PortfolioPanel />}

{/* ===== ON-CHAIN ===== */}
{tab === "ON-CHAIN" && (
  <Panel title={`ON-CHAIN PROOFS // ${events.length} EVENTS`}>
    <div className="p-3"><OnchainStream bare /></div>
  </Panel>
)}
```

- [ ] **Step 4: Remove now-unused code**

Delete `ThoughtsFeed` and `ThoughtRow` (replaced by `ThoughtStream`) and `ActivityRow` (no longer referenced after OVERVIEW/ACTIVITY are gone). Also delete the now-orphaned `rebalances` const (it was only read by the removed OVERVIEW stat grid). **Keep** `Empty` (the REPUTATION tab's RATINGS LOG still renders `<Empty />`), `Stat` (REPUTATION stat grid), `SwarmHeartbeat`, `Panel`, `ChartTip`, and `budgetSeries`/`spends`/`pct` (now used by LIVE). Run the build in Step 5 to catch any orphaned references.

- [ ] **Step 5: Build + lint**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm build`
Expected: PASS. Fix any unused-import/variable lint errors by removing the dead symbols flagged.

- [ ] **Step 6: Visual verification against the live VM**

Run `pnpm dev`, open `http://localhost:3000/dashboard`. Confirm:
- LIVE: heartbeat + budget render; the voxel loads (two bots at center, six labelled stations); the event stream fills within a few seconds; clicking a bot opens nothing fatal (no agent sidebar is wired — that's expected/out of scope).
- THOUGHT: Icarus decision cards (with APY chips) and Daedalus rating cards interleave, newest first.
- PORTFOLIO: total value, positions, current venue, rebalance history populate (or a graceful error line).
- ON-CHAIN: proof rows tagged SUI/WALRUS, each opens the correct explorer.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dash): wire LIVE/THOUGHT/PORTFOLIO/ON-CHAIN tabs"
```

---

## Self-Review Notes (for the implementer)

- The voxel `Bot` click calls `onAgentClick` in `scene.tsx`; the page passes no handler (`<WorkshopScene bare />`), so clicks are inert by design — the agent sidebar is out of scope.
- If `pnpm exec tsc --noEmit` flags `@7kprotocol/sdk-ts` `getSuiPrice` typing in the portfolio route, mirror the import style already used in `lib/talos/yields.ts` (which imports `getSuiPrice` from the same package successfully).
- The event adapter dedupes by stable id (`dec-{n}`, `ev-{tx}-{type}`), so re-fetched decisions/activity never double-count and the voxel never re-stampedes.
- All four surfaces degrade gracefully on fetch failure (keep last good state / inline error), matching the existing dashboard's `tick()` pattern.
