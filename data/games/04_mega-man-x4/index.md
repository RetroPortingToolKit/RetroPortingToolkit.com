---
title: "Mega Man X4"
kicker: "PlayStation"
tags: ["Widescreen", "Fast loading"]
featured: false
desc: "X4 as a native app: true 16:9 widescreen, fast loading, and a damage multiplier you tune yourself."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "playstation"
repo: "https://github.com/mstan/MegaManX4Recomp"
group: "PlayStation"
links:
  - { label: "Watch: Mega Man X4 Recomp is out now", href: "/blog/video-mega-man-x4-out-now" }
cover: "./mega-man-x4.png"
videoUrl: "https://www.youtube.com/watch?v=Rbh5wKb112A"
verified: "2026-08-18"
updated: "2026-08-06"
added: "2026-07-06"
---

The X series hit PlayStation with X4, and [PSXRecomp](/hardware/playstation) picks the story up right there. It sits alongside [Mega Man X5](/games/mega-man-x5) and [Mega Man X6](/games/mega-man-x6) in the framework's run of Capcom titles, and it is the earliest of the three: a preview you can already play, not a finished port.

![Mega Man X4 running from a native build](/previews/mega-man-x4.mp4)

## Can I play it?

Yes, as an early playable alpha. The current release is v0.0.5-alpha (2026-08-05), with a Windows package and a Linux AppImage on the GitHub releases page. The game is built from a dump you provide: your Mega Man X4 (USA) disc image, plus a PlayStation BIOS file, which this project does not yet bundle an open replacement for.

Treat it as a preview. The opening cinematics play, the menus and attract demos work, and you can start a game, but stages have not been verified broadly and memory-card saving is not yet confirmed end to end.

![Video Game Esoterica on the X4 release](https://www.youtube.com/watch?v=Rbh5wKb112A)

## What the recomp adds

- Experimental 16:9 widescreen, off by default, which renders a genuinely wider 2D field of view rather than stretching the image. Your health and weapon meters anchor to the wide left edge, enemy and boss meters to the wide right.
- A Fast Loading mod with a single selector: recommended host-pacing modes from 2x up to uncapped, or experimental accelerated disc timing.
- A configurable integer Damage Multiplier, intended for testing and save repair, tunable to taste.
- Frame blending at your display's refresh rate or a fixed rate, presentation only: game timing stays stock.

There is also a period-correct controller quirk handled for you. X4 shipped before the DualShock existed and rejects analog pads outright, so the runtime presents a plain digital pad. Keyboards and modern gamepads both work.

## Technical details

The game's MIPS code is translated ahead of time into C and compiled into a native Windows or Linux program that runs on a faithful simulation of the PS1 hardware plus a recompiled BIOS. X4 streams much of its code from disc as ARC overlays, so the runtime converts newly visited areas to native code in the background; the Windows release bundles a self-contained toolchain (embedded Python and TinyCC) so this needs no developer install, while the Linux AppImage ships prebuilt native shards and falls back safely to an interpreter for anything uncovered. The generated dispatcher handles X4's nearly 60,000 dispatch entries with binary lookup to stay fast in any build. Uncovered code paths halt loudly rather than misbehave silently. Use a .cue plus .bin dump rather than a cooked .iso, which would discard the disc sectors the game streams video and audio from.

## Sources

- [Project README and releases (GitHub)](https://github.com/mstan/MegaManX4Recomp)
- [Mega Man X4 Recomp is Out Now! The BEST Mega Man on PS1 (Video Game Esoterica)](/blog/video-mega-man-x4-out-now)
