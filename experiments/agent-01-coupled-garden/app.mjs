/**
 * Coupled Garden — isolated browser UI.
 * Author: agent-01 (AI agent). No network, persistence, or personal data.
 */
import { SIZE, createStart, tileConnections, turnGroup, tracePower } from "./logic.mjs";

const boardElement = document.querySelector("#board");
const movesElement = document.querySelector("#moves");
const status = document.querySelector("#status");
const reset = document.querySelector("#reset");
const DIRECTIONS = ["north", "east", "south", "west"];
const VECTORS = [[50, 0], [100, 50], [50, 100], [0, 50]];
const SVG_NS = "http://www.w3.org/2000/svg";

let tiles = createStart();
let moves = 0;
let won = false;

function pathSVG(tile) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");
  for (const direction of tileConnections(tile)) {
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", "50"); line.setAttribute("y1", "50");
    line.setAttribute("x2", String(VECTORS[direction][0]));
    line.setAttribute("y2", String(VECTORS[direction][1]));
    svg.append(line);
  }
  const center = document.createElementNS(SVG_NS, "circle");
  center.setAttribute("cx", "50"); center.setAttribute("cy", "50");
  center.setAttribute("r", "9");
  svg.append(center);
  return svg;
}

function describe(tile, index, powered) {
  const row = Math.floor(index / SIZE) + 1, column = index % SIZE + 1;
  const directions = tileConnections(tile).map(direction => DIRECTIONS[direction]);
  const openings = directions.length === 1 ? directions[0] :
    directions.slice(0, -1).join(", ") + " and " + directions.at(-1);
  const shape = {
    source: "fixed star", goal: "fixed flower", straight: "straight",
    elbow: "corner", tee: "three-way junction"
  }[tile.type];
  return `Row ${row}, column ${column}: ${shape}. Openings ${openings}. ` +
    (powered ? "Powered." : "Not powered.");
}

function render() {
  const flow = tracePower(tiles);
  won = flow.won;
  boardElement.replaceChildren();
  tiles.forEach((tile, index) => {
    const cell = document.createElement("div");
    cell.className = "tile " + tile.type + (flow.powered.has(index) ? " powered" : "");
    cell.dataset.index = String(index);
    cell.setAttribute("role", "img");
    cell.setAttribute("aria-label", describe(tile, index, flow.powered.has(index)));
    cell.append(pathSVG(tile));
    if (tile.type === "source" || tile.type === "goal") {
      const symbol = document.createElement("span");
      symbol.textContent = tile.type === "source" ? "✦" : "✿";
      symbol.setAttribute("aria-hidden", "true");
      cell.append(symbol);
    }
    boardElement.append(cell);
  });
  movesElement.textContent = String(moves);
  status.classList.toggle("won", won);
  if (won) {
    status.textContent = `Connected the flower in ${moves} coupled moves! Restart to try another route.`;
  } else {
    status.textContent = moves
      ? `After ${moves} group ${moves === 1 ? "turn" : "turns"}, the flower is still dark. ${flow.powered.size} of 16 tiles are powered.`
      : "The flower needs a continuous path from the star. Choose a row or column turn.";
  }
}

for (const button of document.querySelectorAll("button[data-axis]")) {
  button.addEventListener("click", () => {
    if (won) return;
    const axis = button.dataset.axis;
    const group = Number(button.dataset.group);
    tiles = turnGroup(tiles, axis, group);
    moves++;
    render();
    // Row/column buttons are never recreated and keep keyboard focus.
  });
}

reset.addEventListener("click", () => {
  tiles = createStart();
  moves = 0;
  render();
  status.textContent = "Restarted. All four rows and columns are ready for a new try.";
  reset.focus({ preventScroll: true });
});

render();
