/**
 * Signal Garden — accessible browser interface.
 * Author: agent-01 (AI agent).
 */
import {
  LEVELS, createBoard, rotateTile, tileConnections, tracePower, hintIndex
} from "./logic.mjs";

const STORAGE_KEY = "signal-garden-progress-v1";
const $ = (id) => document.getElementById(id);
const boardElement = $("board");
const levelList = $("level-list");
const victory = $("victory");
const hintButton = $("hint");
const resetButton = $("reset");
const nextButton = $("next-stage");
const closeButton = $("close-victory");
const clearProgressButton = $("clear-progress");
const DIRECTION_NAMES = ["north", "east", "south", "west"];
const TILE_NAMES = {
  straight: "straight path", elbow: "corner path", tee: "three-way path",
  source: "light source", goal: "flower"
};

function loadProgress() {
  try {
    const item = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (item && typeof item === "object") {
      return {
        unlocked: Number.isInteger(item.unlocked)
          ? Math.max(1, Math.min(LEVELS.length, item.unlocked)) : 1,
        best: item.best && typeof item.best === "object" ? item.best : {},
        lastLevel: Number.isInteger(item.lastLevel) ? item.lastLevel : 0
      };
    }
  } catch { /* Game stays playable when local storage is unavailable. */ }
  return { unlocked: 1, best: {}, lastLevel: 0 };
}

const progress = loadProgress();
let levelIndex = 0;
let currentBoard;
let turns = 0;
let completed = false;
// Ephemeral per-attempt rescue affordance; never persisted with unlocks/bests.
let hintUsed = false;

function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
  catch { /* Private browsing and sandboxed browsers may disable persistence. */ }
}

function showMessage(message) {
  $("status").textContent = message;
}

function updateStats() {
  $("turns").textContent = String(turns).padStart(2, "0");
  const best = progress.best[levelIndex];
  $("best").textContent = Number.isInteger(best) && best >= 0 ? String(best).padStart(2, "0") : "—";
  hintButton.disabled = completed || hintUsed;
  hintButton.textContent = completed ? "✧ Solved" : hintUsed ? "✧ Hint used" : "✧ Hint (1)";
  hintButton.title = completed ? "This garden is solved." : hintUsed
    ? "Reset this garden to restore your one hint." : "Reveal one path tile this attempt.";
}

function renderLevelNav() {
  levelList.replaceChildren();
  LEVELS.forEach((level, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "level-button" + (index === levelIndex ? " active" : "");
    button.textContent = String(index + 1).padStart(2, "0");
    button.disabled = index >= progress.unlocked;
    button.title = level.name + (button.disabled ? " — locked" : "");
    button.setAttribute("aria-label",
      `Garden ${index + 1}: ${level.name}${button.disabled ? ", locked" : ""}`);
    if (index === levelIndex) button.setAttribute("aria-current", "step");
    button.addEventListener("click", () => loadLevel(index, true));
    levelList.append(button);
  });
}

function makeTileElement(tile, index, powered) {
  const isLocked = tile.locked;
  const element = document.createElement(isLocked ? "div" : "button");
  if (!isLocked) element.type = "button";
  element.className = [
    "tile", tile.type, powered ? "powered" : "", isLocked ? "fixed" : ""
  ].filter(Boolean).join(" ");
  element.dataset.index = String(index);
  const row = Math.floor(index / currentBoard.size) + 1;
  const col = index % currentBoard.size + 1;
  // The connector directions are essential game state, not just decoration.
  // Include them in each tile's accessible name so the network can be
  // reasoned about without relying exclusively on its visual segments.
  const openings = tileConnections(tile).map((direction) => DIRECTION_NAMES[direction]);
  const openingNames = openings.length === 1
    ? openings[0]
    : openings.slice(0, -1).join(", ") + " and " + openings.at(-1);
  const label = `Row ${row}, column ${col}: ${TILE_NAMES[tile.type]}. Openings ${openingNames}. ${powered ? "Glowing" : "Not glowing"}.`;
  element.setAttribute("aria-label", isLocked ? label : label + " Rotate clockwise.");
  if (isLocked) element.setAttribute("role", "img");

  for (const direction of tileConnections(tile)) {
    const segment = document.createElement("span");
    segment.className = "segment " + DIRECTION_NAMES[direction];
    segment.setAttribute("aria-hidden", "true");
    element.append(segment);
  }

  if (isLocked) {
    const core = document.createElement("span");
    core.className = "core";
    core.textContent = tile.type === "source" ? "✦" : "✿";
    core.setAttribute("aria-hidden", "true");
    element.append(core);
  } else {
    const hub = document.createElement("span");
    hub.className = "hub";
    hub.setAttribute("aria-hidden", "true");
    element.append(hub);
    element.addEventListener("click", () => rotate(index));
    element.addEventListener("keydown", (event) => handleArrows(event, index));
  }
  return element;
}

/** Arrow keys move spatially among buttons, skipping unrotatable endpoints. */
function handleArrows(event, index) {
  const offsets = {
    ArrowUp: [-1, 0], ArrowRight: [0, 1],
    ArrowDown: [1, 0], ArrowLeft: [0, -1]
  };
  const offset = offsets[event.key];
  if (!offset) return;
  event.preventDefault();
  const size = currentBoard.size;
  let row = Math.floor(index / size), col = index % size;
  for (;;) {
    row += offset[0];
    col += offset[1];
    if (row < 0 || col < 0 || row >= size || col >= size) break;
    const target = boardElement.querySelector(`button[data-index="${row * size + col}"]`);
    if (target) { target.focus(); break; }
  }
}

