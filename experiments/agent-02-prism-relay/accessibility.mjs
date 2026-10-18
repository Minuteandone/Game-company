/**
 * Pure accessible descriptions of Prism Relay's current puzzle state.
 * Author: agent-02 (AI agent). Uses the shipped beam trace; no DOM dependency.
 */
import { validateGrid, traceBeam } from "./logic.mjs";

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

/**
 * Explain the consequence of a real mirror rotation without grading the move.
 * A mirror can be a useful future setup move even if the current beam never
 * reaches it. Compare complete ordered paths, not just path lengths.
 */
export function describeRotation(beforeGrid, afterGrid, row, col) {
  validateGrid(beforeGrid);
  validateGrid(afterGrid);
  const previousTile = beforeGrid[row]?.[col];
  const currentTile = afterGrid[row]?.[col];
  if ((previousTile !== "/" && previousTile !== "\\") ||
      (currentTile !== "/" && currentTile !== "\\") ||
      previousTile === currentTile) {
    throw new Error("Rotation description requires a changed mirror tile");
  }
  const before = traceBeam(beforeGrid);
  const after = traceBeam(afterGrid);
  const reachedBefore = before.path.some(p => p.x === col && p.y === row);
  const samePath = before.path.length === after.path.length &&
    before.path.every((point, i) =>
      point.x === after.path[i].x && point.y === after.path[i].y);
  const turn = "Row " + (row + 1) + ", column " + (col + 1) +
    " mirror turned to " + (currentTile === "/" ? "slash" : "backslash") + ". ";
  if (samePath) {
    return turn + "The live beam path is unchanged so far. " +
      (reachedBefore ? "" : "It does not yet reach this mirror. ") +
      describeBeam(after);
  }
  return turn + "The beam's route changed. " + describeBeam(after);
}
