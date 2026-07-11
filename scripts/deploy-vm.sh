#!/usr/bin/env bash
#
# Deploy Talos (web + multi-user swarm) to the Azure VM.
#
#   bash scripts/deploy-vm.sh            # full deploy: sync + env + build + restart all
#   bash scripts/deploy-vm.sh swarm      # swarm only: sync + env + build + restart talos-swarm
#
# Requires SSH access as azureuser@20.219.0.224 (key at ~/.ssh/id_rsa).
# Secrets are read from your LOCAL .env.local and upserted onto the VM's .env.local
# (chmod 600, never committed). Nothing is deleted on the VM (additive rsync).
#
set -euo pipefail

VM="azureuser@20.219.0.224"
FQDN="talos-swarm-d8b4e2.centralindia.cloudapp.azure.com"
V2_PKG="0x9c49978732d2e8cb38f0744f825bc1d5431f34582811bfef6b099c785a22031f"
MODE="${1:-all}"
LOCAL="$(cd "$(dirname "$0")/.." && pwd)"

# Secret/config keys copied from local .env.local to the VM (if present locally).
# TALOS_PACKAGE_ID and APP_URL are FORCED to VM-correct values below, not copied.
COPY_KEYS=(MONGODB_URI WALLET_ENC_KEY SESSION_SECRET NEXT_PUBLIC_GOOGLE_CLIENT_ID \
           GOOGLE_CLIENT_SECRET WALLET_FUNDING_KEY WALLET_DRIP_SUI)

echo "==> [1/4] Syncing source to $VM:~/Talos (additive; excludes node_modules/.next/.git/.env.local)"
# tar-over-ssh instead of rsync (rsync isn't present in Git Bash on Windows). Additive
# overlay: extraction overwrites changed files but never deletes VM-only files, so the
# VM's .env.local and cumulative .talos-swarm.json are preserved.
tar czf - -C "$LOCAL" \
  --exclude='./node_modules' --exclude='./.next' --exclude='./.git' \
  --exclude='./.env.local' --exclude='*.key' --exclude='*.keystore' \
  --exclude='./.stray-keys' --exclude='./.suicli' \
  --exclude='*talos-swarm*.json' \
  . | ssh "$VM" 'mkdir -p ~/Talos && tar xzf - -C ~/Talos'

echo "==> [2/4] Building the VM env-upsert payload from local .env.local"
# Collect "KEY=VALUE" lines for keys we want to push, straight from local .env.local,
# into a temp file that we scp to the VM. IMPORTANT: we must NOT pipe this into the
# same ssh whose stdin carries the remote heredoc script — the remote `while read`
# would consume the script (skipping install/build) and append it as garbage into
# .env.local. Reading from a scp'd file (< /tmp/...) keeps the two streams separate.
PAYLOAD_TMP="$(mktemp)"
for k in "${COPY_KEYS[@]}"; do
  line="$(grep -E "^${k}=" "$LOCAL/.env.local" 2>/dev/null | head -1 || true)"
  val="${line#*=}"
  if [ -n "$line" ] && [ -n "$val" ]; then
    printf '%s\n' "$line" >> "$PAYLOAD_TMP"
  else
    echo "    (skip $k — not set locally)"
  fi
done
# Forced VM-correct values (override whatever is local):
printf 'TALOS_PACKAGE_ID=%s\n' "$V2_PKG" >> "$PAYLOAD_TMP"
printf 'APP_URL=https://%s\n' "$FQDN" >> "$PAYLOAD_TMP"
# Reliable RPCs — the VM's default fullnode replica (centralindia) cannot read the v2
# vault/policy objects, which breaks the wallet UI AND the multi-user swarm. Pin the
# whole stack to consistently-indexed endpoints. SUI_RPC uses a "mainnet"-named host so
# it also satisfies run-swarm's URL fallback guard; wallet/event use publicnode.
printf 'SUI_RPC=https://rpc-mainnet.suiscan.xyz\n' >> "$PAYLOAD_TMP"
printf 'WALLET_RPC=https://sui-rpc.publicnode.com\n' >> "$PAYLOAD_TMP"
printf 'TALOS_EVENT_RPC=https://sui-rpc.publicnode.com\n' >> "$PAYLOAD_TMP"

echo "==> [3/4] Upserting env on the VM + install + build"
scp -q "$PAYLOAD_TMP" "$VM":/tmp/talos-env-upsert
rm -f "$PAYLOAD_TMP"
ssh "$VM" 'bash -s' <<'REMOTE'
set -e
cd ~/Talos
touch .env.local && chmod 600 .env.local
# Upsert each KEY=VALUE, reading from the scp'd FILE (not stdin — stdin is this script).
while IFS= read -r kv; do
  [ -z "$kv" ] && continue
  key="${kv%%=*}"
  if grep -qE "^${key}=" .env.local; then
    esc="$(printf '%s' "$kv" | sed 's/[&|]/\\&/g')"
    sed -i "s|^${key}=.*|${esc}|" .env.local
  else
    printf '%s\n' "$kv" >> .env.local
  fi
done < /tmp/talos-env-upsert
rm -f /tmp/talos-env-upsert
echo "    env keys now present:"
grep -oE '^[A-Z_]+=' .env.local | sort -u | sed 's/^/      /'
echo "    pnpm install..."
pnpm install --frozen-lockfile 2>&1 | tail -3
echo "    pnpm build..."
pnpm build 2>&1 | tail -6
REMOTE

echo "==> [4/4] Restarting PM2 ($MODE) + save"
if [ "$MODE" = "swarm" ]; then
  ssh "$VM" 'cd ~/Talos && pm2 restart talos-swarm && pm2 save && pm2 status'
else
  ssh "$VM" 'cd ~/Talos && pm2 restart all && pm2 save && pm2 status'
fi

echo ""
echo "==> Done. Tail the swarm to confirm it is iterating vaults:"
echo "    ssh $VM 'pm2 logs talos-swarm --lines 40'"
echo "    Look for:  MULTI_USER_ENABLED=true  and  listActiveVaults -> N"
