---
title: "Star Fox"
kicker: "Super Nintendo"
tags: ["Super FX", "Widescreen"]
featured: false
desc: "A hidden SNESRecomp proof of concept for Star Fox, Super FX, widescreen, and a custom renderer."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "super-nintendo"
showOnPlatform: false
repo: "https://github.com/mstan/StarFoxSNESRecomp"
group: "Super Nintendo"
links:
  - { label: "Star Fox Enhanced", href: "https://github.com/kandowontu/starfox-enhanced" }
verified: "2026-08-20"
updated: "2026-08-06"
added: "2026-07-15"
cover: "./starfox-title.png"
---

Star Fox is a hidden [SNESRecomp](/hardware/super-nintendo) development preview.

Its main value is framework work. It proves two ideas at once: experimental widescreen, and using a custom renderer with SNESRecomp.

The game also uses the Super FX chip, so the project has to keep that chip's behavior faithful instead of skipping around it.

## Playable status

Development preview. The game boots, and the attract sequence, menus, route selection, training, and gameplay have passed basic interactive testing.

Windows and Linux packages are on the GitHub releases page.

It is built from a dump you provide. Experimental 16:9 widescreen is available, but this project does not guarantee an end-to-end experience today.

If you want the full Star Fox experience, [Star Fox Enhanced](https://github.com/kandowontu/starfox-enhanced) is the definitive version to play.

Special thanks to [kandowontu](https://github.com/kandowontu) for Star Fox Enhanced, and for permission to use that work as a reference for SNESRecomp's custom renderer implementation.


## Sources

- [StarFoxSNESRecomp README and releases (GitHub)](https://github.com/mstan/StarFoxSNESRecomp)
- [Star Fox Enhanced (GitHub)](https://github.com/kandowontu/starfox-enhanced)
