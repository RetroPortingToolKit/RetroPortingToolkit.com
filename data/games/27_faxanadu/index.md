---
title: "Faxanadu"
kicker: "NES"
tags: ["Text override"]
featured: false
desc: "The game that started the NESRecomp project."
year: "2026"
status: "Playable alpha"
availability: "Public build"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/FaxanaduRecomp"
group: "NES"
links:
  - { label: "NESRecomp progress article (1379.tech)", href: "https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/" }
verified: "2026-08-18"
updated: "2026-08-04"
added: "2026-03-15"
cover: "./title-screen.png"
---

Faxanadu was the [first commercial title](/blog/nesrecomp-4-titles) [NESRecomp](/hardware/nes) ever supported.

It started the whole NES ecosystem.

It is also the game the [effort first got on screen at all](/blog/journey-with-ai-and-recompilation), in February 2026.

## Playable status

Yes. Windows and experimental Linux builds are on [GitHub Releases](https://github.com/mstan/FaxanaduRecomp/releases). It is built from a dump you provide, the USA version. Current builds cover the main playthrough path with no outstanding known bugs, though the game has not been 100 percent playtested.

## What the recomp adds

Password relief first. Faxanadu saves progress with long mantras instead of a battery, so the recomp keeps them for you. On startup it reads a plain text file next to the executable and auto-fills your most recent mantra on the password screen, and a command-line option can override it for a single session. Capturing the priest's mantra automatically is not yet implemented, so for now you still copy it into the file yourself.

It is also the showcase for the framework's text override system. Dialogue and glyphs are replaced at runtime from a JSON file, so an edit can appear in the running game without rebuilding or patching the ROM.


## Sources

- [FaxanaduRecomp README and releases (GitHub)](https://github.com/mstan/FaxanaduRecomp)
- [NESRecomp framework README (GitHub)](https://github.com/mstan/nesrecomp)
- [NESRecomp progress article (1379.tech)](https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/)
