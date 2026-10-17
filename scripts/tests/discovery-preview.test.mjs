import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCatalog, formatPreview, readCatalog } from "../discovery-preview.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("four experiments have correct credits and existing start pages", async () => {
  const catalog = await readCatalog();
  assert.deepEqual(validateCatalog(catalog), []);
  assert.deepEqual(catalog.games.map(game => [game.id, game.original_author]), [
    ["signal-garden", "agent-01 (AI agent)"],
    ["prism-relay", "agent-02 (AI agent)"],
    ["ringfall", "agent-03 (AI agent)"],
    ["pulse-garden", "agent-04 (AI agent)"]
  ]);
  for (const game of catalog.games) await access(path.join(ROOT, game.path, "index.html"));
});

test("preview identifies drafts, authorship and unavailable hosting", async () => {
  const catalog = await readCatalog();
  const output = formatPreview(catalog);
  assert.match(output, /discovery preview \(NOT PUBLISHED\)/);
  assert.match(output, /no verified public hosted play URL/i);
  assert.match(output, /No social post, HTTP POST, API call/i);
  assert.match(output, /python3 -m http.server 8000/);
  assert.equal((output.match(/Original author/g) || []).length, 4);
  for (const game of catalog.games) {
    assert.ok(output.includes(game.summary));
    assert.ok(output.includes(game.original_author));
    assert.ok(output.includes("tree/main/" + game.path.replace(/\/$/, "")));
  }
  assert.match(output, /GitHub Actions reports a successful Pages deployment/);
  assert.match(output, /https:\/\/minuteandone\.github\.io\/Game-company\//);
  assert.match(output, /Independent HTTP play checks were unavailable/);
});

test("reject invalid paths, claims of hosting, missing credits and duplicated IDs", async () => {
  const catalog = await readCatalog();
  const clone = () => structuredClone(catalog);
  const hacked = clone(); hacked.games[0].path = "../secrets/";
  assert.match(validateCatalog(hacked).join(","), /unsafe local path/);
  const hosted = clone(); hosted.public_hosted_url = "https://example.com";
  assert.match(validateCatalog(hosted).join(","), /Hosting URL must remain unset/);
  const unsupportedDeploy = clone(); unsupportedDeploy.reported_deployment.url = "https://example.com/";
  assert.match(validateCatalog(unsupportedDeploy).join(","), /Reported deployment evidence/);
  const duplicate = clone(); duplicate.games[1].id = duplicate.games[0].id;
  assert.match(validateCatalog(duplicate).join(","), /duplicate ID/);
  const missingCredit = clone(); missingCredit.games[0].original_author = "anonymous";
  assert.match(validateCatalog(missingCredit).join(","), /missing attribution/);
  assert.throws(() => formatPreview(hacked), /unsafe local path/);
});

test("root document advertises catalog and preview metadata without invented live URL", async () => {
  const html = await readFile(path.join(ROOT, "index.html"), "utf8");
  assert.match(html, /rel="alternate" type="application\/json" href="\.\/discovery\/catalog\.json"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:description"/);
  assert.doesNotMatch(html, /property="og:url"/);
});
