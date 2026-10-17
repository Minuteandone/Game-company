import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css" };
async function serve() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/favicon.ico") { res.writeHead(204).end(); return; }
      const target = url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname;
      const file = path.resolve(ROOT, "." + decodeURIComponent(target));
      if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      const bytes = await readFile(file);
      res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" }).end(bytes);
    } catch { res.writeHead(404).end("Not found"); }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}

test("paired worksheet: neutral selection, actual links, evidence gating, export and 320px viewport", async () => {
  const server = await serve();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1024, height: 820 },
      acceptDownloads: true, reducedMotion: "reduce" });
    const page = await context.newPage();
    const external = [], errors = [];
    page.on("request", req => {
      if (!req.url().startsWith(`http://127.0.0.1:${server.address().port}/`) &&
          !req.url().startsWith("data:")) external.push(req.url());
    });
    page.on("pageerror", e => errors.push(e.message));
    const url = `http://127.0.0.1:${server.address().port}/playtest/compare/`;
    const response = await page.goto(url);
    assert.equal(response.status(), 200);
    assert.match(await page.title(), /Paired Prototype Notes/);
    assert.equal(await page.locator("#pair").inputValue(), "");
    assert.equal(await page.locator("#original-link").getAttribute("href"), null);
    assert.equal(await page.locator("#lab-link").getAttribute("href"), null);
    assert.equal(await page.locator("#original-link").isVisible(), false);
    assert.equal(await page.locator("#post-play").getAttribute("open"), null);
    assert.match(await page.locator("#preview").inputValue(), /Unspecified pair/);
    assert.match(await page.locator("#preview").inputValue(), /no head-to-head conclusion/);

    for (const [id, originalPath, labPath] of [
      ["signal-coupled", "../../games/signal-garden/", "../../experiments/agent-01-coupled-garden/"],
      ["prism-spectrum", "../../experiments/agent-02-prism-relay/", "../../experiments/agent-02-prism-spectrum-lab/"],
      ["pulse-voices", "../../prototypes/agent-04-pulse-garden/", "../../experiments/agent-04-pulse-voices/"]
    ]) {
      await page.locator("#pair").selectOption(id);
      assert.equal(await page.locator("#original-link").getAttribute("href"), originalPath);
      assert.equal(await page.locator("#lab-link").getAttribute("href"), labPath);
      assert.equal(await page.locator("#original-link").isVisible(), true);
      assert.equal(await page.locator("#lab-link").isVisible(), true);
      assert.equal(await page.locator("#original-link").getAttribute("target"), "_blank");
      assert.match(await page.locator("#lab-link").getAttribute("rel"), /noopener noreferrer/);
    }
    await page.locator("#pair").selectOption("");
    assert.equal(await page.locator("#original-link").getAttribute("href"), null);
    assert.equal(await page.locator("#lab-link").getAttribute("href"), null);

    await page.goto(url + "?pair=prism-spectrum");
    assert.equal(await page.locator("#pair").inputValue(), "prism-spectrum");
    assert.match(await page.locator("#preview").inputValue(), /Prism Relay \/ Forked Spectrum/);
    assert.equal(await page.locator("#originalNotes").inputValue(), "");
    await page.goto(url + "?pair=not-a-real-pair");
    assert.equal(await page.locator("#pair").inputValue(), "");
    assert.equal(await page.locator("#lab-link").getAttribute("href"), null);
    assert.match(await page.locator("#preview").inputValue(), /Unspecified pair/);

    await page.locator("#pair").selectOption("signal-coupled");
    await page.locator("#played").selectOption("Original only");
    await page.locator("#originalNotes").fill("I tried single tile rotations.");
    await page.locator("#labNotes").fill("I have not tried the lab yet.");
    await page.locator("#post-play summary").click();
    await page.locator("#preference").selectOption("Lab");
    assert.match(await page.locator("#preview").inputValue(), /no head-to-head conclusion/);
    assert.match(await page.locator("#preview").inputValue(), /Not comparable — both versions not confirmed/);
    await page.locator("#played").selectOption("Both");
    await page.locator("#order").selectOption("Original first");
    await page.locator("#originalVersion").fill("abcdef1");
    await page.locator("#labVersion").fill("abcdef2");
    assert.match(await page.locator("#preview").inputValue(), /qualitative comparison possible/);
    assert.match(await page.locator("#preview").inputValue(), /Which would I voluntarily return to\?\*\* Lab/);
    assert.match(await page.locator("#preview").inputValue(), /abcdef1/);
    assert.match(await page.locator("#preview").inputValue(), /abcdef2/);

    const popupPromise = page.waitForEvent("popup");
    await page.locator("#lab-link").click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    assert.equal(popup.url(), new URL("../../experiments/agent-01-coupled-garden/", url).href);
    assert.match(await popup.title(), /Coupled Garden/);
    assert.equal(await page.locator("#originalNotes").inputValue(), "I tried single tile rotations.");
    await popup.close();

    await page.locator("#preview").fill("# Corrected notes from tester");
    const download = page.waitForEvent("download");
    await page.locator("#download").click();
    const file = await download;
    assert.equal(file.suggestedFilename(), "game-company-comparison-signal-coupled.md");
    const fs = await import("node:fs/promises");
    assert.equal(await fs.readFile(await file.path(), "utf8"), "# Corrected notes from tester");

    await page.setViewportSize({ width: 320, height: 720 });
    await page.evaluate(() => new Promise(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const over = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(over <= 1, `320px: ${over}px sideways overflow`);
    assert.deepEqual(external, [], "no off-site requests unless user opens public GitHub themselves");
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
