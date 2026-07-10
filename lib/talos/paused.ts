import { users } from "@/lib/wallet/mongo";

/**
 * Returns true iff the user identified by `sub` has paused their agent.
 * Returns false if the user doc is absent, the flag is unset, or on any DB error
 * (a transient DB hiccup must NOT silently pause a live agent).
 */
export async function isPaused(sub: string): Promise<boolean> {
  try {
    const col = await users();
    const doc = await col.findOne({ sub }, { projection: { paused: 1 } });
    return !!doc?.paused;
  } catch (err) {
    console.error("[isPaused] DB error — defaulting to NOT paused:", err);
    return false;
  }
}
