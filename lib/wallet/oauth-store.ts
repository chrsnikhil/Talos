import { randomUUID, randomBytes } from "node:crypto";
import type { Collection } from "mongodb";
import { MongoClient } from "mongodb";
import { env } from "./config";

// Mongo-backed OAuth state: dynamically-registered clients (Claude registers one per
// connector) and short-lived authorization codes. Codes auto-expire via a TTL index.

export type OAuthClient = {
  client_id: string;
  redirect_uris: string[];
  client_name?: string;
  createdAt: Date;
};

export type OAuthCode = {
  code: string;
  sub: string;
  email: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  createdAt: Date;
  expiresAt: Date; // TTL-indexed
};

let clientPromise: Promise<MongoClient> | null = null;
function mongo(): Promise<MongoClient> {
  if (!clientPromise) clientPromise = new MongoClient(env("MONGODB_URI")).connect();
  return clientPromise;
}

async function clientsCol(): Promise<Collection<OAuthClient>> {
  const c = await mongo();
  const col = c.db("talos").collection<OAuthClient>("oauth_clients");
  await col.createIndex({ client_id: 1 }, { unique: true }).catch(() => {});
  return col;
}

async function codesCol(): Promise<Collection<OAuthCode>> {
  const c = await mongo();
  const col = c.db("talos").collection<OAuthCode>("oauth_codes");
  await col.createIndex({ code: 1 }, { unique: true }).catch(() => {});
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
  return col;
}

/** Dynamic Client Registration: persist the client's redirect URIs, return a fresh id. */
export async function registerClient(input: {
  redirect_uris: string[];
  client_name?: string;
}): Promise<OAuthClient> {
  const doc: OAuthClient = {
    client_id: randomUUID(),
    redirect_uris: input.redirect_uris,
    client_name: input.client_name,
    createdAt: new Date(),
  };
  await (await clientsCol()).insertOne(doc);
  return doc;
}

export async function getClient(client_id: string): Promise<OAuthClient | null> {
  if (!client_id) return null;
  return (await clientsCol()).findOne({ client_id });
}

/** Mint a one-time authorization code bound to the user + PKCE challenge (10 min TTL). */
export async function createAuthCode(input: {
  sub: string;
  email: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
}): Promise<string> {
  const code = randomBytes(32).toString("base64url");
  const now = new Date();
  await (await codesCol()).insertOne({
    code,
    ...input,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
  });
  return code;
}

/** Read-and-delete an authorization code (single use). Returns null if missing/expired. */
export async function consumeAuthCode(code: string): Promise<OAuthCode | null> {
  if (!code) return null;
  const col = await codesCol();
  const doc = await col.findOneAndDelete({ code });
  const rec = (doc && "value" in doc ? doc.value : doc) as OAuthCode | null;
  if (!rec) return null;
  if (rec.expiresAt.getTime() < Date.now()) return null;
  return rec;
}
