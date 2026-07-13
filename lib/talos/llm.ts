// Provider-agnostic LLM brain for the Talos agents (Icarus + Daedalus).
//
// The agents only ever ask the model for a small, strict JSON object (a HOLD/REBALANCE
// decision, or a 0–100 critique). That makes the choice of provider an env decision, not
// a code one: set MISTRAL_API_KEY to think with Mistral, or ANTHROPIC_API_KEY to think
// with Claude. If neither key is present the caller falls back to its deterministic
// heuristic, so an unattended loop never stalls on a missing key or an API hiccup.
//
// Override the model per provider with TALOS_LLM_MODEL.

export type Provider = "groq" | "mistral" | "claude" | "none"
export type LLMInfo = { provider: Provider; model: string }

// Claude path uses a Talos-specific key (TALOS_ANTHROPIC_API_KEY), NOT the generic
// ANTHROPIC_API_KEY: an ambient ANTHROPIC_API_KEY in the environment may not be a usable
// raw API key, which would otherwise mislabel the brain as "claude" while every call
// quietly fell back to the heuristic. Requiring the Talos-specific var makes it explicit.
function groqKey() {
  return process.env.GROQ_API_KEY
}
function mistralKey() {
  return process.env.MISTRAL_API_KEY
}
function claudeKey() {
  return process.env.TALOS_ANTHROPIC_API_KEY
}

/** Which brain is active. TALOS_LLM_PROVIDER forces a choice; otherwise auto-detect by
 *  which key is present (Groq wins — its free tier has no aggressive rate limit, so an
 *  unattended 30s loop never degrades to the heuristic on a burst). Returns "none" →
 *  caller uses the heuristic. */
export function llmInfo(): LLMInfo {
  const forced = (process.env.TALOS_LLM_PROVIDER ?? "").toLowerCase()
  if (forced === "groq" && groqKey()) return { provider: "groq", model: process.env.TALOS_LLM_MODEL ?? "openai/gpt-oss-120b" }
  if (forced === "mistral" && mistralKey()) return { provider: "mistral", model: process.env.TALOS_LLM_MODEL ?? "mistral-large-latest" }
  if (forced === "claude" && claudeKey()) return { provider: "claude", model: process.env.TALOS_LLM_MODEL ?? "claude-sonnet-4-6" }
  if (forced === "none") return { provider: "none", model: "" }
  if (groqKey()) return { provider: "groq", model: process.env.TALOS_LLM_MODEL ?? "openai/gpt-oss-120b" }
  if (mistralKey()) return { provider: "mistral", model: process.env.TALOS_LLM_MODEL ?? "mistral-large-latest" }
  if (claudeKey()) return { provider: "claude", model: process.env.TALOS_LLM_MODEL ?? "claude-sonnet-4-6" }
  return { provider: "none", model: "" }
}

function extractJson(text: string): any | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0])
  } catch {
    return null
  }
}

/** Ask the active provider for a single JSON object. Returns the parsed object,
 *  or null on any error / no provider so the caller can fall back to its heuristic. */
export async function thinkJson(prompt: string, maxTokens = 300): Promise<any | null> {
  const { provider, model } = llmInfo()
  if (provider === "none") return null

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  // One request attempt. Returns {text} on success, or {retry:true} when the provider is
  // rate-limited / briefly unavailable (so we back off and try again instead of dropping
  // straight to the heuristic), or {text:null} on a hard failure.
  async function attempt(): Promise<{ text: string | null; retry: boolean }> {
    try {
      // Groq and Mistral are both OpenAI-compatible chat-completions endpoints.
      if (provider === "groq" || provider === "mistral") {
        const url =
          provider === "groq"
            ? "https://api.groq.com/openai/v1/chat/completions"
            : "https://api.mistral.ai/v1/chat/completions"
        const key = provider === "groq" ? groqKey() : mistralKey()
        const r = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }],
          }),
        })
        if (r.status === 429 || r.status >= 500) return { text: null, retry: true }
        const j: any = await r.json()
        return { text: j?.choices?.[0]?.message?.content ?? null, retry: false }
      }
      // claude
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": claudeKey() as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
      })
      if (r.status === 429 || r.status >= 500) return { text: null, retry: true }
      const j: any = await r.json()
      return { text: j?.content?.[0]?.text ?? null, retry: false }
    } catch {
      return { text: null, retry: true } // network blip — worth one more try
    }
  }

  // Free-tier keys (e.g. Mistral) rate-limit aggressively but recover within ~1s, so a
  // couple of short backoffs keep the LLM brain "on" instead of silently degrading to
  // the heuristic on every burst.
  const backoffs = [1500, 3000, 5000]
  for (let i = 0; i <= backoffs.length; i++) {
    const { text, retry } = await attempt()
    if (text) return extractJson(text)
    if (!retry) return null
    if (i < backoffs.length) await sleep(backoffs[i])
  }
  return null
}
