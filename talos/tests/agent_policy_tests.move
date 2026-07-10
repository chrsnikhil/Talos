#[test_only]
module talos::agent_policy_tests;

use std::string::{Self, String};
use sui::clock;
use sui::test_scenario as ts;
use talos::agent_policy::{Self, AgentPolicy, OwnerCap};

const OWNER: address = @0xA;
const AGENT: address = @0xB;
const STRANGER: address = @0xC;

fun protos(): vector<String> {
    vector[string::utf8(b"suilend"), string::utf8(b"scallop")]
}

/// Create a policy as OWNER with the given bounds; OwnerCap ends up with OWNER.
fun setup(sc: &mut ts::Scenario, budget: u64, per_tx_cap: u64, expires_at_ms: u64) {
    let ctx = sc.ctx();
    let cap = agent_policy::create_policy(AGENT, budget, per_tx_cap, protos(), expires_at_ms, ctx);
    transfer::public_transfer(cap, OWNER);
}

#[test]
fun authorize_happy_path() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc, 1000, 500, 10_000);

    sc.next_tx(AGENT);
    {
        let mut policy = sc.take_shared<AgentPolicy>();
        let mut clk = clock::create_for_testing(sc.ctx());
        clk.set_for_testing(0);

        agent_policy::authorize_spend(&mut policy, &clk, 300, string::utf8(b"suilend"), sc.ctx());
        assert!(policy.remaining_budget() == 700, 0);
        assert!(policy.total_spent() == 300, 1);

        // a second spend keeps decrementing
        agent_policy::authorize_spend(&mut policy, &clk, 200, string::utf8(b"scallop"), sc.ctx());
        assert!(policy.remaining_budget() == 500, 2);

        clk.destroy_for_testing();
        ts::return_shared(policy);
    };
    sc.end();
}

#[test]
fun owner_can_revoke_topup_extend() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc, 1000, 500, 10_000);

    sc.next_tx(OWNER);
    {
        let mut policy = sc.take_shared<AgentPolicy>();
        let cap = sc.take_from_sender<OwnerCap>();

        agent_policy::top_up(&mut policy, &cap, 500);
        assert!(policy.remaining_budget() == 1500, 0);

        agent_policy::extend_expiry(&mut policy, &cap, 99_999);
        assert!(policy.expires_at_ms() == 99_999, 1);

        agent_policy::revoke(&mut policy, &cap);
        assert!(policy.is_revoked(), 2);

        sc.return_to_sender(cap);
        ts::return_shared(policy);
    };
    sc.end();
}

#[test, expected_failure(abort_code = agent_policy::EUnauthorizedAgent)]
fun stranger_cannot_spend() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc, 1000, 500, 10_000);

    sc.next_tx(STRANGER);
    let mut policy = sc.take_shared<AgentPolicy>();
    let mut clk = clock::create_for_testing(sc.ctx());
    clk.set_for_testing(0);
    agent_policy::authorize_spend(&mut policy, &clk, 100, string::utf8(b"suilend"), sc.ctx());
    abort 0
}

#[test, expected_failure(abort_code = agent_policy::EOverPerTxCap)]
fun aborts_over_per_tx_cap() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc, 1000, 500, 10_000);

    sc.next_tx(AGENT);
    let mut policy = sc.take_shared<AgentPolicy>();
    let mut clk = clock::create_for_testing(sc.ctx());
    clk.set_for_testing(0);
    agent_policy::authorize_spend(&mut policy, &clk, 600, string::utf8(b"suilend"), sc.ctx());
    abort 0
}

#[test, expected_failure(abort_code = agent_policy::EOverBudget)]
fun aborts_over_budget() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc, 1000, 2000, 10_000); // high per-tx cap, low budget

    sc.next_tx(AGENT);
    let mut policy = sc.take_shared<AgentPolicy>();
    let mut clk = clock::create_for_testing(sc.ctx());
    clk.set_for_testing(0);
    agent_policy::authorize_spend(&mut policy, &clk, 1500, string::utf8(b"suilend"), sc.ctx());
    abort 0
}

#[test, expected_failure(abort_code = agent_policy::EExpired)]
fun aborts_when_expired() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc, 1000, 500, 100);

    sc.next_tx(AGENT);
    let mut policy = sc.take_shared<AgentPolicy>();
    let mut clk = clock::create_for_testing(sc.ctx());
    clk.set_for_testing(200); // past expiry
    agent_policy::authorize_spend(&mut policy, &clk, 100, string::utf8(b"suilend"), sc.ctx());
    abort 0
}

#[test, expected_failure(abort_code = agent_policy::EProtocolNotAllowed)]
fun aborts_protocol_not_allowed() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc, 1000, 500, 10_000);

    sc.next_tx(AGENT);
    let mut policy = sc.take_shared<AgentPolicy>();
    let mut clk = clock::create_for_testing(sc.ctx());
    clk.set_for_testing(0);
    agent_policy::authorize_spend(&mut policy, &clk, 100, string::utf8(b"deepbook"), sc.ctx());
    abort 0
}

#[test, expected_failure(abort_code = agent_policy::ERevoked)]
fun aborts_when_revoked() {
    let mut sc = ts::begin(OWNER);
    setup(&mut sc, 1000, 500, 10_000);

    // owner revokes
    sc.next_tx(OWNER);
    {
        let mut policy = sc.take_shared<AgentPolicy>();
        let cap = sc.take_from_sender<OwnerCap>();
        agent_policy::revoke(&mut policy, &cap);
        sc.return_to_sender(cap);
        ts::return_shared(policy);
    };

    // agent tries to spend after revocation
    sc.next_tx(AGENT);
    let mut policy = sc.take_shared<AgentPolicy>();
    let mut clk = clock::create_for_testing(sc.ctx());
    clk.set_for_testing(0);
    agent_policy::authorize_spend(&mut policy, &clk, 100, string::utf8(b"suilend"), sc.ctx());
    abort 0
}

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

#[test, expected_failure(abort_code = agent_policy::EOverPerTxCap, location = talos::agent_policy)]
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

#[test, expected_failure(abort_code = agent_policy::EUnauthorizedAgent, location = talos::agent_policy)]
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
