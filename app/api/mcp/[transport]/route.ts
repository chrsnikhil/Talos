import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { verifyMcpToken } from "@/lib/wallet/mcp-token";
import { users } from "@/lib/wallet/mongo";
import { signSession, SESSION_COOKIE } from "@/lib/wallet/session";

export const runtime = "nodejs";
export const maxDuration = 60;

// The MCP tools reuse the existing session-gated routes by calling this same app over
// loopback as the authenticated user — so all vault/policy/RPC logic (and its reliable
// RPC) is shared, and the MCP layer stays a thin, per-user wrapper.
const BASE = process.env.MCP_INTERNAL_BASE || "http://127.0.0.1:3000";
const usd = (x: unknown) => (Number(x ?? 0) / 1e6).toFixed(4);

async function cookieFor(sub: string): Promise<string> {
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
const subOf = (extra: { authInfo?: AuthInfo }) =>
  (extra.authInfo?.extra as { sub?: string } | undefined)?.sub ?? (extra.authInfo?.clientId as string);

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
      async (_args, extra) => {
        const v = await getJson("/api/wallet/vault", await cookieFor(subOf(extra)));
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
      async (_args, extra) => {
        const r = await postJson("/api/wallet/agent", { paused: true }, await cookieFor(subOf(extra)));
        return text(r?.paused === true ? "Agent paused — the swarm will skip your vault until you resume." : "Could not pause the agent.");
      },
    );

    server.registerTool(
      "resume_agent",
      { title: "Resume your agent", description: "Resume the swarm for your vault — it starts managing your funds again.", inputSchema: {} },
      async (_args, extra) => {
        const r = await postJson("/api/wallet/agent", { paused: false }, await cookieFor(subOf(extra)));
        return text(r?.paused === false ? "Agent resumed — the swarm is managing your vault again." : "Could not resume the agent.");
      },
    );
  },
  {},
  { basePath: "/api/mcp", maxDuration: 60, verboseLogs: true },
);

// Per-user bearer auth: validate the token, then confirm it hasn't been revoked
// (its version must still match the user's current mcpTokenVersion).
const verifyToken = async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;
  const claims = await verifyMcpToken(bearerToken);
  if (!claims) return undefined;
  const u = await (await users()).findOne({ sub: claims.sub });
  if (!u || (u.mcpTokenVersion ?? 0) !== claims.tv) return undefined;
  return { token: bearerToken, clientId: claims.sub, scopes: claims.scope.split("+"), extra: { sub: claims.sub } };
};

const authHandler = withMcpAuth(handler, verifyToken, { required: true });
export { authHandler as GET, authHandler as POST, authHandler as DELETE };
