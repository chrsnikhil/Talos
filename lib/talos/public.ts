// Read-only, server-safe config for the dashboard (no private key here).
// Falls back to the live testnet deployment so the dashboard works out of the box.
export const NETWORK = process.env.SUI_NETWORK || "testnet"
export const RPC = process.env.SUI_RPC || "https://fullnode.testnet.sui.io:443"
export const PACKAGE_ID =
  process.env.TALOS_PACKAGE_ID || "0x8a01a3e3dfcafd078bef29bbbc8af6d21da120ee449febd98314311cc0444b31"
export const POLICY_ID =
  process.env.TALOS_POLICY_ID || "0xed40900a9e9c3fa65b350f99ea73469ecf7f0e42d806c6cc69cc0cf3bfa6993a"
export const REPUTATION_ID =
  process.env.TALOS_REPUTATION_ID || "0xb8912d9e70ca432ec23ee7a69e40e254f767695b0740bd4133f17003f1a13806"

export const EXPLORER = `https://suiscan.xyz/${NETWORK}`
