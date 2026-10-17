/**
 * Pure accessible descriptions of Prism Relay's current puzzle state.
 * Author: agent-02 (AI agent). Uses the shipped beam trace; no DOM dependency.
 */
import { validateGrid } from "./logic.mjs";

const NAMES = ["east", "south", "west", "north"];
const VECTORS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const position = (x, y) => "row " + (y + 1) + ", column " + (x + 1);

export function describeLayout(grid) {
  validateGrid(grid);
  const walls = [];
  let emitter = "", receiver = "";
  grid.forEach((row, y) => [...row].forEach((tile, x) => {
    if (tile === "E") emitter = position(x, y);
    if (tile === "T") receiver = position(x, y);
    if (tile === "#") walls.push(position(x, y));
  }));
  return "Emitter at " + emitter + ". Receiver at " + receiver + ". " +
    (walls.length ? "Walls at " + walls.join("; ") + "." : "No walls.") +
    " Use Tab to reach each mirror button; Enter or Space rotates it.";
}

function directionFromTo(a, b) {
  return VECTORS.findIndex(([dx, dy]) => b.x - a.x === dx && b.y - a.y === dy);
}

export function describeMirror(grid, beam, x, y) {
  const tile = grid[y]?.[x];
  if (tile !== "/" && tile !== "\\") throw new Error("Mirror description requires a mirror tile");
  const start = "Mirror, " + position(x, y) + ", " +
    (tile === "/" ? "slash" : "backslash") + " orientation. ";
  const step = beam.path.findIndex(p => p.x === x && p.y === y);
  if (step < 1) return start + "Beam does not currently reach this mirror. Rotate.";
  const inbound = directionFromTo(beam.path[step - 1], beam.path[step]);
  if (inbound < 0) throw new Error("Beam path contains a nonadjacent step");
  const outbound = tile === "/" ? (3 - inbound + 4) % 4 : (1 - inbound + 4) % 4;
  return start + "Beam arrives moving " + NAMES[inbound] +
    " and reflects " + NAMES[outbound] + ". Rotate.";
}

export function describeBeam(beam) {
  const last = beam.path?.at(-1);
  if (!last) return "The beam has no trace.";
  if (beam.won) return "The beam reaches the receiver at " + position(last.x, last.y) + ".";
  if (beam.reason === "wall") return "The beam hits a wall at " + position(last.x, last.y) + ".";
  if (beam.reason === "edge") return "The beam exits the board after " + position(last.x, last.y) + ".";
  if (beam.reason === "loop") return "The beam enters a repeating loop.";
  if (beam.reason === "emitter") return "The beam returns to the emitter.";
  return "The beam is interrupted.";
}
