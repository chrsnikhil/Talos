import { MongoClient, type Collection } from "mongodb";
import { env } from "./config";

export type UserDoc = {
  sub: string;
  email: string;
  address: string;
  encPrivKey: string;
  iv: string;
  tag: string;
  createdAt: Date;
  paused?: boolean;
};

let clientPromise: Promise<MongoClient> | null = null;
function client(): Promise<MongoClient> {
  if (!clientPromise) clientPromise = new MongoClient(env("MONGODB_URI")).connect();
  return clientPromise;
}

export async function users(): Promise<Collection<UserDoc>> {
  const c = await client();
  const col = c.db("talos").collection<UserDoc>("users");
  await col.createIndex({ sub: 1 }, { unique: true }).catch(() => {});
  return col;
}
