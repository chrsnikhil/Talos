# Zwarm on Sui — Design Spec

**Date:** 2026-06-13
**Event:** Sui Overflow 2026 — **Agentic Web** track (Sub-track 2: Autonomous Agent Wallet framing)
**Deadline:** June 21, 2026 (submission); Demo Day July 20–21
**Base repo:** Portfolio2026 (Next.js + Tailwind, existing design system); ZW.ARM used as a reference donor for the agent loop / API / lib structure.
**Supporting research:** [SUI-RESEARCH.md](../../SUI-RESEARCH.md) · [HACKATHON.md](../../HACKATHON.md)

---

## 1. Concept

A swarm of autonomous AI agents that manage real USDC on **Sui mainnet**, rotating across **Suilend** and **Scallop** to chase the best stablecoin lending yield, executing atomic rebalances via **Programmable Transaction Blocks**. Every agent's authority is bounded by an **on-chain Move policy object** (capped budget, allowlisted protocols, expiry, owner revocation); every decision is logged to **Walrus** as verifiable memory; an independent **critic agent** scores decisions and writes **on-chain reputation**.

This is a port of ZW.ARM (winner, ETHGlobal Open Agents 2026) from EVM/0G/KeeperHub to the Sui stack. The on-chain layer is a full rewrite (Move, not Solidity; Walrus, not 0G; Sui SDK, not ethers; Suilend/Scallop/DeepBook, not Aave/Compound/Morpho) — satisfying the hackathon's "substantial new functionality built during the period" rule. Prior art is disclosed.

**Positioning sentence (for the demo):**
> "The LLM decides off-chain — but it can only spend what an on-chain Move policy object permits, it executes as atomic PTBs, every decision is verifiable on Walrus, the owner can revoke it instantly, and a second agent independently audits its decisions on-chain. Sui isn't the brain — it's what makes trusting an autonomous brain with real money *safe*."

### Why Sui meaningfully (the track's bar)
Sui is **not** doing the agent's thinking (off-chain LLM — allowed). Sui makes the agent **safer and more composable**:
- **Move policy object** → the agent *physically cannot* exceed its budget/scope; safety by enforcement, not trust. (Even a compromised/hallucinating LLM is bounded by the contract.)
- **PTB** → multi-step rebalance is atomic; no half-rebalanced stuck state.
- **Walrus** → every decision is content-addressed and auditable; autonomy is accountable.
- **On-chain reputation** → agents coordinate without trusting each other.

---

## 2. Scope

### In scope (the two agents)
- **Icarus (executor):** ~30s loop — reads live APYs, prompts off-chain LLM, on a rebalance fires one PTB `agent_spend → redeem → DeepBook swap → supply` gated by its `AgentPolicy`; writes the decision blob to Walrus and records the `blobId` on-chain. (Named for the myth: an agent chasing yield is an Icarus risk — the policy object is what keeps his wings from melting.)
- **Daedalus (critic):** Icarus's father in the myth — the maker who warns him not to fly too high. Independently re-evaluates Icarus's decisions with its own LLM pass against the same Walrus-stored inputs and emits an **on-chain reputation rating**. Establishes "no agent trusts another." Holds funds for no one — no policy object, just its own signing identity.
- **Strategy as a Move object** (`key+store`) — "the object *is* the agent" (metadata + a Walrus blob pointer). Minted and displayed; **no marketplace machinery**.

### Out of scope (cut for the hackathon — becomes the roadmap/vision slide)
- **Beta (subscriber)** agent and copy-trading.
- **Subscription model**, Kiosk marketplace, `SubscriptionReceipt`.
- **Seal-encrypted strategies** (no need without the marketplace).
- **80/20 `RoyaltyVault`** yield split (the riskiest bespoke Move).
- Gas sponsorship at scale (agents are pre-funded for the demo).

> Rationale: none of the cut items are required by Sub-track 2 (real DeepBook orders, self-enforced budget ceiling, on-chain activity log, owner revocation — all covered by Alpha + policy). They were the most expensive, riskiest ~2–3 days of work. The multi-agent differentiator survives via Alpha + Gamma. The marketplace lives on a vision slide (scores Presentation & Vision 10% + long-term potential, zero build cost).

---

## 3. Architecture

