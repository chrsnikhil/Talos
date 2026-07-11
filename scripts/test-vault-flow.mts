// Harden the money path: build deposit/withdraw/panic with the REAL client builders,
// run them through the REAL execute allowlist, and dry-run withdraw/panic on mainnet.
//   node --import tsx scripts/test-vault-flow.mts
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { buildDeposit, buildOwnerWithdrawUsdc, buildPanic } from "../lib/wallet/vault-tx";
import { isAllowed } from "../lib/wallet/execute-allowlist";

// Test objects created earlier by the funding key (throwaway).
const VAULT = "0x70249a604b70a128adeaac740f9c71f4c2c1f45ba675083ad3de7ff404db18cc";
const OWNER_CAP = "0xe7787b58523332c8a3f1f62ac900e721055afaeea0302164e46b8641efeb51f3";
const POLICY = "0x6673c5bfac56b26c96d82bae0ac1a50d59089e05a76b50b6f8e6672fe46804f4";

const kp = Ed25519Keypair.fromSecretKey(process.env.WALLET_FUNDING_KEY!);
const me = kp.toSuiAddress();
const c = new SuiClient({ url: getFullnodeUrl("mainnet") });

async function dryRun(label: string, tx: any) {
  tx.setSender(me);
  try {
    const bytes = await tx.build({ client: c });
    const dr = await c.dryRunTransactionBlock({ transactionBlock: bytes });
    console.log(`   dry-run: ${dr.effects.status.status} ${dr.effects.status.error ?? ""}`);
  } catch (e: any) {
    console.log(`   dry-run build threw: ${e?.message ?? e}`);
  }
}

// ── Deposit ── (allowlist only — funding key has no USDC to dry-run the move)
const dep = buildDeposit({ vaultId: VAULT, coinObjectId: VAULT /*placeholder*/, amount: 1_000_000 });
console.log("DEPOSIT   allowlist:", isAllowed(dep, me));

// ── Withdraw (amount 0, empty vault) ──
const wd = buildOwnerWithdrawUsdc({ vaultId: VAULT, ownerCapId: OWNER_CAP, amount: 0, sender: me });
console.log("WITHDRAW  allowlist:", isAllowed(wd, me));
await dryRun("withdraw", buildOwnerWithdrawUsdc({ vaultId: VAULT, ownerCapId: OWNER_CAP, amount: 0, sender: me }));

// ── Panic (revoke + withdraw all + transfer) ──
const pn = buildPanic({ policyId: POLICY, vaultId: VAULT, ownerCapId: OWNER_CAP, amount: 0, sender: me });
console.log("PANIC     allowlist:", isAllowed(pn, me));
await dryRun("panic", buildPanic({ policyId: POLICY, vaultId: VAULT, ownerCapId: OWNER_CAP, amount: 0, sender: me }));

// ── Negative control: transfer to a NON-signer must be rejected ──
const evil = buildOwnerWithdrawUsdc({ vaultId: VAULT, ownerCapId: OWNER_CAP, amount: 0, sender: "0x000000000000000000000000000000000000000000000000000000000000dead" });
console.log("EVIL(transfer-to-other) allowlist:", isAllowed(evil, me), "(must be false)");
