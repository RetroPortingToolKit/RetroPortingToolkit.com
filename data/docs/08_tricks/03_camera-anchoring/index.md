---
title: "Camera anchoring"
summary: "Near a room or stage edge, a centered wide view shows empty space the game never drew. Slide the wide view inward so the missing width moves to the other side, and do it in presentation only."
pageType: "guide"
tags: ["Tricks", "Widescreen", "Camera", "2D", "2.5D"]
repos:
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/MegaManZeroRecomp"
updated: "2026-11-05"
---

In a side-scrolling game, the original camera stops at the edge of a room. On the original screen that works: the edge of the screen meets the edge of the room.

Widen the view and center it on the original camera, and the extra margin hangs past that edge. There is nothing there. The game never built it, so the player sees blank space, a repeated backdrop or garbage.

**Camera anchoring** keeps the wide view inside the room. Near an edge, the view slides inward. The width it cannot show on one side is shown on the other side instead.

## Where has it shipped?

Mega Man Maverick Hunter X on PSPLLR, the PSP Low Level Recompiler. Its 0.2.0 release anchors the camera at stage edges, with Fit to screen on by default from the PSP's 480 by 272 up to 32:9. The release notes list camera-edge coverage in the Spark Mandrill, Launch Octopus and Sting Chameleon stages. The project is private for now, so there is no public link.

Maverick Hunter X draws its stages as 3D polygons seen from the side, so the example below is in the game's own world units, not pixels. The method is the same for a 2D game with tile columns.

## A worked example

The game's camera keeps three numbers the port can read:

- its center X,
- the stage's authored left and right bounds,
- a half-width of 90 units, which it uses to clamp the center inside those bounds.

The original projection actually shows about 85.11 units on each side of the center. At the left wall, the camera clamps to X = 90, so the screen shows X = 4.89 to 175.11.

Now open a 21:9 window. The view is 1.32 times wider than the PSP's, so it shows about 112.53 units each side. That is 27.42 more on each side.

| Policy | Center | X shown | What the player sees |
|---|---|---|---|
| Original PSP view | 90 | 4.89 to 175.11 | The game as made |
| Centered, 21:9 | 90 | -22.53 to 202.53 | 22.53 units past the wall, where nothing was built |
| Anchored, 21:9 | 117.42 | 4.89 to 229.96 | The same left edge as the original. All the new width is on the right, where the stage continues |

At 32:9 the extra width is 86.37 units each side. Anchored, the view still starts at 4.89 and now reaches 347.85.

The anchor is the camera center clamped between `left + 90 + margin` and `right - 90 - margin`, where the margin is the extra width on each side. As the player walks away from the wall, the game's camera passes that lower limit and the anchored and centered views become the same. The same thing happens in reverse at the right wall.

Note the 85.11, not the 90. The game clamps with 90 but its projection shows a little less. Using the visible width keeps the same small gap at the wall that the original screen had.

If a room is narrower than the wide view, no position fits. Center the view on the middle of the room. Or fall back to the original width for that room.

## How does it work?

1. **Find the room bounds from the game's own data.** In Maverick Hunter X, they are the camera's authored left and right bounds. Do not guess them from what is on screen.
2. **Compute the anchored center.** Clamp the game's camera center as above.
3. **Move the view, not the camera.** At the game's original look-at call, Maverick Hunter X shifts the local eye and target X by the same amount. The camera and player structures are never written.
4. **Only touch the normal view.** The shift applies only to the ordinary side-on gameplay camera with its own clamp in force. Scripted cameras, boss reveals and cutscenes keep the original view.
5. **Leave screen-space things alone.** The HUD stays anchored to the screen edges. Dialogue and menus keep their own placement. See [HUD anchoring](/docs/tricks/hud-anchoring).
6. **Leave far scenery alone, unless it breaks.** A distant backdrop with its own parallax should keep its own scroll. Fix it separately if anchoring exposes its edge. See [What goes wrong?](#what-goes-wrong)

## How do you keep the faithful path?

Never write the anchored position back into the game. In Maverick Hunter X, the same stored bounds also clamp the player's X. Widening them would change where the player can walk, which is a simulation change, not a view change.

At the original aspect there is no margin, so the shift is always zero.

## What goes wrong?

| Problem | What to do |
|---|---|
| Enemies pop in on the side that grew. | The wider view must also widen the game's culling and spawn checks. Maverick Hunter X passes a wider width to the routine that builds its four cull planes, and leaves the stored bounds alone. See [Widen spawn and cull bounds](/docs/tricks/widen-spawn-and-culling). |
| A boss or miniboss starts too early. | Some placements start an encounter, not just draw an actor. In Maverick Hunter X, the Launch Octopus miniboss closes its room's entrance, and the Sigma 2 Storm Eagle refight is placed just behind a respawn point. Those keep the original activation view, so the player still has to reach them. |
| A distant backdrop shows its edge. | Anchoring moves the view, and a far layer with extra parallax can then show past its own edge. In Spark Mandrill's stage, the far wall's left edge came into view. The fix moved only that backdrop sheet, as one piece, so its art stays intact. |
| The view is wrong after resizing while paused. | Some games skip the camera update while paused. Maverick Hunter X refreshes the view offset when it uploads the paused frame, without rewriting the game's stored matrices. |
| Wrong art after a save state or room change. | Recompute the anchor from current game state every frame. Invalidate any margin caches on state loads, full reloads and camera jumps. |
| Areas behind the player turn to garbage. | Common in tile-based 2D games that reuse tile memory for whatever is off their own screen. Track what the game has actually streamed, or fall back. See the next section. |

## Is it always the right answer?

No. Test it in real play, not just in checks.

On the GBA, one Mega Man Zero attempt passed its geometry tests, strict native execution and selected image matches, then failed owner playtesting. At an adaptive width near 21:9, areas Zero walked away from became garbled, and the result looked worse than the centered view. It was parked and not merged.

Maverick Hunter X builds its stages as 3D geometry, so there is real scenery past the old screen edge. A tile-based 2D game may not keep anything there.

When the camera cannot move safely, [fill the edges](/docs/tricks/fill-the-edges) instead, or pillarbox that scene at the original width.
