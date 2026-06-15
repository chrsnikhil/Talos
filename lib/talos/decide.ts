import type { Apy } from "./yields"
import { thinkJson, llmInfo } from "./llm"

export type Decision = {
  action: "HOLD" | "REBALANCE"
  target: string
  amount: number
  reasoning: string
  by: "heuristic" | "claude" | "mistral" | "groq"
}

type PolicyView = { remaining_budget: number; per_tx_cap: number }

const THRESHOLD_PP = Number(process.env.TALOS_THRESHOLD_PP ?? 0.25) // move if best beats current by >= this

/** Deterministic fallback brain — picks the best APY, respects the leash. */
export function decide(current: string, apys: Apy[], policy: PolicyView, chunk: number): Decision {
  const best = [...apys].sort((a, b) => b.apy - a.apy)[0]
  const cur = apys.find((a) => a.protocol === current) ?? best
  if (best.protocol !== current && best.apy - cur.apy >= THRESHOLD_PP) {
    const amount = Math.min(chunk, policy.per_tx_cap, policy.remaining_budget)
    if (amount > 0) {
      return {
        action: "REBALANCE",
        target: best.protocol,
        amount,
        reasoning: `${best.protocol} ${best.apy}% beats ${current} ${cur.apy}% by ${(best.apy - cur.apy).toFixed(2)}pp`,
        by: "heuristic",
      }
    }
  }
  return {
    action: "HOLD",
    target: current,
    amount: 0,
    reasoning: `holding ${current} (${cur.apy}%); best is ${best.protocol} ${best.apy}%`,
    by: "heuristic",
  }
}

/** LLM brain — used when an LLM provider key is set (Mistral or Claude); returns null
 *  (so the caller uses the heuristic) when no provider is configured or the call fails. */
export async function decideWithLLM(
  current: string,
  apys: Apy[],
  policy: PolicyView,
  chunk: number,
): Promise<Decision | null> {
  const info = llmInfo()
  if (info.provider === "none") return null
  const maxAmount = Math.min(chunk, policy.per_tx_cap, policy.remaining_budget)
  const prompt =
    `You are Icarus, an autonomous yield agent on Sui. Current position: ${current}. ` +
    `Live USDC supply APYs: ${JSON.stringify(apys)}. ` +
    `Your on-chain policy caps you at per_tx_cap=${policy.per_tx_cap}, remaining_budget=${policy.remaining_budget}. ` +
    `Only rebalance if a protocol clearly beats your current one by at least ${THRESHOLD_PP} percentage points (avoid churn). ` +
    `Decide whether to HOLD or REBALANCE to the highest-yielding protocol. ` +
    `Reply with ONLY JSON: {"action":"HOLD"|"REBALANCE","target":"<protocol>","amount":<int <= ${maxAmount}>,"reasoning":"<short>"}.`
  const d = await thinkJson(prompt)
  if (!d) return null

  const reasoning = String(d.reasoning ?? "").slice(0, 200)
  const target = String(d.target ?? current)

  // Ground the LLM against the data. A model can emit a contradictory or hallucinated
  // decision (e.g. action=REBALANCE with target=current, or a protocol not in the survey),
  // and acting on that moves real funds for no reason. So a REBALANCE is only honored when
  // it is genuinely justified: a known, different protocol that actually beats the current
  // one by the threshold. Anything else collapses to a safe HOLD — the LLM's reasoning is
  // advisory, the numbers are the guardrail.
  const cur = apys.find((a) => a.protocol === current)
  const tgt = apys.find((a) => a.protocol === target)
  const justified =
    d.action === "REBALANCE" &&
    !!tgt &&
    target !== current &&
    (!cur || tgt.apy - cur.apy >= THRESHOLD_PP)

  if (justified) {
    const amount = Math.max(0, Math.min(Number(d.amount) || 0, maxAmount))
    if (amount > 0) return { action: "REBALANCE", target, amount, reasoning, by: info.provider }
  }
  return {
    action: "HOLD",
    target: current,
    amount: 0,
    reasoning: reasoning || `holding ${current}`,
    by: info.provider,
  }
}
