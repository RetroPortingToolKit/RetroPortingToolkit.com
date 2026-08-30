---
title: "Every repository"
summary: "All 79 repositories in the fleet, grouped by role, each linked and each attributed to the toolchain it belongs to, plus the dependency map showing which shared component is used by which project."
pageType: "reference"
tags: ["Fleet", "Repositories", "Index"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/recomp-ui"
  - "https://github.com/mstan/m68k-recomp-core"
  - "https://github.com/mstan/z80-recomp-core"
  - "https://github.com/TechnicallyComputers/recomp-net"
updated: "2026-08-25"
---

The fleet is 79 repositories: eleven per-console projects, seven shared components and 61 game ports. Every one is listed here with its role and the toolchain it belongs to. That attribution is usually the first fact you need, and no single repository states it. For what a console's toolchain does rather than where it lives, read the [platform pages](/docs/platforms).

## The count

| Group | Repositories |
|---|---|
| Per-console projects | 11 |
| Shared components consumed as submodules | 7 |
| Game ports | 61 |
| **Total** | **79** |

Three of the 79 turned up only by resolving relative submodule URLs: `m68k-recomp-core`, `z80-recomp-core` and `recomp-ui`. No listing in the fleet shows them, and nothing else on this site links to them. `recomp-ui` is a large shared component, pinned by 55 of the 61 game ports.

> **Note.** Default branches vary. Of these 79 repositories, 45 default to `main` and 34 to `master`. A `blob/main` file URL is wrong for 34 of them.

## Per-console projects

Ten of these are a recompiler and a runtime for one machine. A game port is a thin repository on top of one of them. The eleventh, `xboxlle-probe`, is an instrument rather than a toolchain and runs no games. Status wording is each project's own, never upgraded.

| Repository | Console | What it is | Status in its own words |
|---|---|---|---|
| [mstan/psxrecomp](https://github.com/mstan/psxrecomp) | PlayStation | MIPS R3000A to C, translating both a BIOS image and the game executable, with disc-streamed overlays captured and compiled at run time | "The breadth-first push is essentially done; work now is depth and optimization." |
| [mstan/nesrecomp](https://github.com/mstan/nesrecomp) | NES | 6502 to C, plus a C runner library that simulates the PPU, APU, mapper and input | "This builds a static library. It does not create a playable game by itself." |
| [mstan/snesrecomp](https://github.com/mstan/snesrecomp) | SNES | 65816 to C against a C model of the rest of the console, with an interpreter kept live underneath as the correctness floor | "SNESRecomp is alpha software." |
| [mstan/gbarecomp](https://github.com/mstan/gbarecomp) | Game Boy Advance | ARM7TDMI, both ARM and Thumb, to sharded C++ against a shared GBA hardware runtime | "These projects are experimental previews and byproducts of developing the framework." |
| [mstan/segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) | Sega Genesis | 68000 to native C, with the console's second processor, the Z80 sound CPU, handled by the runner | Per-feature table: 68K frontend "Active", sound Z80 static recompilation "Experimental" |
| [mstan/smsggrecomp](https://github.com/mstan/smsggrecomp) | Master System, Game Gear | One Z80 engine for both machines, the Game Gear being a platform flag rather than a fork | "**Status: early (v0.0.2) pre-release, expect bugs.**" |
| [mstan/vbrecomp](https://github.com/mstan/vbrecomp) | Virtual Boy | NEC V810 to C, plus a runtime, a TCP debug server and a Beetle VB oracle harness. No V810 interpreter exists in the project at all | The framework carries no status banner. Its downstream port states "**Status: Playable.**" |
| [mstan/ndsrecomp](https://github.com/mstan/ndsrecomp) | Nintendo DS | Both DS processors lifted to C ahead of time and interleaved on one event scheduler | "Status: very early pre-alpha (v0.0.1)" |
| [mstan/cdirecomp](https://github.com/mstan/cdirecomp) | CD-i | SCC68070 to C, recompiling and running the console's entire CD-RTOS system ROM rather than stubbing it | "Very early development" and "**Gameplay is not yet reachable.**" |
| [mstan/gcnlle](https://github.com/mstan/gcnlle) | GameCube | PowerPC Gekko to C for the console's IPL boot ROM, on a fork of the DolRecomp engine, plus a net-new hardware runtime | "**Early development:** this is research software, not a general GameCube emulator and not ready for ordinary game use." |
| [mstan/xboxlle-probe](https://github.com/mstan/xboxlle-probe) | Xbox | Not a recompiler. An nxdk homebrew agent plus a Python host client that reads registers and memory from a real console | "THIS SOFTWARE CAN CRASH, CORRUPT, OR BRICK AN XBOX" |

## Shared components

Separately versioned repositories that other projects consume as git submodules. The first three are the ones no listing shows.

| Repository | What it is | Consumed by |
|---|---|---|
| [mstan/m68k-recomp-core](https://github.com/mstan/m68k-recomp-core) | "Shared clean-room Motorola 68000-family static-recompiler frontend". A shared decoder, validator and annotation reader, plus two platform profiles, `genesis` and `scc68070`. Shipped as a source package, not a library, because it depends on consumer-owned headers | segagenesisrecomp, cdirecomp |
| [mstan/z80-recomp-core](https://github.com/mstan/z80-recomp-core) | "Shared Zilog Z80 static-recompiler runtime contract and verified instruction semantics". The decoder and C emitter still live in smsggrecomp; this is the platform-neutral layer their output consumes | segagenesisrecomp, smsggrecomp |
| [mstan/recomp-ui](https://github.com/mstan/recomp-ui) | "A shared, **console-agnostic launcher and in-game settings UI** for static-recompilation game ports." One Dear ImGui core, composed per console from a single profile row | 58 game ports across eight consoles |
| [TechnicallyComputers/recomp-net](https://github.com/TechnicallyComputers/recomp-net) | "Portable **delay-sync** netcode library for recompilation / modern-runtime hosts". C11, version 0.1.0, with a rollback architecture on a branch | psxrecomp, nesrecomp, snesrecomp, segagenesisrecomp |
| [TechnicallyComputers/recomp-net-server](https://github.com/TechnicallyComputers/recomp-net-server) | The lobby and signalling control plane for recomp-net, in Rust. Explicitly "**not** part of the `recomp-net` library tree" | Run as a service, not linked |
| [TechnicallyComputers/retcomm-rbengine](https://github.com/TechnicallyComputers/retcomm-rbengine) | "Portable **rollback host helpers**". recomp-net owns the wire and the state machine, this owns the host policy that makes rollback feel playable | psxrecomp |
| [TechnicallyComputers/retcomm-catalog](https://github.com/TechnicallyComputers/retcomm-catalog) | JSON manifests of supported titles, downloaded by the RetComM Launcher independently of app updates. Twelve titles at the time of this survey, all PlayStation | The launcher, over HTTP |

## Game ports

61 repositories, each a thin layer over one toolchain: a CMake glue file, per-game recompiler input, a small hand-written runtime shim, a `tools/` directory and a README. None of them holds a game file, and none holds the generated C. See [Port a game](/docs/guides/port-a-game) for what that layer contains.

### PlayStation, on psxrecomp

Twenty repositories. Eighteen pin psxrecomp as a submodule, at path `psxrecomp` or `psxrecomp-v4`.

| Repository | Note |
|---|---|
| [mstan/TombaRecomp](https://github.com/mstan/TombaRecomp) | |
| [mstan/Tomba2Recomp](https://github.com/mstan/Tomba2Recomp) | |
| [mstan/ApeEscapeRecomp](https://github.com/mstan/ApeEscapeRecomp) | |
| [mstan/MegaManX4Recomp](https://github.com/mstan/MegaManX4Recomp) | |
| [mstan/MegaManX5Recomp](https://github.com/mstan/MegaManX5Recomp) | |
| [mstan/MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp) | The fleet's most heavily modded port, and the reason the mod package system exists |
| [mstan/TsumuLightRecomp](https://github.com/mstan/TsumuLightRecomp) | |
| [OpokXeno/xenogears-recomp](https://github.com/OpokXeno/xenogears-recomp) | Points both its psxrecomp and its recomp-ui submodules at that owner's own forks |
| [PeriBluGaming/ToyStory2Recomp](https://github.com/PeriBluGaming/ToyStory2Recomp) | Declares no submodules. Carries a partial snapshot of the framework and a vendored copy of recomp-ui as a plain tree |
| [Alexbeav/syphon-filter-2-recompiled](https://github.com/Alexbeav/syphon-filter-2-recompiled) | Declares no submodules, and ships a setup kit rather than a binary |
| [TechnicallyComputers/MastersOfTerasKasiRecomp](https://github.com/TechnicallyComputers/MastersOfTerasKasiRecomp) | Netplay title, with disc identity requirements in its `game.toml` |
| [TechnicallyComputers/BombermanPartyEditionRecomp](https://github.com/TechnicallyComputers/BombermanPartyEditionRecomp) | Netplay title |
| [TechnicallyComputers/Bomberman-World-Recomp](https://github.com/TechnicallyComputers/Bomberman-World-Recomp) | |
| [TechnicallyComputers/Bomberman-Fantasy-Race-Recomp](https://github.com/TechnicallyComputers/Bomberman-Fantasy-Race-Recomp) | |
| [TechnicallyComputers/Klonoa-Door-to-Phantomile](https://github.com/TechnicallyComputers/Klonoa-Door-to-Phantomile) | |
| [TechnicallyComputers/Marvel-vs.-Capcom-Clash-of-Super-Heroes-Recomp](https://github.com/TechnicallyComputers/Marvel-vs.-Capcom-Clash-of-Super-Heroes-Recomp) | |
| [TechnicallyComputers/Metal-Slug-X-Recomp](https://github.com/TechnicallyComputers/Metal-Slug-X-Recomp) | |
| [TechnicallyComputers/Rampage---Through-Time-Recomp](https://github.com/TechnicallyComputers/Rampage---Through-Time-Recomp) | |
| [TechnicallyComputers/Street-Fighter-Alpha-3-Recomp](https://github.com/TechnicallyComputers/Street-Fighter-Alpha-3-Recomp) | |
| [TechnicallyComputers/TwistedMetal4Recomp](https://github.com/TechnicallyComputers/TwistedMetal4Recomp) | |

### NES, on nesrecomp

Ten repositories, all pinning nesrecomp as a submodule at path `nesrecomp`.

| Repository | Note |
|---|---|
| [mstan/SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp) | Pins a disassembly project as a second submodule, and carries a `THIRD-PARTY-LICENSES/` directory |
| [mstan/LegendOfZeldaNESRecomp](https://github.com/mstan/LegendOfZeldaNESRecomp) | |
| [mstan/MetroidNESRecomp](https://github.com/mstan/MetroidNESRecomp) | |
| [mstan/Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp) | |
| [mstan/FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp) | One of only two repositories in the whole fleet carrying a `MODDING.md` |
| [mstan/GumshoeNESRecomp](https://github.com/mstan/GumshoeNESRecomp) | |
| [mstan/DrMarioNesRecomp](https://github.com/mstan/DrMarioNesRecomp) | |
| [mstan/DuckHuntNESRecomp](https://github.com/mstan/DuckHuntNESRecomp) | |
| [mstan/YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp) | |
| [mstan/YoshisCookieRecomp](https://github.com/mstan/YoshisCookieRecomp) | |

### SNES, on snesrecomp

Eight repositories. Seven pin snesrecomp as a submodule; one vendors it.

| Repository | Note |
|---|---|
| [mstan/SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp) | The most thoroughly documented port in the fleet, and the one that builds two variants from one repository |
| [mstan/MegaManXSNESRecomp](https://github.com/mstan/MegaManXSNESRecomp) | Commits a runtime coverage manifest and feeds it back into regeneration |
| [mstan/SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp) | |
| [mstan/StarFoxSNESRecomp](https://github.com/mstan/StarFoxSNESRecomp) | |
| [mstan/ZeldaAlttPSNESRecomp](https://github.com/mstan/ZeldaAlttPSNESRecomp) | |
| [mstan/DKC2Recomp](https://github.com/mstan/DKC2Recomp) | Points its snesrecomp and recomp-ui submodules at `Nicktendonick` forks. MIT at the root over a noncommercial framework |
| [Team-Resurgent/MegaManX-X](https://github.com/Team-Resurgent/MegaManX-X) | Vendors snesrecomp as a plain tree, and declares recomp-ui in `.gitmodules` while shipping no gitlink for it, so a clean clone cannot configure |

One more SNES repository is in the fleet and is not named or linked here. Its license file says the repository is proprietary, confidential and meant to stay private, so this site holds it back until its owner has been asked. [Licenses](/docs/fleet/licenses) does the same.

### Game Boy Advance, on gbarecomp

Fourteen repositories, all pinning gbarecomp as a submodule at path `gbarecomp`. Every one of them boots through the real recompiled BIOS, so the user supplies a BIOS dump as well as a cartridge dump.

| Repository | Note |
|---|---|
| [mstan/MinishCapRecomp](https://github.com/mstan/MinishCapRecomp) | Carries the fleet's canonical `baserom.md`, quoted on [The game file you supply](/docs/concepts/the-game-file-you-supply) |
| [mstan/MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp) | |
| [mstan/MarioKartSuperCircuitRecomp](https://github.com/mstan/MarioKartSuperCircuitRecomp) | Pins a decompilation project as a second submodule |
| [mstan/SuperMarioAdvance2Recomp](https://github.com/mstan/SuperMarioAdvance2Recomp) | |
| [mstan/SuperMarioAdvance4Recomp](https://github.com/mstan/SuperMarioAdvance4Recomp) | |
| [mstan/WarioWareTwistedRecomp](https://github.com/mstan/WarioWareTwistedRecomp) | Pins SDL as an Android build submodule |
| [mstan/EmeraldRecomp](https://github.com/mstan/EmeraldRecomp) | Pins a decompilation project as a second submodule |
| [mstan/FireRedLeafGreenRecomp](https://github.com/mstan/FireRedLeafGreenRecomp) | Pins a decompilation project as a second submodule |
| [mstan/RubySapphireRecomp](https://github.com/mstan/RubySapphireRecomp) | Pins a decompilation project as a second submodule |
| [mstan/DragonBallZBuusFuryRecomp](https://github.com/mstan/DragonBallZBuusFuryRecomp) | |
| [mstan/DragonBallZLegacyOfGokuRecomp](https://github.com/mstan/DragonBallZLegacyOfGokuRecomp) | |
| [mstan/DragonBallZLegacyofGokuIIRecomp](https://github.com/mstan/DragonBallZLegacyofGokuIIRecomp) | |
| [mstan/ShrekGBAVideoRecomp](https://github.com/mstan/ShrekGBAVideoRecomp) | The cartridge that needed a 64 MiB mapper the toolchain calls Matrix Memory |
| [Shy/BoktaiRecomp](https://github.com/Shy/BoktaiRecomp) | Points its gbarecomp submodule at that owner's own fork |

### Sega Genesis, on segagenesisrecomp

| Repository | Note |
|---|---|
| [mstan/SonicTheHedgehogRecomp](https://github.com/mstan/SonicTheHedgehogRecomp) | The reference Genesis port. Its README reports "530+ functions" generated and "Zero dispatch misses on GHZ" |
| [mstan/SonicTheHedgehog2Recomp](https://github.com/mstan/SonicTheHedgehog2Recomp) | Has no runner of its own and reaches through the Sonic 1 repository to get to the submodule. The fleet's most heavily widescreen-configured port, at 46 injection sites |
| [mstan/Sonic3AndKnucklesRecomp](https://github.com/mstan/Sonic3AndKnucklesRecomp) | Three games in one repository as three build modes, because the lock-on cartridge is the two smaller ones combined |

### Master System and Game Gear, on smsggrecomp

| Repository | Note |
|---|---|
| [mstan/SonicTheHedgehogSMSRecomp](https://github.com/mstan/SonicTheHedgehogSMSRecomp) | One of the two bring-up titles for the toolchain |
| [mstan/SonicBlastGGRecomp](https://github.com/mstan/SonicBlastGGRecomp) | The Game Gear half of the same bring-up |

### Virtual Boy, Nintendo DS and Nintendo 64

| Repository | Console | Toolchain | Note |
|---|---|---|---|
| [mstan/MarioTennisVirtualBoyRecomp](https://github.com/mstan/MarioTennisVirtualBoyRecomp) | Virtual Boy | vbrecomp | The only vbrecomp port. Its license is scoped to build glue, CMake wiring and documentation only |
| [mstan/MetroidPrimeHuntersRecomp](https://github.com/mstan/MetroidPrimeHuntersRecomp) | Nintendo DS | ndsrecomp | The only ndsrecomp port, and it consumes the framework through an `ndsrecomp.pin` file rather than a submodule |
| [mstan/PokemonStadiumRecomp](https://github.com/mstan/PokemonStadiumRecomp) | Nintendo 64 | Not written by this fleet, see [Nintendo 64](/hardware/nintendo-64) | One of the two ports here built on an outside framework. Archived |
| [mstan/PocketMonstersStadiumRecomp](https://github.com/mstan/PocketMonstersStadiumRecomp) | Nintendo 64 | Not written by this fleet, see [Nintendo 64](/hardware/nintendo-64) | The other one. Reaches its framework through a pin file rather than a submodule |

## What consumes what

Fifteen of the 83 repositories declare no submodules at all. The rest declare at least one, and this table collapses every declaration to one row per shared component. It tells you how far a change to a shared repository reaches.

| Component | Consumers | Who |
|---|---|---|
| [recomp-ui](https://github.com/mstan/recomp-ui) | 55 gitlinks, plus 1 vendored tree and 1 broken declaration | Game ports on PlayStation, SNES, GBA, NES, Genesis, Virtual Boy and N64 |
| [psxrecomp](https://github.com/mstan/psxrecomp) | 18 | The PlayStation ports, at path `psxrecomp` or `psxrecomp-v4` |
| [gbarecomp](https://github.com/mstan/gbarecomp) | 14 | Every Game Boy Advance port |
| [nesrecomp](https://github.com/mstan/nesrecomp) | 10 | Every NES port |
| [snesrecomp](https://github.com/mstan/snesrecomp) | 7 gitlinks plus 1 vendored tree | Every SNES port |
| [recomp-net](https://github.com/TechnicallyComputers/recomp-net) | 4 | nesrecomp, psxrecomp and snesrecomp at `lib/recomp-net`; segagenesisrecomp at `external/recomp-net` |
| [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) | 3 | Every Genesis port |
| [m68k-recomp-core](https://github.com/mstan/m68k-recomp-core) | 2 | segagenesisrecomp and cdirecomp, both at `external/m68k-recomp-core` |
| [z80-recomp-core](https://github.com/mstan/z80-recomp-core) | 2 | segagenesisrecomp and smsggrecomp, both at `external/z80-recomp-core` |
| [smsggrecomp](https://github.com/mstan/smsggrecomp) | 2 | Both Sega 8-bit ports |
| [vbrecomp](https://github.com/mstan/vbrecomp) | 1 | The Virtual Boy port |
| [retcomm-rbengine](https://github.com/TechnicallyComputers/retcomm-rbengine) | 1 | psxrecomp, at `lib/retcomm-rbengine` |

A shared component is not the same everywhere it is used. Three details.

**recomp-ui is shared in intent and fanned out in practice.** Its 55 gitlinks pin 18 different commits. The closest is one commit behind its default branch, the furthest 231 behind. Two consumers point their submodule URL at a fork instead of the original, three suppress status reporting with `ignore = all`, and three pin a named feature branch.

**The two CPU cores are in much better shape.** Both z80-recomp-core consumers pin the identical commit, which is that repository's only commit. The two m68k-recomp-core consumers are 14 commits apart on one line of development, with cdirecomp behind rather than forked. Their shared decoder and validator are byte-identical between the two pins. All the drift sits in the Genesis profile, which is the split that repository's README asks for.

**A vendored copy inside a game port is not the framework.** `PeriBluGaming/ToyStory2Recomp` and `Team-Resurgent/MegaManX-X` each carry a partial snapshot of a framework instead of a submodule, including older attribution files that say different things. For any statement about a framework, read the framework repository.

## Two repositories that are no longer reachable

`TechnicallyComputers/Crash-Team-Racing-Recomp` and `TechnicallyComputers/Crash-Bash-Recomp` are named by game pages elsewhere on this site and no longer resolve. Another repository in the same organisation resolves normally, so this is not a network fault: both have gone private or been deleted. They are not linked here, because a link would send you to a 404. Neither could be read, so nothing here says what they held.

## Source

- The repository list, the toolchain attribution per game port and the canonical port layout come from each repository's `.gitmodules`, from the `*.pin` files used where a framework is not a submodule, and from each README.
- The dependency map comes from every `.gitmodules` file and every gitlink in the fleet, read together.
- Status quotations come from the README of the repository being quoted. Toolchain READMEs: [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/README.md), [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/README.md), [snesrecomp](https://github.com/mstan/snesrecomp/blob/main/README.md), [gbarecomp](https://github.com/mstan/gbarecomp/blob/main/README.md), [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/README.md), [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/README.md), [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/README.md), [ndsrecomp](https://github.com/mstan/ndsrecomp/blob/main/README.md), [cdirecomp](https://github.com/mstan/cdirecomp/blob/master/README.md), [gcnlle](https://github.com/mstan/gcnlle/blob/master/README.md), [xboxlle-probe](https://github.com/mstan/xboxlle-probe/blob/main/README.md).
- Shared component descriptions: [`m68k-recomp-core/README.md`](https://github.com/mstan/m68k-recomp-core/blob/main/README.md), [`z80-recomp-core/README.md`](https://github.com/mstan/z80-recomp-core/blob/main/README.md), [`recomp-ui/README.md`](https://github.com/mstan/recomp-ui/blob/master/README.md), [`recomp-net/README.md`](https://github.com/TechnicallyComputers/recomp-net/blob/main/README.md), [`recomp-net-server/README.md`](https://github.com/TechnicallyComputers/recomp-net-server/blob/main/README.md), [`retcomm-rbengine/README.md`](https://github.com/TechnicallyComputers/retcomm-rbengine/blob/main/README.md), [`retcomm-catalog/README.md`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/README.md).

## Next

- [Licenses](/docs/fleet/licenses) for what each of these repositories declares, including the 48 that declare nothing.
- [Lineage and credit](/docs/fleet/lineage-and-credit) for how these projects descend from each other.
- [Port a game](/docs/guides/port-a-game) for what is inside one of the 64 game port repositories and how it uses its toolchain.
- [Glossary](/docs/concepts/glossary) for the vocabulary every one of these repositories assumes you already have.
