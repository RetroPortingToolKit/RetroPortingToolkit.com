---
title: "Faxanadu"
kicker: "NES"
tags: ["Text override"]
featured: false
desc: "The game that started the NES project, playable from title screen to credits, with dialogue you can edit in a text file."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/FaxanaduRecomp"
group: "NES"
links:
  - { label: "NESRecomp: From Faxanadu to 4 Supported Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/" }
verified: "2026-08-18"
updated: "2026-08-04"
added: "2026-03-15"
cover: "./title-screen.png"
---

Faxanadu was the [first commercial title](/blog/nesrecomp-4-titles) [NESRecomp](/hardware/nes) ever supported: the proof of concept that started the whole NES ecosystem, chosen because it was unlikely to already have much attention. Today it is one of the most complete games in the family, playable from title screen to credits and maintained by the core team.

It is also the game the [effort first got on screen at all](/blog/journey-with-ai-and-recompilation), in February 2026.

![The first successful render, February 2026. The sky palette is wrong and the sprites are garbled, but the world is there.](/data/blog/19_journey-with-ai-and-recompilation/faxanadu_pc_LeclJi8wRk.png)

## Playable status

Yes. Windows and experimental Linux builds are on [GitHub Releases](https://github.com/mstan/FaxanaduRecomp/releases). It is built from a dump you provide, the USA version. The game runs from title screen through credits with no outstanding known bugs, though it has not been 100 percent playtested.

## What the recomp adds

Password relief first. Faxanadu saves progress with long mantras instead of a battery, so the recomp keeps them for you. On startup it reads a plain text file next to the executable and auto-fills your most recent mantra on the password screen, and a command-line option can override it for a single session. Capturing the priest's mantra automatically is not yet implemented, so for now you still copy it into the file yourself.

It is also the showcase for the framework's Text Override System. Dialogue and glyphs are replaced at runtime from a JSON file, with hot reload, so an edit appears in the running game within about a second. That opens the door to retranslation and accessibility work without any ROM hacking. Save states and a fast-forward toggle round it out.


## Sources

- [FaxanaduRecomp README and releases (GitHub)](https://github.com/mstan/FaxanaduRecomp)
- [NESRecomp framework README (GitHub)](https://github.com/mstan/nesrecomp)
- [NESRecomp: From Faxanadu to 4 Supported Commercial Titles (1379.tech)](https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/)
