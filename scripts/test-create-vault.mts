// Reproduce the vault-creation flow to capture the exact on-chain error.
//   node --import tsx scripts/test-create-vault.mts
// Uses WALLET_FUNDING_KEY as a throwaway owner. Creates a real AgentPolicy (cheap),
// then DRY-RUNS create_vault two ways (pure vector<TypeName> vs makeMoveVec) to see
// which the VM accepts. No vault is actually created (dry run).
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";

const PKG = "0x9c49978732d2e8cb38f0744f825bc1d5431f34582811bfef6b099c785a22031f";
const USDC = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";
const TYPENAME = "0x1::type_name::TypeName";
const AGENT = "0x1f0455e5fb79711dff710e04aa9a7ea4dbb582b77a3a5452fcc61be1cb80ea7f";

const kp = Ed25519Keypair.fromSecretKey(process.env.WALLET_FUNDING_KEY!);
const me = kp.toSuiAddress();
const c = new SuiClient({ url: getFullnodeUrl("mainnet") });
console.log("sender:", me);

// ── 1. Create a policy (real tx, cheap) so we have an owned AgentPolicy to test against ──
const pTx = new Transaction();
pTx.moveCall({
  target: `${PKG}::agent_policy::create_policy_entry`,
  arguments: [
    pTx.pure.address(AGENT),
    pTx.pure.u64(1_000_000_000n),
    pTx.pure.u64(100_000_000n),
    pTx.pure.vector("string", ["scallop", "navi", "kai"]),
    pTx.pure.u64(BigInt(Date.now() + 30 * 24 * 60 * 60 * 1000)),
  ],
});
const pRes = await c.signAndExecuteTransaction({
  signer: kp, transaction: pTx, options: { showEffects: true, showObjectChanges: true },
});
await c.waitForTransaction({ digest: pRes.digest });
console.log("create_policy status:", pRes.effects?.status?.status, pRes.effects?.status?.error ?? "");
const policyChange = (pRes.objectChanges ?? []).find(
  (o: any) => o.type === "created" && String(o.objectType).includes("::agent_policy::AgentPolicy"),
) as any;
const policyId = policyChange?.objectId;
console.log("policyId:", policyId);
if (!policyId) { console.log("no policy created — aborting"); process.exit(1); }

async function dryVault(label: string, build: (tx: Transaction) => void) {
  const tx = new Transaction();
  tx.setSender(me);
  build(tx);
  try {
    const bytes = await tx.build({ client: c });
    const dr = await c.dryRunTransactionBlock({ transactionBlock: bytes });
    console.log(`\n[${label}] status:`, dr.effects.status.status, dr.effects.status.error ?? "");
  } catch (e: any) {
    console.log(`\n[${label}] build/dry-run threw:`, e?.message ?? e);
  }
}

// ── 2a. Current builder: pure vector<TypeName> (suspected bad) ──
await dryVault("pure vector<string> as allowed", (tx) => {
  tx.moveCall({
    target: `${PKG}::vault::create_vault`,
    typeArguments: [USDC],
    arguments: [tx.object(policyId), tx.pure.vector("string", [])],
  });
});

// ── 2b. Proposed fix: makeMoveVec of TypeName, empty ──
await dryVault("makeMoveVec<TypeName> empty as allowed", (tx) => {
  const empty = tx.makeMoveVec({ type: TYPENAME, elements: [] });
  tx.moveCall({
    target: `${PKG}::vault::create_vault`,
    typeArguments: [USDC],
    arguments: [tx.object(policyId), empty],
  });
});
