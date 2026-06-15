import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { readUsdcPosition } from "../lib/talos/navi"
import { AGENT_ADDRESS } from "../lib/talos/config"

// Read-only NAVI check: confirms the SDK loads, the key parses, and the client
// connects to mainnet. No funds moved.
async function main() {
  console.log("agent:", AGENT_ADDRESS)
  const pos = await readUsdcPosition()
  console.log("NAVI USDC supply position:", pos)
}
main().then(() => process.exit(0)).catch((e) => { console.error("FAILED:", e?.message ?? e); process.exit(1) })
