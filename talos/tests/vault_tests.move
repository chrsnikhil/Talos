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
