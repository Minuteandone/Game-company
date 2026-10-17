/**
 * Real Chromium regression for the isolated Coupled Garden mechanics lab.
 * Author: agent-01 (AI agent). Temporary test-only browser dependency.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright";
import { createStart, shortestSolution } from "./logic.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PAGE = "/experiments/agent-01-coupled-garden/";

async function serve() {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname);
      if (pathname === "/favicon.ico") { res.writeHead(204).end(); return; }
      const absolute = path.resolve(ROOT, "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname));
      if (!absolute.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      const data = await readFile(absolute);
      const mime = { ".html": "text/html", ".css": "text/css", ".mjs": "text/javascript", ".js": "text/javascript" };
      res.writeHead(200, { "content-type": mime[path.extname(absolute)] || "application/octet-stream" }).end(data);
    } catch { res.writeHead(404).end("Not found"); }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}

test("group controls: keyboard/click win, reset, touch, mobile layout and no telemetry", async (t) => {
  const server = await serve();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 375, height: 740 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [], unwanted = [];
    page.on("pageerror", err => errors.push(err.message));
    page.on("request", req => {
      if (!req.url().startsWith(`http://127.0.0.1:${server.address().port}/`) &&
          !req.url().startsWith("data:")) unwanted.push(req.url());
    });
    const root = `http://127.0.0.1:${server.address().port}`;
    const response = await page.goto(root + PAGE);
    assert.equal(response.status(), 200);
    assert.match(await page.title(), /Coupled Garden/);
    assert.equal(await page.locator("#board .tile").count(), 16);
    assert.equal(await page.locator("button[data-axis=row]").count(), 4);
    assert.equal(await page.locator("button[data-axis=column]").count(), 4);
    assert.equal(await page.locator("#moves").textContent(), "0");
    assert.match(await page.locator("#status").textContent(), /continuous path/);
    const originalLabels = await page.locator("#board .tile").evaluateAll(nodes =>
      nodes.map(node => node.getAttribute("aria-label")));
    assert.match(originalLabels[0], /fixed star.*Openings east.*Powered/);
    assert.match(originalLabels[15], /fixed flower.*Not powered/);

    const plan = shortestSolution(createStart());
    assert.ok(plan && plan.length === 4);
    for (const [i, move] of plan.entries()) {
      const control = page.locator(`button[data-axis="${move.axis}"][data-group="${move.group}"]`);
      await control.focus();
      if (i === 0) await page.keyboard.press("Enter");
      else await control.click();
      assert.equal(await page.locator("#moves").textContent(), String(i + 1));
      assert.equal(await control.evaluate(el => el === document.activeElement), true,
        "group control must retain focus after a board redraw");
    }
    assert.match(await page.locator("#status").textContent(), /Connected the flower in 4 coupled moves/);
    const changedLabels = await page.locator("#board .tile").evaluateAll(nodes =>
      nodes.map(node => node.getAttribute("aria-label")));
    assert.notDeepEqual(changedLabels, originalLabels);
    assert.match(changedLabels[15], /fixed flower.*Powered/);
    assert.equal(await page.evaluate(() => localStorage.length), 0,
      "experiment must not track/save gameplay in localStorage");

    // Solved state locks the result until an explicit reset; no free extra turns.
    await page.locator('button[data-axis="row"][data-group="2"]').click();
    assert.equal(await page.locator("#moves").textContent(), "4");
    await page.locator("#reset").click();
    assert.equal(await page.locator("#moves").textContent(), "0");
    assert.match(await page.locator("#status").textContent(), /Restarted/);
    assert.match(await page.locator("#board .tile").nth(15).getAttribute("aria-label"), /Not powered/);

    for (const width of [320, 360, 375, 750]) {
      await page.setViewportSize({ width, height: 740 });
      await page.evaluate(() => new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, width + "px viewport has " + overflow + "px horizontal overflow");
    }
    const touch = await browser.newContext({ viewport: { width: 320, height: 700 },
      hasTouch: true, isMobile: true, reducedMotion: "reduce" });
    const touchPage = await touch.newPage();
    await touchPage.goto(root + PAGE);
    await touchPage.locator('button[data-axis="column"][data-group="1"]').tap();
    assert.equal(await touchPage.locator("#moves").textContent(), "1");
    assert.equal(await touchPage.evaluate(() => localStorage.length), 0);
    await touchPage.close();
    await touch.close();

    assert.deepEqual(errors, [], "no page JavaScript errors");
    assert.deepEqual(unwanted, [], "no requests beyond the same local origin");
    t.diagnostic("Four-turn group solve, reset, keyboard focus, touch input, and mobile bounds passed.");
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
