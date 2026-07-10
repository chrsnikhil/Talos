# Talos Vault — design spec

**Date:** 2026-07-10
**Status:** approved (brainstorm), ready for implementation plan
**Context:** Sui Overflow 2026 finalist build-out. Turns Talos from a single custodial
swarm into a multi-user, non-custodial, policy-as-a-service yield product.

## Decisions (from brainstorm)

1. **Custody depth while deployed:** the Vault owns lending positions (sCoins) at *all*
   times — idle USDC and deployed positions alike. Panic = instant on-chain freeze via
   `OwnerCap`; the agent unwinds deployed positions back to the Vault within ~1 tick.
2. **Agent-offline fallback:** the `OwnerCap` holder can withdraw *any* Vault asset — idle
   USDC or raw sCoin receipts — to their own wallet at any time, with no agent involvement.
   No on-chain redeem integration required (redeem sCoin off-chain if needed).
3. **Network / funds:** mainnet, real USDC. De-risked with small per-policy caps for the
   demo, team-seeded funds first, and a prominent "experimental / unaudited" disclosure.

## Object model

Keep `talos::agent_policy` (the leash / rules) and `talos::reputation` unchanged in spirit.
Add `talos::vault` (the funds). One user holds one `AgentPolicy` + one `Vault`, both governed
by the single `OwnerCap` they already own.

```move
module talos::vault;

public struct Vault has key {
    id: UID,
    owner: address,          // human (zkLogin wallet)
    agent: address,          // Talos agent, mirrors the policy's agent
    policy_id: ID,           // the AgentPolicy that bounds this vault
    usdc: Balance<USDC>,      // idle USDC
    principal: u64,          // cumulative deposited − withdrawn, for yield-uplift analytics
    allowed_positions: VecSet<TypeName>,  // which receipt (sCoin) types may enter the vault
    // lending receipts held as dynamic fields keyed by position type
}
```

Positions are stored via `dynamic_field`, keyed by receipt coin type, so the Vault owns every
asset at all times, idle or deployed.

## Core mechanism — atomic hot-potato rebalance

Move's hot-potato pattern forces any borrowed value back into the Vault in the same PTB. The
agent can never end a transaction holding user funds.

```move
public struct BorrowReceipt { vault_id: ID, amount: u64, protocol: String } // no abilities = hot potato

// agent pulls USDC out, receives a potato it MUST resolve this PTB
public fun borrow_for_supply(
    vault: &mut Vault, policy: &AgentPolicy, clock: &Clock,
    amount: u64, protocol: String, ctx: &TxContext
): (Coin<USDC>, BorrowReceipt) {
    agent_policy::assert_active(policy, clock, protocol, amount, ctx); // sender==agent, !revoked, !expired, allowlisted, ≤per_tx_cap
    let c = coin::from_balance(vault.usdc.split(amount), ctx);
    (c, BorrowReceipt { vault_id: object::id(vault), amount, protocol })
}

// the ONLY way to discharge the potato: return an allowlisted position into the vault
public fun return_position<P>(vault: &mut Vault, receipt: BorrowReceipt, position: Coin<P>) {
    let BorrowReceipt { vault_id, .. } = receipt;      // consume potato
    assert!(vault_id == object::id(vault), EWrongVault);
    assert!(vault.allowed_positions.contains(&type_name::get<P>()), EPositionNotAllowed);
    merge_into_vault(vault, position);                  // dynamic field, merge if type already held
}
```

Off-chain the agent builds one PTB: `borrow_for_supply` → venue supply move-call (consumes the
`Coin<USDC>`, returns the sCoin) → `return_position`. Omit the return and the PTB aborts on the
unresolved potato; the USDC never left. **Unwind** is the mirror: borrow the sCoin, redeem on
the venue, return `Coin<USDC>`.

## Deposit / Withdraw / Panic

- **deposit(vault, coin):** anyone adds USDC; bumps `principal`.
- **owner_withdraw_usdc(vault, cap, amount) / owner_withdraw_position<P>(vault, cap):** OwnerCap
  holder pulls any asset — idle USDC or raw sCoins — to their own wallet, anytime, agent or not.
  The trustless floor.
- **Panic** (frontend composes one PTB): `agent_policy::revoke(policy, cap)` — instant on-chain
  freeze; the swarm already halts on `revoked` — plus `owner_withdraw_usdc(all idle)`. Live agent
  unwinds deployed positions within a tick; dead agent → user pulls raw sCoins.

## Security model

Funds flow only Vault → allowlisted venue → Vault; the agent holds nothing between txs; per-tx
cap, expiry, and freeze all still apply; OwnerCap exits at any moment. Move can't cheaply verify
on-chain that a returned position is *worth* the USDC taken (needs an oracle). Contained by: the
protocol allowlist, the position-type allowlist, small per-policy caps, and Daedalus scoring
every move. **Oracle value-check is logged as future hardening, not built now.**

## Contract changes

- **New:** `talos::vault` (above).
- **`agent_policy` tweaks:** add a non-decrementing `assert_active(policy, clock, protocol,
  amount, ctx)` view for the vault to call; repurpose `remaining_budget` as a max-exposure /
  deposit cap (a continuously-rebalancing vault would drain a decrementing counter). The Vault's
  USDC balance is the real hard spend limit. `per_tx_cap`, `allowlist`, `expiry`, `revoked`
  unchanged.
- **Unchanged:** `reputation`.

## Out of scope (future hardening)

- On-chain oracle value-check on `return_position`.
- On-chain emergency redeem (chosen fallback is raw-position withdrawal).
- Pooled/shared vault accounting (one shared Vault object per user for now).
