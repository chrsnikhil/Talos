# User Dashboard Plan

> Autonomous loop: sensible defaults, don't wait for the user, commit per task, DO NOT push. Branch feat/managed-wallet. Verify UI with headless Chrome at "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu --screenshot=<repo-relative.png> --window-size=1440,900 --virtual-time-budget=9000 <url>, then READ the png.

**Goal:** The logged-in user sees a dashboard: live cross-venue USDC yields (Scallop/Navi/Kai), their vault balance, and a "yield-uplift" headline ("Talos earned you X% / $Y more than parking in one venue").

**Architecture:** A read route aggregates live venue APYs (reuse the DeFiLlama fetch pattern in `lib/talos/yields.ts` — but DO NOT import 7k/@7kprotocol into a Next route; it breaks the build. Use plain fetch to DeFiLlama, and Binance for SUI price if needed, per the existing portfolio route). Charts render client-side. Yield-uplift = (best venue the agent captured over time) vs (a fixed baseline venue), computed from the reputation/decision history where available, else a clearly-labeled projection from current APYs. Reuse existing `app/api/talos/*` routes where possible.

**Tech stack:** Next.js 16, existing `lib/talos/*` read helpers, a charting approach that adds NO heavy dep unless already present (check package.json for `recharts`; if present use it, else lightweight inline SVG/`<svg>` sparkline components).

## Global Constraints
- `@mysten/sui` 1.45.2, pnpm, commit per task no push. Never import `@7kprotocol/sdk-ts` into a Next route/component (build-breaker). Session-gated routes `runtime="nodejs"`. No secrets in client files.

---

### Task 1: Yields read route (`app/api/wallet/yields/route.ts`)
GET (public or session-gated) → live USDC supply APYs for scallop/navi/kai from DeFiLlama (`https://yields.llama.fi/pools`, filter chain=Sui, USDC symbols, map to the three projects — copy the resolution logic from `lib/talos/yields.ts`'s `fetchReal`, but as a self-contained fetch that does NOT import the 7k SDK). Return `{ venues: [{key, apy}], best, ts }`. Cache/timeout gracefully; on failure return the last-known or a sane fallback. Verify `pnpm build`. Commit `feat(dashboard): live cross-venue yields route`.

### Task 2: Chart primitives (`components/dash/`)
Check `package.json` for `recharts`. If present, build with it; else create lightweight `components/dash/sparkline.tsx` (an SVG line chart from number[]) and `components/dash/bar-compare.tsx` (horizontal bars comparing venue APYs, highlighting the best). Pure, presentational, aesthetic-matched (bg #0d1319, green #28d391, blue #3b9eff, monospace). Verify compile. Commit `feat(dashboard): chart primitives`.

### Task 3: Yield-uplift compute (`lib/wallet/uplift.ts` + route)
`computeUplift({ venues, principal })` → `{ bestApy, baselineApy, upliftPct, upliftUsdPerYear }` where baseline = a fixed reference venue (e.g. the lowest of the three, or a "single-venue hold") and best = the max APY the agent rotates into. Expose via `app/api/wallet/uplift/route.ts` (session-gated: pull the user's vault principal from the vault route logic, or accept `?principal=`). Clearly a projection when no realized history exists — label it. Commit `feat(dashboard): yield-uplift computation`.

### Task 4: Dashboard UI (`components/wallet/dashboard-panel.tsx`) + wire into `app/(app)/app/page.tsx`
A panel: the yield-uplift headline (big green number), a bar-compare of the three venues (best highlighted), the user's vault balance, and a balance/APY sparkline (use recent APY samples or a short synthetic series clearly labeled "live"). Wire below the vault panel, only when signed in. Verify `pnpm build` + headless screenshot of /app (read the png). Commit `feat(dashboard): user dashboard panel`.

## Self-Review
Covers live yields (T1), chart primitives (T2), uplift math (T3), UI (T4). Reuses existing DeFiLlama pattern, avoids the 7k Next-build trap. Uplift is honestly labeled projection vs realized. No new heavy deps unless recharts already present.
