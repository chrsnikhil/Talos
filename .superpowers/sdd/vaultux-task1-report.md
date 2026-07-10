# Vault UX Task 1 — Client Transaction Builders

**Date:** 2026-07-11  
**Branch:** feat/managed-wallet  
**Commit:** feat(vault-ux): client transaction builders

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/wallet/vault-tx.ts` | Five exported builder functions returning `Transaction` |
| `lib/wallet/vault-tx.test.mts` | ESM test (tsx + node:assert) verifying all MoveCalls target PACKAGE_ID |
| `.superpowers/sdd/vaultux-task1-report.md` | This report |

---

## Move Signatures Used

### `agent_policy::create_policy_entry`
```move
entry fun create_policy_entry(
    agent: address,
    budget: u64,
    per_tx_cap: u64,
    protocols: vector<String>,
    expires_at_ms: u64,
    ctx: &mut TxContext,
)
```

### `vault::create_vault<S>`
```move
public fun create_vault<S>(
    policy: &AgentPolicy,
    allowed: vector<TypeName>,
    ctx: &mut TxContext,
)
```
Note: `public fun` (not `entry`) — callable via PTB MoveCall.

### `vault::deposit<S>`
```move
public fun deposit<S>(v: &mut Vault<S>, c: Coin<S>)
```

### `vault::owner_withdraw_usdc<S>`
```move
public fun owner_withdraw_usdc<S>(
    v: &mut Vault<S>,
    cap: &OwnerCap,
    amount: u64,
    ctx: &mut TxContext,
): Coin<S>
```

### `agent_policy::revoke`
```move
public fun revoke(policy: &mut AgentPolicy, cap: &OwnerCap)
```

---

## USDC Type

```
0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC
```
Confirmed as the native Wormhole-bridged USDC on Sui mainnet (used in plan; type verified against chain documentation).

---

## Allowlist / Non-MoveCall Design Finding

**This is the key finding for Task 4 (execute).**

Three builders emit non-MoveCall PTB commands that the current `/api/wallet/execute` allowlist will reject:

| Builder | Non-MoveCall Command | Reason |
|---------|----------------------|--------|
| `buildDeposit` | `SplitCoins` | Splits exact deposit amount from a Coin |
| `buildOwnerWithdrawUsdc` | `TransferObjects` | Returns withdrawn Coin to sender wallet |
| `buildPanic` | `TransferObjects` | Returns withdrawn Coin to sender wallet |

**Resolution options for Task 4:**
1. **Extend the allowlist** to permit `SplitCoins` (safe, always splits the user's own coin) and `TransferObjects` where the recipient equals the session wallet address (self-transfer only — safe).
2. **Add a Move entry wrapper** (e.g. `entry fun owner_withdraw_usdc_to_sender`) that calls `owner_withdraw_usdc` and `transfer::public_transfer` internally, eliminating the client-side `transferObjects` — but this requires a Move module upgrade.

Option 1 (allowlist extension) is the lightest-weight fix and is recommended for Task 4.

`buildCreatePolicy` and `buildCreateVault` emit only MoveCall commands and are already allowlist-compatible.

---

## Test Output

```
buildCreatePolicy ok — commands: [ 'MoveCall' ]
buildCreateVault ok — commands: [ 'MoveCall' ]
buildDeposit DESIGN NOTE: contains SplitCoins command — allowlist must permit it
buildDeposit ok — commands: [ 'SplitCoins', 'MoveCall' ]
buildOwnerWithdrawUsdc DESIGN NOTE: contains TransferObjects command — allowlist must permit self-transfers or a Move entry wrapper must be added
buildOwnerWithdrawUsdc ok — commands: [ 'MoveCall', 'TransferObjects' ]
buildPanic DESIGN NOTE: contains TransferObjects command — allowlist must permit self-transfers or a Move entry wrapper must be added
buildPanic ok — commands: [ 'MoveCall', 'MoveCall', 'TransferObjects' ]
USDC_TYPE ok: 0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC

All vault-tx tests passed.
```

`pnpm exec tsc --noEmit`: zero errors in `lib/wallet/vault-tx.ts` (pre-existing errors in unrelated `components/` and `lib/talos/` files are unchanged).

---

## Self-Review

- All five builders implemented per plan spec.
- Real Move signatures read from source — no guessing.
- Non-MoveCall commands documented with `// ⚠` inline and in this report; tests print DESIGN NOTE warnings rather than hiding them.
- `buildPanic` is a single PTB with `revoke` + `owner_withdraw_usdc` as required.
- `buildDeposit` splits the exact amount from the caller's coin — caller provides one coin object ID, no coin-selection logic needed in the builder.
- `buildCreateVault` passes `allowedPositions` as `vector<TypeName>` (string-encoded type names, as TypeName is `std::string::String` on Sui).
- Package ID sourced from `config.ts` constant — no hardcoding in builder file.
