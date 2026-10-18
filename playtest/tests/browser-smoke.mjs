/**
 * Real HTTP/Chromium+WebKit integration smoke test for the voluntary playtest worksheet.
 * Author: agent-01 (AI agent). Playwright is test-only, not a game dependency.
 */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, webkit } from "playwright";
const browserType = process.env.PLAYTEST_BROWSER === "webkit" ? webkit : chromium;
const browserLabel = browserType.name();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".css": "text/css" };

test(`worksheet (${browserLabel}): real controls, local-only Markdown download and narrow layout`, async (t) => {
  const requests = [];
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    requests.push(url.pathname);
    const requested = url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname;
    const absolute = path.resolve(ROOT, "." + decodeURIComponent(requested));
    if (!absolute.startsWith(ROOT + path.sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    try {
      const data = await readFile(absolute);
      response.writeHead(200, { "content-type": MIME[path.extname(absolute)] ?? "application/octet-stream" });
      response.end(data);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  let browser;
  try {
    browser = await browserType.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1100, height: 850 },
      reducedMotion: "reduce",
      acceptDownloads: true
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    const loaded = await page.goto(`http://127.0.0.1:${server.address().port}/playtest/`);
    assert.equal(loaded.status(), 200);
    assert.equal(await page.title(), "Playtest Notes — Game Company");
    assert.equal(await page.locator("#game").inputValue(), "",
      "no experiment should be silently selected on a new worksheet");
    const neutralReport = await page.locator("#preview").inputValue();
    assert.match(neutralReport, /Playtest notes — Unspecified experiment/);
    assert.match(neutralReport, /Original author:\*\* Not recorded/);
    assert.doesNotMatch(neutralReport, /Playtest notes — Signal Garden|\*\*Original author:\*\* agent-01 \(AI agent\)/,
      "blank worksheet must not falsely attribute a player's notes to Signal Garden");
    assert.equal(await page.locator("#play-selected").isVisible(), false);
    assert.equal(await page.locator("#play-selected").getAttribute("href"), null);
    assert.match(await page.locator("#game-question").textContent(), /Choose an experiment first/);
    // The first real Prism Relay reviewer accidentally exported a Signal Garden
    // report because the worksheet always selected its first option. An explicit
    // game deep link must prefill only the reviewed game ID (never other answers).
    const catalog = [
      ["signal-garden", "Signal Garden", "agent-01 (AI agent)", "../games/signal-garden/"],
      ["prism-relay", "Prism Relay", "agent-02 (AI agent)", "../experiments/agent-02-prism-relay/"],
      ["ringfall", "Ringfall", "agent-03 (AI agent)", "../prototypes/ringfall/"],
      ["pulse-garden", "Pulse Garden", "agent-04 (AI agent)", "../prototypes/agent-04-pulse-garden/"]
    ];
    const rootHtml = await readFile(path.join(ROOT, "index.html"), "utf8");
    for (const [game, name, author, playPath] of catalog) {
      // Every arcade game card must supply the matching explicit context.
      assert.ok(rootHtml.includes(`href="./playtest/?game=${game}"`),
        "Arcade has no direct feedback link for " + name);
      const linked = await page.goto(`http://127.0.0.1:${server.address().port}/playtest/?game=${game}`);
      assert.equal(linked.status(), 200);
      assert.equal(await page.locator("#game").inputValue(), game);
      assert.equal(await page.locator("#play-selected").getAttribute("href"), playPath);
      assert.match(await page.locator("#preview").inputValue(),
        new RegExp("# Playtest notes — " + name));
      assert.ok((await page.locator("#preview").inputValue()).includes("Original author:** " + author));
      assert.equal(await page.locator("#firstAction").inputValue(), "",
        "Game preselection should not invent first-action notes");
      assert.equal(await page.locator("#specific-followup").getAttribute("open"), null,
        "Post-play hypothesis remains hidden before the user chooses it");
    }

    const labs = [
      ["coupled-garden-lab", "Coupled Garden (comparison lab)", "agent-01 (AI agent)"],
      ["prism-spectrum-lab", "Forked Spectrum (comparison lab)", "agent-02 (AI agent)"],
      ["pulse-voices-lab", "Plant Voices (comparison lab)", "agent-04 (AI agent)"]
    ];
    for (const [game, name, author] of labs) {
      const linked = await page.goto("http://127.0.0.1:" + server.address().port + "/playtest/?game=" + game);
      assert.equal(linked.status(), 200);
      assert.equal(await page.locator("#game").inputValue(), game);
      assert.equal(await page.locator("#play-selected").isHidden(), true,
        "comparison labs must remain attribution-only in the downloadable worksheet");
      assert.equal(await page.locator("#play-selected").getAttribute("href"), null,
        "comparison labs must not invent curated-package launch paths");
      const labReport = await page.locator("#preview").inputValue();
      assert.ok(labReport.includes("# Playtest notes — " + name));
      assert.ok(labReport.includes("Original author:** " + author));
      assert.equal(await page.locator("#specific-followup").getAttribute("open"), null,
        "Lab-specific post-play hypothesis remains hidden until deliberately opened");
    }

    // An unknown or attacker-controlled query cannot set arbitrary answers or
    // change the game launch link; existing manual selection must still work.
    await page.goto(`http://127.0.0.1:${server.address().port}/playtest/?game=unknown%3Cscript%3E`);
    assert.equal(await page.locator("#game").inputValue(), "");
    assert.equal(await page.locator("#play-selected").getAttribute("href"), null);
    assert.equal(await page.locator("#play-selected").isHidden(), true);
    await page.locator("#game").selectOption("prism-relay");
    assert.match(await page.locator("#preview").inputValue(), /Prism Relay/);
    await page.goto(`http://127.0.0.1:${server.address().port}/playtest/`);
    assert.equal(await page.locator("#game").inputValue(), "");
    assert.match(await page.locator("#preview").inputValue(), /Unspecified experiment/);
    t.diagnostic("Reviewed shipped/lab deep links attribute reports correctly; blank and unknown URLs remain safe.");

    const discussion = page.locator("#share-discussion");
    assert.equal(await discussion.getAttribute("href"),
      "https://github.com/Minuteandone/Game-company/issues/4");
    assert.equal(await discussion.getAttribute("target"), "_blank");
    assert.match(await discussion.getAttribute("rel"), /noopener/);
    assert.match(await discussion.getAttribute("rel"), /noreferrer/);
    assert.match(await page.locator(".sharing-note").textContent(), /GitHub comments are public/);
    assert.match(await page.locator(".sharing-note").textContent(), /never publishes anything for you/);
    t.diagnostic("Blank worksheet provides a clearly optional, public and user-initiated sharing path.");

    // Launch destinations are determined by the chosen reviewed experiment,
    // not user-entered strings. Changing selection must not itself send requests.
    for (const [game, route, title] of [
      ["signal-garden", "../games/signal-garden/", "Signal Garden"],
      ["prism-relay", "../experiments/agent-02-prism-relay/", "Prism Relay"],
      ["ringfall", "../prototypes/ringfall/", "Ringfall"],
      ["pulse-garden", "../prototypes/agent-04-pulse-garden/", "Pulse Garden"]
    ]) {
      await page.locator("#game").selectOption(game);
      assert.equal(await page.locator("#play-selected").getAttribute("href"), route);
      assert.match(await page.locator("#play-selected").textContent(), new RegExp("Open " + title));
      assert.equal(await page.locator("#play-selected").isVisible(), true);
    }
    await page.locator("#game").selectOption("coupled-garden-lab");
    assert.equal(await page.locator("#play-selected").isHidden(), true);
    assert.equal(await page.locator("#play-selected").getAttribute("href"), null);
    assert.match(await page.locator("#preview").inputValue(), /Coupled Garden \(comparison lab\)/);
    await page.locator("#game").selectOption("");
    assert.equal(await page.locator("#play-selected").isVisible(), false,
      "clearing selection must hide the last game's link");
    assert.equal(await page.locator("#play-selected").getAttribute("href"), null,
      "no stale game URL may survive after clearing selection");
    assert.match(await page.locator("#preview").inputValue(), /Unspecified experiment/);
    await page.locator("#game").selectOption("pulse-garden");
    await page.locator("#familiarity").selectOption("First time");
    await page.locator("#device").selectOption("Desktop/laptop");
    await page.locator('input[value="Keyboard"]').check();
    await page.locator("#goal").selectOption("Partly");
    await page.locator("#firstAction").fill("I tried the arrow keys before reading the help.");
    await page.locator("#enjoyment").selectOption("4");
    await page.locator("#improvement").fill("Show a clearer bloom target.");
    assert.equal(await page.locator("#specific-followup").getAttribute("open"), null);
    assert.equal(await page.locator("#specific").isVisible(), false,
      "game-specific hypothesis should not be visible before the tester opens the post-play follow-up");
    assert.match(await page.locator("#game-question").textContent(), /deliberate placement decisions/i);
    await page.locator("#specific-followup summary").click();
    assert.equal(await page.locator("#specific").isVisible(), true);
    await page.locator("#specific").fill("I mostly waited after planting six seeds.");
    const generated = await page.locator("#preview").inputValue();
    assert.match(generated, /Pulse Garden/);
    assert.match(generated, /agent-04 \(AI agent\)/);
    assert.match(generated, /First time/);
    assert.match(generated, /Keyboard/);
    assert.match(generated, /4\/5/);
    assert.match(generated, /I tried the arrow keys/);
    assert.match(generated, /Show a clearer bloom target/);
    assert.match(generated, /mostly waited after planting six seeds/);
    assert.match(generated, /After learning how to plant/);
    assert.doesNotMatch(generated, /Pass(ed)?|Verified by a player/);
    t.diagnostic("Form updates only the local preview and preserves proper attribution.");

    const downloadWait = page.waitForEvent("download");
    await page.locator("#download").click();
    const download = await downloadWait;
    assert.equal(download.suggestedFilename(), "game-company-playtest-pulse-garden.md");
    const downloadedText = await readFile(await download.path(), "utf8");
    assert.equal(downloadedText, generated);
    assert.match(await page.locator("#status").textContent(), /Nothing was submitted/);
    t.diagnostic("Downloaded Markdown exactly matches the preview.");

    await page.locator("#preview").fill("# Custom note edited by the tester");
    const customDownloadWait = page.waitForEvent("download");
    await page.locator("#download").click();
    const customDownload = await customDownloadWait;
    assert.equal(await readFile(await customDownload.path(), "utf8"), "# Custom note edited by the tester");
    t.diagnostic("Edited previews export exactly as shown.");

    await page.setViewportSize({ width: 360, height: 760 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    assert.ok(overflow <= 1, `Unexpected horizontal overflow: ${overflow}px`);
    assert.deepEqual(errors, [], "no browser JavaScript or console errors");
    assert.deepEqual(
      [...new Set(requests)].sort(),
      ["/playtest/", "/playtest/report.mjs", "/playtest/worksheet.mjs"].sort(),
      "test page loads no external endpoints, tracking scripts or other assets"
    );
    t.diagnostic("360px layout is usable without horizontal overflow or extra requests.");

    // A *user-initiated* link opens the selected game in a separate tab.
    // The worksheet's input and editable report remain on the original page.
    const popupPromise = page.waitForEvent("popup");
    await page.locator("#play-selected").click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    assert.equal(popup.url(),
      `http://127.0.0.1:${server.address().port}/prototypes/agent-04-pulse-garden/`);
    assert.equal(await popup.title(), "Pulse Garden — agent-04");
    assert.equal(await page.locator("#firstAction").inputValue(),
      "I tried the arrow keys before reading the help.");
    assert.equal(await page.locator("#preview").inputValue(),
      "# Custom note edited by the tester");
    await popup.close();
    t.diagnostic("Opening the selected playable game is opt-in and preserves unsent feedback notes.");

    // A submitted first-round Prism Relay review was mislabeled Signal Garden.
    // Merely changing the selector must never silently relabel typed notes.
    // Test both typed form answers and a manually edited Markdown preview.
    const changedPreview = await page.locator("#preview").inputValue();
    const rejected = page.waitForEvent("dialog");
    await Promise.all([
      page.locator("#game").selectOption("prism-relay"),
      (async () => {
        const dialog = await rejected;
        assert.match(dialog.message(), /clear this report's notes, ratings and test context/);
        await dialog.dismiss();
      })()
    ]);
    assert.equal(await page.locator("#game").inputValue(), "pulse-garden",
      "Cancel must restore the previous game's identity");
    assert.equal(await page.locator("#firstAction").inputValue(),
      "I tried the arrow keys before reading the help.");
    assert.equal(await page.locator("#preview").inputValue(), changedPreview,
      "Cancelling must preserve manual edits to the exported Markdown");
    assert.match(await page.locator("#status").textContent(), /Switch cancelled/);

    const accepted = page.waitForEvent("dialog");
    await Promise.all([
      page.locator("#game").selectOption("prism-relay"),
      (async () => {
        const dialog = await accepted;
        assert.match(dialog.message(), /Copy or download them first/);
        await dialog.accept();
      })()
    ]);
    assert.equal(await page.locator("#game").inputValue(), "prism-relay");
    assert.equal(await page.locator("#firstAction").inputValue(), "");
    assert.equal(await page.locator("#specific").inputValue(), "");
    assert.equal(await page.locator("#goal").inputValue(), "Not recorded");
    assert.equal(await page.locator("#enjoyment").inputValue(), "");
    assert.equal(await page.locator("#device").inputValue(), "Not recorded");
    assert.equal(await page.locator('input[value="Keyboard"]').isChecked(), false);
    assert.equal(await page.locator("#specific-followup").getAttribute("open"), null);
    assert.match(await page.locator("#preview").inputValue(), /Playtest notes — Prism Relay/);
    assert.doesNotMatch(await page.locator("#preview").inputValue(), /Custom note edited by the tester|mostly waited/);
    assert.equal(await page.locator("#play-selected").getAttribute("href"),
      "../experiments/agent-02-prism-relay/");
    assert.match(await page.locator("#status").textContent(), /notes were cleared/);

    // Blank form is a neutral staging area: a tester who wrote notes before
    // choosing a game must still be able to attribute those notes without loss.
    await page.locator("#game").selectOption("");
    await page.locator("#firstAction").fill("I pressed a tile before picking the game.");
    await page.locator("#game").selectOption("signal-garden");
    assert.equal(await page.locator("#firstAction").inputValue(),
      "I pressed a tile before picking the game.");
    assert.match(await page.locator("#preview").inputValue(), /Playtest notes — Signal Garden/);
    t.diagnostic("Switching filled-game context requires consent; cancelled changes preserve, accepted changes clear, neutral attribution preserves.");

    // The Markdown preview is editable even if all ordinary answer fields are
    // untouched. Changes to another answer must not erase hand-edited text.
    await page.locator("#preview").fill("# My carefully revised Signal Garden report");
    page.once("dialog", async dialog => {
      assert.match(dialog.message(), /manually edited this Markdown report/i);
      await dialog.dismiss();
    });
    await page.locator("#device").selectOption("Tablet");
    assert.equal(await page.locator("#device").inputValue(), "Not recorded",
      "rejecting a form change restores the previous answer");
    assert.equal(await page.locator("#preview").inputValue(),
      "# My carefully revised Signal Garden report");
    assert.match(await page.locator("#status").textContent(), /hand-edited report was preserved/);

    // Checkboxes need the same reversible snapshot semantics.
    page.once("dialog", async dialog => { await dialog.dismiss(); });
    await page.locator('input[value="Touch"]').check();
    assert.equal(await page.locator('input[value="Touch"]').isChecked(), false);
    assert.equal(await page.locator("#preview").inputValue(),
      "# My carefully revised Signal Garden report");

    page.once("dialog", async dialog => { await dialog.accept(); });
    await page.locator("#device").selectOption("Tablet");
    assert.equal(await page.locator("#device").inputValue(), "Tablet");
    assert.match(await page.locator("#preview").inputValue(), /Tablet/);
    assert.doesNotMatch(await page.locator("#preview").inputValue(),
      /My carefully revised Signal Garden report/);

    // Switching a blank, unattributed worksheet with a manually edited
    // Markdown report must also request permission, while ordinary answers
    // written before selection still remain supported without a prompt.
    page.once("dialog", async dialog => { await dialog.accept(); });
    await page.locator("#game").selectOption("");
    assert.equal(await page.locator("#game").inputValue(), "");
    await page.locator("#preview").fill("# Neutral custom notes, no game assigned");
    page.once("dialog", async dialog => {
      assert.match(dialog.message(), /Choosing a game will regenerate this hand-edited Markdown report/);
      await dialog.dismiss();
    });
    await page.locator("#game").selectOption("prism-relay");
    assert.equal(await page.locator("#game").inputValue(), "");
    assert.equal(await page.locator("#preview").inputValue(),
      "# Neutral custom notes, no game assigned");

    page.once("dialog", async dialog => { await dialog.accept(); });
    await page.locator("#game").selectOption("prism-relay");
    assert.equal(await page.locator("#game").inputValue(), "prism-relay");
    assert.match(await page.locator("#preview").inputValue(), /Playtest notes — Prism Relay/);
    assert.doesNotMatch(await page.locator("#preview").inputValue(), /Neutral custom notes/);
    t.diagnostic("Manual Markdown is protected from ordinary form changes, checkbox changes and neutral-to-game selection in Chromium/WebKit.");

    await page.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
