---
title: "NESRecomp: From Faxanadu to 4 Supported Commercial Titles"
author: "Matthew Stanley"
kicker: "1379.tech"
tags: []
featured: false
desc: "Four NES games and counting: how the recompiler learned to find functions in binaries that never carried a symbol."
date: "2026-03-28"
venue: "1379.tech"
layout: "article"
cover: "./cover.png"
links:
  - { label: "Read on 1379.tech", href: "https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/" }
---

- [nesrecomp](https://github.com/mstan/nesrecomp)
- [LegendOfZeldaNESRecomp](https://github.com/mstan/LegendOfZeldaNESRecomp)
- [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp)
- [SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp)
- [DrMarioNESRecomp](https://github.com/mstan/DrMarioNesRecomp)

When I originally wrote about Faxanadu running through a static recompiler, it was effectively a proof of concept. It demonstrated that 6502 code could be translated into native C and run without an interpreter, but it required a fair amount of manual intervention and game-specific handling to get there.

Since then, NESRecomp has evolved into something much more consistent. It is no longer just a one-off success case; it now behaves like a reusable framework capable of supporting multiple commercial titles with far less guesswork.

[Watch: 2026 03 28 NESRecomp Demos | (Legend of Zelda, Dr Mario, SMB)](https://www.youtube.com/watch?v=qGDWf9JqXIY)

## Supported Games

NESRecomp currently supports four commercial games:

- **Super Mario Bros.** (Mapper 0 / NROM)
- **Faxanadu** (MMC1)
- **The Legend of Zelda** (MMC1, SRAM execution)
- **Dr. Mario** (MMC1, CHR ROM bank switching)

These cover a reasonable range of behaviors, from simple fixed layouts to bank switching and runtime code relocation.

## Function Discovery Improvements

Function discovery was one of the main early bottlenecks. Identifying function boundaries in 6502 code is not straightforward, particularly with indirect jumps and bank switching involved. The current system improves this through graph walking (JSR/RTS), better handling of dispatch tables, and register state propagation to resolve bank context.

One notable acceleration for The Legend of Zelda came from leveraging zelda1-disassembly by Aldo Nunez. Specifically, I scanned all JSR TableJump ($E5E2) call sites and parsed their inline address tables to extract dispatch targets that static analysis alone could not reliably resolve. This significantly reduced missed functions and helped stabilize the Zelda recomp much earlier in the process.

In addition, incorporating function seeds from disassemblies more broadly has proven effective. Super Mario Bros. and Zelda both benefited from this, with a noticeable improvement in coverage and fewer missing execution paths.

## Mapper Support

Mapper support has expanded to include both Mapper 0 (NROM) and Mapper 1 (MMC1), including PRG and CHR bank switching. This was necessary to move beyond simpler titles and handle more representative NES behavior.

Once mapper behavior is modeled correctly, the remaining work tends to be straightforward translation rather than special-case handling.

## SRAM Execution

The Legend of Zelda also introduced the need for SRAM execution support. The game copies code into SRAM and executes it from there, which breaks the assumption that executable code only resides in ROM.

Handling this required mapping runtime memory behavior back into the static model. With that in place, this pattern is no longer a blocker.

## Runtime Stability

The runtime layer is now stable enough to consistently produce playable output. Rendering (backgrounds, sprites, scroll behavior) and APU audio are implemented well enough for real gameplay rather than just validation.

There are still minor issues. Dr. Mario currently runs audio slightly faster than expected, and Faxanadu has some transparency inconsistencies in certain areas. These are relatively contained issues and do not impact overall playability.

## Debugging Workflow

Debugging has improved in a practical sense. Deterministic timing, save states, and input scripting make issues easier to reproduce. There is also support for validating behavior against an emulator, which helps isolate whether a problem is in code generation or runtime behavior.

The workflow is now iterative rather than exploratory. Problems can be narrowed down and addressed without large amounts of guesswork.

## Reduced Game-Specific Handling

The most meaningful improvement is that new games require less custom logic. Earlier iterations often required patching edge cases per title. Many of those patterns are now handled generically, including dispatch tables, pointer tricks, and undocumented opcodes.

There are still edge cases, but they are increasingly absorbed into the framework rather than handled externally.

## Closing Thoughts

The original Faxanadu work established that static recompilation on the NES was viable. The current state shows that it can be applied more broadly and with less manual effort.

Minor issues still exist, but the overall pipeline is stable and continues to improve. Support for additional games is increasing, and most of the work now revolves around extending coverage rather than proving new concepts.

NES remains a practical target for this approach due to its relatively simple architecture, and NESRecomp is now in a position where progress is incremental and consistent rather than experimental.

---

Related: [Faxanadu](/games/faxanadu), [Super Mario Bros.](/games/super-mario-bros), [The Legend of Zelda](/games/legend-of-zelda), and [Dr. Mario](/games/dr-mario) on [NES](/hardware/nes).
