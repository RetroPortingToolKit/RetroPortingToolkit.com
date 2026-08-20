---
title: "Master System and Game Gear"
kicker: "Z80"
tags: ["Cross-platform", "Shared Z80 core"]
featured: false
desc: "One engine covers both Sega machines: Sonic the Hedgehog plays Green Hill Zone, Sonic Blast reaches its title screen, and the output is checked byte for byte against two accurate emulators."
year: "2026"
status: "Partial"
maturity: "Alpha"
availability: "Public build"
provenance: "core"
arch: "Zilog Z80"
repo: "https://github.com/mstan/smsggrecomp"
group: "Early platform work"
links:
  - { label: "Recomp + AI: 5 Months Later (1379.tech)", href: "https://1379.tech/recomp-ai-5-months-later/" }
verified: "2026-08-20"
cover: "./sonicblast-gameplay.png"
---

[Sonic the Hedgehog](/games/sonic-the-hedgehog-sms) boots and plays Green Hill Zone as a native app, built from a cartridge dump you provide. smsggrecomp translates a Master System or Game Gear game's Z80 code into C and runs it against a clean-room runner that models the rest of the machine. One engine covers both consoles, because the Game Gear is a Master System with a cropped viewport, a wider palette, and stereo sound.

## What runs today

Two games are in bring-up, each with its own repo and a prebuilt Windows download. [Sonic the Hedgehog](/games/sonic-the-hedgehog-sms) on Master System boots and plays Green Hill Zone. [Sonic Blast](/games/sonic-blast) on Game Gear boots through its intro to the title screen. Neither has been played end to end, and the framework describes itself as early and pre-release at v0.0.2. Other Sonic titles on these consoles are named as future targets.

What has been checked is narrow and precise. Over the roughly 40 to 60 seconds of title and attract demo exercised so far, both games run with no interpreter fallback at all, and both are compared against two accurate emulators, Mesen 2 and Genesis Plus GX, on seven accuracy axes: video and color memory come out byte identical, timing differences are jitter with no net drift, and audio lines up. The project keeps those claims, the evidence, and what is still outstanding in its own accuracy document rather than in a headline.

## Technical details

The recompiler decodes every reachable Z80 instruction in the ROM, starting from the reset, interrupt, and restart vectors plus jump tables and extra seeds named in the game's configuration, and emits one C function per subroutine over a shared Z80 state and the original 64 KB address space with its paged ROM. The rest of the machine is not recompiled: video, the SN76489 sound chip, the controller and system ports, and the Sega and Codemasters mappers all run in the runner. Computed jumps that the static analysis cannot resolve fall back to a vendored MIT licensed Z80 interpreter running over the live bus, and that same interpreter is the semantic reference the generated code is validated against.

The Z80 state contract and the verified instruction semantics live in a shared submodule, z80-recomp-core, which the Sega Genesis project also consumes for its sound processor. An optional output mode emits one instruction per call for hosts that drive the Z80 as an interleaved coprocessor, which is what that Genesis experiment needs. The runner builds on Windows, macOS, and Linux on SDL2. Neither the ROM nor the generated C is committed: you supply the dump, and the C is regenerated locally. The project has not declared a license yet, and the clean-room sound chip is original to it.

## Sources

- [Recomp + AI: 5 Months Later (1379.tech)](https://1379.tech/recomp-ai-5-months-later/)
- [smsggrecomp on GitHub](https://github.com/mstan/smsggrecomp)
