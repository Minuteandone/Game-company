/**
 * Browser regression for optional Forked Spectrum lab, over real localhost HTTP.
 * Author: agent-02 (AI agent). No remote publishing or telemetry.
 */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PAGE = "experiments/agent-02-prism-spectrum-lab/";

async function serverOnRandomPort() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
      if (pathname === "/favicon.ico") { response.writeHead(204).end(); return; }
      const relative = pathname.endsWith("/") ? pathname + "index.html" : pathname;
      const absolute = path.resolve(ROOT, "." + relative);
      if (!absolute.startsWith(ROOT + path.sep)) {
        response.writeHead(403).end(); return;
      }
      const bytes = await readFile(absolute);
      const mime = { ".html": "text/html", ".mjs": "text/javascript", ".css": "text/css" };
      response.writeHead(200, { "content-type": mime[path.extname(absolute)] || "application/octet-stream" }).end(bytes);
    } catch { response.writeHead(404).end("Not found"); }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}

test("Forked Spectrum: keyboard splits, solves, resets and remains narrow-safe", async () => {
  const server = await serverOnRandomPort();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 360, height: 740 }, reducedMotion: "reduce" });
    const errors = [], outgoing = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("request", request => {
      if (!request.url().startsWith("http://127.0.0.1:" + server.address().port + "/") &&
          !request.url().startsWith("data:")) outgoing.push(request.url());
    });

    const root = "http://127.0.0.1:" + server.address().port + "/";
    const loaded = await page.goto(root + PAGE);
    assert.equal(loaded.status(), 200);
    assert.match(await page.title(), /Forked Spectrum/);
    assert.equal(await page.locator("#cells .mirror").count(), 3);
    assert.equal(await page.locator("#rays polyline").count(), 3, "white feed and two colored traces");
    assert.equal(await page.locator("#cyan-state").textContent(), "Not connected");
    assert.equal(await page.locator("#amber-state").textContent(), "Not connected");

    const cyanMirror = page.locator('#cells .mirror[data-x="3"][data-y="1"]');
    const amberMirror = page.locator('#cells .mirror[data-x="3"][data-y="5"]');
    assert.match(await cyanMirror.getAttribute("aria-label"), /cyan ray reaches it/);
    assert.match(await amberMirror.getAttribute("aria-label"), /amber ray reaches it/);
    await cyanMirror.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#cyan-state").textContent(), "Connected");
    assert.equal(await page.locator("#amber-state").textContent(), "Not connected");
    assert.equal(await page.locator("#rotations").textContent(), "Rotations: 1");
    assert.equal(await cyanMirror.evaluate(el => el === document.activeElement), true,
      "keyboard focus should survive re-rendering");

    await amberMirror.click();
    assert.equal(await page.locator("#cyan-state").textContent(), "Connected");
    assert.equal(await page.locator("#amber-state").textContent(), "Connected");
    assert.match(await page.locator("#status").textContent(), /Both rays connected in 2 rotations/);
    assert.equal(await page.locator("#rays polyline").count(), 3);

    await page.locator("#reset").click();
    assert.equal(await page.locator("#rotations").textContent(), "Rotations: 0");
    assert.equal(await page.locator("#cyan-state").textContent(), "Not connected");
    assert.equal(await page.locator("#amber-state").textContent(), "Not connected");

    // Avoid transient browser-resize measurements; use two frames to settle.
    await page.evaluate(() => new Promise(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, "360px layout overflows horizontally by " + overflow + "px");
    assert.deepEqual(errors, [], "no JavaScript runtime errors");
    assert.deepEqual(outgoing, [], "no outside-network requests");
    await page.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
