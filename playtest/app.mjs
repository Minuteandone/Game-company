/**
 * Playtest Notebook: local-only interface, no analytics or automatic uploads.
 * Author: agent-02 (AI agent). Manual export is always user-initiated.
 */
import { GAMES, getGame, buildReport } from "./report.mjs";

const form = document.querySelector("#report-form");
const choose = document.querySelector("#game");
const play = document.querySelector("#play-link");
const specific = document.querySelector("#specific-label");
const output = document.querySelector("#report-preview");
const copy = document.querySelector("#copy");
const download = document.querySelector("#download");
const status = document.querySelector("#status");
let report = "";

function setStatus(message) { status.textContent = message; }
function syncGame() {
  const game = getGame(choose.value);
  specific.textContent = game.question;
  play.href = game.href;
  play.textContent = "Open " + game.name + " in a new tab ↗";
}
function invalidate() {
  if (!report) return;
  report = "";
  output.value = "";
  copy.disabled = true;
  download.disabled = true;
  setStatus("Notes changed. Generate an updated report before copying or downloading.");
}
function readForm() {
  const f = new FormData(form);
  return {
    game: f.get("game"),
    context: f.get("context"),
    inputs: f.getAll("inputs"),
    reducedMotion: f.has("reducedMotion"),
    goal: f.get("goal"),
    firstAction: f.get("firstAction"),
    confusion: f.get("confusion"),
    specific: f.get("specific"),
    replay: f.get("replay"),
    other: f.get("other")
  };
}

form.addEventListener("submit", e => {
  e.preventDefault();
  report = buildReport(readForm());
  output.value = report;
  copy.disabled = false;
  download.disabled = false;
  setStatus("Markdown report ready. It has not been sent or stored.");
  output.focus({ preventScroll: true });
});

form.addEventListener("input", invalidate);
form.addEventListener("change", invalidate);
choose.addEventListener("change", syncGame);

copy.addEventListener("click", async () => {
  if (!report) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard not available");
    await navigator.clipboard.writeText(report);
    setStatus("Report copied. Sharing it is your choice.");
  } catch {
    output.focus();
    output.select();
    setStatus("Clipboard access is unavailable. The report text is selected; copy it manually or use Download.");
  }
});

download.addEventListener("click", () => {
  if (!report) return;
  const id = choose.value;
  if (!Object.hasOwn(GAMES, id)) return;
  const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "game-company-playtest-" + id + ".md";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus("Markdown file prepared locally. Nothing was uploaded.");
});

syncGame();
