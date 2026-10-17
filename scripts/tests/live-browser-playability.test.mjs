/**
 * Headless Chromium checks against the REAL published Game Company arcade.
 *
 * Author: agent-02 (AI agent). Unlike localhost game tests and HTTP GET asset
 * probes, this executes JS and clicks through the live GitHub Pages site.
 * A hermetic, temporary browser context is used; nothing is submitted.
 *
 * Usage (after installing Playwright and Chromium):
 *   node --test scripts/tests/live-browser-playability.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { LEVELS } from "../../experiments/agent-02-prism-relay/levels.mjs";
import { solvePuzzle } from "../../experiments/agent-02-prism-relay/logic.mjs";

const SITE = "https://minuteandone.github.io/Game-company/";
const SITE_ORIGIN = new URL(SITE).origin;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../artifacts/live-browser");

async function captureSafety(page, exceptions) {
  const issues = [];
  page.on("pageerror", e => issues.push("Runtime: " + e.message));
  page.on("console", m => {
    // GitHub Pages may return a 404 for the browser's implicit favicon GET.
    // That is unrelated to the games' JavaScript behavior.
    if (m.type() === "error" && !m.text().includes("favicon.ico")) {
      issues.push("Console: " + m.text());
    }
  });
  await page.route("**/*", route => {
    const request = route.request();
    const url = request.url();
    const method = request.method();
    const allowedAsset = url.startsWith(SITE);
    const browserFavicon = url === SITE_ORIGIN + "/favicon.ico";
    if (method !== "GET" || (!allowedAsset && !browserFavicon)) {
      issues.push("Unexpected outbound browser request: " + method + " " + url);
      return route.abort();
    }
    return route.continue();
  });
  exceptions.push({ issues, page });
  return issues;
}
async function visit(context, pathname, exceptions) {
  const page = await context.newPage();
  await captureSafety(page, exceptions);
  const url = new URL(pathname, SITE).href;
  assert.ok(url.startsWith(SITE), "Only the published arcade origin and prefix may be tested");
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 35000 });
  assert.equal(response?.status(), 200, "Published page must return HTTP 200: " + pathname);
  return page;
}
async function snapshot(page, name) {
  await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: true, animations: "disabled" });
}

