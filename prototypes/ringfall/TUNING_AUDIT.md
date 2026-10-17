# Ringfall tuning audit — spawn pressure

**Author:** agent-03 (AI agent) · 2026-10-17

This is a small mathematical audit of Ringfall's current spawn curve. It is a **design aid, not a substitute for playtesting**. The game is random, targets overlap in time, pointer steering behaves differently from keyboard steering, and player strategy matters.

The purpose is to turn “difficulty ramps up” into a few inspectable expectations that can be compared with actual play feedback.

## Current shipped constants

From `prototypes/ringfall/index.html`:

- hazard probability: `min(0.18 + elapsed / 150, 0.42)`
- base spawn interval: `max(0.26, 0.92 - elapsed * 0.009)`
- random interval multiplier: uniform from `0.78` through `1.23`
- keyboard turn speed: `2.7 rad/s`
- collector half-arc: `0.24 rad`

The interval multiplier has mean `(0.78 + 1.23) / 2 = 1.005`.

For a rough expectation at time `t`:

```
mean interval ≈ base interval × 1.005
total spawns/sec ≈ 1 / mean interval
circle spawns/sec ≈ total spawns/sec × (1 - hazard probability)
hazard spawns/sec ≈ total spawns/sec × hazard probability
```

## Expected pressure curve

| Elapsed | Hazard chance | Mean interval | All spawns/sec | Circle spawns/sec | Hazard spawns/sec |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0 s | 18% | 0.925 s | 1.08 | 0.89 | 0.19 |
| 15 s | 28% | 0.789 s | 1.27 | 0.91 | 0.35 |
| 30 s | 38% | 0.653 s | 1.53 | 0.95 | 0.58 |
| 36 s | 42% cap | 0.599 s | 1.67 | 0.97 | 0.70 |
| 45 s | 42% | 0.518 s | 1.93 | 1.12 | 0.81 |
| 60 s | 42% | 0.382 s | 2.62 | 1.52 | 1.10 |
| ~73 s | 42% | 0.261 s floor | 3.83 | 2.22 | 1.61 |

Two distinct phases fall out of the formulas:

1. **0–36 seconds:** the circle workload stays close to one per second while much of the added pressure comes from hazards becoming more common.
2. **36–73 seconds:** hazard probability has stopped growing, so the shrinking interval drives both circle and hazard rates sharply upward.
3. **After ~73 seconds:** the spawn interval reaches its floor and expected arrival rates plateau.

That shape is not inherently good or bad; it is simply more specific than “the game gets faster.”

### Spawn rate is not ring-crossing rate

The table above describes **objects created per second**, because that is what the spawn interval directly controls. It does not literally describe how many objects cross the collector ring at the same elapsed timestamp.

Each spawned object starts at `hypot(W, H) * 0.58` and receives a fixed inward speed based on the elapsed time when it was created. Its travel time to the collector ring therefore depends on:

- viewport geometry;
- its random speed component;
- the elapsed-time speed ramp.

Early objects can spend several seconds travelling inward, while later objects travel faster. The stream reaching the ring is therefore delayed relative to the spawn stream, and the increasing object speed can compress some of that delay during the ramp.

For late-run **steady-state pressure**, spawn rate remains a useful input-rate approximation. For claims about the exact second when the collector becomes overloaded, it is not enough by itself. A future simulation or real playtest should measure actual ring-crossing times rather than relabel the spawn curve as arrivals.

## Viewport-dependent preview time

Viewport geometry changes how long a spawned object remains visible before reaching the collector ring.

The shipped game uses:

```
spawn radius = hypot(width, height) × 0.58
collector radius = max(100, min(width, height) × 0.31)
mean object speed ≈ 99 + min(elapsed × 1.7, 155) px/sec
```

The mean-speed estimate uses the midpoint of the random `0–28 px/sec` speed term.

That gives these approximate spawn-to-ring travel times:

| Viewport | 0 s | 36 s | 60 s | 73 s |
| --- | ---: | ---: | ---: | ---: |
| 900×700 | 4.49 s | 2.77 s | 2.21 s | 1.99 s |
| 360×640 | 3.17 s | 1.96 s | 1.56 s | 1.41 s |

In this comparison, the narrow viewport provides roughly **29% less preview time** throughout the run.

This is a meaningful tuning variable even though the responsive layout itself is technically correct. The existing browser smoke test proves Ringfall fits at narrow width; it does **not** prove identical difficulty across aspect ratios.

A useful device-playtest question is therefore:

> **At the same elapsed point in a run, does narrow/tall play feel noticeably more rushed than desktop play because targets reach the collector ring sooner?**

No viewport-specific balance change is justified from this calculation alone.

## Crude keyboard travel model

For two random angles on a circle, the expected shortest angular distance between them is `π / 2`.

The collector does not need to center exactly on a circle: its half-arc is `0.24 rad`. If target separation `D` is treated as uniform on `[0, π]`, a rough expected required movement is:

```
E[max(D - 0.24, 0)] = (π - 0.24)² / (2π) ≈ 1.34 rad
```

At `2.7 rad/s`, that is about:

```
1.34 / 2.7 ≈ 0.50 seconds of average keyboard travel per independent random target
```

or roughly **2.0 random target repositions per second** under unrealistically ideal conditions.

The expected circle **spawn** rate reaches about 2.0/sec around **70 seconds**.

### Important limitations

This is **not** a proof that keyboard play becomes impossible at 70 seconds.

The model ignores:

- signals being visible before they reach the collector ring;
- choosing movement based on multiple future targets instead of one-at-a-time reaction;
- targets sometimes appearing near the current angle;
- hazards changing the desirable path;
- pointer/touch steering;
- overlapping arrival windows;
- player prediction and route planning;
- mistakes and recovery;
- the fact that survival is supposed to become unsustainable eventually in an arcade run.

It is best treated as a tuning hypothesis.

## Human playtest question

The useful question is now unusually specific:

> **Around the 65–80 second range, does Ringfall's endgame feel excitingly unsustainable, or does keyboard control begin to feel mechanically unable to service the incoming circle rate?**

Useful evidence would include:

- approximate run duration before core loss;
- whether the player understood *why* they failed;
- whether failures felt caused by a bad choice, slow reaction, or an impossible queue of targets;
- whether pointer and keyboard players report materially different late-run ceilings;
- whether the player voluntarily restarts after reaching that pressure range.

## Current recommendation

Do **not** change the spawn curve from this audit alone.

If human runs consistently end around the predicted late-pressure transition and players describe the failure as unreadable or impossible rather than tense, useful follow-up experiments could adjust one variable at a time:

- raise the interval floor;
- slow the post-36-second interval ramp;
- widen the collector arc;
- raise keyboard angular speed;
- alter hazard/circle composition.

If players enjoy the late-run collapse and voluntarily retry, the intentionally unsustainable curve may already be doing its job.

The audit exists so a future tuning change can name the pressure it is trying to change instead of adjusting constants by feel alone.

— **agent-03 (AI agent)**
