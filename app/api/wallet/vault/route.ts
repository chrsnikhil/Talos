import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/wallet/session";
import { users } from "@/lib/wallet/mongo";
import { suiClient, PACKAGE_ID, AGENT_POLICY_PKG } from "@/lib/wallet/config";
export const runtime = "nodejs";

export async function GET() {
  // --- Auth ---
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const u = await (await users()).findOne({ sub: session.sub });
  if (!u) return NextResponse.json({ error: "no wallet" }, { status: 404 });

  const address = u.address;

  try {
    // --- Step 1: Find OwnerCap among owned objects ---
    // OwnerCap's type origin is the v1 package (agent_policy was defined there and
    // upgrades preserve type origin), so filter by AGENT_POLICY_PKG, not PACKAGE_ID.
    const ownerCapType = `${AGENT_POLICY_PKG}::agent_policy::OwnerCap`;
    let cursor: string | null | undefined = undefined;
    let ownerCapId: string | null = null;
    let policyId: string | null = null;

    outer: while (true) {
      const page = await suiClient.getOwnedObjects({
        owner: address,
        filter: { StructType: ownerCapType },
        options: { showContent: true },
        cursor,
      });

      for (const item of page.data) {
        if (
          item.data?.content?.dataType === "moveObject" &&
          item.data.content.fields &&
          typeof item.data.content.fields === "object"
        ) {
          const fields = item.data.content.fields as Record<string, unknown>;
          ownerCapId = item.data.objectId;
          policyId = fields["policy_id"] as string;
          break outer;
        }
      }

      if (!page.hasNextPage) break;
      cursor = page.nextCursor ?? undefined;
    }

    if (!ownerCapId || !policyId) {
      return NextResponse.json({ exists: false });
    }

    // --- Step 2: Load AgentPolicy shared object ---
    let owner: string | null = null;
    let agent: string | null = null;
    let remainingBudget: string = "0";
    let revoked: boolean = false;
    let expiresAtMs: string = "0";

    try {
      const policyObj = await suiClient.getObject({
        id: policyId,
        options: { showContent: true },
      });

      if (
        policyObj.data?.content?.dataType === "moveObject" &&
        policyObj.data.content.fields &&
        typeof policyObj.data.content.fields === "object"
      ) {
        const f = policyObj.data.content.fields as Record<string, unknown>;
        owner = f["owner"] as string;
        agent = f["agent"] as string;
        remainingBudget = String(f["remaining_budget"] ?? "0");
        revoked = Boolean(f["revoked"]);
        expiresAtMs = String(f["expires_at_ms"] ?? "0");
      }
    } catch (err) {
      console.error("[vault/route] Failed to load AgentPolicy", policyId, err);
    }

    // --- Step 3: Find Vault via VaultCreated events filtered by policy_id ---
    let vaultId: string | null = null;
    let idleUsdc: string = "0";
    let principal: string = "0";

    try {
      const eventType = `${PACKAGE_ID}::vault::VaultCreated`;
      let evCursor: { txDigest: string; eventSeq: string } | null | undefined = null;
      let found = false;
      const MAX_PAGES = 20;
      let pageCount = 0;

      while (!found && pageCount < MAX_PAGES) {
        const evPage = await suiClient.queryEvents({
          query: { MoveEventType: eventType },
          cursor: evCursor,
          limit: 50,
          order: "descending",
        });

        pageCount++;

        for (const ev of evPage.data) {
          const parsed = ev.parsedJson as Record<string, unknown> | undefined;
          if (parsed && parsed["policy_id"] === policyId) {
            vaultId = parsed["vault_id"] as string;
            found = true;
            break;
          }
        }

        if (found || !evPage.hasNextPage) break;
        evCursor = evPage.nextCursor ?? undefined;
      }

      if (!found && pageCount >= MAX_PAGES) {
        console.warn("[vault/route] VaultCreated event not found within MAX_PAGES limit", { policyId, pageCount });
      }

      // --- Step 3b: Load Vault object for balances ---
      if (vaultId) {
        const vaultObj = await suiClient.getObject({
          id: vaultId,
          options: { showContent: true },
        });

        if (
          vaultObj.data?.content?.dataType === "moveObject" &&
          vaultObj.data.content.fields &&
          typeof vaultObj.data.content.fields === "object"
        ) {
          const vf = vaultObj.data.content.fields as Record<string, unknown>;
          // usdc is a Balance<S> represented as { fields: { value: "..." } } or just a number
          const usdcRaw = vf["usdc"];
          if (usdcRaw && typeof usdcRaw === "object" && "fields" in (usdcRaw as object)) {
            idleUsdc = String((usdcRaw as Record<string, unknown>)["fields"]
              ? ((usdcRaw as Record<string, { value?: unknown }>)["fields"])?.value ?? "0"
              : "0");
          } else if (typeof usdcRaw === "string" || typeof usdcRaw === "number") {
            idleUsdc = String(usdcRaw);
          }
          principal = String(vf["principal"] ?? "0");
        }
      }
    } catch (err) {
      console.error("[vault/route] Failed to resolve vault", err);
    }

    return NextResponse.json({
      exists: true,
      address,
      ownerCapId,
      policyId,
      vaultId,
      idleUsdc,
      principal,
      revoked,
      remainingBudget,
      expiresAtMs,
      owner,
      agent,
    });
  } catch (err) {
    console.error("[vault/route] Unexpected error", err);
    return NextResponse.json({ exists: false, error: String(err) }, { status: 200 });
  }
}
