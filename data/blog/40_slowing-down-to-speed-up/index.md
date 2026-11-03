---
title: "Slowing down to speed up"
authors: ["Matthew Stanley"]
kicker: "1379.tech"
tags: ["Performance", "Recompilation"]
featured: false
desc: "Before-and-after CPU and GPU numbers for games on nine systems, from NES to the original Xbox."
date: "2026-11-03"
venue: "1379.tech"
layout: "article"
cover: "./banner-xbox.webp"
links:
  - { label: "Read the original on 1379.tech", href: "https://1379.tech/recompiler-performance-host-native-hle/" }
---

From the beginning, my goal on my recompilers has been accuracy under an LLE (low level emulation) focus. The intent here being that LLE is an uncompromising way to ensure correctness. From there, I would focus on using drop-in HLE (high level emulation) for my ecosystems.

I wanted to hold off on "premature optimization" until I really had a foundation that these things were on point. My inflection point became when I was able to have speedrunners going through my titles performing speedrun glitches and techs, that I had a solid baseline to reference.

So I took time to pivot, and go through all of my ecosystems. The intent was to be able to have performance focused HLE to replace the *correct*, but slow LLE ecosystems. One HLE system was permitted to replace multiple LLE subsystems, but it had to adhere to the input and output contract of the respective system(s) it was replacing. A game's output should be behaviorally the same.

![Megaman X under host native HLE performing Magic Carpet](./mmx-magic-carpet-widescreen.mp4)

I was able to pull some great outcomes from this work. The 16 bit era was where most of the gains were had, but I was able to save time across all of them.

![CPU time saved per frame, newest build against the build from before this work.](./cpu-chart.webp)

*Each comparison is two builds of the same game on the same PC, playing the same stretch of gameplay back to back. Most games are locked to their original speed, so the win shows up as headroom for higher resolutions and weaker hardware.*

## What the headroom buys: upscaling

The clearest way to see it is in the 3D games, where a higher internal resolution adds real detail.

![Blinx: The Time Sweeper (Xbox), native vs 3x. Before this work 3x ran at 23.8 FPS; now it holds the game's 30.](./compare-xbox.webp)

![Mario Kart: Super Circuit (GBA), native vs 8x HD. The old CPU renderer managed under 25 FPS at 8x on a 2013 PC; the GPU renderer runs it at over 150.](./compare-gba.webp)

## System by system

### PlayStation

![PlayStation CPU time per frame before and after: Ape Escape at 4K 9.39 to 5.90 ms, Mega Man X6 at 4x 3.89 to 1.99 ms](./chart-psx.webp)

![Mega Man X4 used to send about 1,300 draw batches per frame in this fight. Now it sends 31 to 63.](./chart-psx-x4.webp)

### SNES

![The biggest gains are in widescreen, where far more of the screen is drawn.](./chart-snes.webp)

### Game Boy Advance

![HD rendering moved from the CPU to the GPU. Measured on a 2013 PC with a GTX 760.](./chart-gba.webp)

### Virtual Boy

![Virtual Boy CPU time per frame and uncapped frame rate: Wario Land 9.09 to 4.77 ms and 108 to 207 FPS, Zero Racers 5.14 to 2.68 ms and 190 to 357 FPS](./chart-vb.webp)

### Sega Genesis

![Genesis CPU time per frame: Sonic the Hedgehog with the CRT filter 2.14 to 0.72 ms](./chart-genesis.webp)

### Original Xbox

![Blinx at 3x: CPU per update 57.0 to 34.4 ms, game speed 23.8 to 29.5 updates per second against a target of 30](./chart-xbox.webp)

### Nintendo DS

![Nintendo DS CPU time per frame: Metroid Prime Hunters 14.8 to 11.8 ms](./chart-nds.webp)

### NES, Master System and Game Gear

![NES CPU time per frame: Metroid 10.27 to 8.84 ms, The Legend of Zelda 11.58 to 10.22 ms](./chart-nes.webp)

![CPU time per frame: Sonic the Hedgehog on Master System 0.47 to 0.41 ms, Sonic Blast on Game Gear 0.64 to 0.56 ms](./chart-smsgg.webp)

The 8-bit systems gained less, and that's expected. Their hardware is simple: a slow 8-bit CPU, a basic tile-and-sprite video chip and a few sound channels. Reproducing it was never the expensive part, so there was less waste to remove. Sonic on the Master System already took under half a millisecond per frame, about 3% of its frame budget.

## Not everything worked

Every idea was built and measured, and kept only if it won. On PlayStation alone, 10 changes shipped and 12 were thrown out. One native geometry engine made Ape Escape 22% slower. On Genesis, about a dozen ideas, including new FM synth kernels, were measured and reverted.

## Building on one of these? Update.

If you've been using one of my frameworks, I heavily encourage you update. This should vastly improve your ability to enhance, as well as your end user's experience on low end hardware.

Know something using one of these for their project? Ask them to update!

- **NES:** [nesrecomp](https://github.com/mstan/nesrecomp)
- **Master System / Game Gear:** [smsggrecomp](https://github.com/mstan/smsggrecomp)
- **SNES:** [snesrecomp](https://github.com/RetroPortingToolKit/snesrecomp)
- **Sega Genesis / Sega CD:** [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp)
- **Virtual Boy:** [vbrecomp](https://github.com/mstan/vbrecomp)
- **Game Boy Advance:** [gbarecomp](https://github.com/mstan/gbarecomp)
- **Nintendo DS:** [ndsrecomp](https://github.com/RetroPortingToolKit/ndsrecomp)
- **PlayStation:** [psxrecomp](https://github.com/RetroPortingToolKit/psxrecomp)
- **Original Xbox:** [XboxLLR](https://github.com/mstan/xboxllr)

---

*Originally published on [1379.tech](https://1379.tech/recompiler-performance-host-native-hle/).*
