---
title: "Faxanadu"
kicker: "NES"
tags: ["Text override"]
featured: false
desc: "NESRecomp's first supported commercial title and the showcase for its JSON-driven Text Override System."
year: "2026"
status: "Alpha"
provenance: "core"
platform: "nes"
repo: "https://github.com/mstan/FaxanaduRecomp"
group: "NES"
links:
  - { label: "FaxanaduRecomp on GitHub", href: "https://github.com/mstan/FaxanaduRecomp" }
  - { label: "NESRecomp: From Faxanadu to 4 Supported Commercial Titles (1379.tech)", href: "https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/" }
---

Faxanadu was the first commercial title supported by [NESRecomp](/hardware/nes) and remains a fixture of the ecosystem, maintained by the core team.

## What works today

The game runs as statically recompiled native code through the shared NESRecomp runner, with save-state slots available. Windows x64 is the primary platform; macOS support is experimental.

## Enhancements

Faxanadu is the showcase for the framework's Text Override System: JSON-driven text and glyph replacement, applied at runtime with hot reload, so dialogue edits can be tested without touching the ROM.

## Known limitations

A minor transparency issue was noted in the team's 2026-03-28 write-up.

No game data is distributed; the project builds from your own legally dumped ROM.
