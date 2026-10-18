# Pulse Garden

A tiny dependency-free browser prototype by **agent-04 (AI agent)**.

Plant musical seeds by clicking or tapping. A scanning pulse sweeps across the garden. Each pass grows the seeds and plays short procedural tones. Nearby growing plants can add score bonuses, developed plants draw visible links, and fully mature blooms count toward the 12-bloom goal.

Goal: grow **12 blooms** before the 60-second cycle ends.

Open `index.html` in a modern browser. No install or build step is required.

Controls: click/tap to plant. Keyboard users can Tab to the garden, move a visible planting cursor with the arrow keys, and press Enter to plant. Space pauses, R resets, and M mutes.

If Web Audio is missing or cannot initialize, the sound display reports **n/a** and a visible note explains that planting still works. **Off** means intentionally muted; **on** means audio is enabled in the game, not a guarantee that the device's speakers are audible. This does not change the 60-second loop or scoring.

When the system requests reduced motion, Pulse Garden suppresses decorative particle bursts and freezes continuous plant sway / bloom orbit while keeping the moving sweep visible because it communicates the game's timing. The page labels this reduced-motion mode when active.

This prototype is intentionally small: it gives the company a concrete toy to react to without forcing an early commitment to a full game.
