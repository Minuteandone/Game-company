/**
 * Pure, dependency-free conversion from optional playtest notes to Markdown.
 * Author: agent-01 (AI agent).
 * This module never collects, stores or transmits user input.
 */
export const GAMES = Object.freeze({
  "signal-garden": {
    name: "Signal Garden",
    author: "agent-01 (AI agent)",
    path: "games/signal-garden/"
  },
  "prism-relay": {
    name: "Prism Relay",
    author: "agent-02 (AI agent)",
    path: "experiments/agent-02-prism-relay/"
  },
  ringfall: {
    name: "Ringfall",
    author: "agent-03 (AI agent)",
    path: "prototypes/ringfall/"
  },
  "pulse-garden": {
    name: "Pulse Garden",
    author: "agent-04 (AI agent)",
    path: "prototypes/agent-04-pulse-garden/"
  }
});

const OPTIONS = Object.freeze({
  familiarity: ["First time", "Played before", "Not recorded"],
  device: ["Desktop/laptop", "Phone", "Tablet", "Other", "Not recorded"],
  goal: ["Yes", "Partly", "No", "Not recorded"],
  pacing: ["Too slow", "About right", "Too fast", "Not recorded"],
  replay: ["Yes", "Unsure", "No", "Not recorded"]
});
const INPUTS = ["Keyboard", "Mouse / trackpad", "Touch", "Other"];

/** Escape inline Markdown formatting and punctuation used by headings and lists. */
function plain(value, maxLength = 2000) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
}

function mdText(value, maxLength = 2000) {
  return plain(value, maxLength)
    .replace(/\\/g, "\\\\")
    .replace(/([*_`\[\]<>|])/g, "\\$1")
    .replace(/https?:\/\/\S+/gi, "[link omitted; describe it in words]");
}

function pick(key, value) {
  return OPTIONS[key].includes(value) ? value : "Not recorded";
}

function freeText(label, value) {
  const sanitized = mdText(value);
  return `**${label}:** ${sanitized || "Not recorded"}`;
}

function rating(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 5
    ? `${number}/5`
    : "Not recorded";
}

/**
 * Produce a single, standalone Markdown report suitable for an Issue comment.
 * No dates, usernames, locations, browser fingerprints or other metadata
 * are automatically gathered.
 */
export function buildReport(data = {}) {
  const game = GAMES[data.game];
  const name = game ? game.name : "Unspecified experiment";
  const inputs = Array.isArray(data.input)
    ? [...new Set(data.input)].filter((value) => INPUTS.includes(value))
    : [];
  const fields = [
    `# Playtest notes — ${name}`,
    "",
    "> Voluntary observations from one session. These are subjective notes, not automated test results or a representative sample.",
    "",
    "## Test context",
    `- **Experiment:** ${name}`,
    `- **Original author:** ${game?.author ?? "Not recorded"}`,
    `- **Session type:** ${pick("familiarity", data.familiarity)}`,
    `- **Device type:** ${pick("device", data.device)}`,
    `- **Browser (optional):** ${mdText(data.browser, 160) || "Not recorded"}`,
    `- **Input actually used:** ${inputs.length ? inputs.join(", ") : "Not recorded"}`,
    `- **Version / commit tested (optional):** ${mdText(data.version, 160) || "Not recorded"}`,
    "",
    "## First-minute experience",
    `- **Was the goal clear?** ${pick("goal", data.goal)}`,
    freeText("First action I tried", data.firstAction),
    freeText("What happened / what confused me", data.firstMinute),
    "",
    "## Core loop",
    `- **Enjoyment (personal impression):** ${rating(data.enjoyment)}`,
    `- **Meaningful choices (personal impression):** ${rating(data.agency)}`,
    `- **Pacing felt:** ${pick("pacing", data.pacing)}`,
    `- **Would I play another round/level?** ${pick("replay", data.replay)}`,
    freeText("What worked best", data.strength),
    freeText("Biggest improvement opportunity", data.improvement),
    "",
    "## Optional reproducible bug",
    freeText("Steps to reproduce", data.bugSteps),
    freeText("Expected", data.expected),
    freeText("Actual", data.actual),
    "",
    "---",
    "Feedback assembled locally with Game Company's optional playtest worksheet by agent-01 (AI agent).",
    "Only the tests explicitly described above were performed; omitted items are not verified.",
    ""
  ];
  return fields.join("\n");
}

export function suggestedFilename(data = {}) {
  const game = Object.hasOwn(GAMES, data.game) ? data.game : "experiment";
  return `game-company-playtest-${game}.md`;
}
