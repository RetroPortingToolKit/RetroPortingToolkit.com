---
title: "Final Fantasy VI Recomp"
desc: "A community game project. See the source repository for details and current progress."
kicker: "Community submission"
tags: ["Community"]
provenance: "community"
repo: "https://github.com/Cis-24/FinalFantasyVISNESRecomp"
status: "Community submission"
platform: "super-nintendo"
links: [{"label":"Project on GitHub","href":"https://github.com/Cis-24/FinalFantasyVISNESRecomp"}]
added: "2026-11-13"
updated: "2026-11-13"
submissionId: "dea03286e44251c9"
draft: false
creator: {"github":"Cis-24","discord":"cis24"}
---

A community game project. See the source repository for details and current progress.

## Project

A native recompilation of Final Fantasy VI for the SNES \(released in North America as Final Fantasy III\), built on [SNESRecomp](/hardware/super-nintendo).

The game's 65816 code is translated ahead of time into C and compiled into a native executable. Code that cannot be proven statically still runs in the framework's interpreter, so the port stays correct while more of it moves to native code. Progress is checked against a reference emulator with scripted input routes.

Work in progress; not yet playable from start to finish.

- Boots to the title screen and runs the intro, the field \(walking, doors, map changes\) and the main menu.
- Battles are the current work. The first battle and two battles with the player commands \(Fight, Magic, Summon, Item, Steal, SwdTech, Throw, Tools, Blitz, Sketch, Slot, Dance; Lore, X-Magic, Morph, Revert, Runic, Capture, Jump, Control, Mimic, GP Rain, Rage, Row, Def\) run through to the victory and back to the field. Further battle routes cover different battle types, monster AI and most of the spells.

Validated routes \(validation/routes\): boot to title, new game to Narshe, field walk, menu tour, first battle, battle commands \(two routes\), field modes, doors, menu scrolling, battle types, monster AI, spells \(two routes\). Each route replays fixed input and compares memory, video memory and the frame buffer at checkpoints. Known and explained differences from the reference are masked in validation/masks.toml, each with a reason.
