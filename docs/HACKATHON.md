# Sui Overflow 2026 — Hackathon Reference

> Sui's flagship global online hackathon. Theme: **Build What Matters** — meaningful products, real-world applications, long-term ecosystem growth (AI-native apps, DeFi, new on-chain experiences).

---

## Timeline (Pacific Time)

| Date | Milestone |
| --- | --- |
| May 7 | Official launch (track + prize reveal at Sui Live, Miami) |
| May 7 – June 21 | Active building period |
| **June 21** | **Submission deadline** (changes after may not count toward shortlisting) |
| July 8 | Shortlisted teams announced |
| July 20–21 | Demo Day (virtual, live to judges) |
| Aug 27 | Winners announced (pitch at Sui Basecamp 2026) |

> **Note:** Today is 2026-06-13 — **~8 days left** until the submission deadline.

---

## Tracks & Prizes

### Core Tracks
- **Agentic Web** — AI-native agents / autonomous workflows leveraging Sui primitives. (1st $30k / 2nd $15k / 3rd $10k / 4th $7.5k)
- **DeFi & Payments** — programmable payment systems & financial apps. (1st $30k / 2nd $15k / 3rd $10k / 4th $7.5k)

### Specialized Tracks
- **Walrus** — AI agents/workflows powered by Walrus as a verifiable data & memory layer. (1st $35k / 2nd $15k / 3rd $7.5k / 4th $5k + $7.5k honorable mentions)
- **DeepBook (Predict)** — apps, services, vaults, bots, analytics on DeepBook Predict. (1st $35k / 2nd $15k / 3rd $7.5k / 4th $5k + $7.5k honorable mentions)

### Special Rewards
- **University Award** — 10 × $2,500 (teams with ≥50% student participation; set "university student" in DeepSurge profile).
- **Post-Hackathon** — $250k+ in audit credits, ecosystem support, mentorship.

### Award Structure (split distribution)
- 50% on winner announcement, 50% after successful mainnet deployment.
- If already on mainnet by August announcement → 100% upfront.
- Mainnet deploy must meet minimum functional requirements set by Sui / track sponsors.

---

## Judging Criteria
- **Real-World Application — 50%** (meaningful problem-solving, market relevance, long-term value)
- **Product & UX — 20%** (quality, usability, polish)
- **Technical Implementation — 20%** (technical quality, reliability, meaningful Sui integration)
- **Presentation & Vision — 10%** (clarity, storytelling, long-term vision)

> Strong projects: solve meaningful problems, polished UX, leverage Sui meaningfully, strong product thinking, long-term potential. **Not just technical demos.**

---

## Submission Checklist
| Field | Requirement |
| --- | --- |
| Project Name | Clear + simple |
| Description | What it does, why it matters |
| Project Logo | 1:1 ratio (JPG/PNG) |
| Public GitHub Repo | Public during judging period |
| Demo Video | Required, YouTube preferred, ≤ 5 min |
| Website | Optional, highly recommended |
| Deployment | Testnet or Mainnet |
| Package ID | If deployed on-chain |

### Eligibility
- Built during official period (May 7 – June 21, 2026). Existing projects OK only with substantial new functionality built during the period.
- Must be deployed to Sui mainnet/testnet by shortlisting & demo day.
- Team must attend virtual Demo Day; ≥1 member must pass KYC to receive prizes.
- OFAC-sanctioned regions ineligible.
- Each submission → one primary track (projects may overlap; subtracks are guides, not separate competitions).
- Code reuse allowed if legally owned (frameworks, UI libs, boilerplate) but substantial new dev required; disclose pre-existing portions.
- Open-sourcing not required, but judges may request temporary access.
- AI-assisted dev tools allowed and expected.

---

## Track Details

### DeepBook Predict
Programmable, vol-surface-priced prediction protocol on Sui.

**Status:**
- Predict protocol **live on Sui testnet** — rolling sub-hour BTC oracles, public indexer/API at `predict-server.testnet.mystenlabs.com`, `dUSDC` quote asset. Mainnet planned; hackathon projects expected to redeploy day one.
- DeFi surface live on **mainnet**: DeepBook spot, `deepbook_margin` (margin + liquidation), `iron_bank` (permissioned USDsui supply w/ Slush user vault).

**Build:** apps, services, vaults, bots, analytics. Interest areas:
- **Vault strategies** — capital allocated across Predict positions/ranges/PLP supply (range-ladder vaults, PLP+hedge, BTC-collateralized premia harvesters, 3-protocol margin loops).
- **Cross-venue arbitrage** — bots watching Predict's vol surface vs Polymarket/Hyperliquid; trade the spread.
- **Alt-flavor frontends** — gamified apps, mobile PWAs, Telegram bots, social/chat trading.
- **Analytics/dev tooling** — live SVI surface viewers, PLP risk dashboards, manager PnL, settlement leaderboards, oracle-feed health monitors.