function renderBoard(focusIndex = null) {
  const { powered } = tracePower(currentBoard.tiles, currentBoard.size);
  boardElement.style.setProperty("--size", String(currentBoard.size));
  // Fixed endpoints are not keyboard-rotatable; give their coordinates
  // in the board overview so players need not locate them by color alone.
  const position = (index) => `row ${Math.floor(index / currentBoard.size) + 1}, column ${index % currentBoard.size + 1}`;
  boardElement.setAttribute("aria-label",
    `Garden ${levelIndex + 1}, ${currentBoard.size} by ${currentBoard.size} grid. ` +
    `Fixed star at ${position(currentBoard.sourceIndex)}. ` +
    `Fixed flower at ${position(currentBoard.goalIndex)}. ` +
    "Rotate tiles to connect the star to the flower. Arrow keys move between rotatable tiles.");
  const fragment = document.createDocumentFragment();
  currentBoard.tiles.forEach((tile, index) => {
    fragment.append(makeTileElement(tile, index, powered.has(index)));
  });
  boardElement.replaceChildren(fragment);
  if (focusIndex !== null) {
    boardElement.querySelector(`button[data-index="${focusIndex}"]`)?.focus({ preventScroll: true });
  }
}

function loadLevel(index, focusBoard = false, persist = true) {
  if (index < 0 || index >= progress.unlocked) return;
  levelIndex = index;
  currentBoard = createBoard(index);
  turns = 0;
  completed = false;
  hintUsed = false;
  progress.lastLevel = index;
  if (persist) saveProgress();
  $("stage-name").textContent = LEVELS[index].name;
  $("level-number").textContent =
    `${String(index + 1).padStart(2, "0")} / ${String(LEVELS.length).padStart(2, "0")}`;
  victory.hidden = true;
  renderLevelNav();
  renderBoard();
  updateStats();
  showMessage("Follow the glow. The flower is waiting.");
  if (focusBoard) boardElement.querySelector("button.tile")?.focus();
}

function rotate(index) {
  if (completed || currentBoard.tiles[index].locked) return;
  currentBoard.tiles = rotateTile(currentBoard.tiles, index);
  turns++;
  const { goalReached, powered } = tracePower(currentBoard.tiles, currentBoard.size);
  let newRecord = false;
  if (goalReached) {
    completed = true;
    const previousBest = progress.best[levelIndex];
    newRecord = !Number.isInteger(previousBest) || turns < previousBest;
    if (newRecord) progress.best[levelIndex] = turns;
    progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length, levelIndex + 2));
    saveProgress();
  }
  renderBoard(completed ? null : index);
  updateStats();
  if (completed) {
    renderLevelNav();
    showMessage(`Flower awake! The signal arrived in ${turns} turns.`);
    $("victory-summary").textContent =
      `You restored ${LEVELS[levelIndex].name} in ${turns} turns.` +
      (newRecord ? " A personal best!" : "");
    $("victory-title").textContent =
      levelIndex === LEVELS.length - 1 ? "Every garden is glowing." : "Beautifully connected.";
    nextButton.innerHTML = levelIndex === LEVELS.length - 1
      ? "Visit the first garden <span aria-hidden=\"true\">→</span>"
      : "Next garden <span aria-hidden=\"true\">→</span>";
    victory.hidden = false;
    nextButton.focus();
  } else {
    showMessage(`${powered.size} tiles glowing. Keep connecting the trail.`);
  }
}

hintButton.addEventListener("click", () => {
  if (completed || hintUsed) return;
  const index = hintIndex(currentBoard);
  if (index < 0) {
    showMessage("Every main path is aligned. Look for one last connection.");
    return;
  }
  const row = Math.floor(index / currentBoard.size) + 1;
  const col = index % currentBoard.size + 1;
  const target = boardElement.querySelector(`button[data-index="${index}"]`);
  if (target) {
    hintUsed = true;
    updateStats();
    target.classList.remove("hint");
    void target.offsetWidth; // Restart the visual hint pulse after repeat requests.
    target.classList.add("hint");
    target.focus();
  }
  showMessage(`Try rotating the highlighted tile at row ${row}, column ${col}. One hint used; Reset this garden to restore it.`);
});

resetButton.addEventListener("click", () => {
  loadLevel(levelIndex, true);
  showMessage("Fresh start! The garden is ready.");
});

clearProgressButton.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Clear Signal Garden's saved level unlocks and personal bests in this browser? " +
    "This cannot be undone. Other games and websites will not be affected."
  );
  if (!confirmed) return;

  // Erase only this game's key, never all localStorage. Keep the cleared
  // state in memory even when storage is unavailable (e.g. private mode).
  let removed = true;
  try { localStorage.removeItem(STORAGE_KEY); }
  catch { removed = false; }
  progress.unlocked = 1;
  progress.best = {};
  progress.lastLevel = 0;
  // Do not immediately recreate the erased key just by loading stage one.
  loadLevel(0, true, false);
  showMessage(removed
    ? "Saved progress cleared for Signal Garden. Garden one is ready."
    : "This session was reset, but browser storage blocked deletion. Old progress may return after reload.");
});

nextButton.addEventListener("click", () => {
  loadLevel(levelIndex === LEVELS.length - 1 ? 0 : levelIndex + 1, true);
});

function closeVictory() {
  victory.hidden = true;
  resetButton.focus();
}
closeButton.addEventListener("click", closeVictory);

// Trap keyboard focus inside the completion dialog; Escape dismisses it.
victory.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { event.preventDefault(); closeVictory(); return; }
  if (event.key !== "Tab") return;
  if (event.shiftKey && document.activeElement === nextButton) {
    event.preventDefault();
    closeButton.focus();
  } else if (!event.shiftKey && document.activeElement === closeButton) {
    event.preventDefault();
    nextButton.focus();
  }
});

loadLevel(Math.max(0, Math.min(progress.lastLevel, progress.unlocked - 1)));
