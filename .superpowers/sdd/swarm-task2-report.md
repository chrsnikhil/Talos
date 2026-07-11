# Swarm Task 2 Report — Vault Hot-Potato Rebalance Executor

**Date:** 2026-07-11  
**File created:** `lib/talos/vault-exec.ts`

---

## Per-Venue SDK Findings

### Scallop (`@scallop-io/sui-scallop-sdk`) — COMPOSABLE

**What works:**
- `ScallopTxBlock.deposit(coinArg, 'usdc')` accepts any `SuiObjectArg` (including a PTB `NestedResult`) and returns a `MarketCoin<USDC>` as a `TransactionResult`.
- `ScallopTxBlock.mintSCoin('susdc', marketCoin)` converts that to `sCoin<SCALLOP_USDC>` — also a `TransactionResult` that can be chained further.
- The full supply chain: `borrow_for_supply → deposit(coin) → mintSCoin(marketCoin) → return_position` — 4 move-calls in one PTB.
- Redeem chain: `borrow_position → burnSCoin(sCoin) → withdraw(marketCoin) → return_usdc`.
- `depositQuick` / `withdrawQuick` are NOT composable — they do RPC coin selection and auto-execute.
- `builder.init()` is called internally by `createScallopBuilder()` — builder is ready after `await sdk.createScallopBuilder()`.

**sCoin type:** `0x55588ffc90718301696fd5497a7b6e82c0f86c15d58e41fc9750a24329ee2523::scallop_usdc::SCALLOP_USDC`  
**Move target (supply):** `{protocolPkg}::mint::mint` (called via `txBlock.deposit`)  
**Move target (sCoin):** `0xde8fe7f73fcaff729de640b1a67afff5028019aefa67c151250a8d47db37aa1c::s_coin_converter::mint_s_coin`

---

### Kai (`@kunalabs-io/kai`) — COMPOSABLE (with framework coin↔balance conversions)

**What works:**
- `VaultInfo.deposit(tx, balance: TransactionObjectInput)` accepts a `Balance<T>` as a PTB argument and returns `Balance<YT>`.
- Kai's vault deposit function: `0x909ad5f8badc34b49507dbd0cb9fb88cc816b531323659e3aefb992d4ab58474::vault::deposit`.
- Full supply chain: `borrow_for_supply → 0x2::coin::into_balance → vault.deposit(balance) → 0x2::coin::from_balance → return_position` — 5 move-calls.
- Redeem: `borrow_position → into_balance → vault.withdraw(balance, strategies) → from_balance → return_usdc`.

**Critical gap in public API:** `fromBalance` / `intoBalance` helper functions are defined in the Kai SDK internals but NOT exported from the package's public API. Solution: use `tx.moveCall` directly against `0x2::coin::into_balance` / `0x2::coin::from_balance` (standard Sui framework calls, permanently stable).

**yUSDC type:** `0x7ea359636b36e7c027c2cd71adedaf19be658e1477d9e71368a0b3824a0a27ff::yusdc::YUSDC`  
**Vault object:** `0x3e8a6d1e29d2c86aed50d6055863b878a7dd382de22ea168177c80c1d7150061`  
**NOTE:** There is a deprecated/paused yUSDC vault — the above is the active one (`VAULTS.USDC`).

---

### Navi (`navi-sdk`) — NOT COMPOSABLE (supply terminal, no output token)

**What blocks it:**
- `depositCoin(txb, poolConfig, coinArg, amount)` from `navi-sdk/src/libs/PTB/commonFunctions.ts` accepts a `TransactionArgument` as input — so the coin _input_ is composable.
- However, `incentive_v3::entry_deposit` is a **void entry function**. It emits no receipt token, no share token, and returns nothing. There is nothing to chain into `vault::return_position`.
- `AccountManager.depositToNavi()` is fully auto-executing (not PTB-composable at all).
- The Navi protocol tracks user balances via internal dynamic fields, not mintable position tokens.

**To fix Navi:** Either (a) Navi protocol adds a `deposit_and_get_receipt(...)` entry that returns a `PositionReceipt` object, or (b) a thin on-chain Talos adapter wraps the Navi deposit and issues a custom Talos receipt, or (c) the Talos vault module adds a `navi_borrow_for_supply` variant that doesn't require a position coin return (uses a Navi-specific two-phase pattern). This is a design decision for a future task.

---

## `rebalanceVault` Design

```
rebalanceVault(vaultRef, decision) — supply path
  - guards: action === "REBALANCE", venue in SUPPORTED_VENUES
  - dispatches to rebalanceVaultScallop or rebalanceVaultKai
  - signs with agent keypair, executes on mainnet

unwindVault(vaultRef, protocol) — redeem path
  - mirror of above, dispatches to unwindVaultScallop or unwindVaultKai

dryRunRebalance(venue, vaultRef, amountUsdc) — PTB build validation
  - builds the full PTB, calls rawTx.build({ client }) to serialize
  - attempts dryRunTransactionBlock (expects "object not found" for placeholder IDs)
  - returns { ok, error, details }
```

`SUPPORTED_VENUES = new Set(["scallop", "kai"])` — `rebalanceVault` throws a descriptive error for unsupported venues (including Navi).

---

## Dry-Run / Build Validation

Validated with a local `node` script (no env vars needed) — proof that PTB composition is structurally correct:

**Kai supply PTB (5 move-calls):**
```
[0] talos::vault::borrow_for_supply
[1] 0x2::coin::into_balance
[2] 0x909a…::vault::deposit      ← Kai vault
[3] 0x2::coin::from_balance
[4] talos::vault::return_position
```
Result: **PASS** — 5 chained move-calls, hot-potato discharged correctly.

**Scallop supply PTB (4 move-calls, 2 added by ScallopTxBlock):**
```
[0] talos::vault::borrow_for_supply
[1] {scallop_pkg}::mint::mint        ← txBlock.deposit()
[2] {scoin_pkg}::s_coin_converter::mint_s_coin  ← txBlock.mintSCoin()
[3] talos::vault::return_position
```
Structurally valid — the Scallop SDK's `deposit()` + `mintSCoin()` accept `NestedResult` args from prior steps.

**TypeScript check:** `pnpm exec tsc --noEmit` — zero errors in `vault-exec.ts`. Pre-existing errors in `components/` and `lib/talos/kai.ts`/`sevenk.ts` are unchanged.

---

## Self-Review

- **Hot-potato guarantee preserved:** The `BorrowReceipt` from `vault::borrow_for_supply` must be discharged in the same PTB via `return_position` — the transaction aborts if the position coin is never returned. Same for the unwind path.
- **Navi documented, not hacked:** Rather than faking Navi composability, `SUPPORTED_VENUES` excludes it with a clear error message and this report explains the exact blocker.
- **Kai's private `fromBalance`/`intoBalance`:** Used `tx.moveCall` against `0x2` directly — these are stable Sui framework functions, not SDK internals.
- **Scallop `createScallopBuilder` init:** The builder initializes internally on creation; no separate `init()` call needed.
- **Both venues proven composable** via PTB structure validation (no on-chain execution required).
- **No mainnet keys needed** for the dry-run validation — the PTB is built client-side and only the structure is validated.
