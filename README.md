# TALOS

> Autonomous yield management, proved on chain.

Talos is a swarm of two autonomous AI agents that manage real USDC on **Sui mainnet** under an on-chain policy they physically cannot break, with a second agent independently grading every decision on-chain.

**Live dashboard:** https://talos-swarm-d8b4e2.centralindia.cloudapp.azure.com/
· **Demo video:** https://www.youtube.com/watch?v=LUMQi-ISaKs
· **Track:** Sui Overflow 2026, Agentic Web

---

## The problem

Stablecoin lending rates on Sui move every block. Most people park funds in one protocol and leave yield on the table, because nobody can watch a dozen dashboards twenty-four hours a day. The obvious fix is an AI agent, but handing an autonomous agent real money is terrifying: what stops it draining the wallet, chasing a bad venue, or acting on a hallucinated decision?

Talos answers that with two agents and an on-chain guardrail the agent cannot override.

## The two agents

- **Icarus (executor).** Reads live USDC lending rates across Scallop, Navi, and Kai (plus SUI momentum) every thirty seconds, picks the best venue with an LLM (`gpt-oss-120b`), and rebalances real USDC on mainnet. It can only ever spend through the on-chain Move policy.
- **Daedalus (critic).** Independently re-judges every move Icarus makes, scores it from 0 to 100 with a reason, and writes that verdict to an on-chain reputation ledger signed by its **own separate key**. No agent trusts another. The chain is the referee.

## How one cycle works

1. **Sense.** Read live APYs across every venue and SUI's momentum.
2. **Decide.** The `gpt-oss-120b` model picks the highest-yield venue; an anti-churn threshold blocks pointless moves.
3. **Authorize.** The on-chain Move policy checks budget, allowlist, and expiry, inside the same Programmable Transaction Block as the trade.
4. **Execute.** One atomic PTB carries the policy check and the rebalance together. If any bound is exceeded, the whole transaction reverts.
5. **Log.** The decision and its reasoning are written to Walrus, content-addressed and public.
6. **Rate.** Daedalus scores the move on-chain. The loop repeats in thirty seconds.

## Why it leverages Sui deeply

This is a custom on-chain system, not a wrapper around an RPC:

- **Custom Move contracts.** Two bespoke modules deployed on mainnet: `talos::agent_policy` (the leash) and `talos::reputation` (the critic ledger).
- **Object-capability security.** The policy is a shared object; the human owner holds an `OwnerCap` capability object and can revoke, top up, or extend at any time. The agent owns nothing that can bypass it.
- **Atomic Programmable Transaction Blocks.** The policy check and the real redeem, swap, and supply run as one atomic transaction, so a violated bound reverts the entire rebalance.
- **On-chain reputation.** A second shared object accrues a tamper-proof, critic-signed track record.
- **Walrus.** Verifiable, content-addressed agent memory: every decision is stored and publicly retrievable.
- **Shared objects and on-chain events** form a permanent, queryable activity log that powers the dashboard.

## On-chain (Sui mainnet)

| Artifact | Address |
| --- | --- |
| Package (`agent_policy` + `reputation`) | [`0x75b7f5d2926f333d8849726655904111420d4f86acb2578274b31338bcf8142c`](https://suiscan.xyz/mainnet/object/0x75b7f5d2926f333d8849726655904111420d4f86acb2578274b31338bcf8142c) |
| AgentPolicy (the on-chain leash) | [`0x16d5c0c966ac8d78992908ada307dc5991fc76ce4915ae499fa91cfe11c1b5b6`](https://suiscan.xyz/mainnet/object/0x16d5c0c966ac8d78992908ada307dc5991fc76ce4915ae499fa91cfe11c1b5b6) |
| Reputation ledger | [`0x3928f7b3ab4114a44b0f533ed627c247994894985c91cf05464ab36d161f072a`](https://suiscan.xyz/mainnet/object/0x3928f7b3ab4114a44b0f533ed627c247994894985c91cf05464ab36d161f072a) |
| Icarus (executor) | [`0x1f0455e5fb79711dff710e04aa9a7ea4dbb582b77a3a5452fcc61be1cb80ea7f`](https://suiscan.xyz/mainnet/account/0x1f0455e5fb79711dff710e04aa9a7ea4dbb582b77a3a5452fcc61be1cb80ea7f) |
| Daedalus (critic) | [`0x4f11c87bbd643a06ff73b88fc10faff62d47142dc0edf5ae3783bcc0ded9f2ea`](https://suiscan.xyz/mainnet/account/0x4f11c87bbd643a06ff73b88fc10faff62d47142dc0edf5ae3783bcc0ded9f2ea) |

Browse any of these on [Suiscan](https://suiscan.xyz/mainnet). A rebalance is signed by Icarus; its rating is signed by Daedalus. The two are different keys, so the independent critique is verifiable, not just claimed.

## Stack

- **Move** for the on-chain contracts (policy + reputation).
- **Next.js + React** dashboard (live event stream, decision feed, on-chain proof links, a 3D voxel view of the swarm).
- **LLM:** `gpt-oss-120b`.
- **Sui ecosystem:** Walrus (agent memory), 7k aggregator (USDC/SUI swaps), Scallop / Navi / Kai (USDC lending).
- **Runtime:** a always-on process swarm on an Azure VM, thirty-second tick, surviving reboots.

## Repository layout

```
talos/sources/        Move contracts: agent_policy.move, reputation.move
lib/talos/            agent runtime: yields, decide, icarus, daedalus, chain, walrus, venues
scripts/              run-swarm, create-policy, and on-chain setup scripts
app/                  Next.js app: landing + /dashboard + /api/talos/* routes
components/           dashboard UI, including the voxel workshop
```

## Notes

The dashboard reads live on-chain state and the agent's decision feed. Every action it shows links to its Suiscan transaction and its Walrus record, so anything Talos claims can be checked directly on-chain.
