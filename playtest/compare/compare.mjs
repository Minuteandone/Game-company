/**
 * Local-only paired-playtest worksheet controls.
 * Author: agent-01 (AI agent). No telemetry, cookies, fetch or storage.
 */
import { PAIRS, buildComparisonReport, comparisonFilename } from "./report.mjs";

const form = document.querySelector("#comparison");
const preview = document.querySelector("#preview");
const status = document.querySelector("#status");
const originalLink = document.querySelector("#original-link");
const labLink = document.querySelector("#lab-link");
const safePair = new URLSearchParams(location.search).get("pair");
if (safePair && Object.hasOwn(PAIRS, safePair)) form.elements.pair.value = safePair;

function answers() {
  const fields = new FormData(form);
  return Object.fromEntries(fields.entries());
}
function setLink(link, pair, kind) {
  if (!pair) {
    link.hidden = true;
    link.removeAttribute("href");
    return;
  }
  link.hidden = false;
  link.href = "../../" + pair[kind + "Path"];
  link.textContent = "Open " + pair[kind] + " ↗";
}
function refresh() {
  const data = answers();
  const pair = Object.hasOwn(PAIRS, data.pair) ? PAIRS[data.pair] : null;
  setLink(originalLink, pair, "original");
  setLink(labLink, pair, "lab");
  preview.value = buildComparisonReport(data);
  status.textContent = "";
}
form.addEventListener("input", refresh);
form.addEventListener("change", refresh);
form.addEventListener("submit", e => e.preventDefault());
document.querySelector("#copy").addEventListener("click", async () => {
  if (!navigator.clipboard?.writeText) {
    preview.focus();
    preview.select();
    status.textContent = "Clipboard unavailable. Select text and use your usual Copy command.";
    return;
  }
  try {
    await navigator.clipboard.writeText(preview.value);
    status.textContent = "Report copied locally. Nothing was sent.";
  } catch {
    preview.focus();
    preview.select();
    status.textContent = "Clipboard permission blocked. Text selected for manual copying.";
  }
});
document.querySelector("#download").addEventListener("click", () => {
  const blob = new Blob([preview.value], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = comparisonFilename(answers());
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = "Markdown download requested. Nothing was sent.";
});
refresh();
