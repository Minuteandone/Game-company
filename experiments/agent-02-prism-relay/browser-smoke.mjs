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
import { solvePuzzle } from "./logic.mjs";
import { LEVELS } from "./levels.mjs";

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

    assert.equal(await page.locator("#board").getAttribute("aria-describedby"), "board-layout");
    assert.match(await page.locator("#board-layout").textContent(), /Emitter at row 4, column 1/);
    assert.match(await page.locator("#board-layout").textContent(), /Walls at row 2, column 4/);
    const mirror = page.locator("#board .mirror").first();
    const x = await mirror.getAttribute("data-x");
    const y = await mirror.getAttribute("data-y");
    assert.match(await mirror.getAttribute("aria-label"), /arrives moving east and reflects north/);
    await mirror.focus();
    await page.keyboard.press("Enter");
    assert.match(await page.locator("#board .mirror").first().getAttribute("aria-label"), /arrives moving east and reflects south/);
    assert.match(await page.locator("#status").textContent(), /Circuit connected/);


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


test("browser: solve, unlock, persist and remain usable at narrow width", async (t) => {
  const { server, url } = await startServer();
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1000, height: 760 },
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
    assert.equal(await page.title(), "Prism Relay · agent-02 prototype");
    assert.equal(await page.locator("#level-index").textContent(), "01 / 04");
    assert.equal(await page.locator("#moves").textContent(), "0");
    assert.equal(await page.locator("#best").textContent(), "—");
    assert.equal(await page.locator("#level-picker .level-choice").count(), LEVELS.length);
    assert.equal(await page.locator("#level-picker .level-choice:not(:disabled)").count(), 1);
    assert.equal(await page.locator("#next").isDisabled(), true);

    await page.keyboard.press("h");
    assert.match(await page.locator("#status").textContent(), /^Hint:/);
    await page.keyboard.press("r");
    assert.equal(await page.locator("#status").textContent(), "Circuit restarted. A new route awaits.");
    t.diagnostic("Initial controls, hint shortcut and restart shortcut passed.");

    // First circuit has an initially off-path mirror. Rotating it is a
    // legitimate setup action even though it cannot change the current ray.
    const initialRay=await page.locator("#board .beam-core").getAttribute("points");
    await page.locator('#board .mirror[data-x="2"][data-y="5"]').click();
    assert.equal(await page.locator("#moves").textContent(),"1");
    assert.equal(await page.locator("#board .beam-core").getAttribute("points"),initialRay);
    assert.match(await page.locator("#status").textContent(),
      /Row 6, column 3 mirror turned to slash\. The live beam path is unchanged so far\./);
    assert.match(await page.locator("#status").textContent(),
      /It does not yet reach this mirror\./);
    await page.locator("#reset").click();
    assert.equal(await page.locator("#moves").textContent(),"0");

    const solution = solvePuzzle(LEVELS[0].grid);
    assert.ok(solution && solution.length > 0, "first circuit needs a non-empty known solution");
    for (const { x, y } of solution) {
      await page.locator(`#board .mirror[data-x="${x}"][data-y="${y}"]`).click();
    }

    assert.equal(await page.locator("#beam-state").textContent(), "✦ SIGNAL CONNECTED");
    assert.equal(await page.locator("#moves").textContent(), String(solution.length));
    assert.equal(await page.locator("#best").textContent(), String(solution.length));
    assert.equal(await page.locator("#next").isDisabled(), false);
    assert.equal(await page.locator("#level-picker .level-choice:not(:disabled)").count(), 2);
    assert.match(await page.locator("#status").textContent(), /next puzzle is unlocked/i);
    t.diagnostic("UI clicks solved the shipped first circuit and unlocked circuit 2.");

    await page.locator("#next").click();
    assert.equal(await page.locator("#level-index").textContent(), "02 / 04");
    assert.equal(await page.locator("#level-title").textContent(), LEVELS[1].name);
    assert.equal(await page.locator("#moves").textContent(), "0");

    // A non-winning turn on a beam-reached mirror must report that it really
    // redirected light, and give the actual new beam interruption.
    const levelTwoRay=await page.locator("#board .beam-core").getAttribute("points");
    await page.locator('#board .mirror[data-x="1"][data-y="3"]').click();
    assert.equal(await page.locator("#moves").textContent(), "1");
    assert.notEqual(await page.locator("#board .beam-core").getAttribute("points"),levelTwoRay);
    assert.match(await page.locator("#status").textContent(),
      /^Row 4, column 2 mirror turned to slash. The beam's route changed./);
    assert.match(await page.locator("#status").textContent(), /The beam (?:exits|hits|returns|enters)/);
    await page.locator("#reset").click();

    await page.reload();
    assert.equal(await page.locator("#level-picker .level-choice:not(:disabled)").count(), 2);
    assert.equal(await page.locator("#best").textContent(), String(solution.length));
    await page.locator("#level-picker .level-choice").nth(1).click();
    assert.equal(await page.locator("#level-title").textContent(), LEVELS[1].name);
    t.diagnostic("Unlock and best-score persistence survived a real reload.");

    await page.setViewportSize({ width: 360, height: 740 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    assert.ok(overflow <= 1, `360px viewport has ${overflow}px horizontal overflow`);
    assert.ok((await page.locator("#board").boundingBox())?.width <= 360);
    assert.deepEqual(runtimeErrors, [], "no browser runtime/console errors expected");
    t.diagnostic("Narrow viewport and runtime-error checks passed.");

    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});


test("browser: confirm clears only Prism Relay data; cancel preserves it", async (t) => {
  const { server, url } = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));

    assert.equal((await page.goto(url)).status(), 200);
    await page.evaluate(() => localStorage.setItem("unrelated-game-key", "keep"));
    const solution = solvePuzzle(LEVELS[0].grid);
    for (const { x, y } of solution) {
      await page.locator('#board .mirror[data-x="' + x + '"][data-y="' + y + '"]').click();
    }
    assert.equal(await page.locator("#level-picker .level-choice:not(:disabled)").count(), 2);
    assert.equal(await page.locator("#best").textContent(), String(solution.length));
    const saveKey = "game-company-agent-02-prism-relay-v1";
    const saved = await page.evaluate(key => localStorage.getItem(key), saveKey);
    assert.ok(saved?.includes('"unlocked":1'));

    page.once("dialog", async dialog => {
      assert.match(dialog.message(), /Clear Prism Relay's saved level unlocks/);
      await dialog.dismiss();
    });
    await page.locator("#clear-progress").click();
    assert.equal(await page.locator("#level-picker .level-choice:not(:disabled)").count(), 2);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), saveKey), saved);
    t.diagnostic("Cancelling the native confirmation preserves saved unlocks and best score.");

    page.once("dialog", async dialog => { await dialog.accept(); });
    await page.locator("#clear-progress").click();
    assert.equal(await page.locator("#level-picker .level-choice:not(:disabled)").count(), 1);
    assert.equal(await page.locator("#level-index").textContent(), "01 / 04");
    assert.equal(await page.locator("#best").textContent(), "—");
    assert.equal(await page.locator("#moves").textContent(), "0");
    assert.equal(await page.evaluate(key => localStorage.getItem(key), saveKey), null);
    assert.equal(await page.evaluate(() => localStorage.getItem("unrelated-game-key")), "keep");
    assert.match(await page.locator("#status").textContent(), /Saved Prism Relay progress cleared/);
    t.diagnostic("Confirmation resets session and removes only Prism Relay's storage key.");

    await page.reload();
    assert.equal(await page.locator("#level-picker .level-choice:not(:disabled)").count(), 1);
    assert.equal(await page.locator("#best").textContent(), "—");
    assert.equal(await page.evaluate(() => localStorage.getItem("unrelated-game-key")), "keep");

    for (const { x, y } of solution) {
      await page.locator('#board .mirror[data-x="' + x + '"][data-y="' + y + '"]').click();
    }
    assert.ok(await page.evaluate(key => localStorage.getItem(key), saveKey));
    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test("browser: storage denial warns that previous progress may return after reload", async () => {
  const { server, url } = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const original = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function(key) {
        if (key === "game-company-agent-02-prism-relay-v1") throw new Error("storage removal denied");
        return original.call(this, key);
      };
    });
    const page = await context.newPage();
    await page.goto(url);
    for (const { x, y } of solvePuzzle(LEVELS[0].grid)) {
      await page.locator('#board .mirror[data-x="' + x + '"][data-y="' + y + '"]').click();
    }
    page.once("dialog", async dialog => { await dialog.accept(); });
    await page.locator("#clear-progress").click();
    assert.equal(await page.locator("#level-picker .level-choice:not(:disabled)").count(), 1);
    assert.match(await page.locator("#status").textContent(), /browser storage blocked deletion/i);
    await page.reload();
    assert.equal(await page.locator("#level-picker .level-choice:not(:disabled)").count(), 2);
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});


test("browser: keyboard return link navigates from Prism Relay to arcade", async () => {
  const { server, url } = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 360, height: 740 }, reducedMotion: "reduce" });
    assert.equal((await page.goto(url)).status(), 200);
    const back = page.getByRole("link", { name: "Back to Game Company Arcade" });
    assert.equal(await back.getAttribute("href"), "../../index.html");
    for (const width of [360, 320]) {
      await page.setViewportSize({ width, height: 740 });
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      assert.ok(overflow <= 1, width + "px viewport has " + overflow + "px horizontal overflow");
      assert.ok(await back.isVisible(), "return-to-arcade link remains visible");
    }
    await back.focus();
    assert.equal(await back.evaluate(el => el === document.activeElement), true);
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/index\.html$/);
    assert.match(await page.title(), /Game Company Arcade/);
    assert.ok(await page.getByRole("heading", { name: /Four experiments/ }).isVisible());
    await page.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
