#[test_only]
module talos::vault_tests;

use std::string;
use std::type_name;
use sui::clock;
use sui::coin;
use sui::test_scenario as ts;
use talos::agent_policy::{Self, AgentPolicy, OwnerCap};
use talos::vault::{Self, Vault};

const OWNER: address = @0xA;
const AGENT: address = @0xB;
const STRANGER: address = @0xC;

/// test-only marker types for the stable coin and a lending receipt
public struct TUSDC has drop {}
public struct SCOIN has drop {}

fun protos(): vector<std::string::String> {
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
