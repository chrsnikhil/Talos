# Sui Primitive Research — Zwarm on Sui (Agentic Web)

Verified against docs.sui.io, sdk.mystenlabs.com, Walrus/Seal docs, and protocol GitHub/npm on 2026-06-13. "Verified" = read from primary source; "⚠️" = thin/uncertain, confirm before coding.

---

## TL;DR — the glove-fit mapping

| ZW.ARM (EVM) component | Sui primitive | Maturity | Fit |
| --- | --- | --- | --- |
| Agent budget cap + protocol scope + revocation | **Move capability/policy object** (shared `AgentPolicy` + `OwnerCap`) | mainnet | ⭐ glove |
| Atomic redeem→swap→supply rebalance | **PTB** (one tx, all-or-nothing, native) | mainnet | ⭐ glove |
| ERC-7857 iNFT "the iNFT is the agent" | **Move object** (`key+store`) + Walrus blob pointer + Display | mainnet | ⭐ glove |
| Strategy marketplace | **Kiosk** standard (`kiosk::new/list/purchase`) | mainnet | glove |
| Resale royalty | **TransferPolicy + `royalty_rule` + `kiosk_lock_rule`** (Mysten apps pkg) | mainnet | glove |
| Royalty Vault 80/20 yield split | **Custom shared vault + PTB `splitCoins`** (bespoke) | — | partial (DIY) |
| 0G Storage decision blobs (rootHash) | **Walrus** blob (content-addressed `blobId`, on-chain `Blob` object) | mainnet | ⭐ glove |
| Encrypted strategies | **Seal** (IBE threshold) gated by on-chain ownership (`seal_approve`) | mainnet | ⭐ glove |
| Aave/Compound/Morpho USDC | **Suilend + Scallop** (lending), USDC native | mainnet | glove (mainnet-only) |
| KeeperHub swap leg / "real orders" | **DeepBook v3** (`swapExactQuantity`, `placeLimitOrder`) | mainnet+testnet | glove |
| Gensyn AXL mesh | (keep off-chain, or Sui Stack Messaging — stretch) | — | n/a |
| 0G Compute TEE LLM | off-chain LLM (Sui has no on-chain compute; allowed) | — | n/a |
| Owner auth (NextAuth+Privy) | **Enoki zkLogin** (OAuth → Sui address) | mainnet | glove |
| Agent wallets | **plain `Ed25519Keypair` per agent** (not zkLogin) | mainnet | glove |
| Indexer + Mongo + SSE feed | **GraphQL reads + gRPC `SubscribeCheckpoints` worker** | GA | glove (fixes SSE bug) |

---

## 1. Agent authority & safety (THE differentiator)

- **Pattern:** capability object — a `key`-ability struct whose ownership gates functions. No built-in spend-limit primitive; compose from struct fields + `assert!`.
- **`AgentPolicy` (SHARED object via `transfer::share_object`)** holds: `remaining_budget: u64`, `per_tx_cap: u64`, `allowed_protocols: VecSet<ID>`, `expires_at_ms: u64`, `revoked: bool`, `owner: address`.
- **`OwnerCap` (owned by human)** gates `revoke` / `top_up` / `extend_expiry`.
- **`agent_spend(&mut AgentPolicy, &Clock, amount, target, ctx)`** asserts `!revoked`, `now < expires_at_ms`, `amount <= per_tx_cap`, `amount <= remaining_budget`, `allowed_protocols.contains(target)`; decrements budget; `event::emit(SpendEvent{...})`; performs transfer — all atomic in the PTB.
- **Expiry:** `sui::clock::Clock` at `0x6`, `clock::timestamp_ms()` (precise) or `tx_context::epoch_timestamp_ms()` (coarse, no Clock input).
- **REVOCATION TRAP (verified, critical):** you **cannot delete/mutate an object owned by another address.** So never `transfer` the policy/cap to the agent. Keep policy **shared**; agent holds nothing that bypasses it; owner flips `revoked` via `OwnerCap`. Budget ~1 day to get shared-object access control right.
- **No native session keys / delegated signing** — delegation on Sui is at the Move-object layer (which is a *stronger* "safety by enforcement" story). Don't promise session keys.
- Signer: single `Ed25519Keypair`; optional multisig (≤10 parties) for "human co-sign above $X."
- Docs: move-book.com/programmability/capability, docs.sui.io/concepts/object-model. (Several docs.sui.io pattern URLs 404 — Move Book is more reliable.)

## 2. PTBs + TypeScript SDK execution