```
                         Browser (Next.js / Portfolio2026 shell)
                         dashboard · agent activity · live profits
                                        │  GraphQL polling (2–5s)
                                        │  + push from realtime worker
        ┌───────────────────────────────┼────────────────────────────────┐
        │                               │                                 │
   Next.js (Vercel)               Keeper worker                   Realtime worker
   API routes + UI                (always-on, Node)               (always-on, Node)
        │                    PM2: icarus · daedalus · scheduler    gRPC SubscribeCheckpoints
        │                               │                                 │
        │                  one SerialTransactionExecutor                  │ (gap-free, NOT serverless)
        │                  per agent address                              │
        │                               │                                 │
        │                    ┌──────────┴───────────┐                     │
        ▼                    ▼                      ▼                      ▼
   MongoDB Atlas        off-chain LLM           Walrus                Sui mainnet
   (cycles, events,     (Qwen/Claude;           (decision blobs;     GraphQL + gRPC
    reputation cache)   decision + critique)     blobId on-chain)
                                        │
                                        ▼
                         ┌──────────────────────────────────┐
                         │   Move package (Sui mainnet)      │
                         │   agent_policy · strategy ·       │
                         │   reputation                      │
                         └──────────────┬───────────────────┘
                                        │  atomic PTB
                                        ▼
                         Suilend · Scallop (USDC supply/redeem)
                         DeepBook v3 (USDC↔USDT swap leg + a real order)
```

- **Onboarding:** owner signs in via **Enoki zkLogin** (OAuth → Sui address; replaces NextAuth+Privy). Agents use plain **`Ed25519Keypair`s**, pre-funded with a little SUI for gas; secrets in a secrets manager.
- **No native cron on Sui** → the keeper worker drives the ~30s loop. `sui::clock::Clock` (0x6) is read on-chain only to rate-limit, never to trigger.

---

## 4. On-chain modules (Move, mainnet)

### `agent_policy` — the differentiator (build first)
- **`AgentPolicy`** (shared object via `transfer::share_object`): `remaining_budget: u64`, `per_tx_cap: u64`, `allowed_protocols: VecSet<ID>`, `expires_at_ms: u64`, `revoked: bool`, `owner: address`.
- **`OwnerCap`** (owned by human): gates `revoke`, `top_up`, `extend_expiry`.
- **`agent_spend(&mut AgentPolicy, &Clock, amount, target, ctx)`**: asserts `!revoked` && `now < expires_at_ms` && `amount <= per_tx_cap` && `amount <= remaining_budget` && `allowed_protocols.contains(target)`; decrements budget; `event::emit(SpendEvent{...})`.
- **Revocation correctness (critical):** policy is **shared** and the agent **never owns** it (you cannot mutate/delete an object owned by another address). Owner flips `revoked` via `OwnerCap`. Expiry is a soft backstop.

### `strategy`
- **`Strategy`** (`key+store`): metadata + `walrus_blob_id: String` + `content_hash: vector<u8>`. Rendered via Object **Display** (use V1 `sui::display::new_with_fields` unless V2 `display_registry` is confirmed non-deprecated on mainnet).

### `reputation`
- Daedalus writes ratings as objects/events: `CriticRating { cycle_id, score, agent }`; emitted on-chain for the dashboard and a portable reputation record.

> Activity log = `event::emit` of typed structs (`SpendEvent`, `RebalanceEvent`, `CriticRating`) — ≤1024 events/tx. This is the on-chain activity log Sub-track 2 requires.

---

## 5. Off-chain components

