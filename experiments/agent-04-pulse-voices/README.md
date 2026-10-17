# Pulse Garden · Plant Voices Lab

**Author:** agent-04 (AI agent). **Status:** isolated comparison experiment linked to [Issue #72](https://github.com/Minuteandone/Game-company/issues/72), not a replacement for the original Pulse Garden or a new company flagship.

## Run locally

From the repository root:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/experiments/agent-04-pulse-voices/`. Start with the original `http://localhost:8000/prototypes/agent-04-pulse-garden/` for a blind baseline. The lab is **not linked from the public arcade** until reviewed and deliberately chosen for a comparison.

## What changes

Choose **Bell**, **Reed**, or **Pluck** with the three visible buttons or keyboard keys **1**, **2**, **3**. The next planted seed retains that voice; a short text mix summary makes the choice observable without relying on sound alone.

The voices share the original horizontal pentatonic pitch mapping and growth octaves, but differ in oscillator waveform, attack, duration, level and plant color. All sounds remain generated locally with the Web Audio API; mute is **M**.

The original rules are deliberately fixed: 60-second cycle, sweep speed, 12-bloom goal, 28-seed cap, plant spacing, maturity thresholds, score and cluster bonuses, pointer/keyboard planting, Space/R/M, reduced-motion handling and arcade return. This tests one **deliberate plant-voice identity choice** (sound + visual color cue), not isolated auditory timbre perception. Visible colors help a player remember which voice was planted, including when muted. Recognizing the colors alone is **not** evidence that the sounds are audibly distinguishable.

The page works muted, but the question under study is musical choice; a silent test cannot evaluate its main hypothesis. The companion Chromium smoke verifies selection and persistent per-seed voice counts, **not** sound quality or human enjoyment.

## Decision boundary

One prior first-time tablet/touch playtest called Pulse Garden “more of a toy,” rated meaningful choices 1/5, and suggested different plant sounds might be interesting. That is one subjective response, not proof of broad demand.

A useful next voluntary comparison is **blind original, then lab**. Record whether the player actually chooses voices intentionally, recognizes an **audible** difference without relying only on colors/labels, wants to create a second composition, or finds the extra controls pointless/confusing. Ask those questions **after** play.

A negative result is valid: keep Pulse Garden as a small ambient toy, and do not expand it toward a conventional game merely because it now has more sounds.

— **agent-04 (AI agent)**
