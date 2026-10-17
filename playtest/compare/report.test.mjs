import test from "node:test";
import assert from "node:assert/strict";
import { PAIRS, buildComparisonReport, comparisonFilename } from "./report.mjs";

test("pairs credit all three lab authors and have exact static paths", () => {
  assert.deepEqual(Object.keys(PAIRS).sort(), ["prism-spectrum", "pulse-voices", "signal-coupled"]);
  for (const [id, pair] of Object.entries(PAIRS)) {
    assert.match(pair.originalAuthor, /agent-0[124] \(AI agent\)/);
    assert.equal(pair.originalAuthor, pair.labAuthor);
    assert.ok(pair.originalPath.endsWith("/") && pair.labPath.endsWith("/"));
    assert.ok(!pair.originalPath.startsWith("/") && !pair.labPath.startsWith("/"));
    assert.match(buildComparisonReport({ pair: id }), /Incomplete or unspecified pair/);
  }
});

test("blank pair or single visit cannot produce a fabricated paired preference", () => {
  for (const data of [
    {}, { pair: "unknown", played: "Both", preference: "Lab" },
    { pair: "signal-coupled", played: "Lab only", preference: "Lab" },
    { pair: "prism-spectrum", played: "Original only", preference: "Original" },
    { pair: "pulse-voices", played: "Not recorded", preference: "Lab" }
  ]) {
    const report = buildComparisonReport(data);
    assert.match(report, /Incomplete or unspecified pair; no head-to-head conclusion/);
    assert.match(report, /Which would I voluntarily return to\?\*\* Not comparable — both versions not confirmed/);
    assert.doesNotMatch(report, /\*\*Which would I voluntarily return to\?\*\* (Lab|Original|Neither|Unsure)/);
  }
  assert.match(buildComparisonReport(), /Unspecified pair/);
  assert.match(buildComparisonReport(), /Original author:\*\* Not recorded/);
  assert.equal(comparisonFilename({ pair: "../foo" }), "game-company-comparison-unspecified.md");
});

test("an explicitly played pair can report preferences without presenting a ranked verdict", () => {
  const report = buildComparisonReport({
    pair: "pulse-voices", played: "Both", order: "Lab first", preference: "Original",
    originalNotes: "I planted twice", labNotes: "I selected Pluck",
    originalVersion: "c123", labVersion: "d456"
  });
  assert.match(report, /Pulse Garden \/ Plant Voices Lab/);
  assert.match(report, /Both versions reportedly played; qualitative comparison possible/);
  assert.match(report, /Original author:\*\* agent-04 \(AI agent\)/);
  assert.match(report, /Lab author:\*\* agent-04 \(AI agent\)/);
  assert.match(report, /Original build\/version \(optional\):\*\* c123/);
  assert.match(report, /Order actually played:\*\* Lab first/);
  assert.match(report, /Which would I voluntarily return to\?\*\* Original/);
  assert.match(report, /I planted twice/);
  assert.match(report, /I selected Pluck/);
  assert.equal(comparisonFilename({ pair: "pulse-voices" }), "game-company-comparison-pulse-voices.md");
});

test("escaping removes Markdown injection, external links and control characters", () => {
  const report = buildComparisonReport({
    pair: "signal-coupled", played: "Both",
    originalNotes: "# Heading\n**bold** <unsafe> https://example.com/x",
    labNotes: "ok\u0000\tmore"
  });
  assert.doesNotMatch(report, /\*\*bold\*\* <unsafe>/);
  assert.match(report, /\\\*\\\*bold\\\*\\\*/);
  assert.match(report, /\[link omitted\]/);
  assert.doesNotMatch(report, /https:\/\/example.com/);
  assert.match(report, /ok  more/);
  assert.doesNotMatch(report, /\u0000/);
});

test("invalid comparative choices are explicitly Not recorded", () => {
  const r = buildComparisonReport({
    pair: "signal-coupled", played: "Both", order: "Agent-always-wins", preference: "The Lab!!!!"
  });
  assert.match(r, /Order actually played:\*\* Not recorded/);
  assert.match(r, /Which would I voluntarily return to\?\*\* Not recorded/);
});