**Integration ideas:** tokenized share tokens on `PredictManager`; compose with `deepbook_margin` + `iron_bank`; keeper services using `predict::redeem_permissionless` + public `predict-server` events; inspection/management tooling.

**Minimum requirement:**
- Integrate DeepBook Predict contract on testnet.
- Product must work end-to-end (full flow tested).
- Vault strategies need proper simulation results.

**Key contract calls:** `predict::mint`, `predict::supply` (PLP), `predict::redeem_permissionless`, `OracleSVI` / `oracle::OracleSVIUpdated` events.

**dUSDC:** NOT official testnet USDC. Request via https://tally.so/r/Xx102L

**References:** DeepBook Predict codebase — **use branch `predict-testnet-4-16`, not `main`**. Deepbook sandbox (1-line local stack), Predict doc, DeepBook v3 doc, margin doc. TG: https://go.sui.io/ofw-deepbook-tg

### Walrus
Walrus as a Verifiable Data Platform for AI. Problem: agents are stateless/fragmented — need durable cross-session memory, shared context, portable persistent data.

**Build:** AI agents / agentic workflows (single or multi-agent) demonstrating:
- Long-term memory (persistent, verifiable)
- Persistent data/file access via Walrus (direct or via file management interface)
- Integrations/tooling for adopting Walrus or MemWal (Walrus Memory)

Interest: long-running stateful workflows (research/trading/monitoring agents), multi-agent coordination, artifact-driven workflows (datasets, logs, reports). Adapters/plugins, orchestration layers, cross-agent memory sharing, memory inspection/debug tools.

**References:** Walrus docs (CLI/HTTP API/TS SDK, aggregators/publishers), Walrus Sites (`site-builder` CLI), MemWal docs + playground + GitHub, Seal (privacy layer), Sui Stack Messaging.

### DeFi & Payments
Programmable money — assets as objects, atomic PTBs, Move type-safe financial logic.

**Build:** payment flows, wallets/interfaces, vaults/capital allocators, automation systems, financial abstractions.

**Building blocks:** Sui Move (object assets, ownership, type-safe logic), PTBs (bundled atomic multi-step flows: pay→swap→deposit), tokens/NFTs, optional DeFi protocol integrations (lending, DEX, yield).

**Idea flavors:** trust-minimized finance (programmable loans, milestone escrow, payment-linked credit, prediction markets), payments/consumer (smart wallets, merchant systems, streaming/subscription, payroll, privacy rails), vaults/capital mgmt (yield vaults, auto-savings, treasury, portfolio allocators), financial automation (auto-invest bots, rebalancing, conditional payments), infra/tooling (payment SDKs, tx-flow visualizers, dashboards, Move debuggers).

### Agentic Web
Sui must be a **meaningful part of the AI stack** — not a payment rail bolted on. Show why Sui specifically (Move objects, zkLogin, PTBs, DeepBook, Walrus, Seal) makes the AI better/safer/more composable. Generic LLM wrappers holding SUI won't place.

- **Sub-track 1: Autonomous Risk Guardian** — live risk monitor for a Sui lending/perps protocol; ingest oracle feeds, AI risk model, autonomous on-chain parameter adjustment/pause via Move policy object, on-chain logging, DAO override. *Must have:* live price feed, visible AI risk score, ≥1 autonomous on-chain action, human override.
- **Sub-track 2: Autonomous Agent Wallet** — agent wallet via zkLogin or Move policy object granting capped budget + protocol scope (e.g. "max 500 USDC, DeepBook only, 24h"). Agent autonomously executes strategy, self-enforces ceiling, on-chain activity log. *Must have:* real DeepBook orders, self-enforced budget ceiling, on-chain activity log, owner revocation demo.
- **Sub-track 3: Intent Engine** — parse plain-English goal → compile to Sui PTB → guardian risk check (plain language) → explicit user confirm → execute. *Must have:* text→PTB→execution flow, human-readable PTB preview, guardian catching ≥2 risk classes, explicit confirmation.

---

## Key Resources
- Sui docs: https://docs.sui.io/ · SDK: https://sdk.mystenlabs.com/
- Founder starter pack: https://www.sui.io/founder-starter-pack
- Awesome Sui: https://github.com/sui-foundation/awesome-sui
- Move bootcamp: https://github.com/MystenLabs/sui-move-bootcamp
- Sui Pilot: https://github.com/contract-hero/sui-pilot
- OpenZeppelin audited Move libraries & tools
- DeepSurge registration / profile (set student status for University Award)

## Sponsors
Headline + track sponsor: **Walrus**. Track sponsor: **DeepBook**. Prize sponsors: **OpenZeppelin**, **OtterSec**. Award sponsor: **Scallop**.
