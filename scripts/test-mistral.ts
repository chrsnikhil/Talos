import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })
import { llmInfo, thinkJson } from "../lib/talos/llm"
async function main() {
  console.log("brain:", llmInfo())
  const r = await thinkJson('Reply ONLY JSON: {"ok": true, "say": "<one word>"}', 50)
  console.log("response:", r)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e?.message ?? e); process.exit(1) })
