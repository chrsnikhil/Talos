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
rsync -az \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude .env.local --exclude '*.key' --exclude '*.keystore' \
  --exclude .stray-keys --exclude .suicli \
  -e ssh "$LOCAL"/ "$VM":Talos/

echo "==> [2/4] Building the VM env-upsert payload from local .env.local"
# Collect "KEY=VALUE" lines for keys we want to push, straight from local .env.local.
PAYLOAD=""
for k in "${COPY_KEYS[@]}"; do
  line="$(grep -E "^${k}=" "$LOCAL/.env.local" 2>/dev/null | head -1 || true)"
  val="${line#*=}"
  if [ -n "$line" ] && [ -n "$val" ]; then
    PAYLOAD+="$line"$'\n'
  else
    echo "    (skip $k — not set locally)"
  fi
done
# Forced VM-correct values (override whatever is local):
PAYLOAD+="TALOS_PACKAGE_ID=$V2_PKG"$'\n'
PAYLOAD+="APP_URL=https://$FQDN"$'\n'

echo "==> [3/4] Upserting env on the VM + install + build"
printf '%s' "$PAYLOAD" | ssh "$VM" 'bash -s' <<'REMOTE'
set -e
cd ~/Talos
touch .env.local && chmod 600 .env.local
# Read the upsert payload from stdin, upsert each KEY=VALUE into .env.local.
while IFS= read -r kv; do
  [ -z "$kv" ] && continue
  key="${kv%%=*}"
  if grep -qE "^${key}=" .env.local; then
    # replace in place (| delimiter avoids clashes with / in values)
    esc="$(printf '%s' "$kv" | sed 's/[&|]/\\&/g')"
    sed -i "s|^${key}=.*|${esc}|" .env.local
  else
    printf '%s\n' "$kv" >> .env.local
  fi
done
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
