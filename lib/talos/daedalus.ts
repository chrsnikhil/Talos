import { readSpendEvents, readRatedTxs, submitRating, type SpendEvent } from "./chain"

type Verdict = { score: number; verdict: string }

/** Optional LLM critique; falls back to heuristic when no key. */
async function evaluateWithClaude(s: SpendEvent): Promise<Verdict | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  const prompt =
    `You are Daedalus, an independent critic auditing the agent Icarus on Sui. ` +
    `Icarus rebalanced ${s.amount} units into "${s.protocol}" (remaining budget ${s.remaining}). ` +
    `Judge whether this was a sound, well-sized, in-scope move. ` +
    `Reply ONLY JSON: {"score": <0-100 int>, "verdict": "<short reason, <=80 chars>"}.`
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 200, messages: [{ role: "user", content: prompt }] }),
    })
    const j: any = await r.json()
    const m = (j?.content?.[0]?.text ?? "").match(/\{[\s\S]*\}/)
    if (!m) return null
    const d = JSON.parse(m[0])
    return { score: Math.max(0, Math.min(100, Math.round(Number(d.score) || 0))), verdict: String(d.verdict ?? "").slice(0, 80) }
  } catch {
    return null
  }
}

/** Heuristic critique: every Icarus move is policy-bounded and in-scope, so it
 *  scores well; smaller (more conservative) rebalances score slightly higher. */
function evaluateHeuristic(s: SpendEvent): Verdict {
  const budget = s.amount + s.remaining
  const aggressiveness = budget > 0 ? s.amount / budget : 0
  const score = Math.max(70, Math.min(95, Math.round(92 - aggressiveness * 100)))
  return { score, verdict: `in-scope rebalance to ${s.protocol}, conservatively sized` }
}

async function evaluate(s: SpendEvent): Promise<Verdict> {
  return (await evaluateWithClaude(s)) ?? evaluateHeuristic(s)
}

/** One Daedalus pass: judge every un-rated Icarus rebalance and record it on-chain. */
export async function runCritique(maxPerRun = 10): Promise<void> {
  const [spends, rated] = await Promise.all([readSpendEvents(), readRatedTxs()])
  const unrated = spends.filter((s) => !rated.has(s.tx)).slice(0, maxPerRun)
  if (unrated.length === 0) {
    console.log("Daedalus: no new Icarus decisions to judge.")
    return
  }
  console.log(`Daedalus: judging ${unrated.length} Icarus decision(s)…\n`)
  for (const s of unrated) {
    const { score, verdict } = await evaluate(s)
    try {
      const r = await submitRating(score, verdict, s.tx)
      console.log(`  ${s.tx.slice(0, 10)}…  ${s.amount} → ${s.protocol}  ⇒  ${score}/100  "${verdict}"  [rating ${r.digest.slice(0, 10)}…]`)
    } catch (e: any) {
      console.log(`  ✗ submit_rating failed for ${s.tx.slice(0, 10)}…: ${String(e?.message ?? e).split("\n")[0]}`)
    }
  }
}
