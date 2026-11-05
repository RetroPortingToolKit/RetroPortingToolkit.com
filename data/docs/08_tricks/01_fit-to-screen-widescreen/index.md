---
title: "Fit to screen widescreen"
summary: "Make the view follow the window's shape, from the original 4:3 up to a maximum each game sets, instead of offering only one fixed widescreen size."
pageType: "guide"
tags: ["Tricks", "Widescreen", "Adaptive widescreen"]
repos:
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/MegaManXSNESRecomp"
  - "https://github.com/mstan/xboxllr"
  - "https://github.com/mstan/BlinxRecomp"
  - "https://github.com/mstan/JSRFRecomp"
updated: "2026-11-04"
---

**Fit to screen** is the recommended default shape for widescreen. Instead of one fixed 16:9 mode, the view grows or shrinks to match the window. A 16:9 monitor gets 16:9. An ultrawide gets 21:9 or 32:9. A 4:3 window gets the original game.

## What problem does it solve?

A fixed widescreen mode only fits one kind of screen. On a different monitor it is either stretched, cropped or boxed in. Players also resize windows, rotate handhelds and switch between a laptop and a TV.

Fit to screen solves all of those with one setting.

## How does it work?

1. Read the window's drawable size.
2. Keep the original height. Work out the width that gives square pixels at that height.
3. Clamp that width between the original width and the game's own maximum.
4. Render that many columns. If the window changes, do it again.

The maximum matters. Each game only supports as much width as it can fill with real content. gbarecomp's shared video surface reaches 896 by 160, enough for 50:9, but each game sets its own ceiling inside that, and games that have not opted in stay at 240.

Offer fixed presets too. 16:9, 21:9 and 32:9 are useful when a player wants a stable view, and some features need one.

## How do you keep the faithful path?

At a 4:3 window, Fit to screen must produce the original game. No extra margin, no shifted camera, no changed spawns.

Scenes the port does not support should fall back to the original width with bars on the sides. That is better than showing stale or garbage graphics in the margins. Menus, movies and full-screen UI often stay 4:3 on purpose.

## What goes wrong?

| Problem | What to do |
|---|---|
| The view jumps or tears while resizing. | Recompute the width only between frames, and invalidate any margin caches when it changes. |
| A wider window changes gameplay. | If spawns or triggers depend on the view, the wider view is a simulation change. Test it like one. See [Widen spawn and cull bounds](/docs/tricks/widen-spawn-and-culling). |
| Netplay players see different widths. | If the view width can change what the game simulates, players must agree on one fixed width. Mega Man X's netplay only allows the original view or fixed 16:9, 21:9 or 32:9. |
| Stale tiles appear in the margins. | The game is not streaming that area. Fall back to the original width for that scene, or see [Fill the edges](/docs/tricks/fill-the-edges). |

## Where is it used?

- [Blinx](https://github.com/mstan/BlinxRecomp) on XboxLLR. Adaptive follows the window's client size from 4:3 through 32:9, with 16:9, 21:9 and 32:9 presets. Gameplay widens, menus and stage select stay centered 4:3. A fresh launcher defaults to Fit to screen.
- [Jet Set Radio Future](https://github.com/mstan/JSRFRecomp). Widescreen is on by default and follows the window, including ultrawide.
- [Mega Man X](https://github.com/mstan/MegaManXSNESRecomp) on snesrecomp. Adaptive, 16:9, 21:9 and 32:9 views of expanded gameplay.
- [gbarecomp](https://github.com/mstan/gbarecomp). A game opts in with its own maximum view width. The framework handles live resizing and the wider video surface, while each game owns its streaming, camera, spawning and HUD.

Next: once the view is wider, the HUD needs to move. See [HUD anchoring](/docs/tricks/hud-anchoring).
