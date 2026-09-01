---
title: "PlayStation"
kicker: "MIPS"
tags: ["Widescreen", "Mods", "Save states"]
featured: true
desc: "The gold-standard ecosystem here: native PlayStation ports, OpenBIOS boot for many projects, community ports, mods, widescreen, save states, and rewind."
year: "2026"
status: "Gold standard"
maturity: "Beta"
availability: "Public build"
provenance: "core"
arch: "MIPS R3000A"
repo: "https://github.com/mstan/psxrecomp"
group: "Active platform ecosystems"
links:
  - { label: "Read: PSXRecomp overhaul on 1379.tech", href: "https://1379.tech/psxrecomp-overhauled-now-bios-tomba/" }
  - { label: "Watch: Tomba save states and rewind", href: "https://www.youtube.com/watch?v=L36ppNkuJG0" }
verified: "2026-08-18"
updated: "2026-08-31"
cover: "./mascot-room.webp"
---

PSXRecomp is the gold-standard ecosystem for this site.

It turns a PlayStation game into a native app. The goal is not to ship a new emulator. The goal is a real port that still behaves like the original game.

You provide your own disc image. Many projects can use the bundled open-source OpenBIOS. Projects may still ask for a legally obtained retail BIOS.

## What runs today

PSXRecomp has core ports and community ports. The community work is the stronger signal, because it shows the framework is useful beyond the original project team.

Examples include [Spyro the Dragon](/games/openpete-spyro), [Xenogears](/games/xenogears), [Pepsiman](/games/pepsiman), [Twisted Metal 4](/games/twisted-metal-4), [Street Fighter Alpha 3](/games/street-fighter-alpha-3), [Syphon Filter 2](/games/syphon-filter-2), and [Toy Story 2](/games/toy-story-2).

Core examples include [Tomba!](/games/tomba), [Tomba! 2](/games/tomba-2), [Mega Man X6](/games/mega-man-x6), and [Tsumu Light](/games/tsumu-light).

The exact list should live in project repos. This page is here to explain the platform.

## What PlayStation ports can add

- Widescreen that opens the view instead of stretching the image.
- Save states.
- Rewind.
- Mods as toggleable packages.
- Runtime translations.
- Optional visual fixes for PlayStation-era rendering artifacts.
- Faster repeat launches as more game code is discovered and cached.

## What to expect

PSXRecomp is the strongest ecosystem here, but it does not make every PlayStation game automatic.

Each game can still have its own problems: disc layout, streamed code, rendering tricks, timing, memory cards, or plain game bugs. A playable port means that project has done the work for that game.
