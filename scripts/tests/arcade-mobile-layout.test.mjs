/**
 * Actual local-browser responsive layout regression for the shared arcade.
 * Author: agent-01 (AI agent). Uses temporary CI-only Playwright/Chromium.
 * This tests the checkout, not an older published Pages build.
 */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function serve() {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname === "/favicon.ico") {
        response.writeHead(204).end();
        return;
      }
      const pathname = url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname;
      const absolute = path.resolve(ROOT, "." + decodeURIComponent(pathname));
      if (!absolute.startsWith(ROOT + path.sep)) {
        response.writeHead(403).end();
        return;
      }
      const bytes = await readFile(absolute);
      const extension = path.extname(absolute);
      const mime = { ".html": "text/html", ".js": "text/javascript",
        ".mjs": "text/javascript", ".css": "text/css" }[extension] ?? "application/octet-stream";
      response.writeHead(200, { "content-type": mime }).end(bytes);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function settleLayout(page) {
  // A Playwright viewport resize can race the next CSS/layout frame.
  // Two animation frames make measurements about the stable displayed state.
  await page.evaluate(() => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test("arcade: narrow header, links and game cards stay inside the viewport", async (t) => {
  const server = await serve();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ reducedMotion: "reduce",
      viewport: { width: 1100, height: 820 } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    const start = `http://127.0.0.1:${server.address().port}/`;
    const loaded = await page.goto(start);
    assert.equal(loaded.status(), 200);
    assert.match(await page.title(), /Game Company Arcade/);
    assert.equal(await page.locator("a.game-link").count(), 4);

    for (const width of [320, 360, 375, 560, 768, 1100, 360, 320]) {
      await page.setViewportSize({ width, height: 820 });
      await settleLayout(page);
      const result = await page.evaluate(() => {
        const view = document.documentElement.clientWidth;
        const bounds = selector => [...document.querySelectorAll(selector)].map(el => {
          const rect = el.getBoundingClientRect();
          return { text: el.textContent.trim().slice(0, 40),
            left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        });
        return {
          view,
          overflow: document.documentElement.scrollWidth - view,
          logo: bounds("header .logo")[0],
          headerLinks: bounds("header .top-links a"),
          nav: bounds("header .top-links")[0],
          gameLinks: bounds("a.game-link"),
          games: bounds(".game")
        };
      });
      assert.ok(result.overflow <= 1,
        `${width}px viewport has ${result.overflow}px document overflow`);
      for (const [kind, items] of [
        ["navigation link", result.headerLinks],
        ["game link", result.gameLinks],
        ["game card", result.games],
        ["brand", [result.logo]]
      ]) {
        for (const item of items) {
          assert.ok(item.left >= -1 && item.right <= width + 1,
            `${width}px: ${kind} ${item.text} extends horizontally [${item.left}, ${item.right}]`);
        }
      }
      if (width <= 560) {
        assert.ok(result.nav.top >= result.logo.bottom - 1,
          `${width}px: navigation should wrap below the brand without overlap`);
      }
      t.diagnostic(`${width}px: no sideways scroll; 3 header links and 4 games fit.`);
    }

    await page.setViewportSize({ width: 320, height: 740 });
    await settleLayout(page);
    const links = page.locator("header .top-links a");
    for (const link of await links.all()) {
      assert.equal(await link.isVisible(), true);
      await link.focus();
      assert.equal(await link.evaluate(el => el === document.activeElement), true,
        "every header navigation link is keyboard-focusable at phone width");
    }
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
