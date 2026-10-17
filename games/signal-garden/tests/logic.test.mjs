/**
 * Node's built-in test runner: node --test games/signal-garden/tests/*.test.mjs
 * Author: agent-01 (AI agent).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  LEVELS, createBoard, hintIndex, isRouteTileCorrect,
  rotateTile, tileConnections, tracePower
} from "../logic.mjs";

test("all stages are rectangular, distinct, deterministic and initially unpowered at the goal", () => {
  for (let index = 0; index < LEVELS.length; index++) {
    const a = createBoard(index), b = createBoard(index);
    assert.deepEqual(a, b, `stage ${index + 1} should be deterministic`);
    assert.equal(a.tiles.length, a.size * a.size);
    assert.equal(new Set(a.pathIndices).size, a.pathIndices.length);
    assert.equal(a.tiles[a.sourceIndex].type, "source");
    assert.equal(a.tiles[a.goalIndex].type, "goal");
    assert.equal(a.tiles.filter((tile) => tile.type === "source").length, 1);
    assert.equal(a.tiles.filter((tile) => tile.type === "goal").length, 1);
    assert.equal(tracePower(a.tiles, a.size).goalReached, false, `stage ${index + 1} should not start won`);
    assert.notEqual(hintIndex(a), -1, "each board should have an actionable hint");
  }
});

test("every authored stage has a solution", () => {
  for (let index = 0; index < LEVELS.length; index++) {
    const board = createBoard(index);
    const solvedTiles = board.tiles.map((tile) =>
      tile.onRoute ? { ...tile, orientation: tile.solutionOrientation } : tile
    );
    assert.equal(tracePower(solvedTiles, board.size).goalReached, true, `stage ${index + 1}`);
    assert.equal(hintIndex({ ...board, tiles: solvedTiles }), -1);
  }
});

test("source only powers tiles whose connectors face back", () => {
  const tiles = [
    { type: "source", orientation: 1 },
    { type: "straight", orientation: 0 },
    { type: "goal", orientation: 3 },
    { type: "elbow", orientation: 0 },
    { type: "elbow", orientation: 0 },
    { type: "elbow", orientation: 0 },
    { type: "elbow", orientation: 0 },
    { type: "elbow", orientation: 0 },
    { type: "elbow", orientation: 0 }
  ];
  assert.equal(tracePower(tiles, 3).goalReached, false);
  tiles[1] = { ...tiles[1], orientation: 1 };
  const { powered, goalReached } = tracePower(tiles, 3);
  assert.equal(goalReached, true);
  assert.deepEqual([...powered].sort((a, b) => a - b), [0, 1, 2]);
});

test("rotation is pure, locked pieces are stable, and four turns return to start", () => {
  const board = createBoard(0);
  const original = board.tiles;
  assert.equal(rotateTile(original, board.sourceIndex), original);
  let rotated = original;
  const index = board.pathIndices[1];
  for (let turn = 0; turn < 4; turn++) rotated = rotateTile(rotated, index);
  assert.deepEqual(rotated, original);
  assert.notEqual(rotated, original);
  assert.deepEqual(rotateTile(original, -1), original);
  assert.deepEqual(rotateTile(original, 9999), original);
});

test("straight pieces count their two equivalent orientations as correct", () => {
  const tile = { type: "straight", orientation: 2, solutionOrientation: 0, onRoute: true };
  assert.ok(isRouteTileCorrect(tile));
  assert.deepEqual(tileConnections(tile).sort(), [0, 2]);
});

test("invalid boards and levels fail explicitly", () => {
  assert.throws(() => createBoard(-1), RangeError);
  assert.throws(() => createBoard(LEVELS.length), RangeError);
  assert.throws(() => tracePower([], 4), RangeError);
  assert.throws(() => tileConnections({ type: "unknown", orientation: 0 }), /Unknown tile/);
});
