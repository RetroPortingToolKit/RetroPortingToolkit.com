---
title: "Camera anchoring"
summary: "Near a room or stage edge, a centered wide view shows empty space the game never drew. Slide the wide view inward so the missing columns move to the other side, and do it in presentation only."
pageType: "guide"
tags: ["Tricks", "Widescreen", "Camera", "2D"]
repos:
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/MegaManZeroRecomp"
updated: "2026-11-04"
---

In a 2D game, the original camera stops at the edge of a room. On a 4:3 screen that works: the edge of the screen meets the edge of the room.

Widen the view and center it on the original camera, and the extra margin hangs past that edge. There is nothing there. The game never drew it, so the player sees blank space, a repeated backdrop or garbage tiles.

**Camera anchoring** keeps the wide view inside the room. Near an edge, the view slides inward. The columns it cannot show on one side are shown on the other side instead.

This trick is still being proven in 2D ports. The public attempt so far, on Mega Man Zero, was parked after playtesting. The worked example below shows the method, and [Is it always the right answer?](#is-it-always-the-right-answer) covers what went wrong.

## A worked example

Take a GBA platformer. The screen is 240 by 160. At 21:9, Fit to screen makes the view about 373 pixels wide. That is 133 extra columns: 66 on the left and 67 on the right, with the odd pixel on the right.

The player starts at the left wall of a room that is 1,000 pixels wide. The game's own camera sits at X = 0 and shows columns 0 to 239.

| Policy | Columns shown | What the player sees |
|---|---|---|
| Centered | -66 to 306 | 66 columns of nothing at the left |
| Anchored | 0 to 372 | No empty columns. The 66 columns move to the right, where there is real level |

As the player walks right, the game's camera moves right. Once it reaches X = 66, the centered view no longer crosses the wall, so the anchored view and the centered view become the same. In between, the offset shrinks smoothly from 66 to 0. The same thing happens in reverse at the right wall.

If a room is narrower than the view, say a 300-pixel boss room, there is no position that fits. Center the room in the view and pad both sides equally, again with the odd pixel on the right. Or fall back to the original width for that room.

## How does it work?

1. **Find the room bounds.** Read the left and right edge of the current room or stage from the game's own data, not from a guess. Mega Man Zero's attempt used the authored width in the room's chunk map plus the camera's own limits.
2. **Compute the wide origin.** Start from the game's camera, subtract the left margin, then clamp so the view stays inside the room.
3. **Apply one offset to everything in the world.** Every world background layer and every world sprite moves by the same amount. If they disagree, sprites slide against the floor.
4. **Leave screen-space things alone.** The HUD stays anchored to the content edges. Dialogue windows stay centered. See [HUD anchoring](/docs/tricks/hud-anchoring).
5. **Leave wrapped scenery alone.** A looping sky or parallax layer should keep its own scroll. Shifting it makes the background drift as the anchor settles.

## How do you keep the faithful path?

Never write the anchored position back into the game's camera. The game keeps simulating with its own camera. Anchoring only changes where the port draws.

At 4:3 there is no margin, so the offset is always zero.

## What goes wrong?

| Problem | What to do |
|---|---|
| Enemies pop in on the side that grew. | Near an edge one margin is bigger than the other. Spawn and streaming ranges must cover the largest possible margin on both sides, and must not shrink as the view slides. See [Widen spawn and cull bounds](/docs/tricks/widen-spawn-and-culling). |
| Areas behind the player turn to garbage. | A common cause is that the game reuses tile memory for whatever is off its own screen, so the margin shows tiles the game already replaced. Track what the game has actually streamed, or fall back. |
| Black strips next to a dialogue box. | Window regions were applied to the shifted world instead of their real screen position. Keep windows at their physical screen position. |
| Wrong art after a save state or room change. | Invalidate margin caches on state loads, full reloads and any jump in camera position. |
| Sprites appear at the wrong edge. | 9-bit OAM X wraps: -128 and 384 pack to the same value. Keep each sprite's full signed position on the side, before it is packed. |

## Is it always the right answer?

No. Test it in real play, not just in checks.

One Mega Man Zero attempt passed its geometry tests, strict native execution and selected image matches, then failed owner playtesting. At an adaptive width near 21:9, areas Zero walked away from became garbled, and the result looked worse than the centered view. It was parked and not merged.

When the camera cannot move safely, [fill the edges](/docs/tricks/fill-the-edges) instead, or pillarbox that scene at the original width.
