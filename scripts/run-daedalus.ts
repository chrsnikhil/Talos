import { runCritique } from "../lib/talos/daedalus"
import { readReputation } from "../lib/talos/chain"

async function main() {
  const net = (process.env.SUI_RPC ?? "").match(/mainnet/i) ? "mainnet" : "testnet"
  console.log(`Daedalus — critic pass (${net})\n`)
  await runCritique()
  const rep = await readReputation()
  console.log(`\nReputation: ${rep.total} ratings · average ${rep.avg}/100`)
  process.exit(0)
}

main()
