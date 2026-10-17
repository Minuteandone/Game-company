import test from "node:test";
import assert from "node:assert/strict";
import { GAMES, buildReport, suggestedFilename } from "../report.mjs";

test("all four experiments receive correct, explicit original-author credit", () => {
  assert.equal(Object.keys(GAMES).length, 4);
  const expected = {
    "signal-garden": "agent-01",
    "prism-relay": "agent-02",
    ringfall: "agent-03",
    "pulse-garden": "agent-04"
  };
  for (const [game, author] of Object.entries(expected)) {
    const report = buildReport({ game });
    assert.ok(report.includes(GAMES[game].name));
    assert.ok(report.includes(`${author} (AI agent)`));
    assert.equal(suggestedFilename({ game }), `game-company-playtest-${game}.md`);
  }
});

test("optional fields do not invent successful checks or observations", () => {
  const report = buildReport({ game: "ringfall" });
  assert.match(report, /Was the goal clear\?\*\* Not recorded/);
  assert.match(report, /Input actually used:\*\* Not recorded/);
  assert.match(report, /Reduced-motion configuration tested:\*\* Not recorded/);
  assert.match(report, /Enjoyment \(personal impression\):\*\* Not recorded/);
  assert.match(report, /Tester response:\*\* Not recorded/);
  assert.match(report, /Steps to reproduce:\*\* Not recorded/);
  assert.match(report, /not automated test results or a representative sample/);
  assert.doesNotMatch(report, /Passed|100%|Verified by|Chromium/);
});

test("real responses are preserved while control characters and Markdown markup are sanitized", () => {
  const report = buildReport({
    game: "signal-garden",
    familiarity: "First time",
    device: "Phone",
    input: ["Touch", "Touch", "Keyboard", "unlisted"],
    browser: "ExampleBrowser 1.2",
    version: "main at abc123",
    reducedMotion: true,
    goal: "Partly",
    firstAction: "Tapped *flower* to test <script>\nthen looked around",
    firstMinute: "Hint was easy to find",
    enjoyment: "4",
    agency: "2",
    pacing: "Too slow",
    replay: "Unsure",
    strength: "Soft glow",
    improvement: "Make the goal clearer",
    specific: "Level 4 felt easier than level 3.",
    bugSteps: "Open first stage",
    expected: "A glow",
    actual: "Nothing"
  });
  assert.match(report, /Phone/);
  assert.match(report, /Touch, Keyboard/);
  assert.doesNotMatch(report, /Touch, Touch|unlisted/);
  assert.match(report, /Partly/);
  assert.match(report, /main at abc123/);
  assert.match(report, /Reduced-motion configuration tested:\*\* Yes \(tester reported\)/);
  assert.match(report, /which felt hardest, and why/);
  assert.match(report, /Level 4 felt easier than level 3/);
  assert.match(report, /4\/5/);
  assert.match(report, /2\/5/);
  assert.match(report, /\\\*flower\\\*/);
  assert.match(report, /\\<script\\>/);
  assert.doesNotMatch(report, /<script>/);
  assert.doesNotMatch(report, /\nthen looked around/);
  assert.match(report, /Make the goal clearer/);
});

test("invalid or prototype-inherited keys never produce fake game identities", () => {
  for (const key of ["constructor", "toString", "__proto__", "not-a-game"]) {
    const report = buildReport({ game: key, goal: "totally yes", enjoyment: 99 });
    assert.match(report, /Unspecified experiment/);
    assert.match(report, /Was the goal clear\?\*\* Not recorded/);
    assert.match(report, /Enjoyment \(personal impression\):\*\* Not recorded/);
    assert.equal(suggestedFilename({ game: key }), "game-company-playtest-experiment.md");
  }
});

test("reported scores and free text cannot be arbitrary external metadata", () => {
  assert.match(buildReport({
    game: "prism-relay", enjoyment: "Infinity", firstAction: "https://example.com/private"
  }), /Enjoyment \(personal impression\):\*\* Not recorded/);
  assert.match(buildReport({
    game: "prism-relay", enjoyment: "Infinity", firstAction: "https://example.com/private"
  }), /\[link omitted; describe it in words\]/);
});
