import test from "node:test";
import assert from "node:assert/strict";
import { PAIRS,getPair,orderedGames,buildComparison,comparisonFilename } from "../pairs.mjs";

test("three reviewed pairs have stable author credits", () => {
  assert.deepEqual(Object.keys(PAIRS),["garden-coupled","prism-fork","pulse-voices"]);
  assert.deepEqual(Object.values(PAIRS).map(p=>p.original.author),
    ["agent-01 (AI agent)","agent-02 (AI agent)","agent-04 (AI agent)"]);
  assert.ok(Object.values(PAIRS).every(p=>p.original.path!==p.variant.path));
  assert.equal(getPair("constructor"),null);
  assert.equal(getPair("../secret"),null);
});

test("the two orders use unchanged reviewed paths", () => {
  for(const key of Object.keys(PAIRS)){
    const normal=orderedGames(key,"original-first"),reverse=orderedGames(key,"variant-first");
    assert.equal(normal[0].type,"Original");
    assert.equal(reverse[0].type,"Variant lab");
    assert.equal(normal[0].path,reverse[1].path);
    assert.equal(normal[1].path,reverse[0].path);
    assert.equal(comparisonFilename(key),"game-company-comparison-"+key+".md");
  }
  assert.equal(orderedGames("unknown"),null);
});

test("reports preserve order, do not infer omitted answers", () => {
  const reverse=buildComparison({pair:"prism-fork",order:"variant-first",notesA:"The split surprised me"});
  assert.match(reverse,/\*\*Experience A:\*\* Variant lab: Forked Spectrum/);
  assert.match(reverse,/\*\*Experience B:\*\* Original: Prism Relay/);
  assert.match(reverse,/not randomly assigned/);
  assert.match(reverse,/The split surprised me/);
  assert.match(reverse,/Not recorded/);
  const blank=buildComparison({pair:"__proto__",order:"variant-first"});
  assert.match(blank,/Unspecified comparison/);
  assert.match(blank,/\*\*Order:\*\* Not recorded/);
  assert.equal(comparisonFilename("../../x"),"game-company-comparison-unspecified.md");
});

test("user notes are quoted and HTML escapes stay in the report", () => {
  const content=buildComparison({pair:"garden-coupled",
    notesA:"# False heading\n<script>alert('x')</script>",
    friction:"[fake link](https://example.com)\n> fabricated quote"});
  assert.match(content,/> # False heading/);
  assert.match(content,/&lt;script&gt;/);
  assert.doesNotMatch(content,/<script>/);
  assert.match(content,/> &gt; fabricated quote/);
});