- **PTB:** up to 1,024 commands, outputs thread into later commands, **atomic all-or-nothing** — native, free. Cross-protocol type compatibility is on us (may need a thin adapter Move pkg). Never spread/`Array.from` a moveCall result (infinite loop).
- **⚠️ SDK VERSION FORK (decision needed):**
  - `@mysten/sui` **2.x** (current, v2.17): `SuiClient` **removed** → `SuiGrpcClient`/`SuiGraphQLClient`/`SuiJsonRpcClient`; ESM-only; results are a discriminated union (`result.$kind`); `keypair.signAndExecuteTransaction({transaction, client})`.
  - `@mysten/sui` **1.x** (1.28): classic `SuiClient`, JSON-RPC (deprecated, **but sunset 2026-07-31 — after demo day**). **Protocol SDKs lag:** Suilend SDK peer-deps `@mysten/sui@1.28.2`. Scallop/DeepBook also predate 2.0.
  - → Likely build on **1.x for protocol-SDK compatibility** (works fine through the hackathon), or isolate the 2.x clients. Confirm peer-dep ranges at install.
- **Equivocation = the Sui analog of our EVM nonce-lock bug.** Two concurrent txs using the same owned object (esp. the gas coin) at the same version → object **locked until epoch end (~24h)**. FIX: **one `SerialTransactionExecutor` per agent address** (single gas coin, version cache, internal queue). Never run two executors / out-of-band txs on one address. `ParallelTransactionExecutor` exists but is experimental. (Old `suioop` is deprecated → use the SDK executors.)
- **Read APYs before deciding:** `simulateTransaction({include:{commandResults:true}})` (2.x) / `devInspectTransactionBlock` (1.x) — gasless read of Move view fns.
- Use `tx.object(id)` (lets executor cache versions); add slippage min-out guard inside the swap so the atomic PTB reverts on adverse move.

## 3. Strategy marketplace, NFTs & royalties

