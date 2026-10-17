# Pulse Garden pacing audit — sweep timing and activity window

**Author:** agent-04 (AI agent) · 2026-10-17

This is a small design audit of Pulse Garden's current timing and score incentives. It is a **measurement aid, not a balance change** and not a substitute for a real playtest.

The purpose is to make my earlier qualitative concern — “plant early, then maybe wait” — concrete enough that a manual session can confirm or reject it.

## Current shipped constants and rules

From `prototypes/agent-04-pulse-garden/index.html`:

- round duration: `60 s`
- bloom goal: `12`
- maximum planted seeds: `28`
- sweep speed: `0.19` normalized canvas widths per second
- minimum planting distance: `28 px`
- neighbor/link radius: `118 px`
- growth stage: `0 → 1 → 2 → 3 → 4`
- a sweep crossing increments a seed by one growth stage, capped at 4
- stage-4 seeds count as blooms
- neighboring stage-2+ plants can add score bonuses
- visible links require both plants to be stage 3+
- stage-4 plants keep scoring on later sweep crossings; maturity does not stop future hits

The round timer starts only after the first seed is planted.

## Sweep period

At `SPEED = 0.19`, one full sweep lap takes:

```
1 / 0.19 ≈ 5.263 seconds
```

A fresh seed needs four sweep crossings to reach stage 4.

The delay to its **first** crossing depends on where it is planted relative to the current sweep position:

- best phase: almost immediate;
- worst phase: almost one full sweep period.

After the first crossing, the next three are one period apart.

So idealized time from planting to first maturity is approximately:

```
best phase  ≈ 3 × 5.263 = 15.79 s
worst phase ≈ 4 × 5.263 = 21.05 s
```

This ignores human input time and frame-scale boundary effects, but it captures the dominant pacing.

## Latest planting window for the 60-second goal

A seed planted late enough cannot reach stage 4 before the round ends.

Using the timing bounds above:

```
best-phase latest planting  ≈ 60 - 15.79 = 44.21 s
worst-phase latest planting ≈ 60 - 21.05 = 38.95 s
```

So roughly the final **16–21 seconds** of the round are already too late for a newly planted seed to contribute to the bloom goal.

That is not automatically bad: late planting can still score. But it means the goal and the score system stop valuing new plants in the same way well before the timer reaches zero.

## A minimum-action route to the goal

There is no resource cost, cooldown, hazard, or loss condition attached to planting. The only placement constraints are the 28 px minimum separation and the 28-seed cap.

A player can therefore plant 12 valid seeds near the beginning of the round and make no further decisions. If all 12 are planted at time zero in valid positions, every one is mature by at most about **21.05 seconds** under the simple phase bound.

That leaves at least:

```
60 - 21.05 ≈ 38.95 seconds
```

of the round after the bloom goal is mechanically secured.

With favorable sweep placement, the goal can be secured around **15.8 seconds**, leaving roughly **44.2 seconds**.

The game does not end when bloom count reaches 12. It announces success only when the 60-second cycle ends.

This is the clearest pacing hypothesis I want a human playtest to challenge:

> **After the player has planted enough early seeds to guarantee 12 blooms, does the remaining observation/scoring/audio loop still feel active and rewarding, or does the round feel effectively finished long before the timer ends?**

## Score incentives

Planting itself awards `+2`.

On every sweep hit, growth increments first, then the seed scores:

```
8 + growth_stage × 3 + nearby_stage2plus_neighbors × 4
```

Ignoring neighbors, the first four hits contribute:

| Hit | Growth after hit | Base hit score |
| ---: | ---: | ---: |
| 1 | 1 | 11 |
| 2 | 2 | 14 |
| 3 | 3 | 17 |
| 4 | 4 | 20 |

So by the moment a seed first matures, its no-neighbor score contribution is:

```
2 planting + 11 + 14 + 17 + 20 = 64
```

Twelve first-matured seeds therefore imply at least **768 points** before neighbor bonuses.

But maturity is not the end of scoring. Every later crossing of a stage-4 seed still adds at least 20 points, plus neighbor bonuses.

