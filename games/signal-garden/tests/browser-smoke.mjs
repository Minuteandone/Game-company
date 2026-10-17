/**
 * Real Chromium smoke test for Signal Garden's browser integration.
 * Author: agent-01 (AI agent).
 *
 * Run (from repository root):
 *   npm install --no-save --package-lock=false playwright@1.56.1
 *   npx playwright install chromium
 *   node --test games/signal-garden/tests/browser-smoke.mjs
 *
 * Only a test dependency; the playable game itself has zero packages.
 */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/favicon.ico") {
        res.writeHead(204);
        res.end();
        return;
      }
      const pathname = decodeURIComponent(url.pathname);
      const requested = pathname.endsWith("/") ? pathname + "index.html" : pathname;
      const absolute = path.resolve(ROOT, "." + requested);
      if (!absolute.startsWith(ROOT + path.sep)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const data = await readFile(absolute);
      res.writeHead(200, {
        "content-type": MIME[path.extname(absolute)] ?? "application/octet-stream"
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}/games/signal-garden/` });
    });
  });
}

test("browser: controls, full level, record tie, saved progress and narrow viewport", async (t) => {
  const { server, baseUrl } = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1100, height: 850 },
      reducedMotion: "reduce"
    });
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });

    const response = await page.goto(baseUrl);
    assert.equal(response.status(), 200, "game must load via a static server");
    assert.equal(await page.title(), "Signal Garden — A tiny puzzle about finding light");
    assert.equal(await page.locator("#level-list button").count(), 6);
    assert.equal(await page.locator("#board .tile").count(), 16);
    assert.equal(await page.locator("#stage-name").textContent(), "First Light");
    assert.equal(await page.locator("#turns").textContent(), "00");
    assert.equal(await page.locator("#victory").isVisible(), false);
    t.diagnostic("Initial garden rendered: 16 tiles and six level selectors.");

    const movable = page.locator("#board button.tile");
    await movable.first().focus();
    const beforeFocus = await page.evaluate(() => Number(document.activeElement.dataset.index));
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#turns").textContent(), "01", "Enter rotates a focused tile");
    await page.keyboard.press("ArrowRight");
    const afterFocus = await page.evaluate(() => Number(document.activeElement.dataset.index));
    assert.equal(afterFocus, beforeFocus + 1, "Right arrow navigates to the next movable tile");

    await page.locator("#reset").click();
    assert.equal(await page.locator("#turns").textContent(), "00");
    await page.locator("#hint").click();
    assert.match(await page.locator("#status").textContent(), /Try rotating the highlighted tile/);
    assert.equal(await page.locator(".tile.hint").count(), 1, "hint highlights one tile");
    t.diagnostic("Keyboard rotation, spatial navigation, reset and hint passed.");

    // Read the actual shipped puzzle engine and solve using real UI clicks.
    const rotations = await page.evaluate(async () => {
      const { createBoard } = await import("/games/signal-garden/logic.mjs");
      const level = createBoard(0);
      return level.tiles.flatMap((tile, index) => {
        if (!tile.onRoute || tile.locked) return [];
        const turns = (tile.solutionOrientation - tile.orientation + 4) % 4;
        return Array(turns).fill(index);
      });
    });
    assert.ok(rotations.length > 0, "puzzle must have a nontrivial solution");
    async function playSolution() {
      for (const index of rotations) {
        if (await page.locator("#victory").isVisible()) break;
        await page.locator(`#board button[data-index="${index}"]`).click();
      }
      assert.equal(await page.locator("#victory").isVisible(), true, "flower should awaken");
    }

    await playSolution();
    assert.match(await page.locator("#victory-summary").textContent(), /A personal best!/);
    assert.equal(await page.locator("#level-list button").nth(1).isEnabled(), true);
    t.diagnostic("Completed first level through actual pointer interactions.");

    await page.locator("#close-victory").click();
    await page.locator("#reset").click();
    await playSolution();
    assert.doesNotMatch(
      await page.locator("#victory-summary").textContent(),
      /A personal best!/,
      "equal-turn replay must not claim a new best"
    );
    await page.locator("#next-stage").click();
    assert.equal(await page.locator("#stage-name").textContent(), "The Detour");
    assert.equal(await page.locator("#board .tile").count(), 25);
    await page.reload();
    assert.equal(await page.locator("#stage-name").textContent(), "The Detour");
    assert.equal(await page.locator("#level-list button").nth(1).isEnabled(), true);
    t.diagnostic("Replay tie, next-level unlock and localStorage persistence passed.");

    await page.setViewportSize({ width: 360, height: 740 });
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    assert.ok(horizontalOverflow <= 1, `360px viewport has ${horizontalOverflow}px horizontal overflow`);
    assert.equal(await page.locator("#board .tile").count(), 25);
    assert.deepEqual(runtimeErrors, [], "no page JavaScript errors or failed browser requests");
    t.diagnostic("360px viewport has no document-wide horizontal overflow or runtime errors.");

    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
