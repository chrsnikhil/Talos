// Read-only, server-safe config for the dashboard (no private key here).
// Falls back to the live testnet deployment so the dashboard works out of the box.
export const NETWORK = process.env.SUI_NETWORK || "testnet"
export const RPC = process.env.SUI_RPC || "https://fullnode.testnet.sui.io:443"
export const PACKAGE_ID =
  process.env.TALOS_PACKAGE_ID || "0x879f93fde0c8797aa4e6d2d07263d796a0a568953503bd3c695001493a554eca"
export const POLICY_ID =
  process.env.TALOS_POLICY_ID || "0x3451ee0d266b222d3dd5254386e8909eb663bb6fe1b067174cbaad0709725039"

export const EXPLORER = `https://suiscan.xyz/${NETWORK}`
