import type { Apy } from "./yields"

export type Decision = {
  action: "HOLD" | "REBALANCE"
  target: string
  amount: number
  reasoning: string
  by: "heuristic" | "claude"
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

/** Optional LLM brain — used when ANTHROPIC_API_KEY is set; falls back to heuristic on any error. */
export async function decideWithClaude(
  current: string,
  apys: Apy[],
  policy: PolicyView,
  chunk: number,
): Promise<Decision | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  const maxAmount = Math.min(chunk, policy.per_tx_cap, policy.remaining_budget)
  const prompt =
    `You are Icarus, an autonomous yield agent on Sui. Current position: ${current}. ` +
    `Live USDC supply APYs: ${JSON.stringify(apys)}. ` +
    `Your on-chain policy caps you at per_tx_cap=${policy.per_tx_cap}, remaining_budget=${policy.remaining_budget}. ` +
    `Decide whether to HOLD or REBALANCE to the highest-yielding protocol. ` +
    `Reply with ONLY JSON: {"action":"HOLD"|"REBALANCE","target":"<protocol>","amount":<int <= ${maxAmount}>,"reasoning":"<short>"}.`
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
    })
    const j: any = await r.json()
    const text: string = j?.content?.[0]?.text ?? ""
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return null
    const d = JSON.parse(m[0])
    return {
      action: d.action === "REBALANCE" ? "REBALANCE" : "HOLD",
      target: String(d.target ?? current),
      amount: Math.max(0, Math.min(Number(d.amount) || 0, maxAmount)),
      reasoning: String(d.reasoning ?? "").slice(0, 200),
      by: "claude",
    }
  } catch {
    return null
  }
}
