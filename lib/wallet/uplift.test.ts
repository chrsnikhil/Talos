/**
 * Unit tests for computeUplift — run with: pnpm exec tsx lib/wallet/uplift.test.ts
 */
import { computeUplift } from "./uplift";

let passed = 0;
let failed = 0;

function assert(label: string, actual: unknown, expected: unknown) {
  const ok =
    typeof expected === "number"
      ? Math.abs((actual as number) - expected) < 0.0001
      : actual === expected;
  if (ok) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}`);
    console.error(`        expected: ${JSON.stringify(expected)}`);
    console.error(`        received: ${JSON.stringify(actual)}`);
    failed++;
  }
}

// -------------------------------------------------------------------
// Case 1: Three venues, known input
// venues: scallop=5.4, navi=6.2, kai=5.2
// sorted: [kai=5.2, scallop=5.4, navi=6.2]
// best = navi (6.2), baseline = median = scallop (5.4)
// upliftPct = 6.2 - 5.4 = 0.8
// upliftUsdPerYear (principal=10000) = 10000 * 0.8/100 = 80
// -------------------------------------------------------------------
console.log("\nCase 1: Three venues, principal=10000");
const r1 = computeUplift({
  venues: [
    { key: "scallop", apy: 5.4 },
    { key: "navi", apy: 6.2 },
    { key: "kai", apy: 5.2 },
  ],
  principal: 10_000,
});
assert("bestApy", r1.bestApy, 6.2);
assert("baselineApy", r1.baselineApy, 5.4);
assert("upliftPct", r1.upliftPct, 0.8);
assert("upliftUsdPerYear", r1.upliftUsdPerYear, 80);
assert("best", r1.best, "navi");
assert("baseline", r1.baseline, "scallop");

// -------------------------------------------------------------------
// Case 2: Two venues — median is lower of the two (index 0)
// venues: a=4.0, b=8.0
// sorted: [a=4.0, b=8.0]
// medianIdx = floor(1/2) = 0 → baseline = a=4.0
// best = b=8.0
// upliftPct = 4.0, upliftUsdPerYear (principal=5000) = 200
// -------------------------------------------------------------------
console.log("\nCase 2: Two venues, principal=5000");
const r2 = computeUplift({
  venues: [
    { key: "a", apy: 4.0 },
    { key: "b", apy: 8.0 },
  ],
  principal: 5_000,
});
assert("bestApy", r2.bestApy, 8.0);
assert("baselineApy", r2.baselineApy, 4.0);
assert("upliftPct", r2.upliftPct, 4.0);
assert("upliftUsdPerYear", r2.upliftUsdPerYear, 200);

// -------------------------------------------------------------------
// Case 3: Empty venues → all zeros
// -------------------------------------------------------------------
console.log("\nCase 3: Empty venues");
const r3 = computeUplift({ venues: [], principal: 1_000 });
assert("bestApy", r3.bestApy, 0);
assert("baselineApy", r3.baselineApy, 0);
assert("upliftPct", r3.upliftPct, 0);
assert("upliftUsdPerYear", r3.upliftUsdPerYear, 0);
assert("best", r3.best, "");

// -------------------------------------------------------------------
// Case 4: Principal = 0 → upliftUsdPerYear = 0 regardless of apy
// -------------------------------------------------------------------
console.log("\nCase 4: Principal=0");
const r4 = computeUplift({
  venues: [
    { key: "a", apy: 3.0 },
    { key: "b", apy: 9.0 },
  ],
  principal: 0,
});
assert("upliftUsdPerYear", r4.upliftUsdPerYear, 0);
assert("upliftPct", r4.upliftPct, 6.0);

// -------------------------------------------------------------------
// Case 5: Single venue → best = baseline → uplift = 0
// -------------------------------------------------------------------
console.log("\nCase 5: Single venue");
const r5 = computeUplift({
  venues: [{ key: "solo", apy: 7.5 }],
  principal: 1_000,
});
assert("bestApy", r5.bestApy, 7.5);
assert("baselineApy", r5.baselineApy, 7.5);
assert("upliftPct", r5.upliftPct, 0);
assert("upliftUsdPerYear", r5.upliftUsdPerYear, 0);

// -------------------------------------------------------------------
// Summary
// -------------------------------------------------------------------
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
