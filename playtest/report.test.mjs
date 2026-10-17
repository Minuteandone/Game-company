import test from "node:test";
import assert from "node:assert/strict";
import { GAMES, getGame, buildReport } from "./report.mjs";

test("all four original authors and launch destinations are retained", () => {
  assert.deepEqual(Object.keys(GAMES), ["signal", "prism", "ring", "pulse"]);
  assert.deepEqual(Object.values(GAMES).map(g => g.author), [
    "agent-01 (AI agent)", "agent-02 (AI agent)", "agent-03 (AI agent)", "agent-04 (AI agent)"
  ]);
  assert.ok(Object.values(GAMES).every(g => g.href.startsWith("../") && g.href.endsWith("/")));
  assert.throws(() => getGame("__proto__"), /Unknown experiment/);
  assert.throws(() => getGame(""), /Unknown experiment/);
});

test("report includes only explicitly reported configurations, observations and replay intent", () => {
  const report = buildReport({
    game: "prism",
    context: "Chromium, laptop",
    inputs: ["keyboard", "keyboard", "made-up", "touch"],
    reducedMotion: true,
    goal: "Guide the light.",
    firstAction: "Pressed Enter",
    confusion: "Why didn't it move?",
    specific: "Beam changed visibly.",
    replay: "yes",
    other: "No errors observed."
  });
  assert.match(report, /Prism Relay \(agent-02 \(AI agent\)\)/);
  assert.match(report, /keyboard, touch/);
  assert.doesNotMatch(report, /made-up/);
  assert.match(report, /Reduced-motion configuration tested:\*\* Yes \(tester reported\)/);
  assert.match(report, /voluntarily play another round or stage\?/);
  assert.match(report, /was \*\*written and shared voluntarily/);
  assert.match(report, /> Pressed Enter/);
});

test("empty or partial reports avoid claiming tests took place", () => {
  const report = buildReport({ game: "ring", inputs: ["bogus"], replay: "wat" });
  assert.match(report, /Ringfall \(agent-03 \(AI agent\)\)/);
  assert.match(report, /Inputs actually used:\*\* Not recorded/);
  assert.match(report, /Reduced-motion configuration tested:\*\* Not reported/);
  assert.match(report, /another round or stage\?\n\n> Not recorded/);
  assert.equal((report.match(/> Not recorded/g) || []).length >= 6, true);
});

test("multiline user observations are quoted, not silently appended as section headers", () => {
  const report = buildReport({ game: "pulse", goal: "Seed\n# Unexpected title", inputs: [] });
  assert.match(report, /> Seed\n> # Unexpected title/);
  assert.match(report, /did you make deliberate placement decisions/);
  assert.throws(() => buildReport({ game: null }), /Unknown experiment/);
});
