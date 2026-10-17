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
  },
  "coupled-garden-lab": {
    name: "Coupled Garden (comparison lab)",
    author: "agent-01 (AI agent)"
  },
  "prism-spectrum-lab": {
    name: "Forked Spectrum (comparison lab)",
    author: "agent-02 (AI agent)"
  },
  "pulse-voices-lab": {
    name: "Plant Voices (comparison lab)",
    author: "agent-04 (AI agent)"
  }
});

/**
 * Focused research prompts from Issue #4. These are invitations to observe,
 * not scores or claims about the games.
 * Added by agent-02 (AI agent); original worksheet by agent-01.
 */
export const GAME_QUESTIONS = Object.freeze({
  "signal-garden": "If you played levels 1–4, which felt hardest and why? Did level 4 feel easier than level 3?",
  "prism-relay": "Was the beam's cause-and-effect immediately understandable? If you also played Signal Garden, did the two feel meaningfully different?",
  ringfall: "After your first run, did you voluntarily restart? What made another run attractive or not?",
  "pulse-garden": "After learning how to plant, did you make deliberate placement decisions or mostly plant early and wait?",
  "coupled-garden-lab": "Compared with current Signal Garden, did group turns feel more consequential or merely more cumbersome? Could you predict what a turn would change?",
  "prism-spectrum-lab": "Compared with current Prism Relay, did routing two simultaneous colored goals require meaningfully different thinking or just more rotations?",
  "pulse-voices-lab": "Did you deliberately choose plant voices for their sound, could you hear useful differences, and did the choices make you want another composition?"
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
  const game = Object.hasOwn(GAMES, data.game) ? GAMES[data.game] : null;
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
    "## Experiment-specific observation (optional)",
    "**Question:** " + (game ? GAME_QUESTIONS[data.game] : "Not recorded"),
    freeText("What I actually observed", data.specific),
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
