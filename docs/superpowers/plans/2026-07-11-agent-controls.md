# Agent Start/Stop Controls Plan

> Autonomous loop: sensible defaults, don't wait for the user, commit per task, DO NOT push. Branch feat/managed-wallet.

**Goal:** A logged-in user can Stop (pause) and Start (resume) their agent. Paused agents are skipped by the swarm. Reversible, instant, no contract change.

**Architecture:** A DB-backed pause flag (Mongo, per user `sub`) is the simplest reversible mechanism — the on-chain contract only has permanent-ish `revoke`, which the PANIC button already uses. Stop/Start toggles `paused` in Mongo; a session-gated route reads/writes it; the swarm (multi-user refactor, separate) checks it each tick and skips paused users. UI: a Start/Stop toggle in the vault panel.

**Tech stack:** Next.js 16, existing `lib/wallet/*`, Mongo `users` collection.

## Global Constraints
- `@mysten/sui` 1.45.2, pnpm, commit per task no push. Session-gated routes `runtime="nodejs"`. No secrets in client files.

---

### Task 1: Pause state + toggle route (`app/api/wallet/agent/route.ts`)
Add a `paused?: boolean` field to `UserDoc` (`lib/wallet/mongo.ts`). Create `app/api/wallet/agent/route.ts`:
- `GET` (session-gated) → `{ paused: boolean }` (default false).
- `POST` (session-gated) → body `{ paused: boolean }` → update the user doc → `{ paused }`.
Both 401 without a session. Verify `pnpm build`. Commit `feat(agent): db-backed pause flag + toggle route`.

### Task 2: `useAgent()` hook + Start/Stop UI
`lib/wallet/use-agent.ts`: `{ paused, loading, toggle() }` — GET on mount, `toggle()` POSTs the negation, optimistic update. In `components/wallet/vault-panel.tsx` add a Start/Stop control (green "● Running / Stop" vs amber "Paused / Start") that calls `toggle()`, disabled while loading. Match the aesthetic. Verify `pnpm build` + (if a headless browser is available) a screenshot; else confirm component compiles. Commit `feat(agent): useAgent hook + start/stop control`.

### Task 3: Swarm honors the pause flag (doc + hook stub)
The live swarm refactor is a separate (VM-dependent) task, but wire the intent now: add `lib/talos/paused.ts` exporting `isPaused(sub|address): Promise<boolean>` reading the same Mongo `users.paused`, and document in `.superpowers/sdd/progress.md` that the multi-user swarm loop must call it per policy and skip paused users. Commit `feat(agent): isPaused helper for the swarm to honor`.

## Self-Review
Covers pause storage+route (T1), hook+UI (T2), swarm hook (T3). Reversible (unlike on-chain revoke). No contract change. The actual swarm skip lands with the multi-user refactor; T3 provides the shared helper so it's a one-line integration.
