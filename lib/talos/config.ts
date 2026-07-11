import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { SuiClient } from "@mysten/sui/client"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography"

function req(key: string): string {
  const v = process.env[key]
  if (!v) throw new Error(`Missing env var ${key} (set it in .env.local)`)
  return v
}

export const RPC = process.env.SUI_RPC || "https://fullnode.testnet.sui.io:443"
export const PACKAGE_ID = req("TALOS_PACKAGE_ID")
/**
 * Original (v1) package address. `agent_policy` and `reputation` were defined here;
 * Move preserves a type's origin package across upgrades, so their types and events
 * (SpendAuthorized, CriticRating) keep this v1 prefix even when PACKAGE_ID points at
 * v2. Use ORIGIN_PKG for TYPE/event filters on those modules; use PACKAGE_ID (latest)
 * for MoveCall targets and for the v2-native `vault` module (VaultCreated, etc.).
 */
export const ORIGIN_PKG =
  "0x75b7f5d2926f333d8849726655904111420d4f86acb2578274b31338bcf8142c"
export const POLICY_ID = req("TALOS_POLICY_ID")
export const REPUTATION_ID = process.env.TALOS_REPUTATION_ID || "" // required by Daedalus
export const WALRUS_PUBLISHER = process.env.WALRUS_PUBLISHER || "https://publisher.walrus-testnet.walrus.space"

export const client = new SuiClient({ url: RPC })

function loadKeypair(): Ed25519Keypair {
  const raw = process.env.TALOS_AGENT_KEY
  if (!raw) {
    // Dry-run: no real spends are signed, so an ephemeral throwaway key is fine.
    // Lets anyone watch the swarm sense/think/tick locally without the agent secret.
    if (process.env.TALOS_DRY_RUN === "1") {
      console.warn("[config] TALOS_DRY_RUN=1 and no TALOS_AGENT_KEY — using an ephemeral key (no real txs will be signed).")
      return new Ed25519Keypair()
    }
    throw new Error("Missing env var TALOS_AGENT_KEY (set it in .env.local)")
  }
  const { secretKey } = decodeSuiPrivateKey(raw)
  return Ed25519Keypair.fromSecretKey(secretKey)
}

export const keypair = loadKeypair()
export const AGENT_ADDRESS = keypair.toSuiAddress()

// Daedalus (the critic) signs its on-chain ratings with its OWN key, so the
// reputation ledger's `critic` is a different address than the executor it
// grades — the "independent critic" claim is verifiable on-chain, not just
// asserted. Falls back to the agent key when no separate critic key is set, so
// older single-key deployments keep working unchanged.
function loadCriticKeypair(): Ed25519Keypair {
  const k = process.env.TALOS_CRITIC_KEY
  if (!k) return keypair
  const { secretKey } = decodeSuiPrivateKey(k)
  return Ed25519Keypair.fromSecretKey(secretKey)
}

export const criticKeypair = loadCriticKeypair()
export const CRITIC_ADDRESS = criticKeypair.toSuiAddress()
