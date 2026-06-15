import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })
const KEY = process.env.MISTRAL_API_KEY as string
const MODEL = process.env.TALOS_LLM_MODEL ?? "mistral-large-latest"
async function call(i: number) {
  const t = Date.now()
  try {
    const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ model: MODEL, max_tokens: 50, response_format: { type: "json_object" }, messages: [{ role: "user", content: 'Reply ONLY JSON {"n":' + i + '}' }] }),
    })
    const body = await r.text()
    console.log(`#${i} status=${r.status} (${Date.now() - t}ms) ${r.ok ? "OK " + body.slice(0, 60) : "FAIL " + body.slice(0, 160)}`)
  } catch (e: any) {
    console.log(`#${i} THREW ${String(e?.message ?? e).slice(0, 120)}`)
  }
}
async function main() {
  for (let i = 1; i <= 6; i++) { await call(i); await new Promise((r) => setTimeout(r, 800)) }
}
main().then(() => process.exit(0))
