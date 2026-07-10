# Talos — Deployment Record

## Sui Mainnet — vault release (package v2, 2026-07-11)

Non-destructive **package upgrade** of the live mainnet package (additive-only: adds the
`vault` module + `agent_policy::assert_active` / `owner_cap_policy_id`). The existing shared
objects are **unchanged**, so the on-chain track record (AgentPolicy + Reputation, ~174
ratings, avg ~89/100) is preserved and continues live.

| Item | Value |
| --- | --- |
| **Package ID (v2, latest — use for vault + assert_active)** | `0x9c49978732d2e8cb38f0744f825bc1d5431f34582811bfef6b099c785a22031f` |
| Original package ID (v1, type lineage — unchanged) | `0x75b7f5d2926f333d8849726655904111420d4f86acb2578274b31338bcf8142c` |
| Modules | `agent_policy`, `reputation`, **`vault`** |
| Upgrade tx digest | `5Q3pyNjG6LynHpWbvP9ahXMZJpE7XVaWmRnZZr8A7vVf` |
| UpgradeCap | `0xdc4c112f8f4f38b8cd64a70a6694e8b64c1cc7a19f21e3ea13432954ef8f19a5` |
| AgentPolicy (shared, **unchanged**) | `0x16d5c0c966ac8d78992908ada307dc5991fc76ce4915ae499fa91cfe11c1b5b6` |
| Reputation (shared, **unchanged**) | `0x3928f7b3ab4114a44b0f533ed627c247994894985c91cf05464ab36d161f072a` |
| Deployer / owner / agent | `0x1f0455e5fb79711dff710e04aa9a7ea4dbb582b77a3a5452fcc61be1cb80ea7f` |
| Gas spent | ~0.0546 SUI |
| Built with | Sui CLI 1.74.1 (mainnet-matched); dry-run compatibility = success |

> Migration for the swarm/app: set `TALOS_PACKAGE_ID` to the **v2** id above so `vault`
> and `assert_active` resolve; keep `TALOS_POLICY_ID` / `TALOS_REPUTATION_ID` as-is (the
> live objects are preserved). Per-user `create_vault<USDC>` is called by the app, not here.

## Sui Testnet

| Item | Value |
| --- | --- |
| **Package ID** | `0x8a01a3e3dfcafd078bef29bbbc8af6d21da120ee449febd98314311cc0444b31` |
| Modules | `agent_policy`, `reputation` |
| Deployer / owner / agent / critic | `0x1f0455e5fb79711dff710e04aa9a7ea4dbb582b77a3a5452fcc61be1cb80ea7f` |
| **AgentPolicy** (shared) | `0xed40900a9e9c3fa65b350f99ea73469ecf7f0e42d806c6cc69cc0cf3bfa6993a` |
| **Reputation** (shared) | `0xb8912d9e70ca432ec23ee7a69e40e254f767695b0740bd4133f17003f1a13806` |
| Network | Sui Testnet |

> Mainnet redeploy is planned for the hackathon submission. An earlier single-module
> build was published at `0x879f93…554eca`; the combined package above supersedes it.

## The swarm, live on-chain

- **Icarus (executor)** — the runtime (`scripts/run-icarus.ts`) reads the policy, decides, and calls
  `agent_policy::authorize_spend` on-chain (policy-gated) on each rebalance, storing every decision on Walrus.
- **Daedalus (critic)** — `scripts/run-daedalus.ts` reads Icarus's `SpendAuthorized` events, independently
  scores each, and records a `reputation::CriticRating` on-chain. Only the designated critic can rate.

## Proofs on-chain (earlier single-module package `0x879f93…`)
- `authorize_spend` 300/suilend → success (1000 → 700); `revoke` → success; next `authorize_spend` → **aborted `ERevoked`**.

