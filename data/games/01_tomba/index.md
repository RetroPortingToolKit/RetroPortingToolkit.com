---
title: "Tomba!"
kicker: "PlayStation"
tags: ["Widescreen", "Debug menu", "FMV skip"]
featured: true
desc: "PSXRecomp's first game and its most lived-in: a mature alpha you can play end to end, with save states, rewind, and experimental widescreen."
year: "2026"
status: "Mature alpha"
availability: "Public build"
provenance: "core"
platform: "playstation"
repo: "https://github.com/mstan/TombaRecomp"
group: "PlayStation"
links:
  - { label: "psxrecomp Overhauled. Now BIOS + Tomba (1379.tech)", href: "https://1379.tech/psxrecomp-overhauled-now-bios-tomba/" }
  - { label: "Watch: Tomba Recomp is out now", href: "/blog/video-tomba-out-now" }
  - { label: "Watch: save states and rewind in Tomba", href: "/blog/video-tomba-save-states-rewind" }
cover: "/covers/tomba-gameplay.jpg"
videoUrl: "https://www.youtube.com/watch?v=sbqPnJhb3uk"
verified: "2026-08-18"
updated: "2026-08-12"
added: "2026-03-15"
---

Every framework has a first game. For [PSXRecomp](/hardware/playstation), that game was Tomba!.

It is still an alpha, but it is a mature one. You can play it end to end, and new PSXRecomp ecosystem features often show up here first.

![Tomba! running from a native build](/previews/tomba.mp4)

## Playable status

Yes. It is a mature alpha with a public build.

The game itself comes from a file you provide. Supported inputs include a Tomba! (USA) disc image and the CHD from the Steam release. Everything boots from a bundled open-source BIOS, so no extra files are needed, though the launcher accepts your own retail BIOS dump if you prefer it.

![Tomba! in the psxrecomp launcher](./tomba-launcher.png)

## What the recomp adds

Save states and rewind were shown publicly for the first time on this title. They are PSXRecomp ecosystem features, with Tomba! as the showcase.

![Rewind in action](/covers/tomba-rewind.jpg)

Beyond that:

- Experimental 16:9 widescreen. It shows more of the world instead of stretching the picture, but it may expose areas the original game never expected you to see.
- FMV skipping, with an optional auto-skip for the intro. This carries forward from Tomba! Special Edition work.
- A warp debug menu. This was left in the original game; the recomp makes it easier to reach.
- Controller choice: analog or D-pad, plus an optional Hybrid mode that switches to digital when you touch the D-pad and back to analog when you move the stick. This also carries forward from Tomba! Special Edition work.
- Your in-game OPTION settings, like text speed and other choices, persist across launches. That also comes from the Tomba! Special Edition direction.

![Video Game Esoterica on the updated Tomba! recompilation](https://www.youtube.com/watch?v=sbqPnJhb3uk)

## Sources

- [Project README and releases (GitHub)](https://github.com/mstan/TombaRecomp)
- [psxrecomp Overhauled. Now BIOS + Tomba (1379.tech)](https://1379.tech/psxrecomp-overhauled-now-bios-tomba/)
- [I Built a PS1 Static Recompiler With No Prior Experience (1379.tech)](https://1379.tech/i-built-a-ps1-static-recompiler-with-no-prior-experience-and-claude-code/)
- [Watch: Tomba Recomp is out now](/blog/video-tomba-out-now)
- [Watch: save states and rewind in Tomba](/blog/video-tomba-save-states-rewind)
