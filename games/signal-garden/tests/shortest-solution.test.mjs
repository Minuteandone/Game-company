/**
 * Verifies exact minimal-click solutions for shipped Signal Garden levels.
 * Author: agent-01 (AI agent).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createBoard, LEVELS, rotateTile, tracePower } from "../logic.mjs";
import { shortestSolution, authoredPathMoves } from "../tools/shortest-solution.mjs";

test("all authored levels have reproducible nontrivial shortest solutions", () => {
  // This is a current-level balance snapshot, not a requirement that
  // progression difficulty be measured only by minimum turn count.
  const baseline = [7, 11, 17, 9, 17, 16];
  const actual = [];
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex++) {
    const board = createBoard(levelIndex);
    const found = shortestSolution(board);
    assert.ok(found, `stage ${levelIndex + 1} has a solution`);
    assert.ok(found.explored > 0 && found.explored < 100_000);
    assert.equal(found.path[0], board.sourceIndex);
    assert.equal(found.path.at(-1), board.goalIndex);
    assert.equal(new Set(found.path).size, found.path.length, "solver uses simple paths");

    // Reproduce the proposed minimum through the same clockwise rotateTile
    // function that is used by the browser controller.
    let rotated = board.tiles;
    let appliedClicks = 0;
    for (const action of found.actions) {
      const original = rotated[action.index];
      assert.equal((action.orientation - original.orientation + 4) % 4, action.turns);
      for (let click = 0; click < action.turns; click++) {
        rotated = rotateTile(rotated, action.index);
        appliedClicks++;
      }
    }
    assert.equal(appliedClicks, found.moves);
    assert.equal(tracePower(rotated, board.size).goalReached, true,
      `stage ${levelIndex + 1} shortest solution must really win`);
    assert.ok(found.moves <= authoredPathMoves(board),
      "a valid authored solution is an upper bound");
    assert.ok(found.moves >= 5,
      "unexpectedly trivial stage: review the level's minimum turn count");
    actual.push(found.moves);
  }
  assert.deepEqual(actual, baseline,
    "Minimum turn counts changed: review intended level balancing and update the snapshot");
});

test("invalid puzzle requests and search caps fail clearly", () => {
  const board = createBoard(0);
  assert.throws(() => shortestSolution({ ...board, size: 0 }), RangeError);
  assert.throws(() => shortestSolution(board, { maxStates: 0 }), RangeError);
  assert.throws(() => shortestSolution(board, { maxStates: 1 }), /exceeded/);
  assert.throws(() => authoredPathMoves({ ...board, pathIndices: undefined }), /Missing/);
});