## Current combined package — observed state
- AgentPolicy: budget 100000, per-tx 10000; two autonomous rebalances → `remaining 99800`, `total_spent 200`.
- Reputation: 2 `CriticRating`s by Daedalus, **average 92/100**.

## Reproduce

```bash
cd talos && sui move test          # 11/11 unit tests (agent_policy + reputation)
sui client publish --gas-budget 300000000
# create policy + reputation, set TALOS_* in .env.local, then:
pnpm tsx scripts/run-icarus.ts     # Icarus: autonomous on-chain rebalances + Walrus
pnpm tsx scripts/run-daedalus.ts   # Daedalus: judges Icarus, writes CriticRating on-chain
# dashboard: /dashboard (polls policy + activity + reputation live)
```

## Real DeepBook v3 orders (testnet) — the "swap leg"

Icarus now places **real on-chain DeepBook v3 orders** as part of each rebalance (satisfies the Agentic Web Sub-track 2 "real DeepBook orders" must-have). Uses `@mysten/deepbook-v3@0.28.3` on the whitelisted `DEEP_SUI` testnet pool (0% fee, no DEEP token needed) backed by a funded BalanceManager.

| Item | Value |
| --- | --- |
| BalanceManager | `0x3b086bcd88bd588bec2356bd2916991775b5484c494423498779f34fe4a0bbed` |
| Pool | `DEEP_SUI` (whitelisted, testnet) — tick 0.00001, lot 1, minSize 10 |
| Sample order txs | `3hwuB3xycsBxcLGyfcJ77fDmGJ41XwAgdq5R8YpLWU2Y`, `3RkLGbuwdVVLVUSb8vCTQujLRkQxJg9PY5UBVB2yHyVm`, `2ByhGDkXq5JcZo59iGipKL5T7gGk5Y94kjmEbAKx5Rq5` |

Each autonomous rebalance cycle: `agent_policy::authorize_spend` (policy-gated) → real DeepBook `placeLimitOrder` (swap leg) → decision logged to Walrus. Setup: `pnpm tsx scripts/setup-deepbook.ts`.

> Real lending (move actual USDC for yield) requires **mainnet**: Suilend is mainnet-only (SDK needs sui 1.42/2.x); Scallop is mainnet-only too but its SDK is `@mysten/sui@1.45.2`-compatible — the planned path for mainnet redeploy.

## Real USDC lending on mainnet (Scallop) — runbook

Icarus's `runCycle` now has a **lending leg**: when a rebalance targets `scallop` it does a real
Scallop USDC **deposit**; when it leaves `scallop` it **withdraws**. The leg is gated by the same
on-chain `agent_policy::authorize_spend` that bounds every move, and the resulting tx digest is
logged to Walrus (`scallopDigest`) so Daedalus grades it. Wired in `lib/talos/icarus.ts`, executed
through `lib/talos/scallop.ts` against a mainnet client.

**Pre-flight check (read-only, no funds):**
- `pnpm tsx scripts/simulate-mainnet.ts` — confirms the Scallop SDK reads APY/position and that the
  deposit/withdraw txs build. With an unfunded wallet it correctly stops at `No valid coins found`.

**Go-live steps:**
1. Fund agent `0x1f0455e5fb79711dff710e04aa9a7ea4dbb582b77a3a5452fcc61be1cb80ea7f` with ≥ 0.2 SUI (gas)
   and ≥ 0.5 **native Circle USDC** (`0xdba34672…::usdc::USDC`, not wormhole).
2. Redeploy the Move package to mainnet (`sui client switch --env mainnet && sui client publish --gas-budget 300000000`),
   then create the policy + reputation shared objects on mainnet (same flow as testnet).
3. Set in `.env.local`: `SUI_RPC=https://fullnode.mainnet.sui.io:443`, `SUI_NETWORK=mainnet`,
   the new mainnet `TALOS_PACKAGE_ID` / `TALOS_POLICY_ID` / `TALOS_REPUTATION_ID`, `TALOS_SCALLOP=1`,
   and (optional) `TALOS_USDC_CHUNK=0.5`. Leave `TALOS_BALANCE_MANAGER` unset on mainnet (testnet pool).
