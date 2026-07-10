import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { users } from "./mongo";
import { encryptSecret, decryptSecret } from "./crypto";
import { dripGas } from "./gas";

/** Mint-on-first-login. Returns the user's Sui address. */
export async function getOrCreateUser(sub: string, email: string): Promise<{ address: string; created: boolean }> {
  const col = await users();
  const existing = await col.findOne({ sub });
  if (existing) return { address: existing.address, created: false };

  const kp = Ed25519Keypair.generate();
  const address = kp.toSuiAddress();
  const { enc, iv, tag } = encryptSecret(kp.getSecretKey()); // bech32 suiprivkey string
  try {
    await col.insertOne({ sub, email, address, encPrivKey: enc, iv, tag, createdAt: new Date() });
  } catch (e: unknown) {
    if ((e as { code?: number })?.code === 11000) {
      const again = await col.findOne({ sub });
      if (again) return { address: again.address, created: false };
    }
    throw e;
  }
  await dripGas(address).catch((err) => console.error("[dripGas] failed:", err)); // best-effort; never block signup on gas
  return { address, created: true };
}

/** Server-only: decrypt and rebuild the user's keypair for signing. */
export async function loadKeypair(sub: string): Promise<Ed25519Keypair> {
  const col = await users();
  const u = await col.findOne({ sub });
  if (!u) throw new Error("user not found");
  const secret = decryptSecret(u.encPrivKey, u.iv, u.tag);
  return Ed25519Keypair.fromSecretKey(secret);
}
