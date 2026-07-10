import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./config";

function key(): Buffer {
  const k = Buffer.from(env("WALLET_ENC_KEY"), "hex");
  if (k.length !== 32) throw new Error("WALLET_ENC_KEY must be 32 bytes (64 hex chars)");
  return k;
}

export function encryptSecret(plain: string): { enc: string; iv: string; tag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return { enc: enc.toString("hex"), iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex") };
}

export function decryptSecret(enc: string, iv: string, tag: string): string {
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "hex"));
  const tagBuf = Buffer.from(tag, "hex");
  if (tagBuf.length !== 16) throw new Error("invalid auth tag length");
  decipher.setAuthTag(tagBuf);
  return Buffer.concat([decipher.update(Buffer.from(enc, "hex")), decipher.final()]).toString("utf8");
}
