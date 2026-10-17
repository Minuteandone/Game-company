/**
 * Exhaustive eight-state audit for the ORIGINAL Forked Spectrum 7x7 lab.
 * Author: agent-02 (AI agent). This tests meaningful mechanical structure,
 * not player enjoyment. It intentionally does not modify puzzle rules.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { BOARD, traceSpectrum, rotateMirror, findShortestSolution } from "./logic.mjs";

const MIRRORS = Object.freeze([
  { x: 3, y: 1, role: "cyan-turn" },
  { x: 5, y: 1, role: "cyan-gate" },
  { x: 3, y: 5, role: "amber-turn" }
]);

function gridForMask(mask) {
  let grid = BOARD;
  for (let i = 0; i < MIRRORS.length; i++) {
    if (!(mask & (1 << i))) continue;
    const mirror = MIRRORS[i];
    grid = rotateMirror(grid, mirror.y, mirror.x);
  }
  return grid;
}

function outcome(mask) {
  const result = traceSpectrum(gridForMask(mask));
  return { mask, cyan: result.cyan.reached, amber: result.amber.reached, won: result.won };
}

const STATES = Array.from({ length: 1 << MIRRORS.length }, (_, mask) => outcome(mask));

test("board has exactly three independently rotatable mirrors and eight configurations", () => {
  const found = [];
  BOARD.forEach((row, y) => [...row].forEach((tile, x) => {
    if (tile === "/" || tile === "\\") found.push({ x, y });
  }));
  assert.deepEqual(found, MIRRORS.map(({ x, y }) => ({ x, y })));
  assert.equal(STATES.length, 8);
  assert.equal(new Set(Array.from({ length: 8 }, (_, mask) => gridForMask(mask).join("\n"))).size, 8);
});

test("exhaustive state table: cyan requires top turn and unchanged gate; amber requires bottom turn", t => {
  const expected = [
    [false, false], // 000: no mirrors rotated
    [true,  false], // 001: top cyan turn
    [false, false], // 010: turn gate without routing beam to it
    [false, false], // 011: top turn + gate deflects cyan away
    [false, true ], // 100: bottom amber turn
    [true,  true ], // 101: top + bottom (unique win)
    [false, true ], // 110: gate + bottom
    [false, true ]  // 111: all three
  ];
  assert.deepEqual(STATES.map(({ cyan, amber }) => [cyan, amber]), expected);
  for (const state of STATES) {
    assert.equal(state.won, state.cyan && state.amber);
    t.diagnostic(state.mask.toString(2).padStart(3, "0") +
      " (gate,bottom,top bits are mask 2,4,1): cyan=" + state.cyan +
      " amber=" + state.amber + " win=" + state.won);
  }
  assert.deepEqual(STATES.filter(state => state.won).map(state => state.mask), [5],
    "the sole solution is top and bottom rotated, gate unchanged");
});

test("colored goals are separable across all board states, not coupled planning", () => {
  for (let mask = 0; mask < 8; mask++) {
    assert.equal(outcome(mask).cyan, outcome(mask ^ 4).cyan,
      "bottom amber mirror never affects cyan success in any state");
    assert.equal(outcome(mask).amber, outcome(mask ^ 1).amber,
      "top cyan mirror never affects amber success in any state");
    assert.equal(outcome(mask).amber, outcome(mask ^ 2).amber,
      "right cyan gate never affects amber success in any state");
  }
  assert.equal(outcome(1).cyan, true);
  assert.equal(outcome(3).cyan, false, "third mirror is a conditional cyan gate, not an inert decoy");
});

test("two flips suffice; exactly two ordered shortest winning sequences exist", () => {
  const solution = findShortestSolution(BOARD);
  assert.deepEqual(
    solution.map(({ x, y }) => x + "," + y).sort(),
    ["3,1", "3,5"]
  );
  const winningSequences = [];
  for (let first = 0; first < MIRRORS.length; first++) {
    for (let second = 0; second < MIRRORS.length; second++) {
      let grid = BOARD;
      for (const index of [first, second]) {
        const mirror = MIRRORS[index];
        grid = rotateMirror(grid, mirror.y, mirror.x);
      }
      if (traceSpectrum(grid).won) winningSequences.push([first, second]);
    }
  }
  assert.deepEqual(winningSequences, [[0, 2], [2, 0]]);
  assert.equal(STATES.filter(state => state.won && state.mask.toString(2).replaceAll("0", "").length < 2).length, 0);
});
