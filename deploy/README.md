# Deploying the Talos swarm to Azure

This runs the autonomous agent loop **and** the dashboard 24/7 on one always-on Ubuntu
VM, independent of your laptop. The swarm holds a real Sui key and moves real USDC within
the on-chain policy leash, so treat the box like production.

```
  Azure VM (Ubuntu, always on)
  ├─ pm2: talos-swarm   → autonomous loop, writes .talos-swarm.json
  ├─ pm2: talos-web     → next start :3000, reads that file
  └─ Caddy :443         → TLS reverse proxy → localhost:3000   (public dashboard)
```

Same box = the file-based tie keeps working with no shared-state refactor.

---

## 1. Create the VM (run locally, needs the `az` CLI + `az login`)

```bash
az group create -n talos-rg -l eastus

az vm create \
  --resource-group talos-rg \
  --name talos-vm \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard

# open the web ports (22 is already open for SSH)
az vm open-port -g talos-rg -n talos-vm --port 80,443 --priority 900
```

Give the public IP a DNS name so Caddy can get a TLS cert (Let's Encrypt needs a hostname,
not a bare IP). Find the public-IP resource name, then set a unique label:

```bash
az network public-ip list -g talos-rg -o table        # note the Name (e.g. talos-vmPublicIP)
az network public-ip update -g talos-rg -n talos-vmPublicIP --dns-name talos-demo
```

Your domain is now `talos-demo.eastus.cloudapp.azure.com` (label + region + cloudapp suffix).

SSH in:

```bash
ssh azureuser@talos-demo.eastus.cloudapp.azure.com
```

## 2. Get the code onto the VM (private repo → deploy key)

On the VM, make an SSH key and add it to GitHub as a **deploy key** (repo → Settings →
Deploy keys → Add, read-only is fine):

```bash
ssh-keygen -t ed25519 -C "talos-vm" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub      # paste this into GitHub deploy keys
```

Then clone:

```bash
git clone git@github.com:chrsnikhil/Talos.git
cd Talos
```

## 3. Add secrets (never committed)

```bash
cp .env.example .env.local
nano .env.local      # fill in TALOS_AGENT_KEY and GROQ_API_KEY (at minimum)
chmod 600 .env.local
```

## 4. Provision + launch

```bash
bash deploy/azure-setup.sh talos-demo.eastus.cloudapp.azure.com
```

This installs Node/pnpm/pm2/Caddy, builds, starts both processes under pm2 with reboot
persistence, and brings up TLS. When it finishes:

- **Dashboard:** `https://talos-demo.eastus.cloudapp.azure.com`
- **Status:** `pm2 status`
- **Logs:** `pm2 logs talos-swarm` · `pm2 logs talos-web`

## 5. Redeploy after a code change

```bash
cd ~/Talos
git pull
pnpm install
pnpm build
pm2 restart talos-web talos-swarm
```

---

## Operating notes

- **The leash still applies.** The swarm refuses to run on non-mainnet RPC, re-reads the
  on-chain policy every tick, and halts if you revoke it or it expires. The OwnerCap is
  your kill switch — revoking on-chain stops spending regardless of the box.
- **Gas:** the agent wallet needs SUI for tx fees; the loop pauses ticks below
  `TALOS_MIN_SUI` (default 0.1).
- **Cost:** a `B2s` is ~$30/mo; drop to `B1s` (~$8/mo) if the loop is light. Stopping
  (deallocating) the VM stops the agent.
- **Cycle counter** resets to 0 on a fresh box because `.talos-swarm.json` is gitignored
  and regenerated; it then persists across restarts on that box.
- **Secrets** live only in `.env.local` on the VM. For stricter handling, move them to
  Azure Key Vault and inject at process start.
