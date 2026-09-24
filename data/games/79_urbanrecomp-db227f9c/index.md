---
title: "UrbanRecomp"
desc: "A faithful recomp project of SimCity for the SNES. Adding widescreen, a new scenario, cheatmenu, freeplay of all scenarios. Fixing several small bugs, speeding up ma generation etc."
kicker: "Community submission"
tags: ["Community"]
provenance: "community"
repo: "https://github.com/blackerking/UrbanRecomp"
status: "Community submission"
platform: "super-nintendo"
links: [{"label":"Project on GitHub","href":"https://github.com/blackerking/UrbanRecomp"}]
added: "2026-09-24"
updated: "2026-09-24"
submissionId: "db227f9cc77f609d"
draft: false
creator: {"github":"blackerking"}
cover: "./submission-1.png"
---

A faithful recomp project of SimCity for the SNES. Adding widescreen, a new scenario, cheatmenu, freeplay of all scenarios. Fixing several small bugs, speeding up ma generation etc.

## Project

Urban Recomp is a static recompilation of the Super Nintendo release of SimCity \(1991\) onto [SNESRecomp](/hardware/super-nintendo), the same general-purpose 65816-to-C framework used by MegaManXSNESRecomp and the other [SNESRecomp](/hardware/super-nintendo) game repositories. Everywhere else in this repository it is simply "the game".

Adaptive Widescreen, the default renderer: the shared Mods launcher offers Fit to window, Fit height, Fit width, and 4:3 through 32:9 presets \(21:9 out of the box\) while keeping the full original view visible; switching it off there returns to the classic widescreen. See build/run instructions and renderer scope and the dependency audit. The branch retains current main's engine pin and host fixes; controls default to the top left.

Just want to build and play it? See SETUP.md for a Windows/Linux quick-start. Contributors should read CONTRIBUTING.md instead. For a consolidated map of everything reverse-engineered about this ROM so far \(WRAM variables, named routines, patch sites, compressed data regions\), see docs/ROMMAP.md.
