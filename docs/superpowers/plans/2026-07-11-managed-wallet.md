# Managed Wallet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google sign-in → a server-minted, AES-encrypted, MongoDB-stored Ed25519 wallet on Sui mainnet, signed server-side with a move-target allowlist, plus a gas-drip on signup and a client hook the vault UI consumes.

**Architecture:** Custodial embedded wallet. Google auth-code flow → jose session cookie. On first login the server mints an Ed25519 keypair, AES-256-GCM encrypts the secret key, stores it in Mongo keyed by Google `sub`, and drips a little SUI from a funding wallet. Transactions are built client-side and signed+executed server-side; `/api/wallet/execute` allowlists move-call targets to the Talos package so a compromised client can't drain funds elsewhere.

**Tech Stack:** Next.js 16, `@mysten/sui@1.45.2`, `mongodb`, `jose`, `google-auth-library`, Node `crypto`.

## Global Constraints

- `@mysten/sui` stays **1.45.2**. Package manager **pnpm**. Next.js 16 (modified — check `node_modules/next/dist/docs/` if a route/provider pattern misbehaves).
- Mainnet package id (v2): `0x9c49978732d2e8cb38f0744f825bc1d5431f34582811bfef6b099c785a22031f`.
- **Secrets are server-only.** `MONGODB_URI`, `WALLET_ENC_KEY`, `SESSION_SECRET`, `WALLET_FUNDING_KEY`, `GOOGLE_CLIENT_SECRET` must NEVER be `NEXT_PUBLIC_`, never imported into a `"use client"` module. Only `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is client-safe. Real values live in `.env.local` (gitignored) — already created with `MONGODB_URI`, `WALLET_ENC_KEY`, `SESSION_SECRET`, `APP_URL` set; `NEXT_PUBLIC_GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`WALLET_FUNDING_KEY` are blank pending the user.
- Unit tests for pure-logic modules: a `*.test.ts` run with `pnpm exec tsx <file>` using `node:assert/strict` (no framework). Integration: `pnpm build` + live checks.
- Commit after every task; do not `git push`.

---

### Task 1: Install deps, config module, Mongo connection (verified live)

**Files:**
- Modify: `package.json`
- Create: `lib/wallet/config.ts`, `lib/wallet/mongo.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces:
  - `lib/wallet/config.ts`: `NETWORK='mainnet'`, `PACKAGE_ID`, `suiClient` (mainnet `SuiClient`), `env(name)` (throws if a required server var is missing), `DRIP_SUI` (number, default 0.05).
  - `lib/wallet/mongo.ts`: `users(): Promise<Collection<UserDoc>>` where `UserDoc = { sub: string; email: string; address: string; encPrivKey: string; iv: string; tag: string; createdAt: Date }`; a cached `MongoClient`.

- [ ] **Step 1: Install deps**
```bash
pnpm add mongodb jose google-auth-library
```

- [ ] **Step 2: Create `lib/wallet/config.ts`**
```ts
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
```

- [ ] **Step 3: Create `lib/wallet/mongo.ts`**
```ts
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
```

- [ ] **Step 4: Append env keys to `.env.example`** (placeholders only — never real values)
```bash
# --- Managed wallet (custodial embedded wallet) ---
MONGODB_URI=                      # MongoDB Atlas connection string (server only)
WALLET_ENC_KEY=                   # 32-byte hex, AES-256-GCM key for private-key encryption
SESSION_SECRET=                   # random secret for the jose session JWT
WALLET_FUNDING_KEY=               # suiprivkey1... of the gas-drip funding wallet (SEPARATE from agent key)
GOOGLE_CLIENT_SECRET=             # Google OAuth web client secret (server only)
APP_URL=http://localhost:3000     # origin used to build the OAuth redirect URI
# WALLET_DRIP_SUI=0.05            # optional override
```

- [ ] **Step 5: Verify the live Mongo connection**
Create a throwaway check `lib/wallet/_conn-check.ts`:
```ts
import { users } from "./mongo";
const col = await users();
console.log("mongo ok, users count:", await col.countDocuments());
process.exit(0);
```
Run: `pnpm exec tsx --env-file=.env.local lib/wallet/_conn-check.ts`
Expected: `mongo ok, users count: 0` (or a number). If it hangs/errors, the URI or network is wrong — report before proceeding. Then delete `_conn-check.ts`.

- [ ] **Step 6: Commit**
```bash
git add package.json pnpm-lock.yaml lib/wallet/config.ts lib/wallet/mongo.ts .env.example
git commit -m "feat(wallet): deps + config + mongo connection"
```

---

### Task 2: Crypto module (AES-256-GCM) — TDD

**Files:**
- Create: `lib/wallet/crypto.ts`, `lib/wallet/crypto.test.ts`

**Interfaces:**
- Produces: `encryptSecret(plain: string): { enc: string; iv: string; tag: string }` and `decryptSecret(enc: string, iv: string, tag: string): string`, both using `WALLET_ENC_KEY` (32-byte hex). All fields hex-encoded.

- [ ] **Step 1: Write the failing test** — `lib/wallet/crypto.test.ts`
```ts
import assert from "node:assert/strict";
import { encryptSecret, decryptSecret } from "./crypto";

