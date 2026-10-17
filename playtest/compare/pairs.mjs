/**
 * Reviewed comparison pairs and a local-only Markdown exporter.
 * Author: agent-02 (AI agent). No network, telemetry or saved identity.
 */
export const PAIRS = Object.freeze({
  "garden-coupled": Object.freeze({
    name: "Signal Garden and Coupled Garden",
    original: Object.freeze({name:"Signal Garden",author:"agent-01 (AI agent)",path:"games/signal-garden/"}),
    variant: Object.freeze({name:"Coupled Garden",author:"agent-01 (AI agent)",path:"experiments/agent-01-coupled-garden/"})
  }),
  "prism-fork": Object.freeze({
    name: "Prism Relay and Forked Spectrum",
    original: Object.freeze({name:"Prism Relay",author:"agent-02 (AI agent)",path:"experiments/agent-02-prism-relay/"}),
    variant: Object.freeze({name:"Forked Spectrum",author:"agent-02 (AI agent)",path:"experiments/agent-02-prism-spectrum-lab/"})
  }),
  "pulse-voices": Object.freeze({
    name: "Pulse Garden and Plant Voices",
    original: Object.freeze({name:"Pulse Garden",author:"agent-04 (AI agent)",path:"prototypes/agent-04-pulse-garden/"}),
    variant: Object.freeze({name:"Plant Voices Lab",author:"agent-04 (AI agent)",path:"experiments/agent-04-pulse-voices/"})
  })
});

export function getPair(id) {
  return Object.hasOwn(PAIRS, id) ? PAIRS[id] : null;
}

export function orderedGames(pairId, order = "original-first") {
  const pair = getPair(pairId);
  if (!pair) return null;
  const original = { ...pair.original, type:"Original" };
  const variant = { ...pair.variant, type:"Variant lab" };
  return order === "variant-first" ? [variant, original] : [original, variant];
}

function safeNote(input) {
  const value = typeof input === "string" ? input.trim().slice(0,3000) : "";
  if (!value) return "> Not recorded";
  // Quote user text to prevent fabricated headings/fields inside the report.
  return value.replace(/\r\n?/g,"\n").replaceAll("&","&amp;")
    .replaceAll("<","&lt;").replaceAll(">","&gt;")
    .split("\n").map(line => "> " + line).join("\n");
}

export function buildComparison(answers = {}) {
  const pair = getPair(answers.pair);
  const order = answers.order === "variant-first" ? "variant-first" : "original-first";
  const pairName = pair?.name ?? "Unspecified comparison";
  const [a,b] = orderedGames(answers.pair,order) ?? [null,null];
  const label = game => game ? game.type + ": " + game.name + " · " + game.author : "Unspecified";
  return [
    "# Optional Game Company comparison — " + pairName,
    "",
    "> Voluntary observations from one session; subjective, not an automated result or representative sample.",
    "",
    "## Context",
    "- **Pair:** " + pairName,
    "- **Order:** " + (pair ? order === "variant-first" ? "Variant first, original second" : "Original first, variant second" : "Not recorded"),
    "- **Experience A:** " + label(a),
    "- **Experience B:** " + label(b),
    "- **Test environment (optional):**",
    safeNote(answers.environment),
    "- **Version/build identifiers (optional):**",
    safeNote(answers.version),
    "",
    "## First experience (A)",
    "**What I noticed before trying B:**",
    safeNote(answers.notesA),
    "",
    "## Second experience (B)",
    "**What I noticed after trying B:**",
    safeNote(answers.notesB),
    "",
    "## Only after both (optional)",
    "**Would I return to either? Why?**",
    safeNote(answers.returnChoice),
    "",
    "**What differed in the choices I made?**",
    safeNote(answers.difference),
    "",
    "**Anything more confusing, frustrating or worse?**",
    safeNote(answers.friction),
    "",
    "## Evidence limits",
    "- This comparison was not blinded; order was selected, not randomly assigned.",
    "- No play duration, user identity, device or preference was inferred.",
    "- Blank questions are Not recorded, not implicitly positive or negative.",
    "- Play links and this report never submit the answers to a server.",
    ""
  ].join("\n");
}

export function comparisonFilename(pair) {
  return "game-company-comparison-" + (getPair(pair) ? pair : "unspecified") + ".md";
}
