import test from "node:test";
import assert from "node:assert/strict";
import { SITE, CHECKS, publicUrl, validateResponse, checkLiveSite } from "../check-live-arcade.mjs";

test("live-site URLs stay under the exact public GitHub Pages repository", () => {
  assert.equal(publicUrl("games/signal-garden/"), SITE + "games/signal-garden/");
  const paths = new Set(CHECKS.map(check => check.path));
  for (const lab of [
    "experiments/agent-01-coupled-garden/",
    "experiments/agent-02-prism-spectrum-lab/",
    "experiments/agent-04-pulse-voices/"
  ]) assert.ok(paths.has(lab), "comparison lab must remain explicitly reviewed for public GET verification: " + lab);
  for (const [route, kind] of [
    ["playtest/compare/", "html"],
    ["playtest/compare/compare.mjs", "script"],
    ["playtest/compare/pairs.mjs", "script"]
  ]) {
    const check = CHECKS.find(item => item.path === route);
    assert.ok(check, "public comparison worksheet dependency not reviewed: " + route);
    assert.equal(check.type, kind);
    assert.equal(publicUrl(route), SITE + route);
  }
  for (const bad of ["../", "../other/", "/other", "https://example.com", "playtest/?q=x", "a#x"]) {
    assert.throws(() => publicUrl(bad), /Only repository-relative/);
  }
});

test("MIME, response status and expected contents are all required", () => {
  const check = { type: "script", marker: "export function tracePower" };
  const fake = (status, mime) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => mime }
  });
  assert.deepEqual(validateResponse(check, fake(200, "application/javascript"), "export function tracePower() {}"), []);
  assert.match(validateResponse(check, fake(200, "text/html"), check.marker).join(","), /JavaScript module MIME/);
  assert.match(validateResponse(check, fake(404, "application/javascript"), check.marker).join(","), /HTTP 404/);
  assert.match(validateResponse(check, fake(200, "application/javascript"), "<html>404</html>").join(","), /missing expected/);

  const png = { type: "image" };
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual(validateResponse(png, fake(200, "image/png"), signature), []);
  assert.match(validateResponse(png, fake(200, "text/html"), signature).join(","), /expected PNG MIME/);
  assert.match(validateResponse(png, fake(200, "image/png"), Uint8Array.from([0, 1, 2])).join(","), /invalid PNG signature/);
});

test("audit exercises only the reviewed public GET paths", async () => {
  const requested = [];
  const fakeFetch = async (url, options) => {
    requested.push({ url, options });
    const check = CHECKS.find((item) => publicUrl(item.path) === url);
    assert.ok(check, "unexpected outbound request");
    const pngSignature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
    return {
      ok: true,
      status: 200,
      headers: { get: () => check.type === "html"
        ? "text/html; charset=utf-8"
        : check.type === "image" ? "image/png" : "text/javascript" },
      text: async () => check.marker,
      arrayBuffer: async () => pngSignature.buffer
    };
  };
  const results = await checkLiveSite(fakeFetch);
  assert.equal(results.length, CHECKS.length);
  assert.ok(results.every((result) => result.failures.length === 0));
  for (const request of requested) {
    assert.equal(request.options.method, "GET");
    assert.equal(request.options.redirect, "error");
    assert.ok(request.url.startsWith(SITE));
  }
});

test("network and server failures become understandable results", async () => {
  const failed = await checkLiveSite(async () => { throw new Error("offline test"); });
  assert.equal(failed.length, CHECKS.length);
  assert.ok(failed.every((result) => result.failures[0].includes("offline test")));
});
