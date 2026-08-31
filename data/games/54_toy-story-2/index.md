---
title: "Toy Story 2: Buzz Lightyear to the Rescue"
kicker: "PlayStation"
tags: ["Widescreen"]
featured: false
desc: "Playable from BIOS boot through gameplay on Windows and Intel macOS, with a cache that turns the areas you visit into native code as you play."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "community"
platform: "playstation"
repo: "https://github.com/PeriBluGaming/ToyStory2Recomp"
group: "PlayStation"
verified: "2026-08-20"
updated: "2026-08-07"
added: "2026-07-29"
cover: "./toystory2-gameplay.jpg"
---

ToyStory2Recomp is a community project by PeriBluGaming that rebuilds Toy Story 2: Buzz Lightyear to the Rescue as a native program on [PSXRecomp](/hardware/playstation). The author sets expectations in the first line of the README: this is an in-development preview rather than a finished port, and depth will keep landing over months, not days.

## Playable status

Yes, in the alpha sense. Windows and Intel macOS builds are published, both marked pre-release, and both built around the framework's shared recomp-ui launcher.

The project's own status table says the game is playable from BIOS boot through gameplay, with crashes tracked in the repository's issue log. Booting, the disc-detect and licence screen, the title menu and options, new game and load game, and memory-card saving and loading are all listed as working. The intro video is listed as not working for now.

The download runs directly rather than compiling anything: extract the zip, run the executable, and a launcher window opens. Point it at your own BIOS or the bundled OpenBIOS, then at your Toy Story 2 (USA, SLUS-00893) disc image, so the game data comes from a dump you provide. A cue plus bin is preferred, and a plain bin or an iso is accepted.

## What the recomp adds

Two renderers: a CPU software rasterizer, and a GPU-authoritative OpenGL backend that falls back to software if GL fails to start.

The self-growing native cache is the interesting one. Areas you visit are converted to native code as you play, and the result is kept for later launches, so the game gets faster the more of it you have seen. The overlay cache is switched on in the game's own configuration.

Widescreen at 16:9 is present, experimental and opt-in, and widens the field of view rather than stretching the picture. Controllers work in analog or D-pad modes. Launcher settings persist between sessions, and saves are standard .mcd memory-card files that emulators can also read.


## Sources

- [Project README, issue log and releases (GitHub)](https://github.com/PeriBluGaming/ToyStory2Recomp)