4. `pnpm tsx scripts/run-icarus-mainnet.ts` — pre-flights balances/env (refuses if underfunded or not
   mainnet), then runs real policy-gated cycles: `authorize_spend` → real Scallop deposit/withdraw →
   Walrus log. Then `pnpm tsx scripts/run-daedalus.ts` to grade the real moves on-chain.

### Mainnet proof of life (recorded 2026-06-15)

Live deployment + one full policy-gated cycle that moved **real Circle USDC** into Scallop:

| Object / step | ID / digest |
| --- | --- |
| Package | `0x75b7f5d2926f333d8849726655904111420d4f86acb2578274b31338bcf8142c` |
| Policy (shared) | `0x296240ad7f5552a5ec47228cc567f08612d2609e0e9d2016d12e5adc9446bbbf` |
| Reputation (shared) | `0xcadc34281fa4a2415b9b6ef94a498cb91bf9030fcbe080efc1136498f264a7a2` |
| OwnerCap | `0x7ba8723f11007d6a784298f4f73534b563f24e328964fe9b20b9b29cd37f1f55` |
| Agent wallet | `0x1f0455e5fb79711dff710e04aa9a7ea4dbb582b77a3a5452fcc61be1cb80ea7f` |
| Swap 1 SUI → 0.813379 USDC (7K) | `9SRwuqQXwoqCMY9gb5wWW8Y3z72iCGUm7Ni6fDF8M4wm` |
| On-chain `authorize_spend` (policy gate) | `8K5iGH3CeSxKuwia1Y4Kgmrr6LGPDys3prvDRDM9BmQT` |
| Real Scallop deposit (0.1 USDC) | `HF8eX1xnJDFcM9B33zF8kZMDRojpxjHqEzjAgeSEdwdq` |
| Walrus decision blob | `H8wwxUAIrn-r8U2L8TPQZ_PZb8ps9bFCvir-Wp_HCPQ` |
| Daedalus rating of the deposit | `8Uz6MkBLHj…` (92/100) |

After the cycle: Scallop USDC position `0.09999966`, wallet USDC `0.713379` (−0.1), Reputation
`3 ratings · avg 92/100`. The deposit tx originally aborted with `UnusedValueWithoutDrop` because
the sCoin returned by `depositQuick` was never consumed; fixed in `lib/talos/scallop.ts` by
`tx.transferObjects([sCoin], AGENT_ADDRESS)` (and likewise for `withdrawQuick`).

## Multi-protocol survey + second real venue (NAVI) — recorded 2026-06-15

The agent now surveys **four** Sui USDC lending markets each cycle and can move real USDC across
**two** of them. APYs come live from DeFiLlama (`lib/talos/yields.ts`): `scallop`, `navi`, `kai`,
`suilend`. Real execution venues (`lib/talos/icarus.ts` `VENUES` registry): **Scallop**
(`lib/talos/scallop.ts`) and **NAVI** (`lib/talos/navi.ts`, via `navi-sdk` — compatible with the
pinned `@mysten/sui@1.45.2`, needs `^1.16.0`). `kai`/`suilend` are signal-only: Suilend's SDK needs
`@mysten/sui@2.x` (conflicts with Scallop) and it dropped off DeFiLlama's feed. A rebalance withdraws
from the venue it leaves and supplies into the one it enters.

The allowlist is immutable per policy, so the policy was **recreated** with the bigger allowlist
(same package + reputation object; budget 100000, per-tx cap 10000):

