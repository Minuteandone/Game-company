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
const gameSelect = document.querySelector("#game");
const followup = document.querySelector("#specific-followup");
let previousGame = "";
let lastGeneratedPreview = "";
let lastGeneratedFields = [];

// The preview is intentionally editable independently of form answers.
// Preserve this work until the visitor explicitly approves regeneration.
function rememberFields() {
  lastGeneratedFields = [...form.querySelectorAll("input, select, textarea")]
    .map(field => ({
      field, value: field.value,
      checked: field.type === "checkbox" || field.type === "radio" ? field.checked : null
    }));
}

function restoreFields() {
  for (const { field, value, checked } of lastGeneratedFields) {
    field.value = value;
    if (checked !== null) field.checked = checked;
  }
}

function fieldsChanged() {
  return lastGeneratedFields.some(({ field, value, checked }) =>
    field.value !== value || (checked !== null && field.checked !== checked));
}

function regenerateWithConsent() {
  // Browsers fire 'change' after 'input' on text inputs. Avoid duplicate
  // prompts (and accidental loss) when no form value actually changed.
  if (!fieldsChanged()) return;
  if (preview.value !== lastGeneratedPreview && !window.confirm(
    "You manually edited this Markdown report. Changing the form will replace " +
    "those edits. Copy or download first. Continue?"
  )) {
    restoreFields();
    status.textContent = "Change cancelled. Your hand-edited report was preserved.";
    return;
  }
  regenerate();
}

// An explicit game deep link may preselect only one reviewed experiment.
// Ignore unknown IDs rather than guessing from the visitor's browser/referrer.
const requestedGame = new URLSearchParams(window.location.search).get("game");
if (requestedGame && Object.hasOwn(GAMES, requestedGame)) {
  gameSelect.value = requestedGame;
}
previousGame = gameSelect.value;

// Switching an identified game after entering observations can silently
// misattribute those notes to a completely different original author.
// Blank → chosen is different: users can fill the neutral form first.
function containsUnsentDetails() {
  for (const [key, value] of new FormData(form)) {
    if (key !== "game" && value && value !== "Not recorded") return true;
  }
  return preview.value !== lastGeneratedPreview;
}

function confirmGameChange() {
  const nextGame = gameSelect.value;
  if (nextGame === previousGame) return;
  if (previousGame && containsUnsentDetails()) {
    const confirmed = window.confirm(
      "Switching experiments will clear this report's notes, ratings and test context " +
      "so they cannot be credited to the wrong game. Copy or download them first. Continue?"
    );
    if (!confirmed) {
      // The game selector's input event must not regenerate before this.
      gameSelect.value = previousGame;
      status.textContent = "Switch cancelled. Your experiment and notes are unchanged.";
      return;
    }
    // Reset all per-session fields, not just free text: device, input and
    // ratings would also be unreliable if carried into another game.
    form.reset();
    gameSelect.value = nextGame;
    followup.open = false;
    previousGame = nextGame;
    regenerate();
    status.textContent = "Previous experiment's notes were cleared before switching.";
    return;
  }
  // A neutral report can contain hand-edited Markdown too; choosing the
  // correct game should preserve *form answers* but must not silently erase
  // custom report text. This is separate from clearing a named game's notes.
  if (!previousGame && preview.value !== lastGeneratedPreview && !window.confirm(
    "Choosing a game will regenerate this hand-edited Markdown report. " +
    "Copy or download it first if you want to keep those edits. Continue?"
  )) {
    gameSelect.value = previousGame;
    status.textContent = "Switch cancelled. Your hand-edited report was preserved.";
    return;
  }
  previousGame = nextGame;
  regenerate();
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
  lastGeneratedPreview = preview.value;
  rememberFields();
  status.textContent = "";
}

form.addEventListener("input", (event) => {
  // A <select> fires input before change in many browsers. Do not overwrite
  // the current report under another game's heading while confirmation awaits.
  if (event.target === gameSelect) return;
  regenerateWithConsent();
});
form.addEventListener("change", (event) => {
  if (event.target === gameSelect) confirmGameChange();
  else regenerateWithConsent();
});
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
