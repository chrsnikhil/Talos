import { runCritique } from "../lib/talos/daedalus"
import { readReputation } from "../lib/talos/chain"

async function main() {
  console.log("Daedalus — critic pass (testnet)\n")
  await runCritique()
  const rep = await readReputation()
  console.log(`\nReputation: ${rep.total} ratings · average ${rep.avg}/100`)
  process.exit(0)
}

main()
