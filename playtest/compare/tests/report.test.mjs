import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
    friction:"[fake link](https://example.com)\n> fabricated quote",played:"both"});
  assert.match(content,/> # False heading/);
  assert.match(content,/\\<script\\>/);
  assert.doesNotMatch(content,/<script>/);
  assert.match(content,/> \\> fabricated quote/);
  assert.doesNotMatch(content,/https:\/\/example\.com/);
  assert.match(content,/link omitted; describe it in words/);
});



test("one-game or unknown-completion reports cannot claim head-to-head preference",()=>{
  const partial=buildComparison({pair:"prism-fork",played:"original-only",
    returnChoice:"The variant was terrible",difference:"Difference claimed",
    versionOriginal:"original-commit",versionVariant:"lab-commit"});
  assert.match(partial,/Original only/);
  assert.match(partial,/Incomplete; not a head-to-head comparison/);
  assert.doesNotMatch(partial,/The variant was terrible/);
  assert.doesNotMatch(partial,/Difference claimed/);
  assert.match(partial,/original-commit/);
  assert.match(partial,/lab-commit/);
  const both=buildComparison({pair:"prism-fork",played:"both",returnChoice:"I preferred neither"});
  assert.match(both,/Both versions self-reported as played/);
  assert.match(both,/I preferred neither/);
  const missing=buildComparison({pair:"not-known",played:"both",returnChoice:"A fake preference"});
  assert.match(missing,/Incomplete/);
  assert.doesNotMatch(missing,/A fake preference/);
});

test("raw URLs, Markdown links and contact-like text cannot create active public links",()=>{
  const report=buildComparison({
    pair:"prism-fork",played:"both",
    notesA:"https://example.com/private",
    notesB:"[personal](https://example.com/contact)",
    friction:"www.example.org @someone person@example.com",
    returnChoice:"# Spoofed field\n**Winner: lab**"
  });
  assert.doesNotMatch(report,/https?:\/\/example\.com/i);
  assert.doesNotMatch(report,/www\.example\.org/);
  assert.doesNotMatch(report,/person@example\.com/);
  assert.match(report,/link omitted; describe it in words/);
  assert.match(report,/address omitted/);
  assert.match(report,/> # Spoofed field/);
  assert.doesNotMatch(report,/^\*\*Winner: lab\*\*$/m);
});

test("every comparison game is an actual checked-in playable page",async()=>{
  const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
  for(const pair of Object.values(PAIRS)){
    for(const game of [pair.original,pair.variant]){
      await access(path.join(ROOT,game.path,"index.html"));
    }
  }
});

test("address redaction happens before Markdown escapes split underscore-heavy identifiers",()=>{
  const report=buildComparison({
    pair:"garden-coupled",played:"both",
    notesA:"I shared player_name+demo@example.org with someone.",
    notesB:"www.example.test/path and https://host.example/person_name@example.net/private",
    friction:"My alternate mailbox is first.last_tag@example.com and notes are useful."
  });
  assert.doesNotMatch(report,/player_name|player\\_|name\+demo|@example\.org/);
  assert.doesNotMatch(report,/first\.last_tag|first\.last\\_|last_tag|@example\.com/);
  assert.doesNotMatch(report,/person_name|host\.example|www\.example\.test/);
  assert.match(report,/> I shared \[address omitted\] with someone/);
  assert.match(report,/> \[link omitted; describe it in words\] and \[link omitted; describe it in words\]/);
  assert.match(report, /notes are useful/);
  assert.match(report, /Original: Signal Garden/);
  assert.match(report, /Variant lab: Coupled Garden/);
});

test("quoted text still cannot manufacture Markdown links or headings after redaction",()=>{
  const report=buildComparison({
    pair:"prism-fork",played:"both",
    notesA:"[new title](www.example.test/path)\n# A different header",
    notesB:"<script>contact@sample.example</script> and user@host.example"
  });
  assert.doesNotMatch(report,/<script>|www\.example\.test|contact@sample/);
  assert.match(report,/> \\[new title\\]/, "submitted Markdown title stays escaped");
  assert.match(report,/> .*link omitted; describe it in words/,
    "pasted web address is removed even when punctuation follows it");
  assert.doesNotMatch(report,/\]\(www\.example\.test/,
    "Markdown link cannot keep an active web destination");
  assert.match(report,/> # A different header/);
  assert.match(report,/> \\<script\\>\[address omitted\]\\<\/script\\> and \[address omitted\]/);
});