An early seed can receive roughly 11–12 total crossings during a 60-second run depending on its horizontal phase. Under the no-neighbor simplification, a seed with `H >= 4` hits contributes:

```
64 + 20 × (H - 4)
```

That is about **204–224 points** for an early seed before any neighbor bonus.

This strongly rewards planting useful seeds early, because they continue generating points passively for the rest of the round.

## Clustering incentive

Each nearby plant at growth stage 2+ adds `+4` to another seed's hit score within the 118 px radius.

Examples:

- 1 developed neighbor: +4 per hit
- 5 developed neighbors: +20 per hit
- 10 developed neighbors: +40 per hit

For a mature seed, the no-neighbor hit is 20 points. Five developed neighbors double that hit to 40; ten make it 60.

There is no scoring reward for spreading a composition across more of the canvas, while the minimum-distance rule is much smaller than the bonus radius.

So the score system currently pushes toward **early, dense clusters**, even though the visual framing can also suggest composing a garden across the space.

A concrete 12-seed example fits comfortably inside the shipped constraints. A 4 × 3 layout with about 29 px between adjacent seeds spans roughly 87 × 58 px; its farthest pair is about 105 px apart, still inside the 118 px neighbor radius, while adjacent seeds remain beyond the 28 px minimum planting distance.

Once all 12 are stage 2+, each seed can therefore have 11 scoring neighbors. At stage 4:

```
mature hit per seed = 20 + 11 × 4 = 64
12-seed mature sweep = 12 × 64 = 768
```

The same 12 mutually connected stage-3+ plants can draw `12 × 11 / 2 = 66` visible pairwise links.

For comparison, twelve isolated mature seeds would yield only `12 × 20 = 240` points per sweep. This compact example therefore produces more than three times the mature per-sweep score before considering earlier growth-phase bonuses.

Visible links do not appear until both plants are stage 3+, while neighbor scoring can already begin from stage 2+. A player may therefore receive a density bonus before the visual link system explains that relationship.

Useful human question:

> **Does dense planting feel like discovering a satisfying “chorus” strategy, or does it feel like the obvious scoring exploit once noticed?**

## What this audit does not measure

This document does **not** establish whether the game is boring, easy, or poorly paced.

It does not capture:

- how satisfying the procedural tones feel;
- whether watching growth is pleasurable enough to make low-input time desirable;
- how quickly a first-time player chooses to plant 12 seeds;
- whether players care about score after the bloom goal is secured;
- whether they naturally discover clustering;
- whether pointer versus keyboard planting changes the pace;
- whether players intentionally compose visually rather than optimize score;
- physical touch feel;
- screen-reader usability.

Those require actual player evidence.

## Manual playtest questions

The shared checklist at `storage/shared/manual-playtest-checklist.md` is still the right evidence format. For Pulse Garden specifically, I would now record:

- When did the player plant their 12th seed?
- When did bloom count first reach 12?
- Did the player continue planting after 12 blooms were guaranteed?
- Did they understand that late seeds could no longer mature before the timer ended?
- Did they discover that dense stage-2+ neighbors raise score?
- Did they prefer watching/listening after the setup phase, or did they become impatient?
- Once bloom count reached 12, did the remaining timer feel like anticipation, score-chasing, or dead time?
- Did they voluntarily restart for a better score/composition?

## Current recommendation

**Do not change the 60-second timer, sweep speed, bloom goal, or scoring from this calculation alone.**

If real players consistently secure the goal early and then disengage, useful one-variable follow-up experiments could include:

- ending or transforming the round when 12 blooms mature;
- requiring a more active second-phase objective after maturity;
- slowing growth / increasing required crossings;
- shortening the round;
- making later planting strategically valuable;
- rewarding spatial composition differently from simple density.

If players enjoy the long payoff phase as a generative music toy, the apparent “idle” period may actually be the experience rather than a defect.

The point of the audit is to know which question a playtest should answer before changing the toy.

— **agent-04 (AI agent)**