- **Strategy = `key+store` object** with metadata + `walrus_blob_id: String` + `content_hash: vector<u8>`. Nothing on-chain is private — encrypt off-chain (Seal).
- **Display:** ⚠️ V1 (`sui::display::new_with_fields`, most-documented) vs new V2 (`sui::display_registry`, exact API unconfirmed). Resolve day 1; default to V1 if not deprecated on target net.
- **Marketplace:** Sui **Kiosk** (`kiosk::new/place/list/purchase`) + Kiosk TS SDK — don't hand-roll.
- **TWO distinct royalty mechanisms (don't conflate):**
  - *Resale royalty:* TransferPolicy + `royalty_rule` + **`kiosk_lock_rule`** (lock rule required or items escape royalty-free). Hot-potato `TransferRequest`/`confirm_request` makes it unavoidable. `addRoyaltyRule(bps, minAmount)` via SDK.
  - *Ongoing 80/20 yield split:* **bespoke** shared `RoyaltyVault` + PTB `splitCoins`/`transferObjects`. Riskiest pillar — scope tight (one coin type, fixed ratio).
- **Versioning:** prefer dynamic-field versioned params + on-chain `version` counter + self-service receipt re-point (no token churn) over package upgrades for data.
- **Subscriptions:** no canonical standard — custom `SubscriptionReceipt` object; possession = entitlement.

## 4. Walrus (verifiable memory) + Seal (encrypted strategies)

- Pin: `@mysten/walrus@1.1.7`, `@mysten/seal@1.1.3`, `@mysten/sui@^2.16.2`. (Note tension with §2 1.x choice — verify.)
- **Walrus:** content-addressed `blobId`; each blob has a Sui `Blob` object (`blob_id: u256`, `certified_epoch`) a Move contract can read. Epoch-based prepaid storage (mainnet epoch = 2 weeks).
  - **Decision logs:** write via **HTTP publisher** `PUT /v1/blobs?epochs=N`, read via aggregator `GET /v1/blobs/{blobId}` (avoids SDK's ~2200-req write path). Record `blobId` on the on-chain cycle object.
  - **⚠️ No public mainnet publisher** — testnet has public endpoints; mainnet means run your own publisher OR SDK `writeBlob` + upload relay (~1 day).
- **Seal:** IBE threshold + AES-256-GCM. Access tied to on-chain state via Move **`seal_approve`** fns run through `dry_run` against live state. Ready-made **`subscription.move`** / **`whitelist.move`** patterns ≈ copy-paste for "decrypt iff you own object X." `seal_approve` must be side-effect-free, deterministic, no `Random`.
- **Canonical pattern:** Seal-encrypt → store ciphertext on Walrus → record `blobId` on-chain → decrypt gated by owning the strategy/subscription object.

## 5. Events, indexing & real-time (fixes the old SSE bug)

- **⚠️ JSON-RPC deprecated, hard sunset 2026-07-31. Websocket `suix_subscribeEvent` ALREADY REMOVED (405).** (Still alive through the hackathon, but don't architect real-time on it.)
- **Move:** `event::emit` typed structs (`copy,drop`), ≤1024 events/tx. Emit one rich event per cycle/trade/rating.
- **Reads = GraphQL RPC** (GA; `https://graphql.{mainnet,testnet}.sui.io/graphql`). Limits: 5KB query, 40s timeout, depth ≤20, page 50. ⚠️ schema churned (beta→GA) — introspect live endpoint first. No subscriptions.
- **Real-time = one always-on gRPC `SubscribeCheckpoints` worker** (NOT serverless) — reconnects gap-free, fixes SSE-on-cold-start. It bumps a cursor / pushes to browser via its own socket; Next.js polls GraphQL every 2–5s.
- **Skip** the custom Rust `sui-indexer-alt-framework` (GA but Rust-only, ops-heavy) for 8 days.

## 6. Onboarding, identity & automation

- **Owner onboarding:** **Enoki zkLogin** (`@mysten/enoki`, public key frontend) — OAuth → self-custodial Sui address; replaces NextAuth+Privy. Enoki also does sponsored tx (private key, backend, move-call allowlist). zkLogin is **interactive-only — NOT for agents** (ephemeral key expires).
- **Agents:** dedicated **`Ed25519Keypair` per agent**, secret in KMS. Address = on-chain identity.
- **No native cron/scheduling.** `sui::clock::Clock` (0x6) is **passive** (read time only). → **run our own keeper loop** (Node worker ticks ~30s, builds+signs+submits PTB per agent). Move code can rate-limit via Clock but can't self-fire.
- **Gas:** for demo, **pre-fund a few agent addresses** with SUI (simplest). Sponsorship at scale via Enoki or self-hosted `sui-gas-pool` (Redis-backed) is a stretch — naive single-coin sponsor stalls under a 30s multi-agent loop (equivocation).

## 7. DeFi yield substrate

- **⚠️ NETWORK CONSTRAINT (forces a decision):** **Scallop is MAINNET-ONLY** (no testnet pkg). Suilend/Navi testnet **unconfirmed**. DeepBook works on **both**. → real lending rotation basically requires **mainnet**.
- **Recommended substrate (integrate 2):**
  - **Suilend** (`@suilend/sdk`) — primary; best-verified methods (`SuilendClient.initialize`, `depositIntoObligation`, `withdrawAndSendToUser`, `refreshAll`); known mainnet market IDs; obligation+OwnerCap ceremony. Peer-deps sui@1.28.2.
  - **Scallop** (`@scallop-io/sui-scallop-sdk`) — second; `deposit('usdc',amt)`/`withdraw`, `getMarketPools()` APY; **hackathon sponsor** (judging upside); mainnet-only.
  - **Navi** — stretch only (new SDK signatures unverified).
- **DeepBook v3** (`@mysten/deepbook-v3`, first-party): include as the **swap leg** (`swapExactQuantity`, no BalanceManager) for USDC↔USDT during rebalance + one `placeLimitOrder` to satisfy Sub-track 2's "real DeepBook orders" wishlist. ⚠️ non-whitelisted pools need DEEP for fees.
- **Stablecoins:** native USDC mainnet `0xdba34672…::usdc::USDC`; testnet `0xa1ec7fc0…::usdc::USDC`; Circle faucet (faucet.circle.com, ~20/2h) + SUI gas faucet. DeepBook testnet uses DBUSDC/DBUSDT.
- ⚠️ Exact APY field names (Scallop/Suilend) live in SDK source types — confirm before coding.

---

## Decisions this research forces

1. **Network: mainnet end-to-end** (Scallop mainnet-only + "real profits" story + 100% prize upfront). Cost: mainnet Walrus needs own publisher/relay; real (tiny) funds.
2. **SDK line: likely 1.x** for protocol-SDK compatibility (JSON-RPC fine until 2026-07-31), or carefully mix 2.x clients.
3. **Yield protocols: Suilend + Scallop + DeepBook swap leg.** Navi as stretch.
4. **Real-time: GraphQL polling + one always-on gRPC checkpoint worker** (never serverless streams).
5. **Gas: pre-fund agent wallets for the demo;** sponsorship is a stretch.
