---
title: "Sonic the Hedgehog (Master System)"
kicker: "Master System"
tags: ["Byte-exact oracle"]
featured: false
desc: "The 8-bit Sonic, not the Genesis one: a different game with its own Green Hill Zone, brought up on the Z80 framework."
year: "2026"
status: "Tech demo"
availability: "Public build"
provenance: "core"
platform: "master-system-game-gear"
repo: "https://github.com/mstan/SonicTheHedgehogSMSRecomp"
group: "Master System"
verified: "2026-08-20"
updated: "2026-07-23"
added: "2026-06-23"
cover: "./green-hill-zone.png"
---

This is the 8-bit Sonic the Hedgehog, the 1991 Master System game, and not the Genesis game that shares its name. Same hedgehog, some of the same zone names, different game underneath: its own level design, its own engine, its own Green Hill Zone. If you came looking for the 16-bit one, it is [Sonic the Hedgehog on Genesis](/games/sonic-the-hedgehog).

It is one of the two titles that brought up smsggrecomp, the Z80 framework behind the [Master System and Game Gear lineup](/hardware/master-system-game-gear). [Sonic Blast](/games/sonic-blast) is the other, released the same day.

## Playable status

Only as a tech demo, and the project says so plainly. An early Windows build is on the releases page. There is no launcher: you run it from a command line and hand it the path to a ROM dump you provide, keeping `SDL2.dll` beside the executable.

```
SonicTheHedgehogSMSRecomp.exe path\to\sonicthehedgehog.sms --window 3
```

It expects the SMS export ROM, CRC32 `0xB519E833`, 256 KB.

What has been checked is narrow, and stated precisely. Across roughly 60 seconds of the title screen and attract demo, the build ran entirely as recompiled native code with no interpreter fallback hit on that path, and its palette and system RAM matched the reference interpreter byte for byte. The game has not been played end to end. It boots and plays Green Hill Zone; coverage past that is unverified, and more code paths will surface during real play.

![The Green Hill title card, from the recompiled build](./green-hill-title-card.png)

## What the recomp adds

Not features, yet. This is a bring-up, and what the repository contributes over the framework is the per game side: the `game.toml` that describes the ROM's identity, mapper, RAM layout, discovery seeds and jump tables, plus the build glue and a pre-built release.

The controls are the minimum. Arrow keys are the d-pad, Z jumps, X is button 2, Enter is start and pause, Esc quits, and `--window` sets the scale factor.


## Sources

- [Project README and releases (GitHub)](https://github.com/mstan/SonicTheHedgehogSMSRecomp)
- [smsggrecomp framework (GitHub)](https://github.com/mstan/smsggrecomp)
