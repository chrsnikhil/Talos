#[test_only]
module talos::reputation_tests;

use std::string;
use sui::test_scenario as ts;
use talos::reputation::{Self, Reputation};

const CRITIC: address = @0xD;
const SUBJECT: address = @0xB;
const STRANGER: address = @0xC;

fun setup(sc: &mut ts::Scenario) {
    reputation::create_reputation(SUBJECT, sc.ctx());
}

#[test]
fun ratings_accumulate_average() {
    let mut sc = ts::begin(CRITIC);
    setup(&mut sc);

    sc.next_tx(CRITIC);
    {
        let mut rep = sc.take_shared<Reputation>();
        reputation::submit_rating(&mut rep, 80, string::utf8(b"justified"), string::utf8(b"tx1"), sc.ctx());
        reputation::submit_rating(&mut rep, 60, string::utf8(b"risky"), string::utf8(b"tx2"), sc.ctx());
        assert!(rep.total() == 2, 0);
        assert!(rep.average_x100() == 7000, 1); // (80+60)/2 = 70.00
        ts::return_shared(rep);
    };
    sc.end();
}

#[test, expected_failure(abort_code = reputation::ENotCritic)]
fun only_critic_can_rate() {
    let mut sc = ts::begin(CRITIC);
    setup(&mut sc);

    sc.next_tx(STRANGER);
    let mut rep = sc.take_shared<Reputation>();
    reputation::submit_rating(&mut rep, 90, string::utf8(b"x"), string::utf8(b"tx"), sc.ctx());
    abort 0
}

#[test, expected_failure(abort_code = reputation::EScoreTooHigh)]
fun score_must_be_bounded() {
    let mut sc = ts::begin(CRITIC);
    setup(&mut sc);

    sc.next_tx(CRITIC);
    let mut rep = sc.take_shared<Reputation>();
    reputation::submit_rating(&mut rep, 101, string::utf8(b"x"), string::utf8(b"tx"), sc.ctx());
    abort 0
}