| Object / step | ID / digest |
| --- | --- |
| New policy (shared, allowlist `[scallop,navi,kai,suilend]`) | `0x8d0954b482b297d5b1cf0dfd3e320841cd44601d1c941e283909f94cb6855980` |
| New OwnerCap | `0x85e0a833b000a296b99801d9aff2cbbd1861670e85ad3d5eca7156e47adc6a3f` |
| Create-policy tx | `AUFhFQXKgbAy9V7Xt1SQ3ePRCQPxPa554cGST6bYZz75` |
| `authorize_spend` (navi, policy gate) | `E8YRdzHtKi4awNcRegYvGYvynkB1yM7wnZGup7YcSJW4` |
| Real **NAVI** deposit (0.1 USDC) | `DpidDKwoS4Vpa5jPEhG53MjXckZGe9Z4FLhWWctjKE3o` |
| Walrus decision blob | `N0hcK-8y75hEmi3q1tz3_WpsJW-aY75XlKB4Rt4yjWo` |
| Daedalus rating of the NAVI decision | `VMqLunvm5f…` (92/100) |

Decision that cycle: `scallop 5.6% · navi 9.14% · kai 5.34% · suilend 4.02% ⇒ REBALANCE → navi`.
After it: NAVI nUSDC supply position `0.1`, Reputation `4 ratings · avg 92/100`. NAVI's
`depositToNavi` handles coin merge/split internally so it did **not** hit `UnusedValueWithoutDrop`.
`getNAVIPortfolio` reports balances in 1e9 fixed-point — `navi.ts` divides by 1e9 for human USDC.
Demo knob: `TALOS_SIM_<PROTOCOL>` overrides a protocol's simulated APY (e.g. `TALOS_SIM_NAVI=9`).

## Third real venue (Kai Finance) + survey trimmed to 3 real markets — recorded 2026-06-15

The agent now moves real USDC across **three** venues, and every market it surveys is a
real venue (no signal-only entries). **Kai Finance** wired via `@kunalabs-io/kai` (`lib/talos/kai.ts`):
Kai's native `USDC` single-asset vault (`0x3e8a6d1e…0061`) accepts our exact Circle USDC
(`0xdba34672…::usdc::USDC`); depositing mints yUSDC, withdrawing burns it back. The Kai SDK
declares `@mysten/sui@1.45.0`; a scoped pnpm override (`"@kunalabs-io/kai>@mysten/sui": "1.45.2"`)
forces it onto our single shared copy so the `coinWithBalance` build resolver isn't duplicated
(no dual-copy clash). Kai builds a `Transaction` we sign+execute ourselves (unlike NAVI).

**Suilend was dropped** from the survey (`lib/talos/yields.ts` now `[scallop, navi, kai]`).
**AlphaLend was evaluated as the 4th venue and rejected:** its only `@mysten/sui` 1.x-compatible
SDK (v2.0.0) pins a superseded `ALPHALEND_LATEST_PACKAGE_ID` (`0x15c16e76…`; current is
`0xe48b33ef…`), so `add_collateral` would abort on the protocol's version gate; its current SDK
(3.x) needs `@mysten/sui@2.x` (the same Scallop conflict as Suilend); and it isn't on DeFiLlama's
Sui USDC feed, so it couldn't even serve as a real signal. Also, Kai has **no direct native-USDC
lending market** in AlphaLend — USDC routes through a DeepBook margin pool to mint dbUSDC.

Allowlist is immutable per policy, so the policy was **recreated** with allowlist `[scallop, navi, kai]`
via `scripts/create-policy.ts` (budget 100000, per-tx cap 10000, expiry 1900000000000):

