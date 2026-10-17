/**
 * Local-only playtest worksheet behavior.
 * Author: agent-01 (AI agent). No analytics, fetch, localStorage or sending.
 */
import { buildReport, suggestedFilename, GAME_QUESTIONS, GAMES } from "./report.mjs";

const form = document.querySelector("#feedback");
const preview = document.querySelector("#preview");
const status = document.querySelector("#status");
const copyButton = document.querySelector("#copy");
const downloadButton = document.querySelector("#download");
const gameQuestion = document.querySelector("#game-question");
const playSelected = document.querySelector("#play-selected");

// An explicit game deep link may preselect only one reviewed experiment.
// Ignore unknown IDs rather than guessing from the visitor's browser/referrer.
const requestedGame = new URLSearchParams(window.location.search).get("game");
if (requestedGame && Object.hasOwn(GAMES, requestedGame)) {
  document.querySelector("#game").value = requestedGame;
}



function getAnswers() {
  const data = new FormData(form);
  return {
    game: data.get("game"),
    familiarity: data.get("familiarity"),
    device: data.get("device"),
    input: data.getAll("input"),
    browser: data.get("browser"),
    version: data.get("version"),
    goal: data.get("goal"),
    firstAction: data.get("firstAction"),
    firstMinute: data.get("firstMinute"),
    enjoyment: data.get("enjoyment"),
    agency: data.get("agency"),
    pacing: data.get("pacing"),
    replay: data.get("replay"),
    strength: data.get("strength"),
    improvement: data.get("improvement"),
    specific: data.get("specific"),
    bugSteps: data.get("bugSteps"),
    expected: data.get("expected"),
    actual: data.get("actual")
  };
}

function regenerate() {
  const answers = getAnswers();
  gameQuestion.textContent = GAME_QUESTIONS[answers.game] ?? "Choose an experiment first.";
  const game = Object.hasOwn(GAMES, answers.game) ? GAMES[answers.game] : null;
  if (game?.path) {
    // Shipped-game paths come from the reviewed static allowlist, not free-text input.
    playSelected.href = "../" + game.path;
    playSelected.textContent = "Open " + game.name + " in a new tab ↗";
    playSelected.hidden = false;
  } else {
    // Blank/unknown identities and comparison labs never invent a launch destination.
    // Labs are attribution-only here because the curated downloadable _site excludes them.
    playSelected.hidden = true;
    playSelected.removeAttribute("href");
    playSelected.textContent = "Open selected game in a new tab ↗";
  }
  preview.value = buildReport(answers);
  status.textContent = "";
}

form.addEventListener("input", regenerate);
form.addEventListener("change", regenerate);
form.addEventListener("submit", (event) => event.preventDefault());

copyButton.addEventListener("click", async () => {
  if (!navigator.clipboard?.writeText) {
    preview.focus();
    preview.select();
    status.textContent = "Clipboard is unavailable here. Report text selected — use your normal Copy command.";
    return;
  }
  try {
    await navigator.clipboard.writeText(preview.value);
    status.textContent = "Report copied to clipboard. Nothing was submitted.";
  } catch {
    preview.focus();
    preview.select();
    status.textContent = "Clipboard permission was unavailable. Report text selected for manual copying.";
  }
});

downloadButton.addEventListener("click", () => {
  const file = new Blob([preview.value], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedFilename(getAnswers());
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = "Markdown download requested. Nothing was submitted.";
});

regenerate();
