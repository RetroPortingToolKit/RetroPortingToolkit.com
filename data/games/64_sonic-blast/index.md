---
title: "Sonic Blast"
kicker: "Game Gear"
tags: ["Byte-exact oracle"]
featured: false
desc: "The Game Gear half of the Z80 framework: its own palette, viewport and stereo sound, on a title screen verified byte for byte."
year: "2026"
status: "Tech demo"
availability: "Public build"
provenance: "core"
platform: "master-system-game-gear"
repo: "https://github.com/mstan/SonicBlastGGRecomp"
group: "Game Gear"
verified: "2026-08-20"
updated: "2026-07-23"
added: "2026-06-23"
cover: "./title-screen.png"
---

Sonic Blast, the 1996 Game Gear game, is the other half of the first pair brought up on smsggrecomp, released the same day as [the 8-bit Sonic the Hedgehog](/games/sonic-the-hedgehog-sms). Sharing a framework is the point. The Game Gear is close kin to the Master System, so one runtime models both and layers the Game Gear's own palette, viewport and stereo sound over the shared parts, which is why the [Master System and Game Gear lineup](/hardware/master-system-game-gear) is a single project rather than two.

## Playable status

Only as a tech demo. An early Windows build is on the releases page. There is no launcher: you run it from a command line, point it at a ROM dump you provide, and keep `SDL2.dll` beside the executable.

```
SonicBlastGGRecomp.exe path\to\sonicblast.gg --window 4
```

It expects the GG export ROM, CRC32 `0x031B9DA9`, 1 MB.

The verified path is narrow and the project states its boundary exactly. Across about 60 seconds of the title screen and attract demo, the build ran entirely as recompiled native code with no interpreter fallback hit on that path, and its palette and system RAM matched the reference interpreter byte for byte. It boots through the intro to the SONIC BLAST title screen, and gameplay beyond that is largely unexercised. Expect bugs.

![Knuckles in the recompiled build](./gameplay.png)

## What the recomp adds

Nothing on top of the game yet. What this repository contributes is the per game side of the port: `game.toml` with the ROM's identity, mapper, RAM layout, discovery seeds and jump tables, the build script, and a pre-built release.

Controls are the minimum. Arrow keys are the d-pad, Z jumps, X is button 2, Enter is start, Esc quits, and `--window` sets the scale factor.


## Sources

- [Project README and releases (GitHub)](https://github.com/mstan/SonicBlastGGRecomp)
- [smsggrecomp framework (GitHub)](https://github.com/mstan/smsggrecomp)
