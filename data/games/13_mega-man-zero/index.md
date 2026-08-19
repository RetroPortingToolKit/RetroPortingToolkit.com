---
title: "Mega Man Zero"
kicker: "Game Boy Advance"
tags: ["Adaptive widescreen"]
featured: true
desc: "The GBA screen always felt too small for Zero. Opt-in fixed-width or adaptive widescreen finally gives the series room to move."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "game-boy-advance"
repo: "https://github.com/mstan/MegaManZeroRecomp"
group: "Game Boy Advance"
verified: "2026-08-18"
cover: "./mmz-gameplay.png"
gallery:
  - { src: "./mmz-opening.png", caption: "Opening stage" }
---

Mega Man Zero is famously hard, and part of that difficulty is the screen: on the GBA's small 3:2 display, threats arrive with very little warning. This core [GBARecomp](/hardware/game-boy-advance) project rebuilds the game as a native Windows app and lets you widen the view, so you can see what is coming and react to it.

## Can I play it?

Yes, as an in-development preview. Windows builds are on the GitHub Releases page, currently v0.0.3 (July 2026). The game runs from dumps you provide: select your own USA ROM and GBA BIOS when prompted, and the runtime hash-checks the ROM before running it. It boots through the real BIOS into gameplay with working controls, audio, and persistent saves, and the tested routes through the opening mission are fully covered; the rest of the game has not been exhaustively proven yet.

## What the recomp adds

Widescreen is opt-in, with two policies. A fixed logical width from 240 up to 480 pixels, with tile-aligned 288x160 as the recommended setting, or an adaptive width that follows the shape of the window as you resize it. During gameplay the HUD anchors to the left content edge and the boss gauge to the right, while menus keep the faithful 240x160 presentation. The wider modes are experimental: entity spawning keeps its original rules, so pop-in can appear on untested routes, and 384 and 480 widths are validation targets rather than supported modes.

Save states use Shift+F1 through F9 to save and F1 through F9 to load, and holding Tab fast-forwards.

One known v0.0.3-era limitation: loading a save state while widescreen is active can leave the extended view temporarily out of sync. A normal room reload, including dying and choosing Retry, rebuilds it; cartridge saves are unaffected.

## Technical details

The ROM's ARM7TDMI ARM and Thumb code is translated to native C++ ahead of time, and the real GBA BIOS is recompiled and executed through the low-level path rather than used as a stub. The gbarecomp runtime models the PPU, APU, DMA, timers, interrupts, cartridge SRAM, and input. The committed corpus covers 10,885 functions; if execution reaches an address outside it, only that gap runs in an interpreter, and self-healing can compile it to native code and persist it.

Correctness is checked two ways. A strict mode disables all fallbacks so the first missing address aborts, and deterministic campaigns through the opening mission pass it with zero interpreted instructions. An independent emulator run with the same inputs then serves as an oracle: native and oracle frames are pixel-identical through the compared checkpoints, with the small late-route timing residuals documented rather than hidden.

## Sources

- [MegaManZeroRecomp README (GitHub)](https://github.com/mstan/MegaManZeroRecomp)
- [Building & Enhancing Recomps: Ecosystem Updates (1379.tech)](https://1379.tech/building-enhancing-recomps-ecosystem-updates/)
