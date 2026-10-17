import test from "node:test";
import assert from "node:assert/strict";
import { BOARD, validateGrid, traceSpectrum, rotateMirror, findShortestSolution } from "./logic.mjs";

test("unrotated lab board visibly splits but misses both receivers", () => {
  const result = traceSpectrum(BOARD);
  assert.equal(result.feed.reason, "split");
  assert.deepEqual(result.feed.path[0], { x: 0, y: 3 });
  assert.deepEqual(result.feed.path.at(-1), { x: 3, y: 3 });
  assert.deepEqual(result.cyan.path.slice(0, 3), [
    { x: 3, y: 3 }, { x: 3, y: 2 }, { x: 3, y: 1 }
  ]);
  assert.deepEqual(result.amber.path.slice(0, 3), [
    { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 3, y: 5 }
  ]);
  assert.equal(result.cyan.reached, false);
  assert.equal(result.amber.reached, false);
  assert.equal(result.won, false);
});

test("each branch can reach its own colored receiver with two rotations", () => {
  const cyanFixed = rotateMirror(BOARD, 1, 3);
  assert.equal(traceSpectrum(cyanFixed).cyan.reached, true);
  assert.equal(traceSpectrum(cyanFixed).amber.reached, false);
  const solved = rotateMirror(cyanFixed, 5, 3);
  const result = traceSpectrum(solved);
  assert.equal(result.won, true);
  assert.equal(result.cyan.reached, true);
  assert.equal(result.amber.reached, true);
  assert.deepEqual(result.cyan.path.at(-1), { x: 5, y: 0 });
  assert.deepEqual(result.amber.path.at(-1), { x: 6, y: 5 });
  assert.equal(BOARD[1][3], "\\", "original board remains unmodified");
});

test("the candidate can be solved in two rotations, no shorter", () => {
  const solution = findShortestSolution(BOARD);
  assert.ok(solution);
  assert.equal(solution.length, 2);
  assert.deepEqual(solution.map(({ x, y }) => x + "," + y).sort(), ["3,1", "3,5"]);
  let solved = BOARD;
  for (const { x, y } of solution) solved = rotateMirror(solved, y, x);
  assert.equal(traceSpectrum(solved).won, true);
});

test("validation rejects invalid or ambiguous maps", () => {
  assert.deepEqual(validateGrid(BOARD), { width: 7, height: 7 });
  assert.throws(() => validateGrid(["E.P", "A.B."]), /rectangular/);
  assert.throws(() => validateGrid(BOARD.map(r => r.replace("A", "B"))), /exactly one A/);
  assert.throws(() => validateGrid(BOARD.map(r => r.replace("A", "X"))), /exactly one A/);
  assert.equal(rotateMirror(BOARD, 3, 0), BOARD, "nonmirror cannot rotate");
});

test("wrong-color targets do not count as a split-beam solution", () => {
  const reversed = BOARD.map(r => r.replace("A", "X").replace("B", "A").replace("X", "B"));
  const turned = rotateMirror(rotateMirror(reversed, 1, 3), 5, 3);
  const result = traceSpectrum(turned);
  assert.equal(result.cyan.reached, false);
  assert.equal(result.amber.reached, false);
  assert.equal(result.won, false);
  assert.equal(findShortestSolution(BOARD, 2), null, "bounded search refuses larger puzzles");
});
