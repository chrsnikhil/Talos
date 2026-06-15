#!/usr/bin/env bash
# Talos — one-shot provisioner for a fresh Ubuntu 22.04 LTS Azure VM.
#
# Run this FROM the repo root, ON the VM, AFTER you've cloned the repo and created
# .env.local (see deploy/README.md for the full runbook):
#
#   bash deploy/azure-setup.sh <your-domain>
#   # e.g. bash deploy/azure-setup.sh talos-demo.eastus.cloudapp.azure.com
#
# It installs Node + pnpm + pm2 + Caddy, builds the app, starts both processes under
# pm2 (with reboot persistence), and points Caddy at the dashboard with auto-TLS.
set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "✗ usage: bash deploy/azure-setup.sh <domain>   (e.g. talos-demo.eastus.cloudapp.azure.com)" >&2
  exit 1
fi
if [[ ! -f ".env.local" ]]; then
  echo "✗ .env.local not found in $(pwd)." >&2
  echo "  Create it first:  cp .env.example .env.local  &&  nano .env.local" >&2
  echo "  (fill in TALOS_AGENT_KEY + GROQ_API_KEY before continuing)" >&2
  exit 1
fi

echo "▸ [1/6] system packages"
sudo apt-get update -y
sudo apt-get install -y curl git debian-keyring debian-archive-keyring apt-transport-https ca-certificates gnupg

echo "▸ [2/6] Node 20 + pnpm + pm2"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo npm install -g pnpm pm2

echo "▸ [3/6] install deps + build (dev deps kept — tsx/typescript needed at runtime)"
pnpm install --frozen-lockfile || pnpm install
pnpm build

echo "▸ [4/6] Caddy (reverse proxy + automatic TLS)"
if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y caddy
fi
# Point Caddy at the dashboard for the given domain.
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
$DOMAIN {
	encode gzip
	reverse_proxy localhost:3000
}
EOF
sudo systemctl reload caddy || sudo systemctl restart caddy

echo "▸ [5/6] start swarm + web under pm2"
pm2 start ecosystem.config.js
pm2 save
# Enable boot-startup (prints a sudo command and runs it for systemd).
sudo env PATH="$PATH" pm2 startup systemd -u "$(whoami)" --hp "$HOME" | tail -n 1 | bash || true
pm2 save

echo "▸ [6/6] done"
echo
echo "  dashboard:  https://$DOMAIN"
echo "  processes:  pm2 status"
echo "  swarm log:  pm2 logs talos-swarm"
echo "  web log:    pm2 logs talos-web"
echo
echo "  If TLS doesn't come up: confirm ports 80+443 are open in the Azure NSG and that"
echo "  $DOMAIN resolves to this VM's public IP, then: sudo systemctl restart caddy"
