import assert from "node:assert/strict";
import { encryptSecret, decryptSecret } from "./crypto";

const plain = "suiprivkey1q"; // representative secret string
const { enc, iv, tag } = encryptSecret(plain);
assert.notEqual(enc, plain, "ciphertext must differ from plaintext");
assert.equal(decryptSecret(enc, iv, tag), plain, "roundtrip must recover plaintext");

// tamper detection: flipping a ciphertext byte must throw (GCM auth)
const bad = (enc[0] === "a" ? "b" : "a") + enc.slice(1);
assert.throws(() => decryptSecret(bad, iv, tag), "tampered ciphertext must fail auth");
console.log("crypto ok");
