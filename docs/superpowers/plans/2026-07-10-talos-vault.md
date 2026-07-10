# Talos Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a non-custodial `talos::vault` Move module so user USDC and lending-position receipts are owned by an on-chain Vault at all times, movable by the agent only via an atomic hot-potato that forces value back into the Vault, and reclaimable by the owner (idle USDC or raw receipts) at any moment.

**Architecture:** Keep `talos::agent_policy` (rules) and `talos::reputation` unchanged in spirit; add `talos::vault` (funds) that composes with a policy and is governed by the existing `OwnerCap`. Positions are stored as `dynamic_field` `Balance<P>` keyed by receipt type. The agent moves funds with a hot-potato `BorrowReceipt` (no abilities) that can only be discharged by returning value into the Vault in the same PTB.

**Tech Stack:** Sui Move (edition 2024.beta), `sui::dynamic_field`, `sui::balance`, `sui::coin`, `std::type_name`, `sui::vec_set`, `sui::test_scenario`.

## Global Constraints

- Move edition: `2024.beta` (already set in `talos/Move.toml`).
- Named address: `talos = "0x0"` (publish assigns the real id).
- Test identities (reuse existing convention): `OWNER = @0xA`, `AGENT = @0xB`, `STRANGER = @0xC`.
- Build/test command: `sui move test` run from `talos/`. Every task ends green.
- Do **not** modify or break `agent_policy::authorize_spend` — the live swarm still calls it. Only *add* to `agent_policy`.
- The Vault is generic over the stable type `S`. Production instantiates `Vault<S>` with the mainnet USDC type supplied by the off-chain caller (confirm the exact USDC type string during the swarm-refactor plan, NOT here). Tests use a local `TUSDC` marker type.
- Commit after every task with the shown message. Do not `git push`.

---

### Task 1: Extend `agent_policy` with `assert_active` + `owner_cap_policy_id`

The Vault needs a **non-decrementing** authorization check (a continuously-rebalancing vault would drain a decrementing budget) and a way to prove an `OwnerCap` belongs to the Vault's policy.

**Files:**
- Modify: `talos/sources/agent_policy.move` (add two public functions near the `// === Views ===` section, ~line 180)
- Test: `talos/tests/agent_policy_tests.move` (append tests)

**Interfaces:**
- Produces:
  - `agent_policy::assert_active(policy: &AgentPolicy, clock: &Clock, protocol: String, amount: u64, ctx: &TxContext)` — aborts unless `sender == policy.agent`, `!revoked`, `now < expires_at_ms`, `amount <= per_tx_cap`, `protocol` in allowlist. Does **not** touch `remaining_budget`.
  - `agent_policy::owner_cap_policy_id(cap: &OwnerCap): ID`

- [ ] **Step 1: Write the failing tests**

Append to `talos/tests/agent_policy_tests.move`:

```move
#[test]
fun assert_active_happy_and_cap_id() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc, 1000, 500, 10_000);

    // owner_cap_policy_id matches the shared policy's id
    sc.next_tx(OWNER);
    {
        let policy = sc.take_shared<AgentPolicy>();
        let cap = sc.take_from_sender<OwnerCap>();
        assert!(agent_policy::owner_cap_policy_id(&cap) == object::id(&policy), 0);
        sc.return_to_sender(cap);
        ts::return_shared(policy);
    };

    // assert_active passes for the agent within bounds and does NOT change the budget
    sc.next_tx(AGENT);
    {
        let policy = sc.take_shared<AgentPolicy>();
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(0);
        agent_policy::assert_active(&policy, &clk, string::utf8(b"scallop"), 500, sc.ctx());
        assert!(policy.remaining_budget() == 1000, 1); // unchanged
        clk.destroy_for_testing();
        ts::return_shared(policy);
    };
    sc.end();
}

#[test, expected_failure(abort_code = agent_policy::EOverPerTxCap)]
fun assert_active_rejects_over_cap() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc, 1000, 500, 10_000);
    sc.next_tx(AGENT);
    let policy = sc.take_shared<AgentPolicy>();
    let mut clk = clock::create_for_testing(sc.ctx());
    clk.set_for_testing(0);
    agent_policy::assert_active(&policy, &clk, string::utf8(b"scallop"), 600, sc.ctx());
    abort 0
}

#[test, expected_failure(abort_code = agent_policy::EUnauthorizedAgent)]
fun assert_active_rejects_stranger() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc, 1000, 500, 10_000);
    sc.next_tx(STRANGER);
    let policy = sc.take_shared<AgentPolicy>();
    let mut clk = clock::create_for_testing(sc.ctx());
    clk.set_for_testing(0);
    agent_policy::assert_active(&policy, &clk, string::utf8(b"scallop"), 100, sc.ctx());
    abort 0
}
```

Add `use sui::object;` is not needed (implicit); `object::id` is available via the prelude. If the compiler complains, add `use sui::object;` at the top of the test module.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd talos && sui move test assert_active`
Expected: FAIL — `unbound function 'assert_active'` / `owner_cap_policy_id`.

- [ ] **Step 3: Implement the two functions**

In `talos/sources/agent_policy.move`, immediately above `// === Views ===` (~line 180), add:

