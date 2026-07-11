#!/usr/bin/env bash
#
# Cut the public app over to a custom domain (default: talosfi.xyz).
#
#   bash scripts/flip-domain.sh [domain]
#
# Idempotent + safe: it refuses to run until (1) the domain's A record resolves to the
# VM and (2) you confirm the Google OAuth redirect URI is registered — otherwise the
# APP_URL change would break Google login site-wide. It adds a Caddy vhost (Caddy then
# auto-provisions the Let's Encrypt cert), points APP_URL at the new domain, restarts the
# web app, and verifies the OAuth metadata + MCP challenge now advertise the new host.
#
# The Azure hostname vhost is left in place as a fallback (nothing is removed).
#
# AFTER this runs, deploy with:  TALOS_APP_DOMAIN=<domain> bash scripts/deploy-vm.sh
# so a redeploy does not revert APP_URL back to the Azure host.
set -euo pipefail

DOMAIN="${1:-talosfi.xyz}"
VM="azureuser@20.219.0.224"
VM_IP="20.219.0.224"

echo "==> Cutover target: https://$DOMAIN  (proxy -> localhost:3000)"

# 1) DNS gate — the A record MUST resolve to the VM before Caddy can pass the ACME
#    HTTP-01 challenge. Abort otherwise (prevents Let's Encrypt failure/backoff).
echo "==> [1/5] Checking $DOMAIN resolves to $VM_IP ..."
resolved="$(nslookup "$DOMAIN" 8.8.8.8 2>/dev/null | awk '/^Address: /{print $2}' | tail -1 || true)"
if [ "$resolved" != "$VM_IP" ]; then
  echo "    ✗ $DOMAIN resolves to '${resolved:-nothing}', expected $VM_IP."
  echo "      DNS not ready (or A record wrong). Add A @ -> $VM_IP and wait for propagation."
  exit 1
fi
echo "    ✓ DNS OK ($DOMAIN -> $VM_IP)"

# 2) Confirm the Google OAuth redirect is registered — flipping APP_URL repoints the
#    Google login redirect_uri to https://$DOMAIN/api/auth/callback for ALL logins.
if [ "${CONFIRM_GOOGLE_REDIRECT:-}" != "yes" ]; then
  echo "==> [2/5] SAFETY STOP."
  echo "    Before flipping APP_URL, add this to your Google Cloud OAuth client's"
  echo "    Authorized redirect URIs (else Google login breaks everywhere):"
  echo "        https://$DOMAIN/api/auth/callback"
  echo "    Then re-run:  CONFIRM_GOOGLE_REDIRECT=yes bash scripts/flip-domain.sh $DOMAIN"
  exit 2
fi
echo "==> [2/5] Google redirect confirmed by operator."

# 3) Add the Caddy vhost (idempotent) + reload so Caddy provisions the TLS cert.
echo "==> [3/5] Adding Caddy vhost for $DOMAIN + reloading ..."
ssh "$VM" "DOMAIN='$DOMAIN' bash -s" <<'REMOTE'
set -e
CADDYFILE=/etc/caddy/Caddyfile
if sudo grep -q "^${DOMAIN} {" "$CADDYFILE"; then
  echo "    vhost already present — skipping append"
else
  printf '\n%s {\n\tencode gzip\n\treverse_proxy localhost:3000\n}\n' "$DOMAIN" | sudo tee -a "$CADDYFILE" >/dev/null
  echo "    vhost appended"
fi
sudo caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null 2>&1 && echo "    Caddyfile valid"
sudo systemctl reload caddy
echo "    caddy reloaded"
REMOTE

# 4) Point APP_URL at the new domain + restart the web app (picks up OAuth issuer/redirect).
echo "==> [4/5] Setting APP_URL=https://$DOMAIN + restarting talos-web ..."
ssh "$VM" "DOMAIN='$DOMAIN' bash -s" <<'REMOTE'
set -e
cd ~/Talos
touch .env.local && chmod 600 .env.local
if grep -q '^APP_URL=' .env.local; then
  sed -i "s|^APP_URL=.*|APP_URL=https://${DOMAIN}|" .env.local
else
  printf 'APP_URL=https://%s\n' "$DOMAIN" >> .env.local
fi
echo "    APP_URL now: $(grep '^APP_URL=' .env.local)"
pm2 restart talos-web >/dev/null && echo "    talos-web restarted"
REMOTE

# 5) Verify the cert + that metadata/MCP now advertise the new host. Caddy's first cert
#    can take a few seconds; retry the HTTPS check briefly.
echo "==> [5/5] Verifying https://$DOMAIN ..."
ok=""
for i in $(seq 1 12); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/dashboard?tab=VAULT" 2>/dev/null || true)"
  if [ "$code" = "200" ]; then ok=1; break; fi
  echo "    waiting for cert/serve ($i) ... got '$code'"
  sleep 5
done
[ -n "$ok" ] || { echo "    ✗ https://$DOMAIN not serving 200 yet — check 'sudo journalctl -u caddy'"; exit 3; }
echo "    ✓ dashboard 200"
echo -n "    PRM issuer: "; curl -s "https://$DOMAIN/.well-known/oauth-protected-resource" | grep -o "\"authorization_servers\":\[[^]]*\]"
echo -n "    MCP 401 challenge: "; curl -s -i -X POST "https://$DOMAIN/api/mcp/mcp" -H 'Content-Type: application/json' --data '{}' | grep -ic "resource_metadata" | sed 's/^1$/OK/;s/^0$/MISSING/'

echo ""
echo "==> DONE. New connector URL:  https://$DOMAIN/api/mcp/mcp"
echo "    Remove + re-add the connector in Claude web to refresh the (now Talos) icon."
echo "    Future deploys:  TALOS_APP_DOMAIN=$DOMAIN bash scripts/deploy-vm.sh"
