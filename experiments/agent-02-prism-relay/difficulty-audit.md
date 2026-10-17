# Prism Relay — authored puzzle-depth audit

**Author:** agent-02 (AI agent) · 2026-10-17  
**Scope:** All four shipped circuits on their initial grids. This is a reproducible **rules-based analysis**, not a human playtest or a claim about fun.

The basic game tests establish shortest rotations of **1, 2, 3, 3**. This audit enumerates every mirror-orientation combination and counts the outcomes.

## Results

| Circuit | Mirrors | Initial beam mirrors | One-flip changes | Minimum flips | Unique optimal orientation sets | Winning orientations / total | Distinct beam paths |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A Turn of Light | 3 | 1 | 1 | 1 | 1 | 1 / 8 | 4 |
| The High Road | 4 | 1 | 1 | 2 | 1 | 1 / 16 | 5 |
| Down and Around | 5 | 1 | 1 | 3 | 1 | 1 / 32 | 6 |
| Crossed Signals | 9 | 3 | 3 | 3 | 1 | 64 / 512 | 8 |

Each level has **one shortest final mirror configuration**. That is not the same as having only one possible click order. The first three levels have only one winning final orientation each.

Circuit 4 has nine mirrors yet shares circuit 3's three-rotation optimum. It permits many winning final configurations, suggesting that some mirror orientations are incidental once a successful route is found. Extra visible mirrors may increase perceived search difficulty, or merely create distraction; only human observation can answer that.

## Definitions

- **Mirrors:** slash or backslash cells in the initial grid.
- **Initial beam mirrors:** mirrors touched by the zero-rotation beam.
- **One-flip changes:** mirror cells whose individual rotation alters the *ordered cell path* of that beam.
- **Winning orientation sets:** assignments to *all* mirrors that reach the receiver; total possibilities = 2 raised to the mirror count.
- **Unique optimal orientation sets:** winning final assignments requiring the minimum number of mirrors flipped from the starting grid.
- **Distinct beam paths:** unique ordered cell-path sequences across every orientation, whether they reach the receiver or not.

## Reproduce

From the repository root with Node.js 22+:

    node experiments/agent-02-prism-relay/difficulty-audit.mjs
    node --test experiments/agent-02-prism-relay/difficulty-audit.test.mjs

The script uses the shipped pure puzzle rules: traceBeam, rotateMirror, solvePuzzle and validateGrid. Enumeration is bounded to 15 mirrors by default, to avoid unbounded work.

## Human playtest follow-up

Compare perceived challenge of circuits 3 and 4 **before exposing these numerical findings**. Which choices seemed meaningful? Did touching a mirror that did not affect the current beam feel exploratory or confusing? These questions are voluntary; no human observation has been obtained through this audit.

Do not reorder levels or add decoys merely from minimum-rotation counts. This report is a technical baseline for player feedback, not a choice of the company's flagship.

— agent-02 (AI agent)
