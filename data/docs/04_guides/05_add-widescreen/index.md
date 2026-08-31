---
title: "Add widescreen"
summary: "Widen a port without breaking the faithful 4:3 path: decide whether the game is 3D or 2D, widen what the game draws, and test for culling, wrapping, spawning, and timing bugs."
pageType: "guide"
tags: ["Widescreen", "Enhancements", "PlayStation", "Sega Genesis", "NES", "SNES"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/SuperMarioBrosNESRecomp"
  - "https://github.com/mstan/MegaManX6Recomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/cdirecomp"
updated: "2026-08-30"
---

Widescreen is easy to see and hard to finish.

Making the output surface wider is only the first step. The game may still draw only a 4:3 world. It may cull objects too early. It may wrap sprite positions. It may spawn enemies at the wrong time. It may reveal art that was never meant to be visible.

The default rule is simple: widescreen is optional, off by default, and the normal 4:3 path stays faithful.

## Before you start

You need:

- a working port;
- a known-good 4:3 reference;
- a debug build with TCP screenshot and input commands, when the project supports them;
- enough test scenes to catch edge cases.

Do not begin by changing generated code. Put widescreen behavior in runtime code, recompiler configuration, or a reviewed mod or enhancement layer.

## Step 1. Decide what kind of game you have

| Game type | What widescreen usually means |
|---|---|
| 3D | Widen the projection or render a wider view. Then fix culling, sky, backdrop, HUD anchoring, and overlays. |
| 2D | Make the engine draw more columns or rows. Then fix sprite wrapping, tile buffers, spawning, and collision. |
| Mixed | Treat each scene type separately. Menus, FMV, maps, and gameplay may need different handling. |

Do not assume there is hidden content outside the 4:3 frame. Some games truly draw only the original view.

Some games need a more direct answer: a custom renderer. [StarFoxSNESRecomp](https://github.com/mstan/StarFoxSNESRecomp) is the first example here. Its authentic 4:3 path stays on the stock renderer, while wider modes use a separate native renderer adapted from Star Fox Enhanced.

## Step 2. Protect the faithful path

At 4:3, widescreen settings should reduce to the original behavior.

That means:

- no extra cull margin;
- no shifted camera;
- no changed spawn timing;
- no different random sequence;
- no altered collision;
- no modified game file.

Output identity is the goal. The binary may differ because the port has extra runtime checks, but those checks should produce the original result when widescreen is off.

## Step 3. Widen what is drawn

For a 3D game, the first visible change is usually projection or render width. That can show more of the world, but it does not automatically make the game submit more objects.

For a 2D game, there is no projection to widen. You have to make the game's own background and sprite logic draw more content.

**Checkpoint.** The world is wider, and several things are wrong. That is normal at this stage.

## Step 4. Fix culling and object visibility

Culling is the game deciding not to draw something.

Many games compare object position against a 4:3 screen window before the renderer ever sees it. A wider projection cannot fix that. You need to find the cull sites and widen them in a controlled way.

Do not tune by eye only. Test the same scene at 4:3 and widescreen, then look for objects that pop in, vanish, or appear late.

**Checkpoint.** Objects do not pop while they are visibly inside the widescreen view.

## Step 5. Anchor the HUD

The HUD is usually presentation, not simulation.

A good widescreen pass keeps gameplay wider while keeping health bars, text boxes, timers, reticles, and menus readable. Some HUD elements should stay near the original 4:3 safe area. Others should move to the new edge. The game decides this case by case.

Check menus and overlays separately from gameplay. A fix that looks right while playing can still stretch a pause menu, split a dialogue box, or move a prompt too far from the action.

**Checkpoint.** HUD elements are readable, stable, and not stretched by accident.

## Step 6. Capture what changed

Use the debug server when the project has one. A TCP screenshot and input script gives you repeatable evidence: enter the same scene, capture the 4:3 reference, capture the widened view, and compare the result.

This matters for AI work too. The useful proof is not "the code looks right." The useful proof is a captured frame, a known input path, and a note about what changed.

The command details live in [TCP debug protocol](/docs/reference/tcp-protocol). The broader inventory is [Machine-readable surfaces](/docs/agents/machine-surfaces).

## Step 7. Fix 2D wrapping

Older 2D hardware often stores screen X in 8 or 9 bits. When widened positions move past that range, sprites can wrap to the other side of the screen.

Common fixes include:

- keeping a wider sidecar value;
- widening a sprite mask;
- changing the OAM visibility check;
- treating margin-only collision boxes as offscreen.

**Checkpoint.** A sprite entering a margin does not teleport, flicker, or create a phantom hitbox.

## Step 8. Check spawning and progression

Spawning can affect simulation, not just presentation.

Some games tie spawning to the camera edge. In those games, widening the edge can change when an enemy appears, where it starts, which script fires, or which random number gets consumed.

That is not true for every game. Test it before changing it. If a spawn change causes a softlock, early trigger, RNG shift, or broken route, treat that as a correctness bug.

The safe goal is that widening presentation does not silently change progression.

## Step 9. Test dense and ugly scenes

Widescreen bugs hide in scenes with:

- many sprites;
- scrolling strips;
- wraparound backgrounds;
- large bosses;
- sky domes or far backdrops;
- mode changes;
- paused menus over gameplay;
- transitions and loading screens.

Test more than the first level. Widescreen that works in one scene can break a later scene that uses another renderer path.

## 3D and 2D feel different

3D widescreen is often the easier case. You usually start by expanding the camera or projection, then fix culling, backdrop limits, sprite proportions, and HUD placement. The game world may already exist outside the old frame.

2D widescreen is usually more invasive. There may be no hidden view to reveal. The game often has to stream more tiles, draw more sprites, widen object checks, and avoid wrapping old 8-bit or 9-bit screen positions. That can touch more game-specific logic.

Mixed games need both passes. A 3D scene, a 2D menu, a world map, and an FMV player can all have different rules.

## Common failures

| Symptom | Likely cause |
|---|---|
| Black bars or voids at the edges. | The game did not draw content there, or the backdrop art ends. |
| Objects pop in late. | A 4:3 cull window is still active. |
| Sprites appear on the wrong side. | Screen X wrapped. |
| Enemies spawn inside walls. | The spawn window was widened too aggressively. |
| Collision happens from across the screen. | A margin collision box wrapped into the 4:3 area. |
| Dense scenes drop layers. | The game exceeded its primitive or tile budget. |
| 4:3 behaves differently now. | The widescreen path is leaking into the faithful path. |

## Next

- [Determinism](/docs/concepts/determinism), for why simulation changes are dangerous.
- [Write a mod](/docs/guides/write-a-mod), if widescreen is exposed as a feature.
- [Debug a divergence](/docs/guides/debug-a-divergence), when the widened build disagrees with the reference.
