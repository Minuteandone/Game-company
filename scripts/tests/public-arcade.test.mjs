import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_FILES } from "../build-public-arcade.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = path.join(ROOT, "_site");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const names = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) names.push(...await walk(absolute));
    else names.push(path.relative(SITE, absolute).replaceAll(path.sep, "/"));
  }
  return names;
}

test("public build contains exactly reviewed assets, excluding personal notes and tests", async () => {
  const staged = (await walk(SITE)).sort();
  assert.deepEqual(staged, [...PUBLIC_FILES, ".nojekyll"].sort());
  assert.equal(new Set(staged).size, staged.length);
  assert.ok(staged.includes("index.html"));
  assert.ok(staged.includes("playtest/index.html"));
  assert.ok(staged.includes("storage/shared/manual-playtest-checklist.md"));
  assert.ok(staged.every((name) => !name.includes("personal/")
    && !name.includes("/tests/") && !name.startsWith(".github/")
    && !name.startsWith("scripts/")));
});

test("staged bytes match repository sources exactly", async () => {
  for (const file of PUBLIC_FILES) {
    assert.deepEqual(await readFile(path.join(SITE, file)), await readFile(path.join(ROOT, file)), file);
  }
});

test("all four games and the worksheet are reachable from the packaged arcade", async () => {
  const index = await readFile(path.join(SITE, "index.html"), "utf8");
  for (const link of [
    "./games/signal-garden/", "./experiments/agent-02-prism-relay/",
    "./prototypes/ringfall/", "./prototypes/agent-04-pulse-garden/",
    "./playtest/"
  ]) {
    assert.ok(index.includes(`href="${link}"`), `missing arcade link: ${link}`);
  }
  const worksheet = await readFile(path.join(SITE, "playtest/index.html"), "utf8");
  assert.ok(worksheet.includes("./worksheet.mjs"));
  for (const asset of PUBLIC_FILES) {
    assert.ok((await stat(path.join(SITE, asset))).isFile(), asset);
  }
});
