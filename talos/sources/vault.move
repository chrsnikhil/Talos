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