test("published arcade: execute gameplay and inspect all four entry points", { timeout: 180000 }, async (t) => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1100, height: 790 },
    reducedMotion: "reduce",
    acceptDownloads: true,
    serviceWorkers: "block"
  });
  const inspected = [];
  try {
    await t.test("the public arcade renders game links in Chromium", async () => {
      const page = await visit(context, "", inspected);
      assert.match(await page.title(), /Game Company Arcade/);
      const links = page.locator("a.game-link");
      assert.equal(await links.count(), 4);
      const expected = [
        "./games/signal-garden/",
        "./experiments/agent-02-prism-relay/",
        "./prototypes/ringfall/",
        "./prototypes/agent-04-pulse-garden/"
      ];
      const hrefs = await links.evaluateAll(elements => elements.map(a => a.getAttribute("href")));
      assert.deepEqual(hrefs, expected, "Game entries must preserve working project-relative paths");
      await snapshot(page, "arcade-desktop");
      for (const width of [360, 320]) {
        await page.setViewportSize({ width, height: 740 });
        await snapshot(page, "arcade-mobile-" + width);
        const detail = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          offenders: [...document.querySelectorAll("body *")].map(element => {
            const rect = element.getBoundingClientRect();
            return { tag: element.tagName.toLowerCase(), className: String(element.className).slice(0, 70),
              right: Math.round(rect.right), left: Math.round(rect.left), width: Math.round(rect.width) };
          }).filter(element => element.right > innerWidth + 1).sort((a, b) => b.right - a.right).slice(0, 12)
        }));
        t.diagnostic(width + "px arcade overflow audit: " + JSON.stringify(detail));
        assert.ok(detail.overflow <= 1, width + "px gallery horizontal overflow: " + detail.overflow);
      }
      await page.close();
    });

    await t.test("Prism Relay really solves, unlocks and returns to the hosted arcade", async () => {
      const page = await visit(context, "experiments/agent-02-prism-relay/", inspected);
      await page.locator("#board .mirror").first().waitFor({ timeout: 20000 });
      assert.equal(await page.locator("#level-index").textContent(), "01 / 04");
      assert.equal(await page.locator("#next").isDisabled(), true);
      await snapshot(page, "prism-before");

      const solution = solvePuzzle(LEVELS[0].grid);
      assert.ok(solution && solution.length > 0);
      for (const move of solution) {
        await page.locator('#board .mirror[data-x="' + move.x + '"][data-y="' + move.y + '"]').click();
      }
      assert.equal(await page.locator("#beam-state").textContent(), "✦ SIGNAL CONNECTED");
      assert.equal(await page.locator("#moves").textContent(), String(solution.length));
      assert.equal(await page.locator("#next").isDisabled(), false);
      await snapshot(page, "prism-solved");

      await page.locator("#next").click();
      assert.equal(await page.locator("#level-index").textContent(), "02 / 04");
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator("#board .mirror").first().waitFor();
      assert.equal(await page.locator("#level-picker .level-choice:not(:disabled)").count(), 2);

      const arcade = page.getByRole("link", { name: "Back to Game Company Arcade" });
      await arcade.focus();
      await page.keyboard.press("Enter");
      await page.waitForURL(SITE + "index.html", { timeout: 15000 });
      assert.match(await page.title(), /Game Company Arcade/);
      await page.close();
    });

    await t.test("Signal Garden, Ringfall and Pulse Garden render real controls", async () => {
      const signal = await visit(context, "games/signal-garden/", inspected);
      await signal.locator("#hint").waitFor();
      assert.match(await signal.title(), /Signal Garden/);
      const tiles = signal.locator(".tile");
      assert.ok(await tiles.count() > 0, "Signal Garden should generate puzzle tiles");
      await signal.locator("#hint").click();
      assert.ok((await signal.locator("#status").textContent())?.length > 10);
      await snapshot(signal, "signal-garden");
      await signal.close();

      const ring = await visit(context, "prototypes/ringfall/", inspected);
      await ring.locator("#game").waitFor();
      await ring.locator("#start").click();
      await ring.waitForTimeout(160);
      assert.equal(await ring.locator("#game").isVisible(), true);
      assert.equal(await ring.locator("#overlay").evaluate(el => getComputedStyle(el).display), "none",
        "the Start run button should dismiss the introduction overlay");
      await snapshot(ring, "ringfall");
      await ring.close();

      const pulse = await visit(context, "prototypes/agent-04-pulse-garden/", inspected);
      const canvas = pulse.locator("#game");
      await canvas.waitFor();
      assert.equal(await canvas.isVisible(), true);
      await canvas.focus();
      assert.equal(await canvas.evaluate(el => el === document.activeElement), true);
      assert.equal(await pulse.locator("#score").textContent(), "0");
      await pulse.keyboard.press("Enter");
      await pulse.waitForTimeout(160);
      const plantedScore = Number((await pulse.locator("#score").textContent()).replaceAll(",", ""));
      assert.ok(plantedScore >= 2, "keyboard Enter must plant a seed and raise Pulse Garden's score");
      await snapshot(pulse, "pulse-garden");
      await pulse.close();
    });

    await t.test("optional comparison labs execute one reviewed interaction on published Pages", async () => {
      const coupled = await visit(context, "experiments/agent-01-coupled-garden/", inspected);
      assert.match(await coupled.title(), /Coupled Garden/);
      assert.equal(await coupled.locator("#moves").textContent(), "0");
      await coupled.locator('button[data-axis="row"]').first().click();
      assert.equal(await coupled.locator("#moves").textContent(), "1",
        "published Coupled Garden should execute a group turn");
      await coupled.close();

      const spectrum = await visit(context, "experiments/agent-02-prism-spectrum-lab/", inspected);
      assert.match(await spectrum.title(), /Forked Spectrum/);
      assert.equal(await spectrum.locator("#cells .mirror").count(), 3);
      const cyanMirror = spectrum.locator('#cells .mirror[data-x="3"][data-y="1"]');
      await cyanMirror.click();
      assert.equal(await spectrum.locator("#cyan-state").textContent(), "Connected");
      assert.equal(await spectrum.locator("#rotations").textContent(), "Rotations: 1",
        "published Spectrum lab should execute mirror rotation");
      await spectrum.close();

      const voices = await visit(context, "experiments/agent-04-pulse-voices/", inspected);
      assert.match(await voices.title(), /Plant Voices Lab/);
      const voiceButtons = voices.locator("[data-voice]");
      assert.equal(await voiceButtons.count(), 3);
      await voiceButtons.nth(1).click();
      assert.equal(await voices.locator("#voice-status").textContent(), "Selected: Reed");
      const voiceCanvas = voices.locator("#game");
      const box = await voiceCanvas.boundingBox();
      assert.ok(box && box.width > 300 && box.height > 300);
      await voiceCanvas.click({ position: { x: Math.min(180, box.width * 0.3), y: Math.min(180, box.height * 0.3) } });
      assert.equal(await voices.locator("#score").textContent(), "2");
      assert.match(await voices.locator("#mix").textContent(), /Reed 1/);
      assert.equal(await voices.locator("#last-plant").textContent(), "Last planted: Reed");
      await voices.close();

      t.diagnostic("Published comparison labs loaded and executed one bounded interaction each; this is technical QA, not human preference evidence.");
    });

    await t.test("the public worksheet previews feedback locally without sending it", async () => {
      const page = await visit(context, "playtest/", inspected);
      await page.locator("#preview").waitFor();
      await page.locator("#game").selectOption("prism-relay");
      await page.locator("#firstAction").fill("Synthetic browser QA note; not a human playtest.");
      const preview = await page.locator("#preview").inputValue();
      assert.match(preview, /Prism Relay/);
      assert.match(preview, /Synthetic browser QA note/);
      const link = page.locator("#play-selected");
      assert.equal(await link.getAttribute("href"), "../experiments/agent-02-prism-relay/");
      await snapshot(page, "worksheet");
      // Do not click Copy or Download: this check never shares mock data.
      await page.close();
    });

    for (const entry of inspected) {
      assert.deepEqual(entry.issues, [], "No runtime JS errors or external/non-GET requests expected");
    }
    t.diagnostic("All checks use ephemeral browser storage and public GETs; this is NOT human playtesting.");
  } finally {
    await context.close();
    await browser.close();
  }
});
