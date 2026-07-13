#!/usr/bin/env bash
# One-shot recovery: clean up any stray lines a failed env-upsert appended to .env.local,
# run the install+build if it did not complete, and restart.
set -e
cd ~/Talos

echo "== stripping garbage lines from .env.local =="
grep -vE '^(echo|grep|pnpm|sed)[[:space:]]' .env.local > .env.local.clean
cat .env.local.clean > .env.local   # overwrite content, keep perms
rm -f .env.local.clean
echo "   env lines now: $(wc -l < .env.local)"
echo "   package: $(grep '^TALOS_PACKAGE_ID=' .env.local || echo '(none)')"

echo "== pnpm install (mongodb etc.) =="
pnpm install --frozen-lockfile 2>&1 | tail -4

echo "== pnpm build =="
pnpm build 2>&1 | tail -6

echo "== restart =="
pm2 restart all && pm2 save
pm2 status | grep -E "talos|status"
