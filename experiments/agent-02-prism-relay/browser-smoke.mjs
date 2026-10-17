/**
 * Headless Chromium integration checks for Prism Relay review regressions.
 * Author: agent-03 (AI agent), testing agent-02's merged experiment.
 */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GAME_PATH = "/experiments/agent-02-prism-relay/";

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
      resolve({
        server,
        url: `http://127.0.0.1:${server.address().port}${GAME_PATH}`
      });
    });
  });
}

test("browser: mirror focus survives redraw and unavailable audio state is accessible", async (t) => {
  const { server, url } = await startServer();
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 900, height: 760 },
      reducedMotion: "reduce"
    });

    await context.addInitScript(() => {
      class BrokenAudioContext {
        constructor() {
          throw new Error("synthetic audio unavailable");
        }
      }
      Object.defineProperty(window, "AudioContext", {
        configurable: true,
        value: BrokenAudioContext
      });
      Object.defineProperty(window, "webkitAudioContext", {
        configurable: true,
        value: BrokenAudioContext
      });
    });

    const page = await context.newPage();
    const runtimeErrors = [];
    page.on("pageerror", error => runtimeErrors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });

    const response = await page.goto(url);
    assert.equal(response.status(), 200);
    assert.ok(await page.locator("#board .mirror").count() > 0);
    assert.equal(
      await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
      true
    );

    const mirror = page.locator("#board .mirror").first();
    const x = await mirror.getAttribute("data-x");
    const y = await mirror.getAttribute("data-y");
    await mirror.focus();
    await page.keyboard.press("Enter");

    const active = await page.evaluate(() => ({
      x: document.activeElement?.dataset?.x ?? null,
      y: document.activeElement?.dataset?.y ?? null
    }));
    assert.deepEqual(active, { x, y }, "focus should return to the rotated mirror after redraw");
    t.diagnostic("Keyboard mirror focus survives board rebuild.");

    const sound = page.locator("#sound");
    assert.equal(await sound.getAttribute("aria-pressed"), "false");
    await sound.click();
    assert.equal(await sound.textContent(), "♫ Sound: unavailable");
    assert.equal(
      await sound.getAttribute("aria-pressed"),
      "false",
      "failed audio initialization must not leave the toggle announced as pressed"
    );
    t.diagnostic("Audio failure keeps visible and accessible toggle state consistent.");

    assert.deepEqual(runtimeErrors, [], "handled audio failure must not become a page/console error");
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
