---
title: "Widen spawn and cull bounds"
summary: "Games decide what exists and what is drawn using a 4:3 window. Widen those windows to the real view, but keep scripted encounters on their original timing."
pageType: "guide"
tags: ["Tricks", "Widescreen", "Spawning", "Culling"]
repos:
  - "https://github.com/mstan/MegaManXSNESRecomp"
  - "https://github.com/mstan/MegaManX4Recomp"
updated: "2026-11-04"
---

A wider picture is not enough. Most games decide which enemies and items exist, and which sprites get drawn, by checking them against the original screen. In a wide view, the margins look empty, enemies pop in at the old 4:3 line, and sprites vanish before they leave the screen.

**Widening the bounds** makes those checks use the real view.

## What bounds are there?

| Bound | What it decides | What goes wrong if it stays 4:3 |
|---|---|---|
| Activation or spawn | When an object starts to exist | Enemies appear late, inside the view |
| Despawn or removal | When an object is deleted | Objects vanish while still visible |
| Draw cull | Whether a live object is drawn | Objects flicker or disappear near the edge |
| Sprite clip | Whether a sprite's screen X is in range | Sprites wrap to the other side |

Find each one in the game's code. Widen it by the current left and right margins, on the side each margin is on.

## Spawning is a simulation change

Drawing is presentation. Spawning is not. When an enemy spawns changes which script runs, which memory slot it gets and which random numbers are used. Treat a widened spawn window as a correctness change, and test it like one.

Some objects must keep their original timing:

- **Bosses and scripted encounters.** Their setup often locks the camera or starts a room event. Spawning early can reorder that against the room's own triggers.
- **Allocation-sensitive scripts.** Some objects expect a free slot at a known moment. An earlier spawn can take it.

Mega Man X splits its spawn scan in two. Ordinary enemies use an early, widened pass. Bosses, scripted encounters and a few known objects keep the native pass and native timing.

## How do you keep state consistent?

- **Keep one cursor per pass.** If the widened and native scans walk the same spawn list, give each its own position, so one pass cannot skip a record for the other.
- **Resync after a reset.** When the player dies and the level restarts from a checkpoint, the game rebuilds its own cursor. Rebuild the widened one from it.
- **Derive everything from game memory.** Then the result is the same after a save state load or a rollback, which keeps netplay and rewind deterministic.

## How do you keep the faithful path?

At 4:3 both margins are zero. Every widened bound reduces to the original one. Check that with the same route at 4:3 before and after the change.

## What goes wrong?

| Problem | What to do |
|---|---|
| A boss fight starts early or softlocks. | Keep that object on native spawn timing. |
| Enemies spawn inside walls. | The window was widened too far, or on the wrong side. |
| Collision happens from across the screen. | A margin hitbox wrapped into the 4:3 area. Keep the full signed position. |
| The game runs out of sprites. | More visible objects means more sprites. Some ports raise the sprite limit in the renderer only, for presentation. |

## Where is it used?

- [Mega Man X](https://github.com/mstan/MegaManXSNESRecomp) on snesrecomp. Split wide and native spawn passes, per-pass cursors, resync on death, and expanded sprite capacity with its widescreen mod.
- [Mega Man X4](https://github.com/mstan/MegaManX4Recomp) on psxrecomp. Its experimental 16:9 mode widens the background tile window plus actor activation, despawn and draw-cull bounds.

The general steps for culling, wrapping and spawning are also in [Add widescreen](/docs/guides/add-widescreen).