const plain = "suiprivkey1q"; // representative secret string
const { enc, iv, tag } = encryptSecret(plain);
assert.notEqual(enc, plain, "ciphertext must differ from plaintext");
assert.equal(decryptSecret(enc, iv, tag), plain, "roundtrip must recover plaintext");

// tamper detection: flipping a ciphertext byte must throw (GCM auth)
const bad = (enc[0] === "a" ? "b" : "a") + enc.slice(1);
assert.throws(() => decryptSecret(bad, iv, tag), "tampered ciphertext must fail auth");
console.log("crypto ok");
```

- [ ] **Step 2: Run to verify it fails**
Run: `WALLET_ENC_KEY=$(node -e "console.log('11'.repeat(32))") pnpm exec tsx lib/wallet/crypto.test.ts`
Expected: FAIL — `Cannot find module './crypto'` / export missing.

- [ ] **Step 3: Implement `lib/wallet/crypto.ts`**
```ts
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
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(enc, "hex")), decipher.final()]).toString("utf8");
}
```

- [ ] **Step 4: Run to verify it passes**
Run: `WALLET_ENC_KEY=$(node -e "console.log('11'.repeat(32))") pnpm exec tsx lib/wallet/crypto.test.ts`
Expected: `crypto ok`.

- [ ] **Step 5: Commit**
```bash
git add lib/wallet/crypto.ts lib/wallet/crypto.test.ts
git commit -m "feat(wallet): AES-256-GCM secret encryption (tested)"
```

---

### Task 3: Session (jose JWT cookie) — TDD

**Files:**
- Create: `lib/wallet/session.ts`, `lib/wallet/session.test.ts`

**Interfaces:**
- Produces:
  - `signSession(payload: { sub: string; email: string }): Promise<string>` — 7-day HS256 JWT signed with `SESSION_SECRET`.
  - `verifySession(token: string): Promise<{ sub: string; email: string } | null>` — null on invalid/expired.
  - `SESSION_COOKIE = "talos_session"`.

- [ ] **Step 1: Write the failing test** — `lib/wallet/session.test.ts`
```ts
import assert from "node:assert/strict";
import { signSession, verifySession } from "./session";

const token = await signSession({ sub: "abc123", email: "a@b.com" });
const ok = await verifySession(token);
assert.equal(ok?.sub, "abc123");
assert.equal(ok?.email, "a@b.com");
assert.equal(await verifySession("not.a.jwt"), null, "garbage → null");
console.log("session ok");
```

- [ ] **Step 2: Run to verify it fails**
Run: `SESSION_SECRET=devsecretdevsecret pnpm exec tsx lib/wallet/session.test.ts`
Expected: FAIL — module/exports missing.

- [ ] **Step 3: Implement `lib/wallet/session.ts`**
```ts
import { SignJWT, jwtVerify } from "jose";
import { env } from "./config";

export const SESSION_COOKIE = "talos_session";
const secret = () => new TextEncoder().encode(env("SESSION_SECRET"));

