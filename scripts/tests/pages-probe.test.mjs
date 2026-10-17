import test from "node:test";
import assert from "node:assert/strict";
import { pagesReady } from "../probe-pages.mjs";

test("deploy only when Pages exists in workflow mode", () => {
  assert.equal(pagesReady(200, { build_type: "workflow" }), true);
  assert.equal(pagesReady(200, { build_type: "legacy" }), false);
  assert.equal(pagesReady(200, {}), false);
  assert.equal(pagesReady(404, { build_type: "workflow" }), false);
  assert.equal(pagesReady(403, { build_type: "workflow" }), false);
  assert.equal(pagesReady(500, null), false);
});
