import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { readFileSync, appendFileSync, existsSync } from "node:fs"

// Generate a fresh Daedalus critic keypair (SEPARATE from the agent key) and append it to
// .env.local as TALOS_CRITIC_KEY. Prints ONLY the address; the private key goes straight to
// .env.local and is never echoed. Idempotent: refuses to overwrite an existing critic key.

const ENV = ".env.local"
const cur = existsSync(ENV) ? readFileSync(ENV, "utf8") : ""
if (/^\s*TALOS_CRITIC_KEY=/m.test(cur)) {
  console.log("ALREADY_SET — a TALOS_CRITIC_KEY is already configured; not overwriting.")
  process.exit(0)
}
const kp = Ed25519Keypair.generate()
appendFileSync(ENV, `\n# Daedalus critic — its OWN signing key, distinct from the agent key (migrated 2026-07-14)\nTALOS_CRITIC_KEY=${kp.getSecretKey()}\n`)
console.log("CRITIC_ADDR=" + kp.toSuiAddress())
