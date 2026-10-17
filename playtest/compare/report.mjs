/**
 * Paired playtest reporting — pure local-only data model.
 * Author: agent-01 (AI agent); all original game/lab authors credited.
 */
export const PAIRS = Object.freeze({
  "signal-coupled": Object.freeze({
    original: "Signal Garden", originalAuthor: "agent-01 (AI agent)",
    originalPath: "games/signal-garden/",
    lab: "Coupled Garden", labAuthor: "agent-01 (AI agent)",
    labPath: "experiments/agent-01-coupled-garden/"
  }),
  "prism-spectrum": Object.freeze({
    original: "Prism Relay", originalAuthor: "agent-02 (AI agent)",
    originalPath: "experiments/agent-02-prism-relay/",
    lab: "Forked Spectrum", labAuthor: "agent-02 (AI agent)",
    labPath: "experiments/agent-02-prism-spectrum-lab/"
  }),
  "pulse-voices": Object.freeze({
    original: "Pulse Garden", originalAuthor: "agent-04 (AI agent)",
    originalPath: "prototypes/agent-04-pulse-garden/",
    lab: "Plant Voices Lab", labAuthor: "agent-04 (AI agent)",
    labPath: "experiments/agent-04-pulse-voices/"
  })
});

const TRIED = ["Not recorded", "Both", "Original only", "Lab only", "Neither"];
const ORDER = ["Not recorded", "Original first", "Lab first", "Only one version played"];
const PICK = ["Not recorded", "Original", "Lab", "Neither", "Unsure"];

function choice(value, options) {
  return options.includes(value) ? value : "Not recorded";
}
function text(value, limit = 1800) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, limit)
        .replace(/\\/g, "\\\\").replace(/([*_\u0060\[\]<>|])/g, "\\$1")
        .replace(/https?:\/\/\S+/gi, "[link omitted]")
    : "";
}
function answer(value) { return text(value) || "Not recorded"; }

export function buildComparisonReport(input = {}) {
  const pair = Object.hasOwn(PAIRS, input.pair) ? PAIRS[input.pair] : null;
  const played = choice(input.played, TRIED);
  const complete = pair && played === "Both";
  const title = pair ? pair.original + " / " + pair.lab : "Unspecified pair";
  return [
    "# Paired prototype notes — " + title,
    "",
    "> Voluntary subjective observations, not controlled research or proof that a prototype improved.",
    "",
    "## What was actually tried",
    "- **Pair:** " + title,
    "- **Original author:** " + (pair?.originalAuthor ?? "Not recorded"),
    "- **Lab author:** " + (pair?.labAuthor ?? "Not recorded"),
    "- **Versions tried:** " + played,
    "- **Order actually played:** " + choice(input.order, ORDER),
    "- **Comparison status:** " + (complete ? "Both versions reportedly played; qualitative comparison possible" : "Incomplete or unspecified pair; no head-to-head conclusion"),
    "- **Original build/version (optional):** " + answer(input.originalVersion),
    "- **Lab build/version (optional):** " + answer(input.labVersion),
    "- **Device and input actually used (optional):** " + answer(input.device),
    "",
    "## Unprompted first impressions",
    "**Original version — what I did/noticed:** " + answer(input.originalNotes),
    "**Experimental version — what I did/noticed:** " + answer(input.labNotes),
    "",
    "## After both attempts (optional)",
    "- **Which would I voluntarily return to?** " + (complete ? choice(input.preference, PICK) : "Not comparable — both versions not confirmed"),
    "**Which actions felt consequential or confusing, and why?:** " + answer(input.consequence),
    "**Did the lab feel more distinct, frustrating, or neither?:** " + answer(input.distinct),
    "**What would I change or remove?:** " + answer(input.change),
    "",
    "---",
    "Report created locally by agent-01's optional Game Company paired-playtest worksheet.",
    "No date, username, location or browser identity was inferred. Missing answers are not positive results.",
    "Original and lab credits are recorded separately. Never interpret one person's response as a company ranking.",
    ""
  ].join("\n");
}

export function comparisonFilename(input = {}) {
  const pair = Object.hasOwn(PAIRS, input.pair) ? input.pair : "unspecified";
  return "game-company-comparison-" + pair + ".md";
}
