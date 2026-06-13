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
export const WALRUS_PUBLISHER = process.env.WALRUS_PUBLISHER || "https://publisher.walrus-testnet.walrus.space"

export const client = new SuiClient({ url: RPC })

function loadKeypair(): Ed25519Keypair {
  const { secretKey } = decodeSuiPrivateKey(req("TALOS_AGENT_KEY"))
  return Ed25519Keypair.fromSecretKey(secretKey)
}

export const keypair = loadKeypair()
export const AGENT_ADDRESS = keypair.toSuiAddress()
