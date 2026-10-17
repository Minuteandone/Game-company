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
        baseUrl: `http://127.0.0.1:${port}/experiments/agent-04-pulse-voices/`
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
    assert.equal(await page.title(), "Pulse Garden — Plant Voices Lab (agent-04)");
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

    // A deliberate sound choice is stored on each seed, not tied to planting order.
    const buttons = page.locator("[data-voice]");
    assert.equal(await buttons.count(), 3);
    assert.equal(await buttons.nth(0).getAttribute("aria-pressed"), "true");
    await buttons.nth(1).click();
    assert.equal(await buttons.nth(1).getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("#voice-status").textContent(), "Selected: Reed");
    await buttons.nth(0).focus();
    await page.keyboard.press("Enter");
    assert.equal(await buttons.nth(0).getAttribute("aria-pressed"), "true",
      "a focused voice button must activate with Enter");
    await buttons.nth(1).focus();
    await page.keyboard.press("Space");
    assert.equal(await buttons.nth(1).getAttribute("aria-pressed"), "true",
      "a focused voice button must activate with Space");
    await page.keyboard.press("3");
    assert.equal(await buttons.nth(2).getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("#voice-status").textContent(), "Selected: Pluck");

    const canvas = page.locator("#game");
    const initialBox = await canvas.boundingBox();
    assert.ok(initialBox && initialBox.width > 300 && initialBox.height >= 430);

    // Pointer planting starts a run and updates the HUD.
    await canvas.click({ position: { x: 180, y: 180 } });
    assert.equal(await page.locator("#score").textContent(), "2");
    assert.equal(await page.locator("#last-plant").textContent(), "Last planted: Pluck");
    assert.equal(await page.locator("#mix").textContent(), "Garden mix: Bell 0 · Reed 0 · Pluck 1");
    await page.waitForTimeout(180);
    assert.ok(await numericText(page, "#time") < 60);
    // Space on a focused voice button must select it, not pause the running garden.
    await buttons.nth(0).focus();
    const beforeButtonSpace = await numericText(page, "#time");
    await page.keyboard.press("Space");
    assert.equal(await buttons.nth(0).getAttribute("aria-pressed"), "true");
    await page.waitForTimeout(260);
    assert.ok(await numericText(page, "#time") < beforeButtonSpace - 0.1,
      "Space activating a voice button must not pause the garden timer");
    t.diagnostic("Pointer planting starts the garden; focused voice buttons keep Enter/Space semantics.");

    // Reset before testing the keyboard path.
    await page.keyboard.press("r");
    assert.equal(await page.locator("#score").textContent(), "0");
    assert.equal(await page.locator("#time").textContent(), "60.0");

    // Enter plants at the cursor. Moving right then pressing Enter must create a
    // second seed; without cursor movement, minimum-distance logic would reject it.
    await canvas.focus();
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#score").textContent(), "2");
    await page.keyboard.press("2");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#mix").textContent(), "Garden mix: Bell 1 · Reed 1 · Pluck 0");
    assert.equal(await page.locator("#last-plant").textContent(), "Last planted: Reed");
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


test("mobile touch: voice taps persist per planted seed with no narrow-screen overflow", async (t) => {
  const { server, baseUrl } = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 360, height: 740 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce"
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
    const response = await page.goto(baseUrl);
    assert.equal(response.status(), 200);
    assert.equal(await page.title(), "Pulse Garden — Plant Voices Lab (agent-04)");

    const buttons = page.locator("[data-voice]");
    const canvas = page.locator("#game");
    assert.equal(await buttons.count(), 3);

    // Use actual Playwright touch taps, not a click substitute.
    await buttons.nth(1).tap();
    assert.equal(await buttons.nth(1).getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("#voice-status").textContent(), "Selected: Reed");
    await canvas.tap({ position: { x: 60, y: 170 } });
    assert.equal(await page.locator("#score").textContent(), "2");
    assert.equal(await page.locator("#last-plant").textContent(), "Last planted: Reed");

    await buttons.nth(0).tap();
    assert.equal(await buttons.nth(0).getAttribute("aria-pressed"), "true");
    await canvas.tap({ position: { x: 160, y: 170 } });
    assert.equal(await page.locator("#score").textContent(), "4");
    assert.equal(await page.locator("#mix").textContent(), "Garden mix: Bell 1 · Reed 1 · Pluck 0");

    await buttons.nth(2).tap();
    await canvas.tap({ position: { x: 270, y: 170 } });
    assert.equal(await page.locator("#score").textContent(), "6");
    assert.equal(await page.locator("#mix").textContent(), "Garden mix: Bell 1 · Reed 1 · Pluck 1");
    assert.equal(await page.locator("#last-plant").textContent(), "Last planted: Pluck");

    await page.setViewportSize({ width: 320, height: 740 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    assert.ok(overflow <= 1, "320px touch viewport overflowed by " + overflow + "px");

    assert.deepEqual(errors, [], "no runtime or console errors during simulated touch");
    await context.close();
    t.diagnostic("Mobile-emulated touchscreen voice selection and per-seed planting passed; not a physical iOS test.");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
