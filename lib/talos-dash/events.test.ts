import { test } from "node:test"
import assert from "node:assert/strict"
import { decisionToEvent, activityToEvent, mergeEvents, type Decision, type Ev } from "./events"

test("decisionToEvent maps a REBALANCE to an icarus event with tx explorer + station", () => {
  const d: Decision = {
    n: 5, ts: "2026-06-16T04:07:50.000Z", apys: [{ protocol: "navi", apy: 6.28 }],
    from: "sui", action: "REBALANCE", target: "navi", amount: 100,
    reasoning: "navi > sui", by: "groq", txDigest: "ABC", blobId: "BLOB",
  }
  const e = decisionToEvent(d)
  assert.equal(e.agent, "icarus")
  assert.equal(e.type, "REBALANCE")
  assert.equal(e.id, "dec-5")
  assert.equal(e.station, "navi")
  assert.equal(e.txHash, "ABC")
  assert.equal(e.explorer, "https://suiscan.xyz/mainnet/tx/ABC")
})

test("decisionToEvent maps a HOLD to walrus explorer when no tx", () => {
  const d: Decision = {
    n: 6, ts: "2026-06-16T04:08:00.000Z", apys: [], from: "navi",
    action: "HOLD", target: "navi", amount: 0, reasoning: "holding", by: "groq",
    txDigest: null, blobId: "B2",
  }
  const e = decisionToEvent(d)
  assert.equal(e.type, "HOLD")
  assert.equal(e.station, undefined)
  assert.equal(e.explorer, "https://aggregator.walrus-testnet.walrus.space/v1/blobs/B2")
})

test("activityToEvent routes CriticRating to daedalus, SpendAuthorized to icarus", () => {
  const rating: Ev = { type: "CriticRating", tx: "T1", timestampMs: 1, data: { score: 85, verdict: "ok" } }
  const spend: Ev = { type: "SpendAuthorized", tx: "T2", timestampMs: 2, data: { amount: 100, protocol: "navi", remaining: 9000 } }
  const r = activityToEvent(rating)
  const s = activityToEvent(spend)
  assert.equal(r.agent, "daedalus")
  assert.equal(r.type, "RATING")
  assert.equal(r.station, "policy")
  assert.equal(s.agent, "icarus")
  assert.equal(s.type, "SPEND")
  assert.equal(s.station, "navi")
})

test("mergeEvents dedupes by id and sorts ascending by timestamp", () => {
  const d: Decision = { n: 1, ts: "2026-06-16T00:00:02.000Z", apys: [], from: "navi", action: "HOLD", target: "navi", amount: 0, reasoning: "x", by: "groq", txDigest: null, blobId: null }
  const a: Ev = { type: "SpendAuthorized", tx: "T", timestampMs: 1000, data: { amount: 1, protocol: "navi", remaining: 0 } }
  const merged = mergeEvents([d, d], [a])
  assert.equal(merged.length, 2)
  assert.ok(merged[0].timestamp <= merged[1].timestamp)
})