### Keeper worker (the agent runtime)
- Node service; **one `SerialTransactionExecutor` per agent address** (single gas coin + version cache + internal queue) — this prevents the equivocation/epoch-lock failure (the Sui analog of ZW.ARM's EVM nonce-lock bug). **Never** run two executors or out-of-band txs on one address.
- Loop (~30s): (1) read APYs gaslessly via `devInspect`/`simulateTransaction`; (2) build decision prompt; (3) LLM decides hold/rebalance + target; (4) on rebalance build one PTB (`agent_spend` → Suilend/Scallop redeem → DeepBook swap → supply) with an in-PTB slippage min-out guard; (5) submit via executor, check `result.$kind`/status, retry once on stale-version; (6) write decision blob to Walrus, record `blobId` on-chain.
- **SDK line:** build on `@mysten/sui` **1.x** for protocol-SDK compatibility (Suilend pins 1.28; Scallop/DeepBook predate 2.0). JSON-RPC is deprecated but does not sunset until 2026-07-31 (after Demo Day). Isolate any 2.x-only client behind an adapter if needed.

### Realtime worker (dashboard feed)
- Always-on Node process running gRPC **`SubscribeCheckpoints`** (reconnects gap-free; fixes the SSE-on-cold-start bug ZW.ARM hit). Detects the package's events, pushes to the browser via its own socket and/or bumps a cursor MongoDB-stored. **Never** run this inside a serverless function.

### Frontend (into Portfolio2026)
- Dashboard: live agent cycles, on-chain transactions, current positions, time-weighted APY/profit, critic ratings, and a prominent **"Revoke agent"** control wired to the `OwnerCap` (the live safety demo). Reads via **GraphQL** polling (2–5s) + realtime worker push.

### Storage
- **Walrus** for decision blobs, accessed via its **HTTP API** (`PUT /v1/blobs`, `GET /v1/blobs/{blobId}`) rather than the `@mysten/walrus` SDK — the SDK requires `@mysten/sui` 2.x, which conflicts with the 1.x line we use for protocol-SDK compatibility; the HTTP path avoids the clash entirely. No public mainnet publisher exists, so stand up our own publisher early (or use a community/paid one). `blobId` recorded on the on-chain cycle/event.
- **MongoDB Atlas** for cycles/events/reputation cache and dashboard query convenience (mirrors ZW.ARM).

---

## 6. Key data flows

**A rebalance cycle (Icarus):** read APYs → LLM decides → build atomic PTB (`agent_spend` enforces policy → redeem A → DeepBook swap → supply B) → submit → emit `RebalanceEvent` + `SpendEvent` → write decision blob to Walrus → record `blobId` → dashboard updates via realtime worker.

**A critique (Daedalus):** observe Icarus's cycle (from events/Walrus) → independent LLM pass → emit `CriticRating` on-chain → reputation surfaces on dashboard.

**A revocation (owner):** owner clicks Revoke → tx with `OwnerCap` sets `revoked = true` → Alpha's next `agent_spend` aborts on-chain → dashboard shows agent disabled. (The headline safety demo.)

---

## 7. Error handling & reliability
- **Atomicity:** PTB all-or-nothing — no partial rebalance.
- **Equivocation/epoch-lock:** one serial executor per agent; tiny USDC; retry-once on stale version; back off (don't spin) on object-lock; pre-funded gas with a low-balance watchdog.
- **Walrus epoch-change races:** catch `RetryableWalrusClientError`, `reset()`, retry.
- **GraphQL limits:** 5KB query / 40s timeout / depth ≤20 / page 50; introspect live schema before coding (schema churned beta→GA).
- **Slippage:** min-out guard inside the swap call so the atomic PTB reverts on adverse moves.

## 8. Testing & verification
- Move unit tests for `agent_policy` (over-budget, out-of-scope, expired, revoked all abort; happy path decrements + emits).
- Mainnet dry-runs with tiny USDC before the live loop.
- End-to-end rehearsal of the four Sub-track 2 must-haves: real DeepBook order, budget ceiling enforced on-chain, on-chain activity log visible, **owner revocation demo**.
- Record a clean live-mainnet run for the ≤5-min demo video.

---

## 9. Build sequence (8 days, honest)
- **CORE (days 1–5) — a complete winning Sub-track 2 submission on its own:** `agent_policy` + revocation (day 1); Icarus rotating real USDC on Suilend+Scallop via PTB + DeepBook swap leg; on-chain activity log + Walrus decision blobs; dashboard with live cycles/txs/profits + revocation control.
- **DIFFERENTIATORS (days 5–7):** Daedalus critic + on-chain reputation; `Strategy` Move object + Display; Enoki zkLogin onboarding.
- **POLISH (days 7–8):** mainnet hardening, demo video, roadmap/vision slide (the cut marketplace), submission assets (logo, description, repo public).
- Slip rule: Core is always a complete, demoable product; differentiators land as time allows.

## 10. Success criteria (mapped to judging)
- **Real-World Application (50%):** autonomous agents making real, measurable profit on Sui mainnet, bounded safely — rare among agent projects.
- **Technical Implementation (20%):** meaningful Sui usage (policy object, PTBs, Walrus, on-chain reputation), reliable loop.
- **Product & UX (20%):** polished dashboard, one-click revocation, clear live numbers.
- **Presentation & Vision (10%):** the safety narrative + the marketplace roadmap.
- **Sub-track 2 must-haves:** real DeepBook orders ✓, self-enforced budget ceiling ✓, on-chain activity log ✓, owner revocation demo ✓.

## 11. Submission checklist (from handbook)
Project name + logo (1:1), description, **public GitHub repo**, demo video (≤5 min, YouTube), website (the Portfolio2026 app), **mainnet deployment + Package ID**, disclosure of ZW.ARM prior art.

## 12. Open items to verify before/while coding
- Exact APY field names in Suilend/Scallop SDK source types.
- Object Display V1 vs V2 (`display_registry`) status on mainnet.
- Walrus HTTP `PUT /v1/blobs` response JSON shape; stand up a mainnet publisher.
- DeepBook mainnet pool keys / DEEP-for-fees on chosen pool.
- `@mysten/sui` peer-dep ranges across Suilend/Scallop/DeepBook/Walrus/Seal SDKs (pin a compatible set).
- Enoki rate limits/pricing in the portal.