```move
/// Non-decrementing authorization check for composable spends (e.g. the Vault).
/// Enforces the same bounds as `authorize_spend` EXCEPT it does not touch or check
/// `remaining_budget` — the Vault's own coin balance is the hard spend limit, and a
/// continuously-rebalancing vault must not drain a one-way budget counter.
public fun assert_active(
    policy: &AgentPolicy,
    clock: &Clock,
    protocol: String,
    amount: u64,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == policy.agent, EUnauthorizedAgent);
    assert!(!policy.revoked, ERevoked);
    assert!(clock.timestamp_ms() < policy.expires_at_ms, EExpired);
    assert!(amount <= policy.per_tx_cap, EOverPerTxCap);
    assert!(policy.allowed_protocols.contains(&protocol), EProtocolNotAllowed);
}

/// The policy id this OwnerCap governs — lets other modules (the Vault) verify ownership.
public fun owner_cap_policy_id(cap: &OwnerCap): ID { cap.policy_id }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd talos && sui move test`
Expected: PASS — all existing tests plus the 3 new ones (14 total).

- [ ] **Step 5: Commit**

```bash
git add talos/sources/agent_policy.move talos/tests/agent_policy_tests.move
git commit -m "feat(policy): add assert_active + owner_cap_policy_id for vault composition"
```

---

### Task 2: `Vault` object + `create_vault` + `deposit`

**Files:**
- Create: `talos/sources/vault.move`
- Test: `talos/tests/vault_tests.move`

**Interfaces:**
- Produces:
  - `struct Vault<phantom S> has key` with fields `owner: address, agent: address, policy_id: ID, usdc: Balance<S>, principal: u64, allowed_positions: VecSet<TypeName>`
  - `struct PosKey has copy, drop, store { t: TypeName }`
  - `vault::create_vault<S>(policy: &AgentPolicy, allowed: vector<TypeName>, ctx: &mut TxContext)` — shares a `Vault<S>` bound to the policy's owner/agent. Aborts `ENotOwner` unless `sender == policy.owner`.
  - `vault::deposit<S>(v: &mut Vault<S>, c: Coin<S>)` — joins USDC into `usdc`, adds to `principal`.
  - views: `idle<S>(&Vault<S>): u64`, `principal<S>(&Vault<S>): u64`, `owner<S>`, `agent<S>`.
- Consumes: `agent_policy::owner`, `agent_policy::agent` (existing views).

- [ ] **Step 1: Write the failing test**

Create `talos/tests/vault_tests.move`:

```move
#[test_only]
module talos::vault_tests;

use std::type_name;
use sui::clock;
use sui::coin;
use sui::string;
use sui::test_scenario as ts;
use talos::agent_policy::{Self, AgentPolicy, OwnerCap};
use talos::vault::{Self, Vault};

const OWNER: address = @0xA;
const AGENT: address = @0xB;
const STRANGER: address = @0xC;

/// test-only marker types for the stable coin and a lending receipt
public struct TUSDC has drop {}
public struct SCOIN has drop {}

fun protos(): vector<sui::string::String> {
    vector[string::utf8(b"scallop"), string::utf8(b"navi")]
}

/// create policy (OwnerCap → OWNER) then a Vault<TUSDC> allowing SCOIN positions
fun setup(sc: &mut ts::Scenario) {
    {
        let ctx = sc.ctx();
        let cap = agent_policy::create_policy(AGENT, 1_000_000, 100_000, protos(), 10_000, ctx);
        transfer::public_transfer(cap, OWNER);
    };
    sc.next_tx(OWNER);
    {
        let policy = sc.take_shared<AgentPolicy>();
        vault::create_vault<TUSDC>(&policy, vector[type_name::get<SCOIN>()], sc.ctx());
        ts::return_shared(policy);
    };
}

#[test]
fun create_and_deposit() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc);

    sc.next_tx(OWNER);
    {
        let mut v = sc.take_shared<Vault<TUSDC>>();
        assert!(vault::owner(&v) == OWNER, 0);
        assert!(vault::agent(&v) == AGENT, 1);
        assert!(vault::idle(&v) == 0, 2);

        let c = coin::mint_for_testing<TUSDC>(500, sc.ctx());
        vault::deposit(&mut v, c);
        assert!(vault::idle(&v) == 500, 3);
        assert!(vault::principal(&v) == 500, 4);
        ts::return_shared(v);
    };
    sc.end();
}

#[test, expected_failure(abort_code = vault::ENotOwner)]
fun stranger_cannot_create_vault() {
    let mut sc = ts::begin(OWNER);
    {
        let ctx = sc.ctx();
        let cap = agent_policy::create_policy(AGENT, 1_000_000, 100_000, protos(), 10_000, ctx);
        transfer::public_transfer(cap, OWNER);
    };
    sc.next_tx(STRANGER);
    let policy = sc.take_shared<AgentPolicy>();
    vault::create_vault<TUSDC>(&policy, vector[type_name::get<SCOIN>()], sc.ctx());
    abort 0
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd talos && sui move test create_and_deposit`
Expected: FAIL — `unbound module 'talos::vault'`.

