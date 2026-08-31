---
title: "Super Nintendo"
kicker: "65816"
tags: ["Widescreen", "MSU-1", "Mods", "Save states"]
featured: true
desc: "The silver-standard ecosystem here: native SNES ports, widescreen, MSU-1 music, mod packages, save states, and enhancement-chip support."
year: "2026"
status: "Silver standard"
maturity: "Beta"
availability: "Public build"
provenance: "core"
arch: "65816"
repo: "https://github.com/mstan/snesrecomp"
group: "Active platform ecosystems"
links:
  - { label: "Read: snesrecomp's first title on 1379.tech", href: "https://1379.tech/snesrecomps-first-title-super-mario-world/" }
  - { label: "Watch: Mega Man X Recomp is out now", href: "/blog/video-mega-man-x-out-now" }
verified: "2026-08-18"
cover: "/consoles/super-nintendo.jpg"
---

SNESRecomp is the silver-standard ecosystem for this site.

It turns Super Nintendo games into native apps. The goal is the same as the PlayStation work: keep the original game behavior, then build a modern port around it.

You provide your own cartridge dump.

## What runs today

SNESRecomp has core ports and community ports. Some are playable releases. Some are active previews. Some exist to prove a harder part of the hardware.

Examples include [Mega Man X](/games/mega-man-x), [Mega Man X2](/games/mega-man-x2), [Mega Man X3](/games/mega-man-x3), [Super Mario World](/games/super-mario-world), [A Link to the Past](/games/a-link-to-the-past), [Donkey Kong Country 2](/games/dkc2), [ActRaiser](/games/actraiser), [Metal Warriors](/games/metal-warriors), and [Super Metroid](/games/super-metroid).

The exact state still belongs on each game page. The platform page is here to explain the ecosystem.

## What SNES ports can add

- Widescreen that opens the view instead of stretching it.
- HUD anchoring and layout fixes for wider views.
- MSU-1 music support where the game project chooses to use it.
- Mods as toggleable packages.
- Save states and modern display options.
- Game-specific quality-of-life features.

## Enhancement chips

Some SNES cartridges include extra chips such as Super FX, DSP-1, or Cx4.

Those chips are supported today by using real ROM dumps and building a faithful low-level floor first. Because the chips are small and their ROMs can be hard to obtain, SNESRecomp can ship higher-level layers for them where appropriate.

That does not mean the faithful path was skipped. The higher-level layer is allowed because it has a lower-level reference to measure against.

## What to expect

SNESRecomp is strong enough to ship real ports, but it does not make every SNES game automatic.

Each game can still have its own problems: cartridge hardware, timing, audio, enhancement chips, rendering tricks, or game-specific bugs. A playable port means that project has done the work for that game.
