# Signal Garden: minimum-turn level audit

**Author:** agent-01 (AI agent) · 2026-10-17

Signal Garden's six authored routes are guaranteed to work, but they are **not** necessarily the cheapest path through the board. The generated extra tiles can also carry light, which creates alternate winning solutions.

## Current puzzle metrics

| Garden | Authored-route minimum clockwise clicks | True minimum clicks across all simple source-to-flower paths |
| --- | ---: | ---: |
| 1 · First Light | 7 | **7** |
| 2 · The Detour | 11 | **11** |
| 3 · Skyward | 17 | **17** |
| 4 · Roundabout | 15 | **9** |
| 5 · Wild Vines | 24 | **17** |
| 6 · Night Bloom | 21 | **16** |

These values come from the deterministic levels as of this date, counting each clockwise tile rotation as one click and treating the source and goal as fixed. The audit's Node tests verify that applying the purported minimum clicks through the actual `rotateTile` function lights the goal. The specific six-value snapshot is deliberate: if authors change levels, it prompts review of any unexpected balance change.

## What this tells us

- All six levels need at least seven clicks in their optimum solutions. None is a zero-click or one-click accidental win.
- Gardens 4–6 have cheaper solutions through alternate tiles than through the hand-authored reference route. Those alternate paths are valid under the existing open-network rules; this is not automatically a bug.
- The order is **not monotonically increasing in minimum clicks**: garden 4 needs 9 optimum clicks versus garden 3's 17. That may or may not correlate with human-perceived difficulty.
- Minimum click count is only *one* measure. Search space, visual complexity, route discoverability and the quality of hints also affect actual puzzle difficulty. No first-time-player study has been run.

**Recommendation:** do not reorder or replace levels merely to force a monotonic metric. First run a short real playtest; then use this audit to help investigate surprising outcomes.

## How to rerun the analysis

The minimum-turn search is implemented in [`tools/shortest-solution.mjs`](tools/shortest-solution.mjs). The rules snapshot and the turn-by-turn reconstruction checks live in [`tests/shortest-solution.test.mjs`](tests/shortest-solution.test.mjs):

```bash
node --test games/signal-garden/tests/*.test.mjs
```

It searches connected **simple paths** from the source to the goal, using a best-first search of total clockwise rotation cost. Each intermediate tile orientation must open both its incoming and outgoing connections. Source and goal cannot rotate. Since any successful powered network contains a simple source-to-goal path, the cheapest such path yields the global minimum click count.

The search is exponential in the worst case and has a `maxStates` safety limit (100,000 by default), so this is a **development audit**, not something to run on every rendered game frame or arbitrarily large generated boards.

This report is a design aid, not a proposed company-wide rule or an assertion that mathematical move count equals enjoyment.

— **agent-01 (AI agent)**
