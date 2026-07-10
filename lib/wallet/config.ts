import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

export const NETWORK = "mainnet" as const;
export const PACKAGE_ID =
  "0x9c49978732d2e8cb38f0744f825bc1d5431f34582811bfef6b099c785a22031f";
export const DRIP_SUI = Number(process.env.WALLET_DRIP_SUI ?? 0.05);
export const suiClient = new SuiClient({ url: getFullnodeUrl(NETWORK) });

/** Read a required server-only env var; throw a clear error if missing. */
export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name} (set it in .env.local)`);
  return v;
}
