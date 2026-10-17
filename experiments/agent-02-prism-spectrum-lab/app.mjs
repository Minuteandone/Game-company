/**
 * Forked Spectrum optional puzzle-lab UI.
 * Author: agent-02 (AI agent). All state is ephemeral and stays in memory.
 */
import { BOARD, rotateMirror, traceSpectrum } from "./logic.mjs";

const $ = id => document.getElementById(id);
const SVGNS = "http://www.w3.org/2000/svg";
let grid = [...BOARD];
let rotations = 0;

const ICONS = {
  ".": "", "#": "▦", "E": "➜", "P": "✦",
  "A": "A", "B": "B", "/": "/", "\\": "\\"
};
const STYLES = {
  "#": "wall", "E": "emitter", "P": "splitter",
  "A": "cyan-goal", "B": "amber-goal"
};

function position(x, y) {
  return "row " + (y + 1) + ", column " + (x + 1);
}

function rayTouches(ray, x, y) {
  return ray.path.some(p => p.x === x && p.y === y);
}

function describeMirror(tile, x, y, beams) {
  const touched = [];
  if (rayTouches(beams.cyan, x, y)) touched.push("cyan ray reaches it");
  if (rayTouches(beams.amber, x, y)) touched.push("amber ray reaches it");
  return "Rotate mirror at " + position(x, y) + ". Current orientation: " +
    (tile === "/" ? "slash" : "backslash") + ". " +
    (touched.length ? touched.join(" and ") : "Neither colored ray currently reaches it") + ".";
}

function paintRay(points, color) {
  if (points.length < 2) return;
  const line = document.createElementNS(SVGNS, "polyline");
  line.setAttribute("points", points.map(p => (p.x * 100 + 50) + "," + (p.y * 100 + 50)).join(" "));
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", color);
  line.setAttribute("stroke-width", "10");
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("stroke-linejoin", "round");
  line.setAttribute("opacity", ".95");
  $("rays").append(line);
}

function render() {
  const beams = traceSpectrum(grid);
  const cells = $("cells");
  cells.replaceChildren();
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const tile = grid[y][x];
      const mirror = tile === "/" || tile === "\\";
      const cell = document.createElement(mirror ? "button" : "div");
      cell.className = "tile " + (mirror ? "mirror" : STYLES[tile] || "");
      cell.textContent = ICONS[tile];
      cell.setAttribute("data-x", String(x));
      cell.setAttribute("data-y", String(y));
      if (mirror) {
        cell.type = "button";
        cell.setAttribute("aria-label", describeMirror(tile, x, y, beams));
        cell.addEventListener("click", () => {
          grid = rotateMirror(grid, y, x);
          rotations++;
          render();
          const next = cells.querySelector('[data-x="' + x + '"][data-y="' + y + '"]');
          next?.focus({ preventScroll: true });
        });
      } else if (tile !== ".") {
        const name = {
          "#": "wall", "E": "white beam emitter", "P": "fixed splitter",
          "A": "cyan receiver A", "B": "amber receiver B"
        }[tile];
        cell.setAttribute("aria-label", name + ", " + position(x, y));
      } else {
        cell.setAttribute("aria-hidden", "true");
      }
      cells.append(cell);
    }
  }
  $("rays").replaceChildren();
  paintRay(beams.feed.path, "#f0f5ff");
  paintRay(beams.cyan.path, "#7ff8e9");
  paintRay(beams.amber.path, "#ffd18f");

  $("cyan-state").textContent = beams.cyan.reached ? "Connected" : "Not connected";
  $("amber-state").textContent = beams.amber.reached ? "Connected" : "Not connected";
  $("rotations").textContent = "Rotations: " + rotations;
  if (beams.won) {
    $("status").textContent = "Both rays connected in " + rotations + " rotations!";
  } else if (beams.cyan.reached || beams.amber.reached) {
    $("status").textContent = (beams.cyan.reached ? "Cyan" : "Amber") +
      " is connected. Find the other route.";
  } else {
    $("status").textContent = "Both colored rays need a route.";
  }
}

$("reset").addEventListener("click", () => {
  grid = [...BOARD];
  rotations = 0;
  render();
});
render();
