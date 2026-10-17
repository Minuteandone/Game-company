/**
 * Headless Chromium integration smoke test for Ringfall.
 * Author: agent-03 (AI agent).
 *
 * The shipped game remains dependency-free. Playwright is installed only in CI.
 */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const GAME_PATH = "/prototypes/ringfall/index.html";

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/favicon.ico") {
        res.writeHead(204);
        res.end();
        return;
      }
      const requested = decodeURIComponent(url.pathname);
      const absolute = path.resolve(ROOT, "." + requested);
      if (!absolute.startsWith(ROOT + path.sep)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const data = await readFile(absolute);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({
        server,
        url: `http://127.0.0.1:${server.address().port}${GAME_PATH}`
      });
    });
  });
}

test("browser: start, pause, mixed input, reduced motion and narrow viewport", async (t) => {
  const { server, url } = await startServer();
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 900, height: 700 },
      reducedMotion: "reduce"
    });
    const page = await context.newPage();
    const runtimeErrors = [];

    page.on("pageerror", error => runtimeErrors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });

    const response = await page.goto(url);
    assert.equal(response.status(), 200);
    assert.equal(await page.title(), "Ringfall — agent-03 prototype");
    assert.equal(await page.locator("#overlay").isVisible(), true);
    assert.equal(await page.locator("#state").textContent(), "Ready");
    assert.equal(await page.locator("#state").getAttribute("role"), "status");
    assert.equal(await page.locator("#score").textContent(), "0");
    assert.equal((await page.locator("#energy").textContent()).replace(/\s+/g, " ").trim(), "● ● ●");
    assert.equal(
      await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
      true,
      "reduced-motion media query should be active in the test context"
    );
    t.diagnostic("Initial overlay, ready state and reduced-motion context passed.");

    await page.locator("#start").click();
    assert.equal(await page.locator("#overlay").isVisible(), false);
    assert.equal(await page.locator("#state").textContent(), "Live · P pause");

    await page.keyboard.press("p");
    assert.equal(await page.locator("#state").textContent(), "Paused · P resume");
    await page.keyboard.press("p");
    assert.equal(await page.locator("#state").textContent(), "Live · P pause");
    t.diagnostic("Start and explicit pause/resume state passed.");

    const canvas = page.locator("#game");
    const box = await canvas.boundingBox();
    assert.ok(box);
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.35);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("a");
    await page.keyboard.press("d");
    assert.equal(await page.locator("#state").textContent(), "Live · P pause");
    t.diagnostic("Pointer then keyboard input produced no runtime failure.");

    await page.setViewportSize({ width: 360, height: 640 });
    await page.waitForFunction(() => {
      const rect = document.getElementById("game").getBoundingClientRect();
      return Math.abs(rect.width - 360) <= 1 && Math.abs(rect.height - 640) <= 1;
    });
    const narrow = await canvas.boundingBox();
    assert.ok(narrow);
    assert.ok(Math.abs(narrow.width - 360) <= 1, `canvas width was ${narrow.width}`);
    assert.ok(Math.abs(narrow.height - 640) <= 1, `canvas height was ${narrow.height}`);
    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      y: document.documentElement.scrollHeight - document.documentElement.clientHeight
    }));
    assert.ok(overflow.x <= 1, `narrow viewport horizontal overflow: ${overflow.x}px`);
    assert.ok(overflow.y <= 1, `narrow viewport vertical overflow: ${overflow.y}px`);

    assert.deepEqual(runtimeErrors, [], "no browser runtime/console errors expected");
    t.diagnostic("Narrow viewport and runtime-error checks passed.");

    const arcadeLink = page.getByRole("link", { name: "Back to Game Company Arcade" });
    assert.equal(await arcadeLink.getAttribute("href"), "../../index.html");
    await arcadeLink.click();
    assert.equal(await page.title(), "Game Company Arcade — Four Playable Experiments");
    assert.equal(page.url(), new URL("../../index.html", url).href);
    t.diagnostic("Ringfall can return to the public/local arcade with a project-relative link.");

    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
