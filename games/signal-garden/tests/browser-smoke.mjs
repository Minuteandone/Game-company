/**
 * Real Chromium/WebKit browser smoke for Signal Garden's integration.
 * Author: agent-01 (AI agent).
 *
 * Run (from repository root):
 *   npm install --no-save --package-lock=false playwright@1.56.1
 *   npx playwright install chromium webkit
 *   node --test games/signal-garden/tests/browser-smoke.mjs
 *   SIGNAL_GARDEN_BROWSER=webkit node --test games/signal-garden/tests/browser-smoke.mjs
 *
 * Only a test dependency; the playable game itself has zero packages.
 */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, webkit } from "playwright";

const selectedBrowser = process.env.SIGNAL_GARDEN_BROWSER ?? "chromium";
if (!["chromium", "webkit"].includes(selectedBrowser)) {
  throw new Error("Unsupported SIGNAL_GARDEN_BROWSER: " + selectedBrowser);
}
const browserType = selectedBrowser === "webkit" ? webkit : chromium;

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

test(`browser (${selectedBrowser}): controls, full level, records, persistence and narrow viewport`, async (t) => {
  const { server, baseUrl } = await startServer();
  let browser;
  try {
    browser = await browserType.launch({ headless: true });
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
    const overview = await page.locator("#board").getAttribute("aria-label");
    assert.match(overview, /Garden 1, 4 by 4 grid/);
    assert.match(overview, /Fixed star at row 1, column 1/);
    assert.match(overview, /Fixed flower at row 4, column 4/);
    assert.match(overview, /Arrow keys move between rotatable tiles/);
    t.diagnostic("Initial garden rendered with both fixed endpoint coordinates and six level selectors.");

    // Match every tile's accessible description against the shipped rules.
    // Direction and power are essential puzzle information, not decoration.
    const descriptions = await page.evaluate(async () => {
      const { createBoard, tileConnections, tracePower } = await import("/games/signal-garden/logic.mjs");
      const board = createBoard(0);
      const { powered } = tracePower(board.tiles, board.size);
      const names = ["north", "east", "south", "west"];
      return board.tiles.map((tile, index) => {
        const directions = tileConnections(tile).map((direction) => names[direction]);
        const joined = directions.length === 1
          ? directions[0]
          : directions.slice(0, -1).join(", ") + " and " + directions.at(-1);
        return { index, joined, powered: powered.has(index), locked: tile.locked };
      });
    });
    for (const { index, joined, powered, locked } of descriptions) {
      const tile = page.locator(`#board .tile[data-index="${index}"]`);
      const label = await tile.getAttribute("aria-label");
      assert.ok(label.includes(`Openings ${joined}.`),
        `tile ${index} does not describe its real connector directions: ${label}`);
      assert.ok(label.includes(powered ? "Glowing." : "Not glowing."),
        `tile ${index} does not describe its powered state`);
      assert.equal(label.includes("Rotate clockwise."), !locked);
    }
    t.diagnostic("Every tile exposes exact connector directions and power state through its accessible name.");

    const movable = page.locator("#board button.tile");
    await movable.first().focus();
    const beforeFocus = await page.evaluate(() => Number(document.activeElement.dataset.index));
    const beforeLabel = await page.locator(`#board button[data-index="${beforeFocus}"]`).getAttribute("aria-label");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#turns").textContent(), "01", "Enter rotates a focused tile");
    const afterLabel = await page.locator(`#board button[data-index="${beforeFocus}"]`).getAttribute("aria-label");
    assert.notEqual(afterLabel, beforeLabel, "rotation must update the accessible opening directions");
    assert.match(afterLabel, /Openings (north|east|south|west)/);
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
    const detourOverview = await page.locator("#board").getAttribute("aria-label");
    assert.match(detourOverview, /Garden 2, 5 by 5 grid/);
    assert.match(detourOverview, /Fixed star at row 1, column 1/);
    assert.match(detourOverview, /Fixed flower at row 5, column 5/);
    await page.reload();
    assert.equal(await page.locator("#stage-name").textContent(), "The Detour");
    assert.equal(await page.locator("#level-list button").nth(1).isEnabled(), true);
    t.diagnostic("Replay tie, next-level unlock and localStorage persistence passed.");

    // Complete garden two using keyboard Tab navigation + Enter exclusively.
    // Unlike pointer-driven completion above, focus must find the real button.
    const keyboardRotations = await page.evaluate(async () => {
      const { createBoard } = await import("/games/signal-garden/logic.mjs");
      return createBoard(1).tiles.flatMap((tile, index) => {
        if (!tile.onRoute || tile.locked) return [];
        return Array((tile.solutionOrientation - tile.orientation + 4) % 4).fill(index);
      });
    });
    for (const index of keyboardRotations) {
      if (await page.locator("#victory").isVisible()) break;
      let reached = false;
      for (let tab = 0; tab < 48; tab++) {
        const focused = await page.evaluate(() => document.activeElement?.dataset?.index);
        if (focused === String(index)) {
          reached = true;
          break;
        }
        await page.keyboard.press("Tab");
      }
      assert.ok(reached, `tile ${index} must be reachable via Tab`);
      await page.keyboard.press("Enter");
    }
    assert.equal(await page.locator("#victory").isVisible(), true,
      "garden two should be winnable with only Tab and Enter");
    assert.equal(await page.evaluate(() => document.activeElement.id), "next-stage");
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "close-victory");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#victory").isVisible(), false);
    assert.equal(await page.evaluate(() => document.activeElement.id), "reset");
    t.diagnostic("Entire second garden solved by keyboard, and completion-dialog focus restored.");

    // Saving should be reversible without wiping unrelated browser storage.
    const savedBefore = await page.evaluate(() => {
      localStorage.setItem("unrelated-test-key", "keep");
      return JSON.parse(localStorage.getItem("signal-garden-progress-v1"));
    });
    assert.ok(savedBefore.unlocked >= 3);
    assert.ok(savedBefore.best["0"] > 0 && savedBefore.best["1"] > 0);
    page.once("dialog", async (dialog) => {
      assert.match(dialog.message(), /Clear Signal Garden's saved level unlocks/);
      await dialog.dismiss();
    });
    await page.locator("#clear-progress").click();
    assert.equal(await page.locator("#stage-name").textContent(), "The Detour",
      "canceling confirmation must preserve the active level");
    const savedAfterCancel = await page.evaluate(
      () => localStorage.getItem("signal-garden-progress-v1")
    );
    assert.ok(savedAfterCancel);

    page.once("dialog", async (dialog) => { await dialog.accept(); });
    await page.locator("#clear-progress").click();
    assert.equal(await page.locator("#stage-name").textContent(), "First Light");
    assert.equal(await page.locator("#best").textContent(), "—");
    assert.equal(await page.locator("#turns").textContent(), "00");
    assert.equal(await page.locator("#level-list button").nth(1).isDisabled(), true);
    assert.match(await page.locator("#status").textContent(), /Saved progress cleared/);
    assert.equal(await page.evaluate(
      () => localStorage.getItem("signal-garden-progress-v1")
    ), null, "clearing progress should remove the key, not immediately recreate it");
    assert.equal(await page.evaluate(
      () => localStorage.getItem("unrelated-test-key")
    ), "keep", "other site-local data should not be erased");
    await page.reload();
    assert.equal(await page.locator("#stage-name").textContent(), "First Light");
    assert.equal(await page.locator("#best").textContent(), "—");
    assert.equal(await page.locator("#level-list button").nth(1).isDisabled(), true);
    t.diagnostic("Canceled reset retains progress; confirmed clear removes only Signal Garden data and survives reload.");

    await page.setViewportSize({ width: 360, height: 740 });
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    assert.ok(horizontalOverflow <= 1, `360px viewport has ${horizontalOverflow}px horizontal overflow`);
    assert.equal(await page.locator("#board .tile").count(), 16,
      "after clearing progress, the responsive board should still be garden one's 4×4 grid");
    assert.deepEqual(runtimeErrors, [], "no page JavaScript errors or failed browser requests");
    t.diagnostic("360px viewport has no document-wide horizontal overflow or runtime errors.");

    // The route back must work under a GitHub Pages project subdirectory
    // and under a local server without hardcoding a hosting domain.
    const arcadeLink = page.getByRole("link", { name: "Back to Game Company Arcade" });
    assert.equal(await arcadeLink.getAttribute("href"), "../../");
    await arcadeLink.click();
    assert.equal(await page.title(), "Game Company Arcade — Four Playable Experiments");
    assert.equal(page.url(), new URL("../../", baseUrl).href);
    t.diagnostic("Footer link returns to the playable multi-game arcade.");

    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test(`mobile touch (${selectedBrowser}): real taps, reset, hint, and narrow-screen layout`, async (t) => {
  const { server, baseUrl } = await startServer();
  let browser;
  try {
    browser = await browserType.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce"
    });
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on("pageerror", error => runtimeErrors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });
    const response = await page.goto(baseUrl);
    assert.equal(response.status(), 200);
    assert.equal(await page.locator("#board .tile").count(), 16);
    const first = page.locator("#board button.tile").first();
    const before = await first.getAttribute("aria-label");
    await first.tap();
    assert.equal(await page.locator("#turns").textContent(), "01",
      "a simulated touch tap must rotate a tile");
    assert.notEqual(await first.getAttribute("aria-label"), before,
      "touch rotation must update connector directions");
    await page.locator("#reset").tap();
    assert.equal(await page.locator("#turns").textContent(), "00");
    await page.locator("#hint").tap();
    assert.equal(await page.locator(".tile.hint").count(), 1);
    assert.match(await page.locator("#status").textContent(), /row \d+, column \d+/);
    await page.setViewportSize({ width: 320, height: 650 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    assert.ok(overflow <= 1, `320px touch viewport overflows by ${overflow}px`);
    assert.deepEqual(runtimeErrors, [], "no mobile-browser errors");
    t.diagnostic(`${selectedBrowser}: real touch taps rotated/reset/hinted a tile; 320px viewport has no horizontal overflow.`);
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
