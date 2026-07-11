import { AsyncLocalStorage } from "node:async_hooks";
import { createMcpHandler } from "mcp-handler";
import { verifyMcpToken } from "@/lib/wallet/mcp-token";
import { users } from "@/lib/wallet/mongo";
import { signSession, SESSION_COOKIE } from "@/lib/wallet/session";
import { issuer, CORS_HEADERS, corsPreflight } from "@/lib/wallet/oauth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Per-request user context. Bearer auth: a missing/invalid token returns 401 WITH an
// OAuth `WWW-Authenticate` challenge pointing at our Protected Resource Metadata —
// this is exactly what makes Claude.ai web start its OAuth 2.1 discovery (it does NOT
// support static bearer headers on custom connectors). Valid tokens are the per-user
// JWTs minted by the OAuth token endpoint (or the manual /api/wallet/mcp-token route).
const subStore = new AsyncLocalStorage<string>();
const currentSub = () => subStore.getStore()!;

// Tools reuse the existing session-gated routes by calling this app over loopback as the
// authenticated user — so all vault/policy/RPC logic (and its reliable RPC) is shared.
const BASE = process.env.MCP_INTERNAL_BASE || "http://127.0.0.1:3000";
const usd = (x: unknown) => (Number(x ?? 0) / 1e6).toFixed(4);

async function cookieForCurrent(): Promise<string> {
  const sub = currentSub();
  const u = await (await users()).findOne({ sub });
  const token = await signSession({ sub, email: u?.email ?? "" });
  return `${SESSION_COOKIE}=${token}`;
}
async function getJson(path: string, cookie?: string) {
  const res = await fetch(`${BASE}${path}`, { headers: cookie ? { Cookie: cookie } : {}, cache: "no-store" });
  return res.json();
}
async function postJson(path: string, body: unknown, cookie: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  return res.json();
}
const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_vault",
      {
        title: "Get vault status",
        description:
          "Your Talos vault: idle USDC, deployed lending position (which venue, earning), principal, policy status and remaining budget.",
        inputSchema: {},
      },
      async () => {
        const v = await getJson("/api/wallet/vault", await cookieForCurrent());
        if (!v?.exists) return text("No vault yet — create one in the Talos app first.");
        const pos = v.position
          ? `deployed: ${usd(v.position.deployed)} USDC in ${v.position.venue} (earning)`
          : "deployed: none (all idle)";
        return text(
          `Vault ${v.vaultId}\nidle: ${usd(v.idleUsdc)} USDC\nprincipal: ${usd(v.principal)} USDC\n${pos}\npolicy: ${v.revoked ? "REVOKED" : "active"} · budget left ${usd(v.remainingBudget)} USDC`,
        );
      },
    );

    server.registerTool(
      "get_swarm_status",
      { title: "Get swarm status", description: "The Talos agent swarm: active/idle, cycles run, brain (LLM), on-chain reputation.", inputSchema: {} },
      async () => {
        const s = await getJson("/api/talos/swarm");
        const rep = s?.reputation?.total != null ? `${s.reputation.total} ratings (avg ${s.reputation.avg}/100)` : "n/a";
        return text(`Swarm: ${s?.active ? "ACTIVE" : "idle"} · ${s?.cycles ?? 0} cycles · brain ${s?.provider ?? "?"} ${s?.model ?? ""} · reputation ${rep}`);
      },
    );

    server.registerTool(
      "get_yields",
      { title: "Get live venue APYs", description: "Live USDC supply APYs across Scallop, Navi and Kai, and the best one.", inputSchema: {} },
      async () => {
        const y = await getJson("/api/wallet/yields");
        const rows = (y?.venues ?? []).map((v: { key: string; apy: number }) => `${v.key}: ${v.apy}%`).join("\n");
        return text(`${rows}${y?.best ? `\nbest: ${y.best}` : ""}`);
      },
    );

    server.registerTool(
      "pause_agent",
      { title: "Pause your agent", description: "Pause the swarm for your vault — it stops rebalancing your funds until you resume. Reversible.", inputSchema: {} },
      async () => {
        const r = await postJson("/api/wallet/agent", { paused: true }, await cookieForCurrent());
        return text(r?.paused === true ? "Agent paused — the swarm will skip your vault until you resume." : "Could not pause the agent.");
      },
    );

    server.registerTool(
      "resume_agent",
      { title: "Resume your agent", description: "Resume the swarm for your vault — it starts managing your funds again.", inputSchema: {} },
      async () => {
        const r = await postJson("/api/wallet/agent", { paused: false }, await cookieForCurrent());
        return text(r?.paused === false ? "Agent resumed — the swarm is managing your vault again." : "Could not resume the agent.");
      },
    );
  },
  {},
  { basePath: "/api/mcp", maxDuration: 60, verboseLogs: true },
);

// 401 with the RFC 9728 resource_metadata pointer → triggers Claude's OAuth discovery.
const unauthorized = () =>
  new Response(JSON.stringify({ error: "invalid_token", error_description: "authorization required" }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "WWW-Authenticate": `Bearer error="invalid_token", resource_metadata="${issuer()}/.well-known/oauth-protected-resource"`,
      ...CORS_HEADERS,
    },
  });

function withCors(res: Response): Response {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
}

// Bearer auth → run the handler inside the user's async context.
async function authed(req: Request): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  if (!bearer) return unauthorized();
  const claims = await verifyMcpToken(bearer);
  if (!claims) return unauthorized();
  const u = await (await users()).findOne({ sub: claims.sub });
  if (!u || (u.mcpTokenVersion ?? 0) !== claims.tv) return unauthorized();
  const res = await subStore.run(claims.sub, () => handler(req) as Promise<Response>);
  return withCors(res);
}

export { authed as GET, authed as POST, authed as DELETE };
export const OPTIONS = () => corsPreflight();
