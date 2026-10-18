import test from "node:test";
import assert from "node:assert/strict";
import { GAMES, buildReport, suggestedFilename } from "../report.mjs";

test("all reviewed shipped games and comparison labs receive correct explicit credit", () => {
  assert.equal(Object.keys(GAMES).length, 7);
  const expected = {
    "signal-garden": "agent-01",
    "prism-relay": "agent-02",
    ringfall: "agent-03",
    "pulse-garden": "agent-04",
    "coupled-garden-lab": "agent-01",
    "prism-spectrum-lab": "agent-02",
    "pulse-voices-lab": "agent-04"
  };
  for (const [game, author] of Object.entries(expected)) {
    const report = buildReport({ game });
    assert.ok(report.includes(GAMES[game].name));
    assert.ok(report.includes(`${author} (AI agent)`));
    assert.equal(suggestedFilename({ game }), `game-company-playtest-${game}.md`);
  }

  for (const game of ["coupled-garden-lab", "prism-spectrum-lab", "pulse-voices-lab"]) {
    assert.match(GAMES[game].name, /comparison lab/);
    assert.equal(GAMES[game].path, undefined, "comparison labs must not get curated-package launch paths");
  }
});

test("optional fields do not invent successful checks or observations", () => {
  const report = buildReport({ game: "ringfall" });
  assert.match(report, /Was the goal clear\?\*\* Not recorded/);
  assert.match(report, /Input actually used:\*\* Not recorded/);
  assert.match(report, /Enjoyment \(personal impression\):\*\* Not recorded/);
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
    goal: "Partly",
    firstAction: "Tapped *flower* to test <script>\nthen looked around",
    firstMinute: "Hint was easy to find",
    enjoyment: "4",
    agency: "2",
    pacing: "Too slow",
    replay: "Unsure",
    strength: "Soft glow",
    improvement: "Make the goal clearer",
    bugSteps: "Open first stage",
    expected: "A glow",
    actual: "Nothing"
  });
  assert.match(report, /Phone/);
  assert.match(report, /Touch, Keyboard/);
  assert.doesNotMatch(report, /Touch, Touch|unlisted/);
  assert.match(report, /Partly/);
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

test("optional per-game research prompts are accurate without inventing observations", async () => {
  const { GAME_QUESTIONS } = await import("../report.mjs");
  assert.deepEqual(Object.keys(GAME_QUESTIONS).sort(), Object.keys(GAMES).sort());
  const ringfall = buildReport({ game: "ringfall", specific: "Missed circle at about 55 seconds using touch" });
  assert.match(ringfall, /what caused each core loss/i);
  assert.match(ringfall, /when did the run become unmanageable/i);
  assert.match(ringfall, /which input did you use/i);
  assert.match(ringfall, /Missed circle at about 55 seconds using touch/);
  const prism = buildReport({ game: "prism-relay", specific: "Beam reaction was immediate" });
  assert.match(prism, /beam's cause-and-effect immediately understandable/i);
  assert.match(prism, /Beam reaction was immediate/);
  const empty = buildReport({ game: "pulse-garden" });
  assert.match(empty, /After learning how to plant/);
  assert.match(empty, /What I actually observed:\*\* Not recorded/);
  assert.match(buildReport({ game: "coupled-garden-lab" }), /group turns feel more consequential/i);
  assert.match(buildReport({ game: "prism-spectrum-lab" }), /two simultaneous colored goals/i);
  assert.match(buildReport({ game: "pulse-voices-lab" }), /choose plant voices for their sound/i);
});

test("blank game never invents an experiment or original author", () => {
  const report = buildReport({
    game: "",
    firstAction: "Clicked a mirror on the board",
    enjoyment: "2"
  });
  assert.match(report, /^# Playtest notes — Unspecified experiment$/m);
  assert.match(report, /^- \*\*Original author:\*\* Not recorded$/m);
  assert.match(report, /^\*\*Question:\*\* Not recorded$/m);
  assert.match(report, /Clicked a mirror on the board/);
  assert.doesNotMatch(report, /^- \*\*Original author:\*\* agent-01 \(AI agent\)$/m);
  assert.equal(suggestedFilename({ game: "" }), "game-company-playtest-experiment.md");
});

test("public-report draft neutralizes email-like addresses and bare www links without damaging observations", () => {
  const report = buildReport({
    game: "pulse-garden",
    firstAction: "I tapped the planter at www.example.test/profile and heard a tone.",
    firstMinute: "Send contact to player_name+demo@example.org or ask at www.samples.test.",
    strength: "The soft *pulse* is nice.",
    improvement: "See https://example.test/person@example.com/private for my notes.",
    browser: "Sample Browser (contact: admin@browser.example)"
  });
  assert.doesNotMatch(report, /www\\.example\\.test|www\\.samples\\.test|player_name|@example\\.org|admin@browser|https:\\/\\/example\\.test/);
  assert.match(report, /\\[link omitted; describe it in words\\]/);
  assert.match(report, /\\[address omitted\\]/);
  assert.match(report, /I tapped the planter at/);
  assert.match(report, /heard a tone/);
  assert.match(report, /\\\\\\*pulse\\\\\\*/);
  // Fixed, reviewed author/experiment identity remains correctly attributed.
  assert.match(report, /Original author:\\*\\* agent-04 \\(AI agent\\)/);
  assert.match(report, /Playtest notes — Pulse Garden/);
});

test("report markup escaping does not let text imitate an author or heading", () => {
  const report = buildReport({
    game: "prism-relay",
    actual: "# Fake heading *spoofed* <b> www.example.test/unsafe",
    expected: "[Other author](https://example.test)"
  });
  assert.doesNotMatch(report, /\\n# Fake heading/);
  assert.doesNotMatch(report, /<b>/);
  assert.match(report, /\\\\\\*spoofed\\\\\\*/);
  assert.match(report, /\\[link omitted; describe it in words\\]/);
  assert.match(report, /Original author:\\*\\* agent-02 \\(AI agent\\)/);
});
