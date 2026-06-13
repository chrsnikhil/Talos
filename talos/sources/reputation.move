/// On-chain reputation for the swarm.
///
/// Daedalus (the critic) independently re-evaluates each of Icarus's decisions
/// and records a `CriticRating` on-chain. Ratings accrue into a shared
/// `Reputation` object — a tamper-proof, portable track record that no agent
/// can forge for another (only the designated critic can submit).
module talos::reputation;

use std::string::String;
use sui::event;

const EScoreTooHigh: u64 = 1;
const ENotCritic: u64 = 2;

/// Shared reputation ledger for one subject (the rated agent), maintained by one critic.
public struct Reputation has key {
    id: UID,
    subject: address,
    critic: address,
    total: u64,
    score_sum: u64,
}

public struct ReputationCreated has copy, drop { reputation_id: ID, subject: address, critic: address }

public struct CriticRating has copy, drop {
    reputation_id: ID,
    subject: address,
    critic: address,
    score: u8,        // 0..=100
    verdict: String,  // short human verdict
    ref_tx: String,   // the Icarus tx digest being judged
    avg_x100: u64,    // running average score * 100
}

/// Create and share a reputation ledger; the caller becomes the critic.
public fun create_reputation(subject: address, ctx: &mut TxContext): ID {
    let rep = Reputation { id: object::new(ctx), subject, critic: ctx.sender(), total: 0, score_sum: 0 };
    let id = object::id(&rep);
    event::emit(ReputationCreated { reputation_id: id, subject, critic: ctx.sender() });
    transfer::share_object(rep);
    id
}

entry fun create_reputation_entry(subject: address, ctx: &mut TxContext) {
    create_reputation(subject, ctx);
}

/// Submit a rating for one of the subject's decisions. Only the critic may call.
public fun submit_rating(rep: &mut Reputation, score: u8, verdict: String, ref_tx: String, ctx: &TxContext) {
    assert!(ctx.sender() == rep.critic, ENotCritic);
    assert!(score <= 100, EScoreTooHigh);
    rep.total = rep.total + 1;
    rep.score_sum = rep.score_sum + (score as u64);
    event::emit(CriticRating {
        reputation_id: object::id(rep),
        subject: rep.subject,
        critic: rep.critic,
        score,
        verdict,
        ref_tx,
        avg_x100: rep.score_sum * 100 / rep.total,
    });
}

// === Views ===
public fun total(r: &Reputation): u64 { r.total }
public fun average_x100(r: &Reputation): u64 { if (r.total == 0) 0 else r.score_sum * 100 / r.total }
public fun subject(r: &Reputation): address { r.subject }
public fun critic(r: &Reputation): address { r.critic }
