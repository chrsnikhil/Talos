# Swarm Multi-User Refactor Plan

> Prep plan — EXECUTION is BLOCKED on the Azure VM being up (deallocated). The swarm runs as a tsx process on the VM (`scripts/run-swarm.ts`), reads `~/Talos/.env.local`, and moves real funds. Do NOT run these steps in the loop until the user restarts the VM. This plan makes it turnkey. Autonomous loop: write/commit the plan only; do not execute the VM-dependent tasks.

**Goal:** The single-swarm loop (one policy, one agent wallet) becomes multi-user: each tick it iterates every active user vault, rebalances each **through its on-chain vault** within that user's policy bounds, skips paused users, and Daedalus critiques each move — all on package v2.

**Current state (single-user):** `scripts/run-swarm.ts` → `lib/talos/icarus.ts runCycle()` reads ONE policy (`readPolicy`), decides, calls `agent_policy::authorize_spend` on the ONE policy, and moves USDC via the agent's OWN wallet (scallop/navi/kai deposit/withdraw in `lib/talos/*`). `TALOS_PACKAGE_ID` points at v1 `0x75b7f5d2`. Daedalus critiques `SpendAuthorized` events.

**Target:** Per tick, enumerate active user vaults (created via the app's `create_vault<USDC>` on v2), and for each: skip if `isPaused(sub)` or policy revoked/expired; sense APYs; decide; rebalance the VAULT's funds via the hot-potato (`vault::borrow_for_supply` → venue supply → `vault::return_position`, and the unwind mirror) so funds stay vault-owned; Daedalus critiques per user.

## Global Constraints
- `@mysten/sui` 1.45.2; the swarm uses the mainnet-matched Sui CLI at `c:/Users/chrsn/Desktop/SUI26/.suicli/sui.exe` for any CLI ops. Package v2 = `0x9c49978732d2e8cb38f0744f825bc1d5431f34582811bfef6b099c785a22031f`. Commit per task, no push. The agent key remains the designated `agent` on every user policy.

---

### Task 1: Point config at v2 + a user-vault enumerator (`lib/talos/vaults.ts`)
- Update `lib/talos/config.ts` / `.env.example` so `TALOS_PACKAGE_ID` can be v2; on the VM's `.env.local` set `TALOS_PACKAGE_ID=0x9c49978732d2e8cb38f0744f825bc1d5431f34582811bfef6b099c785a22031f` (VM step — document, don't do here).
- `lib/talos/vaults.ts`: `listActiveVaults(): Promise<VaultRef[]>` where `VaultRef = { vaultId, policyId, owner, sub? }`. Source: query `VaultCreated` events on v2 (`${PKG}::vault::VaultCreated`) whose `agent === AGENT_ADDRESS`, dedupe by vault, and cross-check the policy is not revoked/expired via `getObject`. (Optionally join to Mongo `users` by owner address to get `sub` for `isPaused`.) Bound the scan.
- Test: against mainnet, `listActiveVaults()` returns the vaults created by the app (0 until users create them) — a `{length}` smoke is enough. Commit `feat(swarm): v2 config + active-vault enumerator`.

### Task 2: Per-vault rebalance via the hot-potato (`lib/talos/vault-exec.ts`)
- `rebalanceVault(vaultRef, decision)`: build ONE PTB that `vault::borrow_for_supply` (pull USDC under the policy), calls the target venue's supply move-call to get the position coin, and `vault::return_position` (return it to the vault) — the unwind path is the mirror (`borrow_position` → venue redeem → `return_usdc`). Sign with the agent key. This replaces the agent-owned-wallet deposit in the current `icarus.ts` for vaulted users. Reuse the venue supply/redeem move-call construction from `lib/talos/{scallop,navi,kai}.ts` (extract the raw move-call builders so they can be composed into the vault PTB rather than executed standalone).
- Test: dry-run a supply PTB against a test vault if one exists; else assert the PTB is constructed with the right move targets. Commit `feat(swarm): vault hot-potato rebalance executor`.

### Task 3: Multi-user cycle + pause + per-user Daedalus (`lib/talos/icarus.ts` + `daedalus.ts` + `run-swarm.ts`)
- Refactor `runCycle` to `for (const v of await listActiveVaults())`: `if (await isPaused(v.sub)) continue`; sense (shared APY read once per tick); decide per vault (LLM/heuristic, grounded, anti-churn); `rebalanceVault(v, decision)`; store the decision on Walrus keyed by vault; append to the per-user feed.
- Daedalus: critique each user's new `SpendAuthorized`/vault rebalance, writing a rating (one reputation ledger per subject, or a shared ledger keyed by subject — keep the existing reputation for the flagship agent; per-user reputation is a stretch).
- Keep the single-agent flagship loop working (back-compat): if no user vaults exist, the swarm still runs its own demo policy so the live mainnet proof + track record continue.
- Commit `feat(swarm): multi-user cycle honoring pause + per-user rebalance`.

### Task 4 (VM — user-present): wire + deploy
- On the VM: `cd ~/Talos`, scp the changed files, set `.env.local TALOS_PACKAGE_ID=0x9c49…` (v2), `pnpm install && pnpm build`, `pm2 restart talos-swarm && pm2 save`. Confirm `pm2 logs` shows it iterating vaults. This REVIVES the live swarm (down since June 20) AND enables multi-user. Record the new state in `talos/DEPLOYMENT.md`.

## Self-Review
Covers v2 config + enumerator (T1), vault hot-potato rebalance (T2), multi-user cycle + pause + Daedalus (T3), VM deploy (T4, user-present). Keeps the flagship single-agent proof alive for the demo. The hard part is composing the venue supply/redeem move-calls INTO the vault PTB (T2) — extract raw builders from the existing venue modules. Funds stay vault-owned throughout (non-custodial guarantee preserved).
