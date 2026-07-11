# Talos — Go Live Runbook

Everything is code-complete on `feat/managed-wallet` (49 commits ahead of `main`). Going live has
exactly **two** blockers only you can clear (secrets), then one deploy command.

---

## 1. Create the two secrets → put them in `Talos/.env.local`

Your local `.env.local` already has `MONGODB_URI`, `WALLET_ENC_KEY`, `SESSION_SECRET`, `APP_URL`.
Fill the three blanks:

### A. Google OAuth client (`NEXT_PUBLIC_GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`)
1. https://console.cloud.google.com → create/select a project.
2. **APIs & Services → OAuth consent screen** → External → app name "Talos", your email → Save
   (add your Google account under **Test users** so you can log in while it's unverified).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
4. Under **Authorized redirect URIs** add **both** (so login works locally *and* on the live URL):
   - `http://localhost:3000/api/auth/callback`
   - `https://talos-swarm-d8b4e2.centralindia.cloudapp.azure.com/api/auth/callback`
5. Copy the **Client ID** → `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, **Client secret** → `GOOGLE_CLIENT_SECRET`.

### B. Funding key (`WALLET_FUNDING_KEY`)
A Sui keypair holding a little SUI that drips gas (~0.05 SUI, `WALLET_DRIP_SUI`) to each newly
minted user wallet so they can pay gas. Use any funded mainnet key in bech32 form
(`suiprivkey1...`). Fund it with ~1 SUI. **Server-only — never prefix with `NEXT_PUBLIC_`.**

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
WALLET_FUNDING_KEY=suiprivkey1xxxxx
```

---

## 2. Deploy to the VM (revives the live swarm + puts login on the public URL)

VM is already running (`20.219.0.224`). One command, from the repo root:

```bash
bash scripts/deploy-vm.sh          # full: web app + multi-user swarm
# or
bash scripts/deploy-vm.sh swarm    # swarm only (leave the live dashboard web untouched)
```

It rsyncs source (additive, no deletes), copies your secrets to the VM `.env.local`, **forces**
`TALOS_PACKAGE_ID=v2` (enables multi-user vault rebalancing) and `APP_URL=https://<fqdn>`, runs
`pnpm install && pnpm build`, then `pm2 restart` + `save`. Build must pass before restart.

Confirm it's iterating vaults:
```bash
ssh azureuser@20.219.0.224 'pm2 logs talos-swarm --lines 40'
#  expect:  MULTI_USER_ENABLED=true   and   listActiveVaults -> 0   (0 until a user creates one)
```
With 0 user vaults the flagship single-agent loop keeps running (back-compat) — the live
mainnet track record continues either way.

---

## 3. End-to-end mainnet test

Live URL: `https://talos-swarm-d8b4e2.centralindia.cloudapp.azure.com/app`
(or local: `pnpm dev` → http://localhost:3000/app)

1. **Login** — "Sign in with Google" → mints an embedded wallet (address shows in the panel).
   Verify the funding drip landed (small SUI balance).
2. **Create vault** — first deposit calls `create_vault<USDC>` + `deposit`. Fund the wallet with a
   little USDC first (a few cents is enough for the test).
3. **Deposit** — deposit USDC into the vault; balance/principal updates.
4. **Rebalance** — within ~30s the swarm should pick up the new vault and rotate it into the best
   venue (`SpendAuthorized` / vault position event). Watch `pm2 logs talos-swarm`.
5. **Start/Stop** — toggle the agent; confirm a paused vault is skipped next tick.
6. **PANIC** — one PTB revokes the policy + pulls everything back to your wallet on-chain. Verify
   USDC returns and the policy shows revoked.

---

## Notes / gotchas
- OAuth redirect URI **must** match exactly (both localhost + FQDN registered) or login 400s.
- Non-`NEXT_PUBLIC_` secrets stay server-only; `.env.local` is gitignored — never commit it.
- Don't leave the VM running long past demo day (July 18) — ~₹300/day.
- Mongo unreachable from the swarm degrades safely: pause-checks no-op, funds still move correctly.
