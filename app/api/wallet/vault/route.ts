import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/wallet/session";
import { users } from "@/lib/wallet/mongo";
import { suiClient, PACKAGE_ID, AGENT_POLICY_PKG } from "@/lib/wallet/config";
export const runtime = "nodejs";

/** getObject with a small retry so a single RPC hiccup doesn't zero out real balances. */
async function getObjectRetry(id: string, tries = 3) {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await suiClient.getObject({ id, options: { showContent: true } });
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/** Vault.usdc is a Balance<S> — { fields: { value } } — or occasionally a bare number. */
function parseIdle(vf: Record<string, unknown>): string {
  const usdcRaw = vf["usdc"];
  if (usdcRaw && typeof usdcRaw === "object" && "fields" in (usdcRaw as object)) {
    const v = (usdcRaw as Record<string, { value?: unknown }>)["fields"]?.value;
    return String(v ?? "0");
  }
  if (typeof usdcRaw === "string" || typeof usdcRaw === "number") return String(usdcRaw);
  return "0";
}

export async function GET() {
  // --- Auth ---
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const u = await (await users()).findOne({ sub: session.sub });
  if (!u) return NextResponse.json({ error: "no wallet" }, { status: 404 });
  const address = u.address;

  try {
    // --- Step 1: collect ALL OwnerCaps (user may hold several from earlier retries) ---
    // OwnerCap's type origin is the v1 package (upgrades preserve type origin).
    const ownerCapType = `${AGENT_POLICY_PKG}::agent_policy::OwnerCap`;
    const caps: { ownerCapId: string; policyId: string }[] = [];
    let cursor: string | null | undefined = undefined;
    while (true) {
      const page = await suiClient.getOwnedObjects({
        owner: address,
        filter: { StructType: ownerCapType },
        options: { showContent: true },
        cursor,
      });
      for (const item of page.data) {
        const fields =
          item.data?.content?.dataType === "moveObject" && item.data.content.fields
            ? (item.data.content.fields as Record<string, unknown>)
            : null;
        if (fields && item.data) {
          caps.push({ ownerCapId: item.data.objectId, policyId: String(fields["policy_id"]) });
        }
      }
      if (!page.hasNextPage) break;
      cursor = page.nextCursor ?? undefined;
    }
    if (caps.length === 0) return NextResponse.json({ exists: false });

    // --- Step 2: single VaultCreated scan → policyId → vaultId map ---
    const policyToVault = new Map<string, string>();
    {
      const eventType = `${PACKAGE_ID}::vault::VaultCreated`;
      let evCursor: { txDigest: string; eventSeq: string } | null | undefined = null;
      for (let pageCount = 0; pageCount < 20; pageCount++) {
        const evPage = await suiClient.queryEvents({
          query: { MoveEventType: eventType },
          cursor: evCursor,
          limit: 50,
          order: "descending",
        });
        for (const ev of evPage.data) {
          const parsed = ev.parsedJson as Record<string, unknown> | undefined;
          const pid = parsed ? String(parsed["policy_id"]) : "";
          const vid = parsed ? String(parsed["vault_id"]) : "";
          if (pid && vid && !policyToVault.has(pid)) policyToVault.set(pid, vid);
        }
        if (!evPage.hasNextPage || !evPage.nextCursor) break;
        evCursor = evPage.nextCursor;
      }
    }

    // --- Step 3: resolve every cap to a full candidate (policy + its vault balances) ---
    type Cand = {
      ownerCapId: string;
      policyId: string;
      vaultId: string | null;
      idleUsdc: string;
      principal: string;
      remainingBudget: string;
      revoked: boolean;
      expiresAtMs: string;
      owner: string | null;
      agent: string | null;
    };

    const candidates: Cand[] = await Promise.all(
      caps.map(async ({ ownerCapId, policyId }) => {
        let remainingBudget = "0",
          expiresAtMs = "0",
          owner: string | null = null,
          agent: string | null = null,
          revoked = false;
        try {
          const p = await getObjectRetry(policyId);
          const f =
            p.data?.content?.dataType === "moveObject" ? (p.data.content.fields as Record<string, unknown>) : null;
          if (f) {
            owner = String(f["owner"]);
            agent = String(f["agent"]);
            remainingBudget = String(f["remaining_budget"] ?? "0");
            revoked = Boolean(f["revoked"]);
            expiresAtMs = String(f["expires_at_ms"] ?? "0");
          }
        } catch (err) {
          console.error("[vault/route] policy read failed", policyId, err);
        }

        const vaultId = policyToVault.get(policyId) ?? null;
        let idleUsdc = "0",
          principal = "0";
        if (vaultId) {
          try {
            const vobj = await getObjectRetry(vaultId);
            const vf =
              vobj.data?.content?.dataType === "moveObject"
                ? (vobj.data.content.fields as Record<string, unknown>)
                : null;
            if (vf) {
              idleUsdc = parseIdle(vf);
              principal = String(vf["principal"] ?? "0");
            }
          } catch (err) {
            console.error("[vault/route] vault read failed", vaultId, err);
          }
        }
        return { ownerCapId, policyId, vaultId, idleUsdc, principal, remainingBudget, revoked, expiresAtMs, owner, agent };
      }),
    );

    // --- Step 4: deterministic pick — active (not revoked) with a vault, then most funds,
    // then stable tie-break by policyId. Guarantees the same vault every load. ---
    candidates.sort((a, b) => {
      const hasVault = (a.vaultId ? 1 : 0) - (b.vaultId ? 1 : 0);
      if (hasVault) return -hasVault;
      const active = (a.revoked ? 0 : 1) - (b.revoked ? 0 : 1);
      if (active) return -active;
      const funds = Number(a.idleUsdc) + Number(a.principal) - (Number(b.idleUsdc) + Number(b.principal));
      if (funds) return -funds;
      return a.policyId < b.policyId ? -1 : a.policyId > b.policyId ? 1 : 0;
    });
    const best = candidates[0];

    // --- Deployed position: which venue the agent supplied the vault's USDC into, so the
    // UI can show "deployed in scallop" instead of an empty-looking vault. Venue from the
    // vault's position dynamic fields; deployed amount ≈ principal − idle (exact for a
    // deposit→supply; a proxy after withdraws). One extra RPC, only for the selected vault.
    let position: { venue: string; deployed: string } | null = null;
    if (best.vaultId) {
      try {
        const dfs = await suiClient.getDynamicFields({ parentId: best.vaultId });
        for (const df of dfs.data) {
          const tn =
            typeof df.name?.value === "object" && df.name.value !== null
              ? String((df.name.value as { t?: unknown }).t ?? "")
              : String(df.name?.value ?? "");
          if (tn.includes("scallop_usdc")) { position = { venue: "scallop", deployed: "" }; break; }
          if (tn.toLowerCase().includes("yusdc")) { position = { venue: "kai", deployed: "" }; break; }
        }
        if (position) {
          position.deployed = String(Math.max(0, Number(best.principal) - Number(best.idleUsdc)));
        }
      } catch (err) {
        console.warn("[vault/route] position read failed:", err);
      }
    }

    return NextResponse.json({
      exists: true,
      address,
      ownerCapId: best.ownerCapId,
      policyId: best.policyId,
      vaultId: best.vaultId,
      idleUsdc: best.idleUsdc,
      principal: best.principal,
      revoked: best.revoked,
      remainingBudget: best.remainingBudget,
      expiresAtMs: best.expiresAtMs,
      owner: best.owner,
      agent: best.agent,
      // Deployed lending position (venue + approx USDC), or null if all idle.
      position,
      // How many policies/vaults this wallet holds (>1 = leftover duplicates from earlier retries).
      policyCount: candidates.length,
    });
  } catch (err) {
    console.error("[vault/route] Unexpected error", err);
    return NextResponse.json({ exists: false, error: String(err) }, { status: 200 });
  }
}