| Object / step | ID / digest |
| --- | --- |
| New policy (shared, allowlist `[scallop,navi,kai]`) | `0x61b198ecfacb835b9078274e2c3de2f84ce8ea1d0dd9a99bf13afb65584fe9bf` |
| New OwnerCap | `0x5b8980f3b50ef2c70aa11f3383ad7859e079eb527ac094aa86a0c6c429ecf6fa` |
| Create-policy tx | `8rCtoNpiAJvLmGiRtYcnXuymB3LG83YaHWMoNcdQguWK` |
| `authorize_spend` (kai, policy gate) | `7b5yfNjDgjDeKF5MNVRRtUnbENCZrjeKtQvwapYaeynH` |
| Real **Kai** deposit (0.1 USDC) | `9FeksHvD7uY1ZyD9x9agWUP9AsdnDM9C9t9kNBSyZdtv` |
| Walrus decision blob | `PSYIejK5oM4oa5CgdgwICQgjfNfCUIcQoQAiT3tJhuA` |
| Daedalus rating of the Kai decision | `2m9654ULxo…` (92/100) |

After the cycle: Kai USDC position `0.099995`, Reputation `5 ratings · avg 92/100`. Kai's
`depositFromWallet` transfers the minted yUSDC to the wallet so it did **not** hit
`UnusedValueWithoutDrop`. Scripts: `scripts/test-kai-dryrun.ts` (read-only build+dry-run),
`scripts/create-policy.ts` (recreate policy with any allowlist), `scripts/deposit-kai.ts`
(one real policy-gated Kai deposit). Old policies (`0x8d0954b4…`, `0x296240ad…`) superseded.

## First real cross-protocol rebalance — recorded 2026-06-15

The core thesis — *withdraw from a worse venue and supply into a better one* — proven live,
not just per-venue deposits. Ran `scripts/run-icarus-mainnet.ts` with
`TALOS_START_PROTOCOL=kai TALOS_USDC_CHUNK=0.09 TALOS_CYCLES=2` on real live DeFiLlama APYs
(no sim knobs). `decide()` saw **navi 6.29% beats kai 3.99% by 2.30pp** (≥ 0.25pp threshold)
→ REBALANCE → navi.

| Leg | Tx digest |
| --- | --- |
| `authorize_spend(navi, 100)` (policy gate, `0x61b198ec…`) | `2DeKnxgQVsmonpX3uuHPdv6DsVTRfgxmJk1unC33E13a` |
| Real **Kai withdraw** 0.09 USDC | `41QTDFD21tQnAnPAgdVuiADuuZA97xvftgYpLGB3dpGY` |
| Real **NAVI deposit** 0.09 USDC | `J1JieMHvMyKozYQxzPc9ToNUcn3wQjUKYhFxKK6eJtbG` |
| Walrus decision log (cycle 1, rebalance) | `BJkqawsbAQrICNWlTSpwtiRcoY_f4lcKDGKcUTOSx0E` |
| Walrus decision log (cycle 2, HOLD) | `MeA3J9NpibOIqA0BfUT9Wt9y8-NoPwn9N0LzGqF7sHo` |
| Daedalus rating of the rebalance (92/100) | `9DPMBkskX9…` |

Positions moved: kai `0.0999 → 0.0099`, navi `0.10 → 0.19`, scallop `0.10` unchanged; wallet
free USDC flat (`0.513`) confirms the 0.09 withdrawn from Kai funded the NAVI deposit. Cycle 2
correctly **HELD** (navi already best APY) — demonstrates the hysteresis/hold logic. Reputation
now `6 ratings · avg 92/100`. To force a rebalance INTO the best venue, set `current`
(`TALOS_START_PROTOCOL`) to the **lowest-APY venue that actually holds withdrawable funds**
(else `decide()` treats an unknown/best `current` as a HOLD).

**NAVI read fix:** `lib/talos/navi.ts::readUsdcPosition` reads via NAVI's indexer
(`getNAVIPortfolio`), which intermittently returns an empty/zero map (indexer lag) that would
otherwise read as "no position". It now retries up to 4× with 600 ms backoff and only trusts a
`0` after seeing a populated map (otherwise returns `null` so the dashboard shows "—", not "0").
New read-only script `scripts/recon-positions.ts` prints all three positions + wallet balances +
the live APY survey + the current best venue.
