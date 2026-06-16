# Talos Dashboard Port — Design

**Date:** 2026-06-16
**Status:** Approved (pending spec review)

## Goal

Port four dashboard surfaces from the prior ZW.ARM project (Base/0G, 3 agents) into
the Talos Sui dashboard (`app/dashboard/page.tsx`), preserving ZW.ARM's exact
**layout and behavior** while re-skinning to Talos's existing theme:

1. **LIVE** — the 3D voxel "workshop" + the live event stream
2. **THOUGHT** — ZW.ARM's `llm-decisions-stream` (agent reasoning cards)
3. **PORTFOLIO** — ZW.ARM's `portfolio-panel`, read-only
4. **ON-CHAIN** — ZW.ARM's `onchain-stream` (verifiable proof rows)

## Confirmed decisions

- **Voxel roster:** 2 bots — Icarus (executor) + Daedalus (critic). No third/"subscriber" agent.
- **Stations:** Talos venues — SCALLOP · NAVI · KAI · SUI·7K · WALRUS · POLICY.
- **Theme:** Talos's existing look (blue `#3b97fb`, `border-2` brutalist, `font-pixel`).
  Port ZW.ARM's structure/behavior, NOT its colors/bento/section-divider styling.
- **Portfolio:** read-only. Drop the Deposit/Withdraw buttons (Talos has no per-user auth).
- **Tabs:** `LIVE · THOUGHT · PORTFOLIO · ON-CHAIN · POLICY · REPUTATION`.
  Drop OVERVIEW and ACTIVITY. Fold OVERVIEW's swarm-heartbeat + budget chart into the
  top of the LIVE tab so that content is not lost.

## Architecture

### The linchpin: a unified event adapter (Approach A)

ZW.ARM's voxel walks, event stream, and proof stream are all driven by a single
`useAgentEvents()` hook backed by a Mongo/SSE event bus. Talos has no event bus, but
already exposes the same information via two existing endpoints:

- `GET /api/talos/decisions` → `Decision[]` (the "thoughts": apys, action, target,
  reasoning, by, txDigest, blobId, ts, n)
- `GET /api/talos/activity` → `{ events: Ev[] }` (on-chain events: `SpendAuthorized`,
  `CriticRating`, `PolicyCreated`, `ToppedUp`, `ExpiryExtended`, `PolicyRevoked`,
  `ReputationCreated`, each `{ type, tx, timestampMs, data }`)

Build `lib/talos-dash/use-agent-events.ts`: a **singleton poller** (mirrors ZW.ARM's
hook — module-scoped state, `useSyncExternalStore`, 1.5s interval, 500-event history
cap, dedupe by id) that fetches both endpoints and synthesizes the exact `AgentEvent`
shape the ported components expect.

`lib/talos-dash/events.ts` defines:

```ts
export type AgentId = "icarus" | "daedalus"
export interface AgentEvent {
  id: string
  agent: AgentId
  type: string        // mapped event type (see below)
  detail: string      // human-readable line
  timestamp: number   // ms
  time: string        // HH:MM:SS, derived browser-local
  txHash?: string     // Sui tx digest
  blobId?: string     // Walrus blob id
  explorer?: string   // resolved click-through URL
}
```

**Mapping rules (adapter):**

| Source | → AgentEvent |
|---|---|
| Decision, `action==="REBALANCE"` | agent `icarus`, type `REBALANCE`, detail `"{amount} {from}→{target}: {reasoning}"`, `txHash=txDigest`, `blobId`, explorer=suiscan tx |
| Decision, `action==="HOLD"` | agent `icarus`, type `HOLD`, detail=reasoning, `blobId`, explorer=walrus blob |
| Activity `SpendAuthorized` | agent `icarus`, type `SPEND`, detail `"{amount} → {protocol} · remaining {remaining}"`, `txHash=tx`, explorer=suiscan |
| Activity `CriticRating` | agent `daedalus`, type `RATING`, detail `"{score}/100 · {verdict}"`, `txHash=tx`, explorer=suiscan |
| Activity `PolicyCreated`/`ToppedUp`/`ExpiryExtended`/`PolicyRevoked`/`ReputationCreated` | agent `icarus`, type as-is, detail via existing `evDetail()`, `txHash=tx`, explorer=suiscan |

`id` is derived stably from source (`dec-{n}` / `ev-{tx}-{type}`) so the dedupe set and
the voxel's "consumed" tracking work across polls.

Constants: `EXPLORER = https://suiscan.xyz/mainnet`, `WALRUS = https://aggregator.walrus-testnet.walrus.space/v1/blobs`.

### LIVE tab — voxel workshop + event stream

Port `components/workshop/{scene,bot,station,workshop-state}.tsx` into
`components/talos-dash/workshop/` **with the engine verbatim** (camera rig, exponential
smoothing, hop/idle animation, per-frame drain processor, cooldown/linger state machine).

Changes:

- `AgentId` = `icarus | daedalus`. `SPECS` → 2 bots: Icarus blue (`#3b97fb` family),
  Daedalus amber. `HOME_POSITIONS` → two home spots (e.g. `icarus [-2,1]`, `daedalus [2,1]`).
- `CameraRig` MODES → `overview · auto · icarus · daedalus`.
- `STATIONS` → 6 Talos stations mapped onto the existing 5 mesh variants
  (`compute|storage|keeperhub|vault|inft`):
  - SCALLOP → `keeperhub` mesh, NAVI → `compute`, KAI → `storage`,
    SUI·7K → `vault`, WALRUS → `inft`, POLICY → reuse `compute`/`vault` variant (TBD pick
    during impl for visual distinctness).
