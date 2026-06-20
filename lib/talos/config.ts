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
export const POLICY_ID = req("TALOS_POLICY_ID")
export const REPUTATION_ID = process.env.TALOS_REPUTATION_ID || "" // required by Daedalus
export const WALRUS_PUBLISHER = process.env.WALRUS_PUBLISHER || "https://publisher.walrus-testnet.walrus.space"

export const client = new SuiClient({ url: RPC })

function loadKeypair(): Ed25519Keypair {
  const { secretKey } = decodeSuiPrivateKey(req("TALOS_AGENT_KEY"))
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
