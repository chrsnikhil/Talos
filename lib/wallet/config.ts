import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

export const NETWORK = "mainnet" as const;
export const PACKAGE_ID =
  "0x9c49978732d2e8cb38f0744f825bc1d5431f34582811bfef6b099c785a22031f";
/**
 * Original package where `agent_policy` was first published (v1). A Move type keeps
 * its ORIGIN package address across upgrades, so `AgentPolicy`, `OwnerCap`, and the
 * `SpendAuthorized` event are ALWAYS prefixed with this v1 id — even when created by
 * the v2 package. Use this for TYPE filters (StructType / MoveEventType); use
 * PACKAGE_ID (the latest version) for MoveCall targets. The `vault` module was added
 * in v2, so vault types (Vault, VaultCreated) correctly use PACKAGE_ID.
 */
export const AGENT_POLICY_PKG =
  "0x75b7f5d2926f333d8849726655904111420d4f86acb2578274b31338bcf8142c";
export const DRIP_SUI = Number(process.env.WALLET_DRIP_SUI ?? 0.05);
// RPC for all managed-wallet reads/writes. Overridable via WALLET_RPC because the
// default fullnode is geo-load-balanced and some regions (e.g. the VM's) route to a
// replica that can't read the newer v2 vault/policy objects or resolve their coins —
// which breaks the vault UI. Set WALLET_RPC to a consistently-indexed endpoint there.
export const RPC_URL = process.env.WALLET_RPC || getFullnodeUrl(NETWORK);
export const suiClient = new SuiClient({ url: RPC_URL });

/** Read a required server-only env var; throw a clear error if missing. */
export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name} (set it in .env.local)`);
  return v;
}