- `EVENT_BEHAVIOR` (Talos):
  - `REBALANCE` → station = target venue (scallop/navi/kai/sui), task `"rotating → {target}"`, linger 2500
  - `SPEND` → same as REBALANCE target, task `"authorizing spend"`, linger 2000
  - `HOLD` → `home`, task `"surveying yields"`, linger 1000
  - Walrus-store signal (HOLD/REBALANCE both carry blobId) → optional WALRUS hop, task `"logging to walrus"`, linger 1200
  - `RATING` (daedalus) → POLICY station, task `"rating decision"`, linger 2000
  - policy lifecycle types → POLICY station
- `PALETTES` retinted toward Talos accent; nameplate/label `var(--accent-color)` → Talos blue.
- Right column: ported `event-stream.tsx`, filter chips `ALL · ICARUS · DAEDALUS`.
- Above the workshop: the existing `SwarmHeartbeat` + budget-leash chart (moved from OVERVIEW).

Lazy-load the workshop with `next/dynamic` (`ssr:false`) exactly as ZW.ARM does — the
three.js bundle only loads when LIVE is open. Deps already installed (`three@0.167`,
`@react-three/fiber@9.3`, `@react-three/drei@10.7`, `framer-motion@12.40`).

### THOUGHT tab — reasoning cards

Port `llm-decisions-stream.tsx` → `components/talos-dash/thought-stream.tsx`, fed by
`/api/talos/decisions`. One card per decision. Agent color-coding for icarus/daedalus.
Each card: action badge, the live APY survey chips (highlight target + best), reasoning
line, and VERIFY links → Suiscan tx (`txDigest`) + Walrus blob (`blobId`). Replaces the
current THOUGHTS tab implementation. Re-skinned to Talos theme.

### PORTFOLIO tab — read-only

New `app/api/talos/portfolio/route.ts` (server, nodejs runtime) reads on-chain via the
mainnet RPC (`suix_getAllBalances` for `AGENT_ADDRESS`) and the decisions/activity feeds:

```ts
type PortfolioResponse = {
  address: string
  totalUsd: number
  positions: Array<{ venue: string; label: string; amountUsd: number; kind: "lending"|"volatile"|"cash" }>
  currentVenue: string            // from latest decision `from`/`target`
  blendedApy: number | null       // best-effort from latest apys survey
  lastRebalance: { from: string; to: string; amount: number; ts: string; txDigest?: string } | null
  history: Array<{ ts: number; from: string; to: string; txDigest?: string }>  // from SpendAuthorized events
}
```

Position composition: SUI (cash/gas), USDC (cash), scallop/navi/kai receipt tokens
(lending), Helios SUI strategy position USD (volatile, via `readUsdcPosition()` value
logic — USD = suiBase × getSuiPrice()). Port `portfolio-panel.tsx` →
`components/talos-dash/portfolio-panel.tsx` read-only (drop Deposit/Withdraw). Re-skinned.

### ON-CHAIN tab — proof stream

Port `onchain-stream.tsx` → `components/talos-dash/onchain-stream.tsx`, consuming the
event adapter. `classify()` rewritten: events with `explorer` containing `suiscan` →
**SUI** tag; events with a `blobId` (Walrus) → **WALRUS** tag; everything else filtered
out. Auto-scroll, each row a click-through anchor. Re-skinned (drop Base/0G/KH chains).

## Component boundaries

Each unit has one purpose, a well-defined interface, and is independently testable:

- `lib/talos-dash/events.ts` — types + pure mapping functions (`decisionToEvent`,
  `activityToEvent`). Pure, unit-testable with fixture data.
- `lib/talos-dash/use-agent-events.ts` — singleton poller. Depends only on the two
  existing endpoints + the pure mappers.
- `workshop/*` — consumes `useAgentEvents`; no knowledge of Talos APIs.
- `thought-stream` / `portfolio-panel` — fetch their own endpoint; self-contained.
- `onchain-stream` / `event-stream` — consume `useAgentEvents`; presentational.
- `app/api/talos/portfolio/route.ts` — server data assembly; the only new backend code.

## Error handling

- Adapter poll: on non-OK/non-JSON response, keep last good state (mirror ZW.ARM +
  existing dashboard `tick()` behavior). Network blips heal next poll.
- Portfolio route: RPC failure → 200 with `error` field; panel shows a friendly
  inline error and keeps last good render (existing dashboard pattern).
- Voxel: `ssr:false` + a loading placeholder; failure to init three.js degrades to the
  placeholder, not a crashed page.

## Testing

- Unit: pure mappers in `events.ts` against fixture `Decision[]` / `Ev[]` → assert
  `AgentEvent` shape, agent assignment, explorer/blob resolution, stable ids/dedupe.
- Manual/visual: run the dashboard against the live VM endpoints; confirm bots walk on
  real rebalances, event stream fills, portfolio reflects on-chain balances, proof rows
  open the correct explorer. (Per repo norms — no existing automated UI test harness.)

## Out of scope (YAGNI)

- No SSE/event-bus backend, no swarm/VM runtime changes.
- No deposit/withdraw, no auth, no MCP-tokens tab, no marketplace/iNFT/royalty surfaces.
- No new chains beyond Sui + Walrus.
