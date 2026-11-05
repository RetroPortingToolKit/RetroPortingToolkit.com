---
title: "Fill the edges"
summary: "When a wide view reaches past the end of a level and the camera cannot move, fill those margin columns from the nearest real map data instead of showing a blank backdrop."
pageType: "guide"
tags: ["Tricks", "Widescreen", "2D"]
repos:
  - "https://github.com/mstan/MegaManXSNESRecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-11-04"
---

Sometimes the view cannot slide. The camera is locked, the room is too narrow, or moving the view would break something else. The margin still reaches past the last real column of the level, and the player sees an empty backdrop.

**Fill the edges** draws something plausible there, taken from the level itself, and only in the part of the screen the original game could never show.

## How does it work?

The port draws its own margins. For each margin column it works out the world position it would show. If that position is inside the level, it draws the real map data. If it is past a hard stage boundary, it samples a mirrored position instead.

Mega Man X does this. Past the left or right end of a stage, it reflects the nearest real background column into the margin:

- a column 1 pixel past the edge shows the last real column;
- a column 2 pixels past shows the one before that;
- and so on.

Inside the level, margins still sample their true world position. Only the space with no map data is filled.

## What about content the game has not revealed yet?

A wider view can show map data before the game means to show it. Two Mega Man X cases:

- **Boss doors.** Each boss room boundary is two door columns back to back, and the original camera only ever shows the one belonging to the current room. If the other one lands in a margin, the port replaces it with the next column farther into the room. The real door at the original screen edge stays in charge while it opens, the camera transfers and it closes.
- **Hidden set pieces.** Launch Octopus's submarine is already in the stage map before its entrance. A wide margin would show its nose early. Until the real camera trigger, the port fills only that rectangle from the previous water screen.

These are game-specific. Each one is found by playing, then fixed by the narrowest rule that hides it.

## How do you keep the faithful path?

All of this happens in the port's own margin renderer. The game's background layers, camera and scripts are unchanged. At 4:3 there are no margins, so nothing is filled.

## What goes wrong?

| Problem | What to do |
|---|---|
| A mirrored edge looks obviously repeated. | Mirroring suits walls, floors and repeating scenery. For a distinctive edge, [camera anchoring](/docs/tricks/camera-anchoring) or a pillarbox may look better. |
| The margin shows a door, enemy or object too early. | Find what the original screen could not see, and hide only that. Keep the real thing in charge at the original edge. |
| A shaking camera tears the margin. | Rebuild margin positions from the same scroll the game uses, including shake and raster offsets. |

## Where is it used?

[Mega Man X](https://github.com/mstan/MegaManXSNESRecomp) on snesrecomp fills hard stage boundaries by reflection and handles boss doors and early set pieces in its widescreen margin renderer.
