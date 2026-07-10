import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { suiClient, DRIP_SUI } from "./config";

// Fund a new managed wallet with a little SUI for gas, once. No-op if no funding key set.
export async function dripGas(toAddress: string): Promise<string | null> {
  const k = process.env.WALLET_FUNDING_KEY;
  if (!k) return null;
  const funder = Ed25519Keypair.fromSecretKey(k);
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [Math.round(DRIP_SUI * 1e9)]);
  tx.transferObjects([coin], toAddress);
  const res = await suiClient.signAndExecuteTransaction({ signer: funder, transaction: tx });
  return res.digest;
}
