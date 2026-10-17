import test from "node:test";
import assert from "node:assert/strict";
import { SIZE, SOLVED, createStart, tileConnections, turnGroup, tracePower, shortestSolution } from "./logic.mjs";

test("the isolated puzzle starts dark and has a valid powered winning configuration", () => {
  assert.equal(SIZE, 4);
  assert.equal(SOLVED.length, 16);
  assert.equal(SOLVED[0].type, "source");
  assert.equal(SOLVED[15].type, "goal");
  assert.equal(tracePower(SOLVED).won, true);
  const start = createStart();
  assert.equal(tracePower(start).won, false);
  assert.equal(start[0].orientation, SOLVED[0].orientation);
  assert.equal(start[15].orientation, SOLVED[15].orientation);
});

test("group rotation changes multiple cells at once and preserves fixed endpoints", () => {
  const original = createStart();
  for (const axis of ["row", "column"]) {
    const next = turnGroup(original, axis, 2);
    const changed = next.map((tile, index) =>
      tile.orientation !== original[index].orientation ? index : -1).filter(i => i >= 0);
    assert.equal(changed.length, 4, axis + " 3 must rotate four pipes together");
    for (const index of changed) {
      assert.equal(axis === "row" ? Math.floor(index / SIZE) : index % SIZE, 2);
      assert.equal(next[index].orientation, (original[index].orientation + 1) % 4);
    }
    assert.notEqual(next, original);
    assert.equal(next[0].orientation, original[0].orientation);
    assert.equal(next[15].orientation, original[15].orientation);
  }
  assert.deepEqual(turnGroup(original, "row", 0, 0), original);
  assert.equal(turnGroup(original, "row", 0, 1)[0].orientation, original[0].orientation);
  assert.equal(turnGroup(original, "column", 3, 1)[15].orientation, original[15].orientation);
  assert.deepEqual(turnGroup(original, "row", 2, 3).map(x=>x.orientation),
    turnGroup(turnGroup(turnGroup(original, "row", 2), "row", 2), "row", 2).map(x=>x.orientation));
});

test("every connector reports its true rotated directions", () => {
  assert.deepEqual(tileConnections({ type: "source", orientation: 1 }), [1]);
  assert.deepEqual(tileConnections({ type: "elbow", orientation: 2 }), [2, 3]);
  assert.deepEqual(tileConnections({ type: "straight", orientation: 1 }), [1, 3]);
  assert.deepEqual(tileConnections({ type: "tee", orientation: 0 }), [0, 1, 3]);
  assert.throws(() => tileConnections({ type: "nope", orientation: 0 }), /Unknown/);
  assert.throws(() => tileConnections({ type: "elbow", orientation: -1 }), /Invalid orientation/);
});

test("shortest group-control solution requires exactly four actions", () => {
  const start = createStart();
  assert.equal(shortestSolution(start, 3), null);
  const path = shortestSolution(start, 4);
  assert.ok(path);
  assert.equal(path.length, 4);
  let board = start;
  for (const { axis, group } of path) board = turnGroup(board, axis, group);
  const { won, powered } = tracePower(board);
  assert.equal(won, true);
  assert.ok(powered.has(15));
  assert.equal(tracePower(start).won, false, "the start must never be a one-click win");
  assert.deepEqual(shortestSolution(SOLVED, 0), []);
});

test("row and column turns commute; exhaustive four-move wins are 24 permutations", () => {
  const start = createStart();
  const groups = [];
  for (const axis of ["row", "column"]) {
    for (let group = 0; group < SIZE; group++) groups.push({ axis, group });
  }
  const signature = tiles => tiles.map(tile => tile.orientation).join("");
  for (const first of groups) {
    for (const second of groups) {
      const a = turnGroup(turnGroup(start, first.axis, first.group), second.axis, second.group);
      const b = turnGroup(turnGroup(start, second.axis, second.group), first.axis, first.group);
      assert.equal(signature(a), signature(b),
        "all group moves commute, including intersecting row/column turns");
    }
  }

  const winners = [];
  // Enumerate sequences, not just distinct end states: 8^4 = 4096 attempts.
  function enumerate(board, steps) {
    if (steps.length === 4) {
      if (tracePower(board).won) winners.push(steps.map(step =>
        step.axis + ":" + step.group));
      return;
    }
    for (const step of groups) {
      enumerate(turnGroup(board, step.axis, step.group), [...steps, step]);
    }
  }
  enumerate(start, []);
  assert.equal(winners.length, 24,
    "exactly twenty-four four-turn input sequences win");
  const normalized = new Set(winners.map(steps => [...steps].sort().join(",")));
  assert.deepEqual([...normalized], ["column:1,column:3,row:0,row:2"],
    "every shortest win is a permutation of the same four group controls");
});

test("invalid control inputs cannot mutate the puzzle or confuse the solver", () => {
  const start = createStart();
  for(const fn of [
    ()=>turnGroup(start, "diagonal", 1),
    ()=>turnGroup(start, "row", -1),
    ()=>turnGroup(start, "column", 4),
    ()=>turnGroup(start, "row", 1, 1.5),
    ()=>turnGroup(start.slice(0, 15), "row", 1),
    ()=>tracePower(start.slice(0, 15)),
    ()=>shortestSolution(start, -1),
  ]) assert.throws(fn, RangeError);
  assert.equal(tracePower(start).won, false);
});
