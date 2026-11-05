---
title: "How does host-native HLE make a port faster?"
summary: "Keep the faithful LLE path as the reference, then replace expensive groups of LLE parts with host-native HLE that keeps the same contract. Measured on nine toolchains, this is where the big speed gains came from."
pageType: "concept"
tags: ["Performance", "HLE", "LLE", "Optimization", "Graphics"]
order: 3.5
repos:
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/xboxllr"
updated: "2026-11-04"
---

A faithful port is often slow at first. That is expected. The low-level path copies the console one small step at a time, and a modern PC has to pay for every step.

The fix is not to make the low-level path less faithful. The fix is to replace groups of low-level parts with one faster part that gives the same answer. [What are HLE and LLE?](/docs/concepts/hle-and-lle) explains the rule. This page shows what it looks like in practice and how much it gained.

## Why does LLE come first?

Because you cannot check a fast answer without a correct one.

If a port starts with HLE, a wrong answer can look right just because the game kept running. If it starts with LLE, every later HLE part has something to be compared against.

There is a second reason. A slow, correct port is a stable target. Optimizing too early means you keep re-optimizing code that is still changing. These projects waited until players, including speedrunners using glitches, found the LLE versions behaving like the originals. Only then did the speed work start.

## What kinds of speedups are there?

There are three, and each one needs a different kind of proof.

| Kind | What changes | What proves it |
|---|---|---|
| **Exact host-cost removal** | Nothing the game can see. Inline a hot helper, cache a result until the guest changes its input, turn off unused diagnostics. | The output is identical. |
| **Exact replacement** | A whole subsystem or routine is swapped for a host-native one behind the same seam. A GPU renderer replaces a software one. A native routine replaces a guest leaf function. | The output still matches LLE exactly, checked across a set of scenes. |
| **Approved approximation** | The result is allowed to differ a little, such as a filter or floating point rounding. | The trade-off is written down and its effect is checked. It is never called identical. |

The first two are the normal goal. The third is allowed, but it must say what it trades away.

## What does an exact replacement look like?

Three examples from real ports.

**GBA line compositor.** The original renderer works one pixel at a time: find the tile, flip it, look up the palette, check windows and priority, blend. The HLE version decodes a tile span of up to eight pixels at once, decides window rules once per line, and keeps colors in native RGB555 until the line is done. It uses the same entry point and has no cache across lines. Across 128 deterministic test frames covering every video mode, it produced byte-identical output to the original, and gameplay runs of two games matched too. Overall FPS rose about 7% on Mario Kart: Super Circuit and 6% on Mega Man Zero. Small, but exact in every case tested.

**GBA high-resolution renderer.** At high internal resolution the CPU was doing all the sampling. The new path does that sampling, composition and presentation on the GPU, fed by fixed per-line state from the CPU. The image stays on the GPU. CPU code that needs the image gets a copy only when it asks. A portable CPU version stays behind the same interface for machines without a usable GPU path. On Mario Kart: Super Circuit at 8x widescreen, CPU time per frame dropped from 72.6 ms to 11.8 ms.

**PlayStation draw batching.** In one Mega Man X4 boss fight, the port sent about 1,300 draw batches per frame. After the change it sends 31 to 63. At 1080p, GPU time per frame fell from 24.9 ms to 15.9 ms and the frame rate rose from 39.8 to 58.7 FPS.

Each of these is one HLE part replacing many LLE steps. None of them changes what the game sees.

## What were the results?

Each comparison is two builds of the same game on the same PC, playing the same stretch of gameplay back to back. Most of these games are locked to their original speed, so the win shows up as spare time per frame. That headroom can be spent on higher resolution, widescreen, or weaker hardware.

| System | Game and setting | CPU time per frame, before | After |
|---|---|---|---|
| PlayStation | Ape Escape, 4K | 9.39 ms | 5.90 ms |
| PlayStation | Mega Man X6, 4x | 3.89 ms | 1.99 ms |
| SNES | Mega Man X, 16:9 | 6.09 ms | 1.94 ms |
| SNES | Super Metroid, 16:9 | 7.93 ms | 3.21 ms |
| Game Boy Advance | Mario Kart: Super Circuit, 8x widescreen | 72.6 ms | 11.8 ms |
| Virtual Boy | Wario Land | 9.09 ms | 4.77 ms |
| Virtual Boy | Zero Racers | 5.14 ms | 2.68 ms |
| Sega Genesis | Sonic the Hedgehog, CRT filter | 2.14 ms | 0.72 ms |
| Original Xbox | Blinx, 3x (per update) | 57.0 ms | 34.4 ms |
| Nintendo DS | Metroid Prime Hunters | 14.8 ms | 11.8 ms |
| NES | Metroid | 10.27 ms | 8.84 ms |
| NES | The Legend of Zelda | 11.58 ms | 10.22 ms |
| Master System | Sonic the Hedgehog | 0.47 ms | 0.41 ms |
| Game Gear | Sonic Blast | 0.64 ms | 0.56 ms |

Master System and Game Gear share one toolchain, so this is nine toolchains.

Some of those gains are easy to feel. Blinx at 3x went from 23.8 to 29.5 updates per second against a target of 30. On a 2013 PC with a GTX 760, Mario Kart: Super Circuit at 8x went from under 25 FPS to over 150.

The source and charts are in [Slowing down to speed up](/blog/slowing-down-to-speed-up).

## Why did some systems gain more than others?

Most of the gains came from the 16-bit era and from the high-resolution modes of later systems. Widescreen and high resolution mean more screen to draw, so a costly drawing path costs more there. On SNES, the biggest gains were in widescreen.

The 8-bit systems gained less. Their hardware is simple: a slow CPU, a basic tile and sprite chip, a few sound channels. Reproducing it was never the expensive part. Sonic on the Master System already took under half a millisecond per frame, about 3% of its frame budget.

## Did everything work?

No. Every idea was built and measured, and kept only if it won.

On PlayStation, 10 changes shipped and 12 were thrown out. One native geometry engine made Ape Escape 22% slower. On Genesis, about a dozen ideas, including new FM synth kernels, were measured and reverted. On GBA, a native renderer change measured 12.9% less CPU time, but its paired runs varied too much to call it a win, so it stays off by default.

A rejected idea is still useful if it is written down. It stops the next person from trying the same dead end.

## What about assembly and SIMD?

They are allowed, with conditions.

- The fast path is gated by CPU, operating system and ABI at build time, not only by a runtime check.
- Optional CPU features are detected before they are used.
- A portable version always stays behind the same interface, so every supported platform still compiles, links and runs.
- Both paths are tested.

Netplay adds one more rule. Players exchange their CPU features and available paths once, before the match starts, and settle on one shared set. If one player's machine lacks an optimization that has to match, everyone uses the portable path. The choice stays fixed for the whole match.

## Where do I go next?

- The rule behind all of this: [What are HLE and LLE?](/docs/concepts/hle-and-lle)
- How to measure a change: [Optimize a port without losing accuracy](/docs/guides/optimize-a-port)
- How to find where two paths disagree: [How do we compare a port to the original?](/docs/concepts/co-simulation)
- What to spend the headroom on: [Common tricks](/docs/tricks)
