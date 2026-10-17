/**
 * Pure formatter and game-specific prompts for voluntary, manually shared notes.
 * Author: agent-02 (AI agent). No telemetry, storage or outbound requests.
 */
export const GAMES = Object.freeze({
  signal: Object.freeze({
    name: "Signal Garden",
    author: "agent-01 (AI agent)",
    href: "../games/signal-garden/",
    question: "If you played levels 1–4, which felt hardest, and why? Did later levels actually feel harder?"
  }),
  prism: Object.freeze({
    name: "Prism Relay",
    author: "agent-02 (AI agent)",
    href: "../experiments/agent-02-prism-relay/",
    question: "Was the beam's cause-and-effect immediately understandable? If you also played Signal Garden, did the two games feel meaningfully different?"
  }),
  ring: Object.freeze({
    name: "Ringfall",
    author: "agent-03 (AI agent)",
    href: "../prototypes/ringfall/",
    question: "After your first run, did you voluntarily restart? What made another run attractive or not?"
  }),
  pulse: Object.freeze({
    name: "Pulse Garden",
    author: "agent-04 (AI agent)",
    href: "../prototypes/agent-04-pulse-garden/",
    question: "After understanding planting, did you make deliberate placement decisions, or mostly plant early and wait?"
  })
});

const ALLOWED_INPUTS = ["mouse", "keyboard", "touch", "other"];
const REPLAY = Object.freeze({
  yes: "Yes",
  no: "No",
  unsure: "Unsure",
  not_tried: "Did not finish / cannot judge"
});

export function getGame(id) {
  if (!Object.hasOwn(GAMES, id)) throw new Error("Unknown experiment");
  return GAMES[id];
}
function quote(value) {
  const cleaned = typeof value === "string" ? value.trim().replace(/\r\n?/g, "\n") : "";
  if (!cleaned) return "> Not recorded";
  return cleaned.split("\n").map(line => "> " + (line || " ")).join("\n");
}
function selectedInputs(value) {
  if (!Array.isArray(value)) return "Not recorded";
  const unique = [...new Set(value.filter(x => ALLOWED_INPUTS.includes(x)))];
  return unique.length ? unique.join(", ") : "Not recorded";
}

/** Only the selected, human-entered notes are formatted; no implied telemetry. */
export function buildReport(data) {
  const game = getGame(data?.game);
  const replay = Object.hasOwn(REPLAY, data?.replay) ? REPLAY[data.replay] : "Not recorded";
  return [
    "# Game Company — voluntary playtest notes",
    "",
    "**Experiment:** " + game.name + " (" + game.author + ")",
    "**Browser / device, as provided by tester:**",
    quote(data.context),
    "**Inputs actually used:** " + selectedInputs(data.inputs),
    "**Reduced-motion configuration tested:** " + (data.reducedMotion ? "Yes (tester reported)" : "Not reported"),
    "",
    "## First-minute impressions (before reading game code)",
    "",
    "**What did you think the goal was?**",
    quote(data.goal),
    "",
    "**What did you try first? What happened?**",
    quote(data.firstAction),
    "",
    "**Where did you hesitate or get confused?**",
    quote(data.confusion),
    "",
    "## Game-specific observation",
    "",
    "**" + game.question + "**",
    quote(data.specific),
    "",
    "## Would you voluntarily play another round or stage?",
    "",
    "> " + replay,
    "",
    "## Bugs, friction or other observations",
    "",
    quote(data.other),
    "",
    "---",
    "This report was **written and shared voluntarily by a tester** using the local Game Company Playtest Notebook.",
    "The notebook did not automatically collect, store or transmit observations.",
    "Unreported fields do not imply successful tests. This is personal feedback, not automated proof of accessibility or quality.",
    "",
  ].join("\n");
}
