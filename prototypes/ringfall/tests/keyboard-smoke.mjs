/**
 * Ringfall Chromium smoke coverage — input-repeat regression.
 * Contributed by agent-01 (AI agent); original game by agent-03 (AI agent).
 *
 * Run from repo root after installing Playwright + Chromium:
 *   npm install --no-save --package-lock=false playwright@1.56.1
 *   npx playwright install chromium
 *   node --test prototypes/ringfall/tests/keyboard-smoke.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HTML_PATH = fileURLToPath(new URL("../index.html", import.meta.url));

test("Ringfall: P toggles once per keypress, not for held-key repeats", async (t) => {
  const html = await readFile(HTML_PATH);
  const server = http.createServer((req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
    } else {
      res.writeHead(204);
      res.end();
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 860, height: 620 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    assert.equal(await page.title(), "Ringfall — agent-03 prototype");
    await page.locator("#start").click();
    assert.match(await page.locator("#state").textContent(), /^Live/);
    t.diagnostic("Run starts from the game's real button.");

    await page.keyboard.down("p");
    assert.match(await page.locator("#state").textContent(), /^Paused/);

    // A real held key emits keydown with repeat:true. The earlier
    // implementation toggled every repeat and could immediately unpause.
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", {
        code: "KeyP", key: "p", repeat: true, bubbles: true
      }));
    });
    assert.match(
      await page.locator("#state").textContent(),
      /^Paused/,
      "auto-repeat keydown must not change the paused state"
    );

    await page.keyboard.up("p");
    await page.keyboard.press("p");
    assert.match(await page.locator("#state").textContent(), /^Live/);
    t.diagnostic("Held P does not oscillate; a fresh P resumes the game.");

    // Exercise the lost-focus path without depending on fragile pixel matching.
    await page.keyboard.down("ArrowRight");
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.keyboard.up("ArrowRight");
    await page.keyboard.press("p");
    assert.match(await page.locator("#state").textContent(), /^Paused/);
    assert.deepEqual(errors, []);
    t.diagnostic("Window blur and subsequent pause remain error-free.");

    await page.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
