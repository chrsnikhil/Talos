// PM2 process manifest for the Talos box (one always-on Ubuntu VM on Azure).
//
// Runs BOTH processes on the same host so the file-based dashboard tie keeps working
// untouched (the swarm writes .talos-swarm.json; the web app reads it):
//   • talos-swarm — the autonomous agent loop (real USDC, policy-leashed), via tsx
//   • talos-web   — the Next.js dashboard (next start on :3000, fronted by Caddy + TLS)
//
// Both read secrets/config from .env.local (the swarm loads it via dotenv; Next loads it
// automatically). PM2 keeps them alive across crashes, logout, and reboot:
//
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup     # print + run the boot-startup hook
//
module.exports = {
  apps: [
    {
      name: "talos-swarm",
      // tsx runs the TypeScript entrypoint directly; tsx is a local devDependency, so
      // `node --import tsx` resolves it from node_modules (no global install needed).
      script: "scripts/run-swarm.ts",
      interpreter: "node",
      interpreter_args: "--import tsx",
      cwd: __dirname,
      autorestart: true,
      max_restarts: 50,
      restart_delay: 5000,
      max_memory_restart: "500M", // guard against a slow leak taking the box down
      time: true, // timestamp every log line
    },
    {
      name: "talos-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      autorestart: true,
      env: { NODE_ENV: "production" },
      time: true,
    },
  ],
}
