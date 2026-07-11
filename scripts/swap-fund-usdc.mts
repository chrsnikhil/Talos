// One-off: swap ~0.4 SUI -> USDC from the funding key via 7k, to fund a live deposit test.
//   node --import tsx scripts/swap-fund-usdc.mts [suiAmount=0.4]
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { MetaAg } from "@7kprotocol/sdk-ts";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromBase64 } from "@mysten/sui/utils";

const SUI = "0x2::sui::SUI";
const USDC = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";
const suiAmount = Number(process.argv[2] ?? 0.4);

const kp = Ed25519Keypair.fromSecretKey(process.env.WALLET_FUNDING_KEY!);
const me = kp.toSuiAddress();
const RPC = process.env.WALLET_RPC || getFullnodeUrl("mainnet");
const client = new SuiClient({ url: RPC });
const ag = new MetaAg({ fullnodeUrl: RPC, slippageBps: 100 });
const amountIn = Math.round(suiAmount * 1e9).toString();

console.log(`swapping ${suiAmount} SUI -> USDC from ${me}`);
const quotes = await ag.quote({ coinTypeIn: SUI, coinTypeOut: USDC, amountIn });
if (!quotes?.length) { console.log("no route"); process.exit(1); }
const sorted = [...quotes].sort((a, b) => (BigInt(b.amountOut) > BigInt(a.amountOut) ? 1 : -1));
console.log("best quote out ~", Number(sorted[0].amountOut) / 1e6, "USDC");

const usdcBal = async () => Number((await client.getBalance({ owner: me, coinType: USDC })).totalBalance);
const before = await usdcBal();
let ok = false;
for (let pass = 0; pass < 2 && !ok; pass++) {
  for (const quote of sorted.slice(0, 4)) {
    try {
      const r = await ag.fastSwap(
        { quote, signer: me, signTransaction: async (txBytes: string) => kp.signTransaction(fromBase64(txBytes)) },
        { options: { showEffects: true } },
      );
      const status = (r as { effects?: { status?: { status?: string } } }).effects?.status?.status;
      await new Promise((res) => setTimeout(res, 2500));
      const after = await usdcBal();
      console.log("swap tx", r.digest, "status", status, "USDC delta", (after - before) / 1e6);
      // Accept ONLY if USDC actually increased — 7k can report success on a no-op route.
      if (status === "success" && after > before) { ok = true; break; }
    } catch (e) {
      console.log("route failed:", String((e as Error).message).split("\n")[0].slice(0, 90));
    }
  }
}
const finalBal = await usdcBal();
console.log(ok ? "SWAP OK" : "NO REAL SWAP", "— funding USDC now:", finalBal / 1e6);
process.exit(ok ? 0 : 1);
