import test from "node:test";
import assert from "node:assert/strict";
import { auditAll, auditGrid } from "./difficulty-audit.mjs";
import { LEVELS } from "./levels.mjs";

test("all shipped puzzles have unique optimal paths and stable configuration counts", () => {
  const audits = auditAll();
  assert.deepEqual(audits.map(x => x.mirrors), [3, 4, 5, 9]);
  assert.deepEqual(audits.map(x => x.minimumRotations), [1, 2, 3, 3]);
  assert.deepEqual(audits.map(x => x.shortestSolutionCount), [1, 1, 1, 1]);
  assert.deepEqual(audits.map(x => x.winningConfigurations), [1, 1, 1, 64]);
  assert.deepEqual(audits.map(x => x.totalConfigurations), [8, 16, 32, 512]);
  assert.deepEqual(audits.map(x => x.distinctTracedPaths), [4, 5, 6, 8]);
  assert.deepEqual(audits.map(x => x.mirrorsChangingBeamFromOneFlip), [1, 1, 1, 3]);
  assert.ok(audits.every(x => x.width === 7 && x.height === 7));
});

test("a trivial already-connected route is recognized as a zero-turn solution", () => {
  const result = auditGrid(["E.T", "..."]);
  assert.equal(result.mirrors, 0);
  assert.equal(result.minimumRotations, 0);
  assert.equal(result.shortestSolutionCount, 1);
  assert.equal(result.winningConfigurations, 1);
});

test("exhaustive work is bounded when given too many mirrors", () => {
  assert.throws(() => auditGrid(LEVELS[3].grid, 5), /limit exceeded/);
});
