# Onboarding Wizard Plan (LAST feature)

> Autonomous loop: sensible defaults, don't wait for the user, commit per task, DO NOT push. Branch feat/managed-wallet. Verify UI with headless Chrome at "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu --screenshot=<repo-relative.png> --window-size=1440,900 --virtual-time-budget=9000 <url>, then READ the png.

**Goal:** A first-visit onboarding overlay on /app where a 3D voxel agent greets the user and walks them through the features (embedded wallet → deposit → agent finds best yield → PANIC kill-switch → Start/Stop → dashboard), dismissible ("Get started"), replayable.

**Architecture:** Reuse the app's existing react-three-fiber voxel `<Bot>` (`components/talos-dash/workshop/bot.tsx`, exported `Bot({...})`) inside a small `<Canvas>`. A React overlay (fixed, z-top) steps through captions with Next/Back and a final "Get started". First-visit gated by `localStorage.talos_onboarded`. The app already has `three@0.167`, `@react-three/fiber@9`, `@react-three/drei@10`.

**Tech stack:** Next.js 16, react-three-fiber, existing workshop Bot.

## Global Constraints
- pnpm, commit per task no push. `"use client"`. Aesthetic: bg #0d1319, green #28d391, blue #3b9eff, amber #f2b64c, muted #8b98ab, monospace/pixel. No secrets in client files.

---

### Task 1: Wizard overlay component (`components/wizard/onboarding-wizard.tsx`)
Read `components/talos-dash/workshop/bot.tsx` FIRST for the exact `Bot` props (it takes an agent id / bot-state and expects to run inside `<Canvas>`; check its imports `./workshop-state`, `@/lib/talos-dash/events`). Build `OnboardingWizard({ onDone }: { onDone: ()=>void })`:
- A fixed full-screen overlay (semi-opaque #0d1319 backdrop, blur).
- A small `<Canvas>` (react-three-fiber) with basic lighting + the workshop `<Bot>` (use `icarus`) posed/idling — a gentle bob/hop on mount ("jumps in"). If reusing `<Bot>` standalone proves entangled with workshop-state, build a MINIMAL inline voxel bot (a handful of `<mesh><boxGeometry>` boxes: feet/body/head/visor/antenna) in the icarus palette instead — either is fine; keep it a clean voxel character.
- A caption card stepping through 5 steps (Next/Back; final button "Get started" calls `onDone`):
  1. "Meet Talos — your autonomous yield agent."
  2. "Sign in with Google — you get an embedded wallet, no seed phrase."
  3. "Deposit USDC. Talos hunts the best rate across Scallop, Navi & Kai — every 30s."
  4. "You hold the kill-switch: PANIC pulls everything back on-chain, instantly."
  5. "Start/Stop anytime. Watch it earn on your dashboard."
- Aesthetic-matched, keyboard (→/← to step, Esc = Get started).
Verify: `pnpm build` clean; `pnpm exec tsc --noEmit` no new errors. Commit `feat(wizard): 3D voxel onboarding overlay`.

### Task 2: Wire into /app + first-visit gate + replay
In `app/(app)/app/page.tsx`: when signed in AND `localStorage.talos_onboarded` is not set, render `<OnboardingWizard onDone={() => { localStorage.setItem('talos_onboarded','1'); setShow(false); }} />`. Add a small "Replay intro" text button somewhere unobtrusive that re-opens it. Guard `localStorage` for SSR (only read in `useEffect`).
Verify: `pnpm build` clean, THEN `pnpm dev` + headless Chrome screenshot of /app to `.superpowers/sdd/wizard.png` and READ it (note: the wizard shows when signed in; logged-out you'll see sign-in — to see the wizard you may need to temporarily bypass the gate for the screenshot, then revert; at minimum confirm no crash and the 3D canvas mounts). Stop dev server. Commit `feat(wizard): first-visit gate + wire into app`.

## Self-Review
Covers the 3D voxel greeter reusing the existing Bot (T1) and the first-visit wiring + replay (T2). Fallback to an inline voxel bot if the workshop Bot is too entangled. Honest, achievable, matches the demo's voxel aesthetic. This completes the 4-feature build; after this the loop does the vault-panel cleanup pass, then stops on the VM-blocked swarm refactor.