- [ ] **Step 3: Implement `vault.move` (this task's subset)**

Create `talos/sources/vault.move`:

```move
/// Non-custodial escrow Vault for a Talos agent.
///
/// Holds a user's idle USDC and its live lending-position receipts (sCoins) as on-chain
/// assets the agent can never end a transaction holding. The agent moves funds only via a
/// hot-potato `BorrowReceipt` that must be discharged — by returning value into the Vault —
/// in the same programmable transaction. The `OwnerCap` holder can reclaim any asset (idle
/// USDC or a raw receipt) at any time, with no agent involvement.
module talos::vault;

use std::string::String;
use std::type_name::{Self, TypeName};
use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::clock::Clock;
use sui::dynamic_field as df;
use sui::event;
use sui::vec_set::{Self, VecSet};
use talos::agent_policy::{Self, AgentPolicy, OwnerCap};

// === Errors ===
const EWrongVault: u64 = 1;
const EPositionNotAllowed: u64 = 2;
const ENotOwner: u64 = 3;
const EInsufficientIdle: u64 = 4;
const ENoSuchPosition: u64 = 5;

// === Objects ===

/// Shared per-user vault, generic over the stable coin `S` (USDC in production).
public struct Vault<phantom S> has key {
    id: UID,
    owner: address,
    agent: address,
    policy_id: ID,
    usdc: Balance<S>,
    principal: u64,
    allowed_positions: VecSet<TypeName>,
}

/// Dynamic-field key: one `Balance<P>` per allowed receipt type `P`.
public struct PosKey has copy, drop, store { t: TypeName }

// === Events ===
public struct VaultCreated has copy, drop { vault_id: ID, owner: address, agent: address, policy_id: ID }
public struct Deposited has copy, drop { vault_id: ID, amount: u64, principal: u64 }

// === Creation ===

/// Create and share a Vault bound to `policy`. Only the policy owner may call.
public fun create_vault<S>(policy: &AgentPolicy, allowed: vector<TypeName>, ctx: &mut TxContext) {
    assert!(ctx.sender() == agent_policy::owner(policy), ENotOwner);
    let mut set = vec_set::empty<TypeName>();
    allowed.do!(|t| if (!set.contains(&t)) set.insert(t));
    let v = Vault<S> {
        id: object::new(ctx),
        owner: agent_policy::owner(policy),
        agent: agent_policy::agent(policy),
        policy_id: object::id(policy),
        usdc: balance::zero<S>(),
        principal: 0,
        allowed_positions: set,
    };
    event::emit(VaultCreated {
        vault_id: object::id(&v), owner: v.owner, agent: v.agent, policy_id: v.policy_id,
    });
    transfer::share_object(v);
}

// === Deposit ===

/// Add USDC to the vault. Anyone may top up a vault (funds only ever help the owner).
public fun deposit<S>(v: &mut Vault<S>, c: Coin<S>) {
    let amt = c.value();
    v.usdc.join(c.into_balance());
    v.principal = v.principal + amt;
    event::emit(Deposited { vault_id: object::id(v), amount: amt, principal: v.principal });
}

// === Views ===
public fun idle<S>(v: &Vault<S>): u64 { v.usdc.value() }
public fun principal<S>(v: &Vault<S>): u64 { v.principal }
public fun owner<S>(v: &Vault<S>): address { v.owner }
public fun agent<S>(v: &Vault<S>): address { v.agent }
public fun policy_id<S>(v: &Vault<S>): ID { v.policy_id }
public fun allows_position<S>(v: &Vault<S>, t: &TypeName): bool { v.allowed_positions.contains(t) }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd talos && sui move test`
Expected: PASS — the two new vault tests plus everything from Task 1.

- [ ] **Step 5: Commit**

```bash
git add talos/sources/vault.move talos/tests/vault_tests.move
git commit -m "feat(vault): Vault object with create_vault + deposit"
```

---

### Task 3: Supply path — `borrow_for_supply` + `return_position` (hot potato)

**Files:**
- Modify: `talos/sources/vault.move`
- Test: `talos/tests/vault_tests.move`

**Interfaces:**
- Produces:
  - `struct BorrowReceipt` — **no abilities** (hot potato) — `{ vault_id: ID, amount: u64, protocol: String }`
  - `vault::borrow_for_supply<S>(v: &mut Vault<S>, policy: &AgentPolicy, clock: &Clock, amount: u64, protocol: String, ctx: &mut TxContext): (Coin<S>, BorrowReceipt)`
  - `vault::return_position<S, P>(v: &mut Vault<S>, receipt: BorrowReceipt, position: Coin<P>)` — merges `position` into a `Balance<P>` dynamic field; aborts `EPositionNotAllowed` if `P` not allowlisted, `EWrongVault` if receipt is for another vault.
- Consumes: `agent_policy::assert_active` (Task 1).

- [ ] **Step 1: Write the failing test**

Append to `talos/tests/vault_tests.move`:

```move
#[test]
fun supply_moves_usdc_out_and_position_in() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc);

    // fund the vault
    sc.next_tx(OWNER);
    {
        let mut v = sc.take_shared<Vault<TUSDC>>();
        vault::deposit(&mut v, coin::mint_for_testing<TUSDC>(1000, sc.ctx()));
        ts::return_shared(v);
    };

    // agent supplies 400 USDC to "scallop", returns an SCOIN position of 390
    sc.next_tx(AGENT);
    {
        let mut v = sc.take_shared<Vault<TUSDC>>();
        let policy = sc.take_shared<AgentPolicy>();
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(0);

        let (usdc_out, receipt) =
            vault::borrow_for_supply(&mut v, &policy, &clk, 400, string::utf8(b"scallop"), sc.ctx());
        assert!(coin::value(&usdc_out) == 400, 0);
        assert!(vault::idle(&v) == 600, 1);
        // the venue "consumes" the USDC and hands back a receipt coin
        coin::burn_for_testing(usdc_out);
        let scoin = coin::mint_for_testing<SCOIN>(390, sc.ctx());
        vault::return_position(&mut v, receipt, scoin);
        assert!(vault::position_value<TUSDC, SCOIN>(&v) == 390, 2);

        clk.destroy_for_testing();
        ts::return_shared(policy);
        ts::return_shared(v);
    };
    sc.end();
}

#[test, expected_failure(abort_code = vault::EPositionNotAllowed)]
fun return_rejects_unlisted_position() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc);
    sc.next_tx(OWNER);
    {
        let mut v = sc.take_shared<Vault<TUSDC>>();
        vault::deposit(&mut v, coin::mint_for_testing<TUSDC>(1000, sc.ctx()));
        ts::return_shared(v);
    };
    sc.next_tx(AGENT);
    let mut v = sc.take_shared<Vault<TUSDC>>();
    let policy = sc.take_shared<AgentPolicy>();
    let mut clk = clock::create_for_testing(sc.ctx());
    clk.set_for_testing(0);
    let (usdc_out, receipt) =
        vault::borrow_for_supply(&mut v, &policy, &clk, 100, string::utf8(b"scallop"), sc.ctx());
    coin::burn_for_testing(usdc_out);
    // TUSDC is not an allowed position type → abort
    let bad = coin::mint_for_testing<TUSDC>(100, sc.ctx());
    vault::return_position(&mut v, receipt, bad);
    abort 0
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd talos && sui move test supply_moves`
Expected: FAIL — `unbound function 'borrow_for_supply'` / `position_value`.

- [ ] **Step 3: Implement supply path**

In `talos/sources/vault.move`, add after the events block:

```move
/// Hot potato: created when the agent borrows from the vault, destroyed only by returning
/// value into the vault in the same PTB. Has NO abilities, so the transaction cannot end
/// while it is unresolved — the agent can never walk away holding borrowed funds.
public struct BorrowReceipt { vault_id: ID, amount: u64, protocol: String }

public struct Borrowed has copy, drop { vault_id: ID, amount: u64, protocol: String }
public struct PositionReturned has copy, drop { vault_id: ID, position: TypeName, amount: u64 }
```

Then add these functions (before `// === Views ===`):

```move
/// Agent pulls `amount` USDC out to supply into `protocol`, receiving a hot-potato receipt
/// that MUST be discharged via `return_position` (or `return_usdc`) in the same PTB.
public fun borrow_for_supply<S>(
    v: &mut Vault<S>, policy: &AgentPolicy, clock: &Clock,
    amount: u64, protocol: String, ctx: &mut TxContext,
): (Coin<S>, BorrowReceipt) {
    assert!(object::id(policy) == v.policy_id, EWrongVault);
    agent_policy::assert_active(policy, clock, protocol, amount, ctx);
    assert!(v.usdc.value() >= amount, EInsufficientIdle);
    let c = coin::from_balance(v.usdc.split(amount), ctx);
    event::emit(Borrowed { vault_id: object::id(v), amount, protocol });
    (c, BorrowReceipt { vault_id: object::id(v), amount, protocol })
}

/// Discharge a receipt by depositing an allowlisted lending position back into the vault.
public fun return_position<S, P>(v: &mut Vault<S>, receipt: BorrowReceipt, position: Coin<P>) {
    let BorrowReceipt { vault_id, amount: _, protocol: _ } = receipt; // consume potato
    assert!(vault_id == object::id(v), EWrongVault);
    let t = type_name::get<P>();
    assert!(v.allowed_positions.contains(&t), EPositionNotAllowed);
    let key = PosKey { t };
    let amt = position.value();
    if (df::exists_(&v.id, key)) {
        let bal: &mut Balance<P> = df::borrow_mut(&mut v.id, key);
        bal.join(position.into_balance());
    } else {
        df::add(&mut v.id, key, position.into_balance());
    };
    event::emit(PositionReturned { vault_id, position: t, amount: amt });
}
```

Add this view to the `// === Views ===` block:

```move
public fun has_position<S, P>(v: &Vault<S>): bool { df::exists_(&v.id, PosKey { t: type_name::get<P>() }) }
public fun position_value<S, P>(v: &Vault<S>): u64 {
    let key = PosKey { t: type_name::get<P>() };
    if (df::exists_(&v.id, key)) { let b: &Balance<P> = df::borrow(&v.id, key); b.value() } else { 0 }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd talos && sui move test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add talos/sources/vault.move talos/tests/vault_tests.move
git commit -m "feat(vault): atomic hot-potato supply (borrow_for_supply + return_position)"
```

---

### Task 4: Unwind path — `borrow_position` + `return_usdc`

**Files:**
- Modify: `talos/sources/vault.move`
- Test: `talos/tests/vault_tests.move`

**Interfaces:**
- Produces:
  - `vault::borrow_position<S, P>(v: &mut Vault<S>, policy: &AgentPolicy, clock: &Clock, protocol: String, ctx: &mut TxContext): (Coin<P>, BorrowReceipt)` — removes the whole `Balance<P>` and hands it out; aborts `ENoSuchPosition` if absent.
  - `vault::return_usdc<S>(v: &mut Vault<S>, receipt: BorrowReceipt, c: Coin<S>)` — joins redeemed USDC back into `usdc`, discharging the receipt.

- [ ] **Step 1: Write the failing test**

Append to `talos/tests/vault_tests.move`:

```move
#[test]
fun unwind_moves_position_out_and_usdc_in() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc);
    // fund + supply so a position exists
    sc.next_tx(OWNER);
    {
        let mut v = sc.take_shared<Vault<TUSDC>>();
        vault::deposit(&mut v, coin::mint_for_testing<TUSDC>(1000, sc.ctx()));
        ts::return_shared(v);
    };
    sc.next_tx(AGENT);
    {
        let mut v = sc.take_shared<Vault<TUSDC>>();
        let policy = sc.take_shared<AgentPolicy>();
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(0);
        let (usdc_out, r) = vault::borrow_for_supply(&mut v, &policy, &clk, 400, string::utf8(b"scallop"), sc.ctx());
        coin::burn_for_testing(usdc_out);
        vault::return_position(&mut v, r, coin::mint_for_testing<SCOIN>(400, sc.ctx()));

        // now unwind: pull the SCOIN out, "redeem" to 410 USDC, return it
        let (scoin_out, r2) = vault::borrow_position<TUSDC, SCOIN>(&mut v, &policy, &clk, string::utf8(b"scallop"), sc.ctx());
        assert!(coin::value(&scoin_out) == 400, 0);
        assert!(vault::has_position<TUSDC, SCOIN>(&v) == false, 1);
        coin::burn_for_testing(scoin_out);
        vault::return_usdc(&mut v, r2, coin::mint_for_testing<TUSDC>(410, sc.ctx()));
        assert!(vault::idle(&v) == 1010, 2); // 600 left + 410 redeemed

        clk.destroy_for_testing();
        ts::return_shared(policy);
        ts::return_shared(v);
    };
    sc.end();
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd talos && sui move test unwind_moves`
Expected: FAIL — `unbound function 'borrow_position'`.

- [ ] **Step 3: Implement unwind path**

Add to `talos/sources/vault.move` (near the supply functions):

```move
/// Agent pulls the entire `Balance<P>` position out to redeem it, receiving a hot-potato
/// receipt that MUST be discharged via `return_usdc` in the same PTB. `amount = 0` is passed
/// to `assert_active` because unwinds bring funds BACK and are not bounded by per_tx_cap.
public fun borrow_position<S, P>(
    v: &mut Vault<S>, policy: &AgentPolicy, clock: &Clock,
    protocol: String, ctx: &mut TxContext,
): (Coin<P>, BorrowReceipt) {
    assert!(object::id(policy) == v.policy_id, EWrongVault);
    let key = PosKey { t: type_name::get<P>() };
    assert!(df::exists_(&v.id, key), ENoSuchPosition);
    agent_policy::assert_active(policy, clock, protocol, 0, ctx);
    let bal: Balance<P> = df::remove(&mut v.id, key);
    let amt = bal.value();
    event::emit(Borrowed { vault_id: object::id(v), amount: amt, protocol });
    (coin::from_balance(bal, ctx), BorrowReceipt { vault_id: object::id(v), amount: amt, protocol })
}

/// Discharge a receipt by returning redeemed USDC to the vault (does not touch `principal`).
public fun return_usdc<S>(v: &mut Vault<S>, receipt: BorrowReceipt, c: Coin<S>) {
    let BorrowReceipt { vault_id, amount: _, protocol: _ } = receipt; // consume potato
    assert!(vault_id == object::id(v), EWrongVault);
    v.usdc.join(c.into_balance());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd talos && sui move test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add talos/sources/vault.move talos/tests/vault_tests.move
git commit -m "feat(vault): atomic unwind (borrow_position + return_usdc)"
```

---

### Task 5: Owner withdrawals — `owner_withdraw_usdc` + `owner_withdraw_position`

The trustless floor: the `OwnerCap` holder can pull any asset out, anytime, agent or not.

**Files:**
- Modify: `talos/sources/vault.move`
- Test: `talos/tests/vault_tests.move`

**Interfaces:**
- Produces:
  - `vault::owner_withdraw_usdc<S>(v: &mut Vault<S>, cap: &OwnerCap, amount: u64, ctx: &mut TxContext): Coin<S>` — aborts `ENotOwner` unless `owner_cap_policy_id(cap) == v.policy_id`; aborts `EInsufficientIdle` if `amount > idle`; decrements `principal` (floored at 0).
  - `vault::owner_withdraw_position<S, P>(v: &mut Vault<S>, cap: &OwnerCap, ctx: &mut TxContext): Coin<P>` — removes and returns the raw `Balance<P>` as a coin; aborts `ENoSuchPosition` if absent.
- Consumes: `agent_policy::owner_cap_policy_id` (Task 1).

- [ ] **Step 1: Write the failing test**

Append to `talos/tests/vault_tests.move`:

```move
#[test]
fun owner_withdraws_usdc_and_raw_position() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc);
    sc.next_tx(OWNER);
    {
        let mut v = sc.take_shared<Vault<TUSDC>>();
        vault::deposit(&mut v, coin::mint_for_testing<TUSDC>(1000, sc.ctx()));
        ts::return_shared(v);
    };
    // agent parks 400 as an SCOIN position
    sc.next_tx(AGENT);
    {
        let mut v = sc.take_shared<Vault<TUSDC>>();
        let policy = sc.take_shared<AgentPolicy>();
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(0);
        let (u, r) = vault::borrow_for_supply(&mut v, &policy, &clk, 400, string::utf8(b"scallop"), sc.ctx());
        coin::burn_for_testing(u);
        vault::return_position(&mut v, r, coin::mint_for_testing<SCOIN>(400, sc.ctx()));
        clk.destroy_for_testing();
        ts::return_shared(policy);
        ts::return_shared(v);
    };
    // owner reclaims idle USDC AND the raw SCOIN, no agent involved
    sc.next_tx(OWNER);
    {
        let mut v = sc.take_shared<Vault<TUSDC>>();
        let cap = sc.take_from_sender<OwnerCap>();
        let got = vault::owner_withdraw_usdc(&mut v, &cap, 600, sc.ctx());
        assert!(coin::value(&got) == 600, 0);
        assert!(vault::idle(&v) == 0, 1);
        coin::burn_for_testing(got);

        let scoin = vault::owner_withdraw_position<TUSDC, SCOIN>(&mut v, &cap, sc.ctx());
        assert!(coin::value(&scoin) == 400, 2);
        assert!(vault::has_position<TUSDC, SCOIN>(&v) == false, 3);
        coin::burn_for_testing(scoin);

        sc.return_to_sender(cap);
        ts::return_shared(v);
    };
    sc.end();
}

#[test, expected_failure(abort_code = vault::ENotOwner)]
fun stranger_cap_cannot_withdraw() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc);
    // give STRANGER a foreign policy + OwnerCap
    sc.next_tx(STRANGER);
    {
        let ctx = sc.ctx();
        let cap = agent_policy::create_policy(AGENT, 10, 10, protos(), 10_000, ctx);
        transfer::public_transfer(cap, STRANGER);
    };
    sc.next_tx(OWNER);
    {
        let mut v = sc.take_shared<Vault<TUSDC>>();
        vault::deposit(&mut v, coin::mint_for_testing<TUSDC>(100, sc.ctx()));
        ts::return_shared(v);
    };
    sc.next_tx(STRANGER);
    let mut v = sc.take_shared<Vault<TUSDC>>();
    let cap = sc.take_from_sender<OwnerCap>();
    let got = vault::owner_withdraw_usdc(&mut v, &cap, 100, sc.ctx()); // wrong policy → ENotOwner
    coin::burn_for_testing(got);
    abort 0
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd talos && sui move test owner_withdraws`
Expected: FAIL — `unbound function 'owner_withdraw_usdc'`.

- [ ] **Step 3: Implement owner withdrawals**

Add to `talos/sources/vault.move`:

```move
public struct OwnerWithdrew has copy, drop { vault_id: ID, amount: u64, position: bool }

/// Owner reclaims idle USDC to their wallet. Works at any time, agent or not.
public fun owner_withdraw_usdc<S>(
    v: &mut Vault<S>, cap: &OwnerCap, amount: u64, ctx: &mut TxContext,
): Coin<S> {
    assert!(agent_policy::owner_cap_policy_id(cap) == v.policy_id, ENotOwner);
    assert!(v.usdc.value() >= amount, EInsufficientIdle);
    v.principal = if (v.principal >= amount) { v.principal - amount } else { 0 };
    event::emit(OwnerWithdrew { vault_id: object::id(v), amount, position: false });
    coin::from_balance(v.usdc.split(amount), ctx)
}

/// Owner reclaims a raw lending receipt to their wallet — the agent-independent escape hatch.
public fun owner_withdraw_position<S, P>(
    v: &mut Vault<S>, cap: &OwnerCap, ctx: &mut TxContext,
): Coin<P> {
    assert!(agent_policy::owner_cap_policy_id(cap) == v.policy_id, ENotOwner);
    let key = PosKey { t: type_name::get<P>() };
    assert!(df::exists_(&v.id, key), ENoSuchPosition);
    let bal: Balance<P> = df::remove(&mut v.id, key);
    event::emit(OwnerWithdrew { vault_id: object::id(v), amount: bal.value(), position: true });
    coin::from_balance(bal, ctx)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd talos && sui move test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add talos/sources/vault.move talos/tests/vault_tests.move
git commit -m "feat(vault): owner withdrawals for idle USDC and raw positions"
```

---

### Task 6: Panic integration test (freeze + reclaim, agent locked out)

Proves the end-to-end guarantee: after the owner revokes the policy (the panic freeze), the agent's `borrow_for_supply` aborts `ERevoked`, and the owner still reclaims everything.

**Files:**
- Test: `talos/tests/vault_tests.move`

- [ ] **Step 1: Write the failing test**

Append to `talos/tests/vault_tests.move`:

```move
#[test, expected_failure(abort_code = talos::agent_policy::ERevoked)]
fun agent_locked_out_after_panic_freeze() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc);
    sc.next_tx(OWNER);
    {
        let mut v = sc.take_shared<Vault<TUSDC>>();
        vault::deposit(&mut v, coin::mint_for_testing<TUSDC>(1000, sc.ctx()));
        ts::return_shared(v);
    };
    // owner PANIC: revoke the policy (the on-chain freeze)
    sc.next_tx(OWNER);
    {
        let mut policy = sc.take_shared<AgentPolicy>();
        let cap = sc.take_from_sender<OwnerCap>();
        agent_policy::revoke(&mut policy, &cap);
        sc.return_to_sender(cap);
        ts::return_shared(policy);
    };
    // agent tries to move funds after the freeze → aborts ERevoked
    sc.next_tx(AGENT);
    let mut v = sc.take_shared<Vault<TUSDC>>();
    let policy = sc.take_shared<AgentPolicy>();
    let mut clk = clock::create_for_testing(sc.ctx());
    clk.set_for_testing(0);
    let (u, r) = vault::borrow_for_supply(&mut v, &policy, &clk, 100, string::utf8(b"scallop"), sc.ctx());
    coin::burn_for_testing(u);
    vault::return_position(&mut v, r, coin::mint_for_testing<SCOIN>(100, sc.ctx()));
    abort 0
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd talos && sui move test agent_locked_out`
Expected: initially FAIL only if not compiling; once compiling it should PASS (it asserts the expected abort). If it does not abort with `ERevoked`, that is a real bug — investigate before proceeding.

- [ ] **Step 3: No new implementation**

This test exercises existing code (Task 1 `assert_active` reads `revoked`). If it fails to abort, the bug is in `assert_active`'s revoked check — fix there.

- [ ] **Step 4: Run the full suite**

Run: `cd talos && sui move test`
Expected: PASS — all agent_policy, reputation, and vault tests.

- [ ] **Step 5: Commit**

```bash
git add talos/tests/vault_tests.move
git commit -m "test(vault): panic freeze locks the agent out end-to-end"
```

---

### Task 7: Audit sweep + self-review

Adversarial pass over the module before any mainnet funds (todo item 2). Add the abort-path tests that a reviewer would demand, and run the checklist.

**Files:**
- Test: `talos/tests/vault_tests.move`
- Create: `talos/AUDIT.md`

- [ ] **Step 1: Add the remaining adversarial tests**

Append to `talos/tests/vault_tests.move`:

```move
#[test, expected_failure(abort_code = vault::EInsufficientIdle)]
fun cannot_borrow_more_than_idle() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc);
    sc.next_tx(OWNER);
    {
        let mut v = sc.take_shared<Vault<TUSDC>>();
        vault::deposit(&mut v, coin::mint_for_testing<TUSDC>(50, sc.ctx()));
        ts::return_shared(v);
    };
    sc.next_tx(AGENT);
    let mut v = sc.take_shared<Vault<TUSDC>>();
    let policy = sc.take_shared<AgentPolicy>();
    let mut clk = clock::create_for_testing(sc.ctx());
    clk.set_for_testing(0);
    let (u, r) = vault::borrow_for_supply(&mut v, &policy, &clk, 100, string::utf8(b"scallop"), sc.ctx());
    coin::burn_for_testing(u);
    vault::return_position(&mut v, r, coin::mint_for_testing<SCOIN>(1, sc.ctx()));
    abort 0
}

#[test, expected_failure(abort_code = vault::ENoSuchPosition)]
fun owner_withdraw_missing_position_aborts() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc);
    sc.next_tx(OWNER);
    let mut v = sc.take_shared<Vault<TUSDC>>();
    let cap = sc.take_from_sender<OwnerCap>();
    let scoin = vault::owner_withdraw_position<TUSDC, SCOIN>(&mut v, &cap, sc.ctx());
    coin::burn_for_testing(scoin);
    abort 0
}

#[test, expected_failure(abort_code = agent_policy::EExpired)]
fun agent_cannot_borrow_after_expiry() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc);
    sc.next_tx(OWNER);
    {
        let mut v = sc.take_shared<Vault<TUSDC>>();
        vault::deposit(&mut v, coin::mint_for_testing<TUSDC>(1000, sc.ctx()));
        ts::return_shared(v);
    };
    sc.next_tx(AGENT);
    let mut v = sc.take_shared<Vault<TUSDC>>();
    let policy = sc.take_shared<AgentPolicy>();
    let mut clk = clock::create_for_testing(sc.ctx());
    clk.set_for_testing(20_000); // policy expires at 10_000
    let (u, r) = vault::borrow_for_supply(&mut v, &policy, &clk, 100, string::utf8(b"scallop"), sc.ctx());
    coin::burn_for_testing(u);
    vault::return_position(&mut v, r, coin::mint_for_testing<SCOIN>(100, sc.ctx()));
    abort 0
}
```

- [ ] **Step 2: Run the full suite**

Run: `cd talos && sui move test`
Expected: PASS — all tests including the three new abort paths.

- [ ] **Step 3: Write the audit checklist result**

Create `talos/AUDIT.md`:

```markdown
# Talos Vault — self-audit (2026-07-10)

## Covered by tests
- Only the policy's agent can borrow (EUnauthorizedAgent).
- Borrowing bounded by per_tx_cap (EOverPerTxCap) and idle balance (EInsufficientIdle).
- Only allowlisted position types can enter the vault (EPositionNotAllowed).
- Only the matching OwnerCap can withdraw (ENotOwner).
- Revoke (panic freeze) and expiry both lock the agent out (ERevoked, EExpired).
- Withdrawing an absent position aborts (ENoSuchPosition).

## Reviewed by inspection
- BorrowReceipt has no abilities → a borrow cannot be dropped/stored; the PTB must call a
  return_* that consumes it, so funds/positions cannot leave the vault→venue→vault loop.
- Vault has `key` only (no `store`) → cannot be wrapped/transferred out of shared ownership.
- Arithmetic: principal decrement is floored at 0; balance split aborts on underflow natively.

## Known / accepted limitations (documented for judges)
- No on-chain value check that a returned position is worth the borrowed USDC (needs an
  oracle). Contained by: protocol allowlist, position-type allowlist, small per-policy caps,
  and Daedalus scoring every move. Oracle value-check is future hardening.
- Owner escape hatch on a dead agent yields the raw sCoin (redeem off-chain), by design.
```

- [ ] **Step 4: Commit**

```bash
git add talos/tests/vault_tests.move talos/AUDIT.md
git commit -m "test(vault): adversarial abort paths + self-audit checklist"
```

---

### Task 8: Build & publish to Sui mainnet (operational — requires the user)

> This task spends real mainnet gas and needs the deployer's mainnet key + SUI. Do it with the user present. Confirm the exact mainnet USDC type and the three lending-receipt (sCoin) types before creating any real vault.

**Files:**
- Modify: `talos/DEPLOYMENT.md` (append the mainnet record)

- [ ] **Step 1: Full test + build**

Run: `cd talos && sui move test && sui move build`
Expected: all tests PASS; build succeeds with no warnings on `vault.move`.

- [ ] **Step 2: Confirm mainnet env**

Run: `sui client active-env && sui client active-address && sui client gas`
Expected: `mainnet`, the deployer address, and ≥ ~0.5 SUI for gas. Switch with `sui client switch --env mainnet` if needed.

- [ ] **Step 3: Publish**

Run: `sui client publish --gas-budget 500000000`
Expected: success; record the new **Package ID** and the `agent_policy`/`reputation`/`vault` module ids from the output.

- [ ] **Step 4: Record the deployment**

Append to `talos/DEPLOYMENT.md` a "## Sui Mainnet — vault release" table with the new Package ID, deployer, and date. Note that `create_policy`, `create_reputation`, and `create_vault<USDC>` are called per user by the app (Enoki plan), not here.

- [ ] **Step 5: Commit**

```bash
git add talos/DEPLOYMENT.md
git commit -m "chore(deploy): publish policy+reputation+vault package to mainnet"
```

---

## Self-Review

**Spec coverage:**
- Object model (Vault composes with agent_policy, OwnerCap-governed) → Task 2.
- Positions owned at all times via dynamic fields → Tasks 3–4.
- Hot-potato atomic rebalance (supply + unwind) → Tasks 3–4.
- Deposit → Task 2; owner withdraw idle + raw position → Task 5; panic = revoke + withdraw → Task 6 (freeze) and the frontend composes the combined PTB (wallet-UX plan).
- Agent-offline fallback (raw position withdrawal) → Task 5 (`owner_withdraw_position`).
- `assert_active` + repurposed budget (no decrement) → Task 1.
- Security model / accepted oracle limitation → Task 7 (`AUDIT.md`).
- Deploy → Task 8.

**Placeholder scan:** none — every code and test step is complete.

**Type consistency:** `Vault<S>`, `BorrowReceipt`, `PosKey`, and the function signatures (`borrow_for_supply`, `return_position`, `borrow_position`, `return_usdc`, `owner_withdraw_usdc`, `owner_withdraw_position`, `assert_active`, `owner_cap_policy_id`) are used identically across tasks. Error constants (`EWrongVault=1`, `EPositionNotAllowed=2`, `ENotOwner=3`, `EInsufficientIdle=4`, `ENoSuchPosition=5`) are referenced consistently in tests.

**Note for the implementer:** if `sui move test` reports a missing `use` (e.g. `object`, `transfer`), add the obvious framework import at the top of the file — the Sui prelude covers most but not all of these depending on toolchain version.
