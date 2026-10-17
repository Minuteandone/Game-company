/**
 * Real-HTTP Chromium smoke coverage for the local-only Playtest Notebook.
 * Author: agent-02 (AI agent). CI tooling is not a runtime dependency.
 */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".css": "text/css" };

function serve() {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
      if (pathname === "/favicon.ico") {
        res.writeHead(204);
        res.end();
        return;
      }
      const relative = pathname.endsWith("/") ? pathname + "index.html" : pathname;
      const absolute = path.resolve(ROOT, "." + relative);
      if (!absolute.startsWith(ROOT + path.sep)) {
        res.writeHead(403); res.end(); return;
      }
      const data = await readFile(absolute);
      res.writeHead(200, { "content-type": MIME[path.extname(absolute)] || "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, url: "http://127.0.0.1:" + server.address().port + "/playtest/" });
    });
  });
}

test("browser: generate, edit, export a voluntary notebook report", async (t) => {
  const { server, url } = await serve();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 950, height: 820 },
      reducedMotion: "reduce",
      acceptDownloads: true,
      permissions: ["clipboard-read", "clipboard-write"]
    });
    const page = await context.newPage();
    const errors = [];
    const outgoing = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    page.on("request", request => {
      if (!request.url().startsWith(new URL(url).origin + "/")) outgoing.push(request.url());
    });

    const response = await page.goto(url);
    assert.equal(response.status(), 200);
    assert.match(await page.title(), /Playtest Notebook/);
    assert.equal(await page.locator("#play-link").getAttribute("href"), "../games/signal-garden/");
    assert.equal(await page.locator("#copy").isDisabled(), true);
    t.diagnostic("Initial document rendered without a network-dependent backend.");

    await page.locator("#game").selectOption("prism");
    assert.match(await page.locator("#specific-label").textContent(), /Signal Garden/);
    assert.equal(await page.locator("#play-link").getAttribute("href"), "../experiments/agent-02-prism-relay/");
    await page.locator("#context").fill("Chromium on laptop");
    await page.locator('input[name="inputs"][value="keyboard"]').check();
    await page.locator("#goal").fill("Redirect the beam to the receiver");
    await page.locator("#firstAction").fill("Pressed Enter on a mirror");
    await page.locator('input[name="replay"][value="yes"]').check();
    await page.locator('button[type="submit"]').click();

    const report = await page.locator("#report-preview").inputValue();
    assert.match(report, /Prism Relay \(agent-02 \(AI agent\)\)/);
    assert.match(report, /Chromium on laptop/);
    assert.match(report, /Inputs actually used:\*\* keyboard/);
    assert.match(report, /Not reported/);
    assert.match(report, /Redirect the beam to the receiver/);
    assert.equal(await page.locator("#copy").isEnabled(), true);
    assert.equal(await page.locator("#download").isEnabled(), true);
    t.diagnostic("Experiment-specific prompt, report content and explicit input attribution passed.");

    await page.locator("#copy").click();
    assert.match(await page.locator("#status").textContent(), /copied/);
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), report);

    const [file] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#download").click()
    ]);
    assert.equal(file.suggestedFilename(), "game-company-playtest-prism.md");
    t.diagnostic("User-initiated copy and local download work without submitting data.");

    await page.locator("#goal").fill("New observation");
    assert.equal(await page.locator("#report-preview").inputValue(), "");
    assert.equal(await page.locator("#download").isDisabled(), true);
    await page.locator('button[type="submit"]').click();
    assert.match(await page.locator("#report-preview").inputValue(), /New observation/);
    assert.doesNotMatch(await page.locator("#report-preview").inputValue(), /Redirect the beam/);

    await page.setViewportSize({ width: 360, height: 740 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, "360px viewport overflow: " + overflow);
    assert.deepEqual(outgoing, [], "the notebook must make no outgoing requests");
    assert.deepEqual(errors, [], "no browser page/console errors expected");
    t.diagnostic("Edits invalidate old exports; narrow viewport has no horizontal overflow.");

    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
