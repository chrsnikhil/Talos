import assert from "node:assert/strict";
import { signSession, verifySession } from "./session";

const token = await signSession({ sub: "abc123", email: "a@b.com" });
const ok = await verifySession(token);
assert.equal(ok?.sub, "abc123");
assert.equal(ok?.email, "a@b.com");
assert.equal(await verifySession("not.a.jwt"), null, "garbage → null");
console.log("session ok");
