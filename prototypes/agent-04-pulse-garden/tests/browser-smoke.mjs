/**
 * Real Chromium integration smoke test for Pulse Garden.
 * Author: agent-04 (AI agent).
 *
 * This checks browser behavior, not subjective play quality or assistive-tech equivalence.
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
      const port = server.address().port;
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}/prototypes/agent-04-pulse-garden/`
      });
    });
  });
}

function numericText(page, selector) {
  return page.locator(selector).textContent().then(Number);
}

test("browser: pointer + keyboard planting, pause, resize, mute and reset", async (t) => {
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

    page.on("pageerror", error => runtimeErrors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });

    const response = await page.goto(baseUrl);
    assert.equal(response.status(), 200);
    assert.equal(await page.title(), "Pulse Garden — agent-04");
    assert.equal(await page.locator("#score").textContent(), "0");
    assert.equal(await page.locator("#blooms").textContent(), "0 / 12");
    assert.equal(await page.locator("#time").textContent(), "60.0");
    assert.equal(await page.locator("#sound").textContent(), "on");
    assert.equal(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true);
    assert.equal(await page.locator("#game").getAttribute("data-motion"), "reduced");
    assert.equal(await page.locator("#motion-note").isVisible(), true);
    assert.match(await page.locator("#motion-note").textContent(), /decorative particles and bloom sway are minimized/i);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForFunction(() => document.querySelector("#game")?.dataset.motion === "full");
    assert.equal(await page.locator("#motion-note").isVisible(), false);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => document.querySelector("#game")?.dataset.motion === "reduced");
    assert.equal(await page.locator("#motion-note").isVisible(), true);
    t.diagnostic("Reduced-motion preference is detected, disclosed, and updates when the browser preference changes.");

    const canvas = page.locator("#game");
    const initialBox = await canvas.boundingBox();
    assert.ok(initialBox && initialBox.width > 300 && initialBox.height >= 430);

    // Pointer planting starts a run and updates the HUD.
    await canvas.click({ position: { x: 180, y: 180 } });
    assert.equal(await page.locator("#score").textContent(), "2");
    await page.waitForTimeout(180);
    assert.ok(await numericText(page, "#time") < 60);
    t.diagnostic("Pointer planting starts the garden and advances the timer.");

    // Reset before testing the keyboard path.
    await page.keyboard.press("r");
    assert.equal(await page.locator("#score").textContent(), "0");
    assert.equal(await page.locator("#time").textContent(), "60.0");

    // Enter plants at the cursor. Moving right then pressing Enter must create a
    // second seed; without cursor movement, minimum-distance logic would reject it.
    await canvas.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#score").textContent(), "2");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#score").textContent(), "4");
    assert.equal(
      await page.evaluate(() => document.activeElement?.id),
      "game",
      "canvas keeps keyboard focus"
    );
    t.diagnostic("Keyboard planting and cursor movement produced two distinct seeds.");

    // Pause must freeze the countdown.
    await page.waitForTimeout(160);
    const beforePause = await numericText(page, "#time");
    await page.keyboard.press("Space");
    await page.waitForTimeout(320);
    const whilePaused = await numericText(page, "#time");
    assert.ok(
      Math.abs(whilePaused - beforePause) <= 0.1,
      `paused timer moved from ${beforePause} to ${whilePaused}`
    );

    // Resize while paused. The first keyboard seed began at the canvas center
    // and should scale to the new center; clicking there should therefore be
    // rejected by the minimum-distance rule instead of planting a third seed.
    await page.setViewportSize({ width: 360, height: 740 });
    const smallBox = await canvas.boundingBox();
    assert.ok(smallBox && smallBox.width > 300);
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    assert.ok(horizontalOverflow <= 1, `360px viewport has ${horizontalOverflow}px horizontal overflow`);
    await canvas.click({
      position: { x: smallBox.width / 2, y: smallBox.height * 0.65 }
    });
    assert.equal(
      await page.locator("#score").textContent(),
      "4",
      "seed layout remains aligned after resize"
    );

    // Pointer click shifts focus away from canvas; restore it, move the scaled
    // keyboard cursor, and confirm another valid keyboard planting action.
    await canvas.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#score").textContent(), "6");
    t.diagnostic("Resize preserved planting layout and keyboard cursor remained usable.");

    await page.keyboard.press("m");
    assert.equal(await page.locator("#sound").textContent(), "off");
    await page.keyboard.press("m");
    assert.equal(await page.locator("#sound").textContent(), "on");

    // Resume and confirm time moves again.
    await page.keyboard.press("Space");
    await page.waitForTimeout(260);
    const afterResume = await numericText(page, "#time");
    assert.ok(afterResume < whilePaused - 0.1, "timer resumes after Space");

    await page.keyboard.press("r");
    assert.equal(await page.locator("#score").textContent(), "0");
    assert.equal(await page.locator("#blooms").textContent(), "0 / 12");
    assert.equal(await page.locator("#time").textContent(), "60.0");
    assert.deepEqual(runtimeErrors, [], "no page JavaScript or console errors");
    t.diagnostic("Mute, resume, reset and runtime-error checks passed.");

    const arcadeLink = page.getByRole("link", { name: "Back to Game Company Arcade" });
    assert.equal(await arcadeLink.getAttribute("href"), "../../index.html");
    await arcadeLink.click();
    assert.equal(await page.title(), "Game Company Arcade — Four Playable Experiments");
    assert.equal(page.url(), new URL("../../index.html", baseUrl).href);
    t.diagnostic("Pulse Garden can return to the public/local arcade with a project-relative link.");

    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
