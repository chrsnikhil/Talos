# Managed wallet — design spec

**Date:** 2026-07-11
**Status:** approved (brainstorm), ready for implementation plan
**Context:** Sui Overflow 2026 build-out. Replaces the Enoki/zkLogin approach (mainnet zkLogin
is paywalled) with a self-hosted **custodial embedded wallet**: Google sign-in → a server-minted
Ed25519 wallet, encrypted at rest in MongoDB, signed server-side, on Sui mainnet. Foundation for
the vault UX (todo 7).

## Decisions (from brainstorm)

1. **Managed (custodial) wallet.** Server mints + stores the key (encrypted). Simpler than
   zkLogin; honestly pitched as an "embedded wallet, self-custody on the roadmap." The agent-leash
   (vault/policy) story is contract-enforced and unaffected by wallet custody.
2. **Gas drip on signup.** A funding wallet sends a small SUI amount (default ~0.05, configurable)
   to each new wallet once; it self-pays gas thereafter. (No Enoki sponsorship.)
3. **MongoDB** for the user→key store (user-provided Atlas URI).
4. **Retire the Enoki work** (registerEnokiWallets, Enoki sign-in, sponsor routes, the dApp-Kit
   wallet layer). Branch fresh off `feat/vault`; keep the vault contract, the `(app)` route, and
   the `PACKAGE_ID` constant.

## Architecture

Google auth-code flow → verify id_token → signed httpOnly session cookie (`jose`). On first login
per Google `sub`, mint an Ed25519 keypair, AES-256-GCM encrypt the private key, store in Mongo,
drip gas. Transactions are built client-side and signed+executed server-side (the server holds the
key), with a move-target allowlist so a compromised client cannot drain to an arbitrary address.

## File structure

- `lib/wallet/mongo.ts` — cached MongoClient; `users()` collection accessor.
- `lib/wallet/crypto.ts` — AES-256-GCM `encrypt(plain)`/`decrypt(enc,iv,tag)` using `WALLET_ENC_KEY`.
- `lib/wallet/store.ts` — `getOrCreateUser(sub,email)` (mint+encrypt+store+drip on first login) →
  `{ address, created }`; `loadKeypair(sub)` (server-only, decrypts → `Ed25519Keypair`).
- `lib/wallet/gas.ts` — `dripGas(toAddress)`: funding wallet (`WALLET_FUNDING_KEY`) → SUI transfer.
- `lib/wallet/session.ts` — `createSession(sub,email)`/`readSession(req)` (jose JWT cookie).
- `lib/wallet/google.ts` — auth URL builder + code→id_token exchange + verify (`sub`,`email`).
- `lib/wallet/config.ts` — env reads, `PACKAGE_ID` (v2), `ALLOWED_TARGETS`, mainnet SuiClient.
- `app/api/auth/google/route.ts` — redirect to Google.
- `app/api/auth/callback/route.ts` — code → id_token → getOrCreateUser → set session → redirect /app.
- `app/api/auth/logout/route.ts` — clear cookie.
- `app/api/wallet/me/route.ts` — session → `{ address, email }`.
- `app/api/wallet/execute/route.ts` — session → allowlist-check tx → sign+execute → `{ digest }`.
- `components/wallet/sign-in.tsx` — Google button + address display + logout.
- `lib/wallet/use-managed-wallet.ts` — client hook `{ address, email, execute(tx), loading }`.
- `app/(app)/app/page.tsx` — use the new sign-in + hook (replaces Enoki page body).
- Removed: `components/enoki/*`, `app/api/enoki/*`, `lib/enoki/*`, `components/providers.tsx`
  (dApp-Kit wallet layer). Keep `@mysten/sui`; drop `@mysten/dapp-kit`/`@mysten/enoki` usage.

## Env (values live in `.env.local`, gitignored — placeholders only in `.env.example`)

- `MONGODB_URI` — Atlas connection string.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — Google OAuth web client.
- `WALLET_ENC_KEY` — 32-byte hex, AES key for private-key encryption.
- `SESSION_SECRET` — jose JWT signing secret.
- `WALLET_FUNDING_KEY` — suiprivkey of the gas-drip funding wallet (SEPARATE from the agent key).
- `APP_URL` — origin for the OAuth redirect (e.g. `http://localhost:3000`).
- `WALLET_DRIP_SUI` — optional, default `0.05`.

## Security model

- Custodial: the server can move user funds (disclosed). Mitigations: private keys AES-GCM
  encrypted at rest (DB leak alone ≠ theft; also needs `WALLET_ENC_KEY`); `/api/wallet/execute`
  requires a valid session and allowlists move targets to the Talos package (client cannot sign
  arbitrary transfers out); funding key is separate from the agent key (limits blast radius).
- `WALLET_ENC_KEY`, `SESSION_SECRET`, `WALLET_FUNDING_KEY`, `GOOGLE_CLIENT_SECRET`, `MONGODB_URI`
  are server-only — never `NEXT_PUBLIC_`, never in a client module.

## Out of scope (later)

- Self-custody / key export / zkLogin migration.
- External transfers out of the managed wallet (allowlist is Talos-targets-only for now).
- The vault UI itself (todo 7) — this spec delivers auth + wallet + a signing primitive it uses.
