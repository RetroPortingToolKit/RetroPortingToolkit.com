---
title: "Donkey Kong Country 2"
kicker: "Super Nintendo"
tags: ["Widescreen"]
featured: false
desc: "A community-led first release, very early, with experimental widescreen plus rewind and save states built in."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "community"
platform: "super-nintendo"
repo: "https://github.com/mstan/DKC2Recomp"
group: "Super Nintendo"
verified: "2026-08-18"
updated: "2026-08-15"
added: "2026-07-18"
cover: "/data/blog/10_building-enhancing-recomps/dkc2-wide.webp"
---

Donkey Kong Country 2 is the newest [SNESRecomp](/hardware/super-nintendo) title, and the first that is community work hosted by the core team: contributor Nicktendonick does the game work in a core-hosted repository.

## Can I play it?

Very early alpha. The first and so far only release, v0.0.1 (2026-07-20), is public for Windows, and the bring-up is underway. Expectations should match the version number.

An SDL2 host in the source tree is the foundation for future Linux and macOS support, but Windows is the only accepted release platform today. It is built from a dump you provide: the launcher asks for your North American v1.0 ROM and verifies it by checksum.

## What the recomp adds

Even this early, the build ships the comforts the cartridge could not:

- Rewind, fast-forward, and five save-state slots, behind an Assist Tools setting that defaults off.
- Experimental 16:9 widescreen. The internal picture grows from 256x224 to 342x224, adding 43 real pixels of level on each side. The original 4:3 view stays the default.
- Screen models: a byte-exact Raw default, plus opt-in CRT, Composite, and Trinitron color responses.
- An in-game overlay for settings, control rebinding, and assist tools, plus independent Player 1 and Player 2 input sources for two gamepads.

## Technical details

The current analysis profile emits 3,475 exact ahead-of-time compiled CPU variants from 3,325 roots across 13 banks. A shared 65816 interpreter remains the fallback for anything the analysis cannot prove, and hardware outside the main CPU is modeled by the shared runtime.

The widescreen work is backed by an automated deterministic route auditor. It replays recorded play routes, correlates every layer with camera and terrain state, and flags stale tiles, seams, and sprite spawn problems near the former 4:3 boundary. Reverse-engineering knowledge lives in a reviewed symbol database kept outside the generated code.

## Sources

- [DKC2Recomp README (GitHub)](https://github.com/mstan/DKC2Recomp)
