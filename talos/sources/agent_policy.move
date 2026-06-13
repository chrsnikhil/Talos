/// The on-chain leash for a Talos agent.
///
/// An `AgentPolicy` is a shared object that grants a single agent address a
/// capped budget, a protocol allowlist, and an expiry. The agent can only ever
/// spend through `authorize_spend`, which aborts if any bound is exceeded — so
/// even a compromised or hallucinating off-chain agent is physically incapable
/// of acting outside its leash. The owner holds an `OwnerCap` and can revoke,
/// top up, or extend the policy at any time. Every action emits an event,
/// forming a permanent on-chain activity log.
module talos::agent_policy;

use std::string::String;
use sui::clock::Clock;
use sui::event;
use sui::vec_set::{Self, VecSet};

// === Errors ===
const ERevoked: u64 = 1;
const EExpired: u64 = 2;
const EOverPerTxCap: u64 = 3;
const EOverBudget: u64 = 4;
const EProtocolNotAllowed: u64 = 5;
const ENotOwner: u64 = 6;
const EUnauthorizedAgent: u64 = 7;

// === Objects ===

/// Shared policy object. The agent never owns anything that can bypass it.
public struct AgentPolicy has key {
    id: UID,
    /// Human owner who can revoke / top up / extend.
    owner: address,
    /// The single agent address authorised to spend under this policy.
    agent: address,
    /// Remaining spendable budget, in the smallest unit of the quote coin.
    remaining_budget: u64,
    /// Maximum amount a single `authorize_spend` may move.
    per_tx_cap: u64,
    /// Allowlist of protocol identifiers (e.g. b"suilend", b"scallop").
    allowed_protocols: VecSet<String>,
    /// Unix ms after which the policy is expired.
    expires_at_ms: u64,
    /// Owner kill-switch.
    revoked: bool,
    /// Lifetime total authorised, for accounting / the dashboard.
    total_spent: u64,
}

/// Owner's capability over a specific policy. Held by the human, never the agent.
public struct OwnerCap has key, store {
    id: UID,
    policy_id: ID,
}

// === Events (on-chain activity log) ===

public struct PolicyCreated has copy, drop {
    policy_id: ID,
    owner: address,
    agent: address,
    budget: u64,
    per_tx_cap: u64,
    expires_at_ms: u64,
}

public struct SpendAuthorized has copy, drop {
    policy_id: ID,
    agent: address,
    amount: u64,
    protocol: String,
    remaining: u64,
}

public struct PolicyRevoked has copy, drop { policy_id: ID }
public struct ToppedUp has copy, drop { policy_id: ID, added: u64, remaining: u64 }
public struct ExpiryExtended has copy, drop { policy_id: ID, new_expires_at_ms: u64 }

// === Creation ===

/// Create a policy, share it, and return the `OwnerCap` to the caller.
public fun create_policy(
    agent: address,
    budget: u64,
    per_tx_cap: u64,
    protocols: vector<String>,
    expires_at_ms: u64,
    ctx: &mut TxContext,
): OwnerCap {
    let mut set = vec_set::empty<String>();
    protocols.do!(|p| if (!set.contains(&p)) set.insert(p));

    let owner = ctx.sender();
    let policy = AgentPolicy {
        id: object::new(ctx),
        owner,
        agent,
        remaining_budget: budget,
        per_tx_cap,
        allowed_protocols: set,
        expires_at_ms,
        revoked: false,
        total_spent: 0,
    };
    let policy_id = object::id(&policy);
    event::emit(PolicyCreated { policy_id, owner, agent, budget, per_tx_cap, expires_at_ms });

    transfer::share_object(policy);
    OwnerCap { id: object::new(ctx), policy_id }
}

/// Entry convenience: create a policy and send the `OwnerCap` to the caller.
entry fun create_policy_entry(
    agent: address,
    budget: u64,
    per_tx_cap: u64,
    protocols: vector<String>,
    expires_at_ms: u64,
    ctx: &mut TxContext,
) {
    let cap = create_policy(agent, budget, per_tx_cap, protocols, expires_at_ms, ctx);
    transfer::public_transfer(cap, ctx.sender());
}

// === The leash ===

/// Authorise the agent to spend `amount` against `protocol`. Aborts unless the
/// caller is the agent and every bound holds. On success, decrements the budget
/// and emits `SpendAuthorized`. Composed into the same PTB as the real
/// redeem/swap/supply, so a violation reverts the entire rebalance atomically.
public fun authorize_spend(
    policy: &mut AgentPolicy,
    clock: &Clock,
    amount: u64,
    protocol: String,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == policy.agent, EUnauthorizedAgent);
    assert!(!policy.revoked, ERevoked);
    assert!(clock.timestamp_ms() < policy.expires_at_ms, EExpired);
    assert!(amount <= policy.per_tx_cap, EOverPerTxCap);
    assert!(amount <= policy.remaining_budget, EOverBudget);
    assert!(policy.allowed_protocols.contains(&protocol), EProtocolNotAllowed);

    policy.remaining_budget = policy.remaining_budget - amount;
    policy.total_spent = policy.total_spent + amount;

    event::emit(SpendAuthorized {
        policy_id: object::id(policy),
        agent: policy.agent,
        amount,
        protocol,
        remaining: policy.remaining_budget,
    });
}

// === Owner controls ===

public fun revoke(policy: &mut AgentPolicy, cap: &OwnerCap) {
    assert_owner(policy, cap);
    policy.revoked = true;
    event::emit(PolicyRevoked { policy_id: object::id(policy) });
}

public fun top_up(policy: &mut AgentPolicy, cap: &OwnerCap, amount: u64) {
    assert_owner(policy, cap);
    policy.remaining_budget = policy.remaining_budget + amount;
    event::emit(ToppedUp { policy_id: object::id(policy), added: amount, remaining: policy.remaining_budget });
}

public fun extend_expiry(policy: &mut AgentPolicy, cap: &OwnerCap, new_expires_at_ms: u64) {
    assert_owner(policy, cap);
    policy.expires_at_ms = new_expires_at_ms;
    event::emit(ExpiryExtended { policy_id: object::id(policy), new_expires_at_ms });
}

fun assert_owner(policy: &AgentPolicy, cap: &OwnerCap) {
    assert!(cap.policy_id == object::id(policy), ENotOwner);
}

// === Views ===

public fun remaining_budget(p: &AgentPolicy): u64 { p.remaining_budget }
public fun per_tx_cap(p: &AgentPolicy): u64 { p.per_tx_cap }
public fun total_spent(p: &AgentPolicy): u64 { p.total_spent }
public fun expires_at_ms(p: &AgentPolicy): u64 { p.expires_at_ms }
public fun is_revoked(p: &AgentPolicy): bool { p.revoked }
public fun owner(p: &AgentPolicy): address { p.owner }
public fun agent(p: &AgentPolicy): address { p.agent }
public fun allows(p: &AgentPolicy, protocol: &String): bool { p.allowed_protocols.contains(protocol) }