export async function signSession(payload: { sub: string; email: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(token: string): Promise<{ sub: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub === "string" && typeof payload.email === "string") {
      return { sub: payload.sub, email: payload.email };
    }
    return null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run to verify it passes**
Run: `SESSION_SECRET=devsecretdevsecret pnpm exec tsx lib/wallet/session.test.ts`
Expected: `session ok`.

- [ ] **Step 5: Commit**
```bash
git add lib/wallet/session.ts lib/wallet/session.test.ts
git commit -m "feat(wallet): jose session tokens (tested)"
```

---

### Task 4: Wallet store + gas drip

**Files:**
- Create: `lib/wallet/gas.ts`, `lib/wallet/store.ts`

**Interfaces:**
- Consumes: `users` (Task 1), `encryptSecret`/`decryptSecret` (Task 2), `suiClient`/`DRIP_SUI`/`env` (Task 1).
- Produces:
  - `lib/wallet/gas.ts`: `dripGas(toAddress: string): Promise<string | null>` — funding wallet sends `DRIP_SUI` SUI; returns digest or null if `WALLET_FUNDING_KEY` unset (non-fatal).
  - `lib/wallet/store.ts`: `getOrCreateUser(sub: string, email: string): Promise<{ address: string; created: boolean }>`; `loadKeypair(sub: string): Promise<Ed25519Keypair>` (throws if user not found). SERVER-ONLY.

- [ ] **Step 1: Create `lib/wallet/gas.ts`**
```ts
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
```

- [ ] **Step 2: Create `lib/wallet/store.ts`**
```ts
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
  await col.insertOne({ sub, email, address, encPrivKey: enc, iv, tag, createdAt: new Date() });
  await dripGas(address).catch(() => null); // best-effort; never block signup on gas
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
```

Note: verify against `@mysten/sui@1.45.2` types that `Ed25519Keypair.getSecretKey()` returns the bech32 `suiprivkey1…` string and `fromSecretKey(string)` accepts it. If 1.45.2 differs (e.g. returns bytes), encrypt/decrypt the raw bytes as hex and adjust `fromSecretKey` accordingly — keep the roundtrip correct.

- [ ] **Step 3: Verify it compiles + a live mint smoke check (optional, needs Mongo)**
Run: `pnpm exec tsc --noEmit` (no new errors in these files). If you want a live check, write a throwaway that calls `getOrCreateUser("smoke-"+Date.now(), "t@t.com")` with `--env-file=.env.local`, confirm it returns an address and inserts a doc, then remove it and delete the smoke doc. Do not leave test docs in the collection.

- [ ] **Step 4: Commit**
```bash
git add lib/wallet/gas.ts lib/wallet/store.ts
git commit -m "feat(wallet): mint-on-login store + gas drip"
```

---

### Task 5: Google OAuth helper + auth routes

**Files:**
- Create: `lib/wallet/google.ts`, `app/api/auth/google/route.ts`, `app/api/auth/callback/route.ts`, `app/api/auth/logout/route.ts`

**Interfaces:**
- Consumes: `getOrCreateUser` (Task 4), `signSession`/`SESSION_COOKIE` (Task 3), `env` (Task 1).
- Produces:
  - `lib/wallet/google.ts`: `googleAuthUrl(): string`; `exchangeCode(code: string): Promise<{ sub: string; email: string }>`.

- [ ] **Step 1: Create `lib/wallet/google.ts`**
```ts
import { OAuth2Client } from "google-auth-library";
import { env } from "./config";

function redirectUri() { return `${env("APP_URL")}/api/auth/callback`; }
function oauth() {
  return new OAuth2Client(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    env("GOOGLE_CLIENT_SECRET"),
    redirectUri(),
  );
}

export function googleAuthUrl(): string {
  return oauth().generateAuthUrl({ access_type: "online", scope: ["openid", "email", "profile"] });
}

export async function exchangeCode(code: string): Promise<{ sub: string; email: string }> {
  const client = oauth();
  const { tokens } = await client.getToken(code);
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token!,
    audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  });
  const p = ticket.getPayload();
  if (!p?.sub || !p.email) throw new Error("google id_token missing sub/email");
  return { sub: p.sub, email: p.email };
}
```

- [ ] **Step 2: Create `app/api/auth/google/route.ts`**
```ts
import { NextResponse } from "next/server";
import { googleAuthUrl } from "@/lib/wallet/google";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.redirect(googleAuthUrl());
}
```

- [ ] **Step 3: Create `app/api/auth/callback/route.ts`**
```ts
import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/wallet/google";
import { getOrCreateUser } from "@/lib/wallet/store";
import { signSession, SESSION_COOKIE } from "@/lib/wallet/session";
import { env } from "@/lib/wallet/config";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.redirect(`${env("APP_URL")}/app?error=nocode`);
  try {
    const { sub, email } = await exchangeCode(code);
    await getOrCreateUser(sub, email);
    const token = await signSession({ sub, email });
    const res = NextResponse.redirect(`${env("APP_URL")}/app`);
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e: unknown) {
    return NextResponse.redirect(`${env("APP_URL")}/app?error=auth`);
  }
}
```

- [ ] **Step 4: Create `app/api/auth/logout/route.ts`**
```ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/wallet/session";
import { env } from "@/lib/wallet/config";
export const runtime = "nodejs";
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
```

- [ ] **Step 5: Verify build**
Run: `pnpm build` — the three routes appear; no new errors. (Full Google login can't run without the client id/secret; that's verified during your wiring.)

- [ ] **Step 6: Commit**
```bash
git add lib/wallet/google.ts "app/api/auth/google/route.ts" "app/api/auth/callback/route.ts" "app/api/auth/logout/route.ts"
git commit -m "feat(wallet): google oauth helper + auth routes"
```

---

### Task 6: Wallet routes (me + execute with allowlist)

**Files:**
- Create: `app/api/wallet/me/route.ts`, `app/api/wallet/execute/route.ts`

**Interfaces:**
- Consumes: `verifySession`/`SESSION_COOKIE` (Task 3), `loadKeypair` (Task 4), `suiClient`/`PACKAGE_ID` (Task 1), `users` (Task 1).
- Produces:
  - `GET /api/wallet/me` → `{ address, email }` (401 if no session).
  - `POST /api/wallet/execute` — body `{ txJson: string }` (a `Transaction.serialize()` string) → `{ digest }`; 401 no session; 403 if any command is not a MoveCall to `PACKAGE_ID`.

- [ ] **Step 1: Create `app/api/wallet/me/route.ts`**
```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/wallet/session";
import { users } from "@/lib/wallet/mongo";
export const runtime = "nodejs";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const u = await (await users()).findOne({ sub: session.sub });
  if (!u) return NextResponse.json({ error: "no wallet" }, { status: 404 });
  return NextResponse.json({ address: u.address, email: u.email });
}
```

- [ ] **Step 2: Create `app/api/wallet/execute/route.ts`**
```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Transaction } from "@mysten/sui/transactions";
import { verifySession, SESSION_COOKIE } from "@/lib/wallet/session";
import { loadKeypair } from "@/lib/wallet/store";
import { suiClient, PACKAGE_ID } from "@/lib/wallet/config";
export const runtime = "nodejs";

// Only sign transactions whose every command is a MoveCall into the Talos package.
// Blocks a compromised client from signing coin transfers to an arbitrary address.
function isAllowed(tx: Transaction): boolean {
  const data = tx.getData();
  const cmds = data.commands ?? [];
  if (cmds.length === 0) return false;
  return cmds.every((c) => {
    const anyc = c as { $kind?: string; MoveCall?: { package?: string } };
    return anyc.$kind === "MoveCall" && anyc.MoveCall?.package === PACKAGE_ID;
  });
}

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const { txJson } = await req.json();
    if (typeof txJson !== "string") return NextResponse.json({ error: "bad request" }, { status: 400 });
    const tx = Transaction.from(txJson);
    if (!isAllowed(tx)) return NextResponse.json({ error: "target not allowed" }, { status: 403 });
    const signer = await loadKeypair(session.sub);
    tx.setSenderIfNotSet(signer.toSuiAddress());
    const res = await suiClient.signAndExecuteTransaction({ signer, transaction: tx, options: { showEffects: true } });
    return NextResponse.json({ digest: res.digest, status: res.effects?.status?.status });
  } catch (e: unknown) {
    return NextResponse.json({ error: String((e as Error)?.message ?? e) }, { status: 502 });
  }
}
```
Note: verify the `tx.getData().commands` command shape against `@mysten/sui@1.45.2` (the `$kind`/`MoveCall.package` fields). Adjust `isAllowed` to the real shape; the guard MUST still reject any non-MoveCall command and any MoveCall whose package ≠ `PACKAGE_ID`.

- [ ] **Step 3: Verify build**
Run: `pnpm build` — both routes present; no new errors.

- [ ] **Step 4: Commit**
```bash
git add "app/api/wallet/me/route.ts" "app/api/wallet/execute/route.ts"
git commit -m "feat(wallet): session-gated me + allowlisted execute routes"
```

---

### Task 7: Client sign-in + hook + wire the app page; remove Enoki

**Files:**
- Create: `components/wallet/sign-in.tsx`, `lib/wallet/use-managed-wallet.ts`
- Modify: `app/(app)/app/page.tsx`, `app/(app)/layout.tsx`
- Delete: `components/enoki/`, `app/api/enoki/`, `lib/enoki/`, `components/providers.tsx`
- Modify: `package.json` (drop `@mysten/dapp-kit`, `@mysten/enoki`, `@mysten/wallet-standard`, `@tanstack/react-query` if unused elsewhere)

**Interfaces:**
- Produces: `useManagedWallet()` → `{ address: string | null; email: string | null; loading: boolean; refresh(): void }`; `SignIn` default export.

- [ ] **Step 1: Create `lib/wallet/use-managed-wallet.ts`**
```ts
"use client";
import { useCallback, useEffect, useState } from "react";

export function useManagedWallet() {
  const [state, setState] = useState<{ address: string | null; email: string | null; loading: boolean }>(
    { address: null, email: null, loading: true },
  );
  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const r = await fetch("/api/wallet/me");
      if (r.ok) { const { address, email } = await r.json(); setState({ address, email, loading: false }); }
      else setState({ address: null, email: null, loading: false });
    } catch { setState({ address: null, email: null, loading: false }); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { ...state, refresh };
}
```

- [ ] **Step 2: Create `components/wallet/sign-in.tsx`**
```tsx
"use client";
import { useManagedWallet } from "@/lib/wallet/use-managed-wallet";

export default function SignIn() {
  const { address, email, loading, refresh } = useManagedWallet();
  if (loading) return <span style={{ fontFamily: "monospace", color: "#8b98ab" }}>…</span>;
  if (address) {
    return (
      <div style={{ fontFamily: "monospace", color: "#e8eef7" }}>
        <span title={email ?? ""}>{address.slice(0, 6)}…{address.slice(-4)}</span>
        <button style={{ marginLeft: 12 }} onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); refresh(); }}>
          sign out
        </button>
      </div>
    );
  }
  return (
    <a href="/api/auth/google"
       style={{ fontFamily: "monospace", padding: "10px 18px", border: "2px solid #28d391", color: "#28d391", textDecoration: "none" }}>
      Sign in with Google
    </a>
  );
}
```

- [ ] **Step 3: Replace `app/(app)/app/page.tsx`**
```tsx
"use client";
import SignIn from "@/components/wallet/sign-in";
import { useManagedWallet } from "@/lib/wallet/use-managed-wallet";

export default function AppHome() {
  const { address } = useManagedWallet();
  return (
    <main style={{ minHeight: "100vh", background: "#0d1319", color: "#e8eef7", fontFamily: "monospace", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <h1 style={{ letterSpacing: "-0.02em" }}>TALOS</h1>
      <SignIn />
      {address && (
        <section data-testid="wallet" style={{ textAlign: "center", opacity: 0.85 }}>
          <p>your embedded wallet</p>
          <code>{address}</code>
          <p style={{ marginTop: 12, color: "#28d391" }}>vault UI mounts here (todo 7)</p>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Simplify `app/(app)/layout.tsx`** (no dApp-Kit providers needed now)
```tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 5: Remove the Enoki stack**
```bash
git rm -r components/enoki "app/api/enoki" lib/enoki components/providers.tsx
pnpm remove @mysten/dapp-kit @mysten/enoki @mysten/wallet-standard @tanstack/react-query
```
(If `pnpm remove` errors because a package isn't a direct dep, skip it.) Then `grep -rl "dapp-kit\|@mysten/enoki\|components/providers" app components lib` must return nothing — fix any stragglers.

- [ ] **Step 6: Verify build + render**
Run: `pnpm build` (clean). Then `pnpm dev` (background) and screenshot:
```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu --screenshot=".superpowers/sdd/wallet.png" --window-size=1440,900 --virtual-time-budget=9000 "http://localhost:3000/app"
```
Read `.superpowers/sdd/wallet.png` — with no session it must show TALOS + a "Sign in with Google" link (no crash). Stop the dev server.

- [ ] **Step 7: Commit**
```bash
git add -A
git commit -m "feat(wallet): managed-wallet sign-in + hook; retire Enoki/dApp-Kit"
```

---

## Self-Review

**Spec coverage:**
- Google auth-code + session cookie → Tasks 3, 5. Mint+encrypt+store → Tasks 2, 4. Gas drip → Task 4. Signing + allowlist → Task 6. Client sign-in + hook → Task 7. Mongo store → Task 1. Retire Enoki → Task 7. Env placeholders → Task 1.
**Placeholder scan:** none — all code complete. `<ver>`-free (no version unknowns this time). Two "verify against 1.45.2 types" notes (keypair secret format in Task 4; command shape in Task 6) are genuine API-confirmation steps, not placeholders — the correct behavior is specified.
**Type consistency:** `UserDoc`, `env`, `PACKAGE_ID`, `suiClient`, `DRIP_SUI` (Task 1); `encryptSecret/decryptSecret` (Task 2); `signSession/verifySession/SESSION_COOKIE` (Task 3); `getOrCreateUser/loadKeypair/dripGas` (Task 4); `googleAuthUrl/exchangeCode` (Task 5); `useManagedWallet` (Task 7) — all used consistently downstream.
**Security:** every secret var is read only in server files (`lib/wallet/*` imported by routes, never by a `"use client"` module); `use-managed-wallet.ts` and `sign-in.tsx` (the only client files) touch no env. `/api/wallet/execute` allowlists to `PACKAGE_ID`.
