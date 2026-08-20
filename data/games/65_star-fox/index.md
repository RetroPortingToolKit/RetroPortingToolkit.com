---
title: "Star Fox"
kicker: "Super Nintendo"
tags: ["Super FX", "Widescreen"]
featured: false
desc: "The cartridge had a second processor in it, and the recompilation cannot skip past it: Super FX stays authoritative, with an opt-in 16:9 view."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "super-nintendo"
repo: "https://github.com/mstan/StarFoxSNESRecomp"
group: "Super Nintendo"
verified: "2026-08-20"
updated: "2026-08-06"
added: "2026-07-15"
cover: "./starfox-title.png"
---

Star Fox is the [SNESRecomp](/hardware/super-nintendo) title with a second processor to answer for. The Super FX chip sat in the cartridge and did the 3D work the console could not, and this project does not route around it: the chip's low-level execution and architectural state stay authoritative, and compiled paths may speed that behavior up but are not allowed to diverge from it.

## Can I play it?

Yes, as a development preview. The game boots, and the attract sequence, menus, route selection, training, and gameplay have all passed basic interactive testing. Longer sessions, additional routes, and save-state behavior still need coverage before anyone calls it finished, and the project asks for reproducible visual, audio, timing, or stability reports.

Releases run to v0.0.3 (2026-08-06), which fixed audio crackle, with a Windows package and a Linux AppImage.

It is built from a dump you provide, and it is exact about which one: Star Fox (USA) version 1.2, unheadered, 1 MiB. The launcher verifies the ROM by SHA-256 before it will enable Play, then remembers the path.

## What the recomp adds

Widescreen is opt-in and set in `config.ini`. `16:9` is the tested preset, `Off` gives back the original 4:3 picture, and a plain integer from 0 to 95 asks for that many extra pixels on each side. Full 21:9 is not offered: that many extra pixels exceeds what the renderer can hold safely in the SNES's sprite table.

The rest is standard comfort. Ten save-state slots (Shift+F1 through F10 to save, F1 through F10 to load), turbo on Tab, fullscreen on Alt+Enter, a renderer toggle, and window size and volume on hotkeys. SDL game controllers are picked up automatically, and the default keyboard map is written to `keybinds.ini` beside the executable on first launch.

## Technical details

The 65C816 program is translated ahead of time into native C on the snesrecomp framework, while the shared runtime models the rest of the console. Super FX is what makes this game a test case rather than another port: the framework's own notes name Star Fox as the Super FX validation target, and here the coprocessor's behavior is the reference the compiled paths are measured against.

Addresses and annotations are checked against SpyderTL's exact-version Star Fox disassembly, pinned to a specific commit. The recompiler output is generated locally from your ROM and never committed, and the framework revision the project expects is recorded as a gitlink. No license has been declared yet.

## Sources

- [StarFoxSNESRecomp README and releases (GitHub)](https://github.com/mstan/StarFoxSNESRecomp)
