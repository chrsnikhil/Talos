// Read-only, server-safe config for the dashboard (no private key here).
// Falls back to the live MAINNET deployment so the dashboard works out of the box.
export const NETWORK = process.env.SUI_NETWORK || "mainnet"
export const RPC = process.env.SUI_RPC || "https://fullnode.mainnet.sui.io:443"
export const PACKAGE_ID =
  process.env.TALOS_PACKAGE_ID || "0x75b7f5d2926f333d8849726655904111420d4f86acb2578274b31338bcf8142c"
export const POLICY_ID =
  process.env.TALOS_POLICY_ID || "0x16d5c0c966ac8d78992908ada307dc5991fc76ce4915ae499fa91cfe11c1b5b6"
export const REPUTATION_ID =
  process.env.TALOS_REPUTATION_ID || "0x3928f7b3ab4114a44b0f533ed627c247994894985c91cf05464ab36d161f072a"

export const EXPLORER = `https://suiscan.xyz/${NETWORK}`
