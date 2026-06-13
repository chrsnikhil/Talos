import { runCycle } from "../lib/talos/icarus"

const CYCLES = Number(process.env.TALOS_CYCLES ?? 4)
const INTERVAL_MS = Number(process.env.TALOS_INTERVAL_MS ?? 8000)

async function main() {
  console.log(`Icarus runtime — ${CYCLES} cycles @ ${INTERVAL_MS}ms (testnet)\n`)
  for (let n = 1; n <= CYCLES; n++) {
    try {
      await runCycle(n)
    } catch (e: any) {
      console.error(`[#${n}] cycle error:`, e?.message ?? e)
    }
    if (n < CYCLES) await new Promise((r) => setTimeout(r, INTERVAL_MS))
  }
  console.log("\nIcarus runtime finished.")
  process.exit(0)
}

main()
