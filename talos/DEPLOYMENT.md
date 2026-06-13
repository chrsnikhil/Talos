# Talos — Deployment Record

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
