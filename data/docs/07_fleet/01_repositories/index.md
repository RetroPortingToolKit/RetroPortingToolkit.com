---
title: "Every repository"
summary: "All 87 repositories in the fleet, grouped by role, each linked and each attributed to the toolchain it belongs to, plus the dependency map showing which shared component is consumed by which project."
section: "fleet"
sectionTitle: "Fleet"
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
  - "https://github.com/N64Recomp/N64Recomp"
updated: "2026-08-23"
---

This is the index the rest of this wiki hangs off. The fleet is 87 repositories: twelve per-console projects, seven shared components, 64 game ports and four upstream projects it takes its ideas from. Every one is listed here with its role and the toolchain it belongs to, because that attribution is the fact you usually need first and no single repository states it. If you are looking for what a console's toolchain does rather than where it lives, the [platform pages](/docs/platforms) are the technical write-ups and these are the addresses.

## The count

| Group | Repositories |
|---|---|
| Per-console projects | 12 |
| Shared components consumed as submodules | 7 |
| Game ports | 64 |
| Upstream projects | 4 |
| **Total** | **87** |

Three of the 87 turned up only by resolving relative submodule URLs: `m68k-recomp-core`, `z80-recomp-core` and `recomp-ui`. No listing in the fleet surfaces them, and nothing else on this site links to them, which is why they get their own group below rather than a footnote. `recomp-ui` in particular is a substantial shared component pinned by 58 of the 64 game ports.

> **Note.** Default branches vary. Of these 87 repositories, 48 default to `main`, 38 to `master`, and one, Zelda64Recomp, to `dev`. A `blob/main` file URL is wrong for 39 of them.

## Per-console projects

Eleven of these are a recompiler and runtime pair for one machine, and a game port is a thin repository on top of one of them. The twelfth, `xboxlle-probe`, is an instrument rather than a toolchain and runs no games at all. Status wording is each project's own, never upgraded.

| Repository | Console | What it is | Status in its own words |
|---|---|---|---|
| [mstan/psxrecomp](https://github.com/mstan/psxrecomp) | PlayStation | MIPS R3000A to C, translating both a BIOS image and the game executable, with disc-streamed overlays captured and compiled at run time | "The breadth-first push is essentially done; work now is depth and optimization." |
| [mstan/nesrecomp](https://github.com/mstan/nesrecomp) | NES | 6502 to C, plus a C runner library that simulates the PPU, APU, mapper and input | "This builds a static library. It does not create a playable game by itself." |
| [mstan/snesrecomp](https://github.com/mstan/snesrecomp) | SNES | 65816 to C against a C model of the rest of the console, with an interpreter kept live underneath as the correctness floor | "SNESRecomp is alpha software." |
| [mstan/gbarecomp](https://github.com/mstan/gbarecomp) | Game Boy Advance | ARM7TDMI, both ARM and Thumb, to sharded C++ against a shared GBA hardware runtime | "These projects are experimental previews and byproducts of developing the framework." |
| [mstan/gbrecompiled](https://github.com/mstan/gbrecompiled) | Game Boy, Game Boy Color | SM83 to portable C, one file per bank, linked against a runtime named `gbrt` | "This is a development fork. The canonical project is [arcanite24/gb-recompiled](https://github.com/arcanite24/gb-recompiled), go there for stable use." |
| [mstan/segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) | Sega Genesis | 68000 to native C, with the console's second processor, the Z80 sound CPU, handled by the runner | Per-feature table: 68K frontend "Active", sound Z80 static recompilation "Experimental" |
| [mstan/smsggrecomp](https://github.com/mstan/smsggrecomp) | Master System, Game Gear | One Z80 engine for both machines, the Game Gear being a platform flag rather than a fork | "**Status: early (v0.0.2) pre-release, expect bugs.**" |
| [mstan/vbrecomp](https://github.com/mstan/vbrecomp) | Virtual Boy | NEC V810 to C, plus a runtime, a TCP debug server and a Beetle VB oracle harness. No V810 interpreter exists in the project at all | The framework carries no status banner. Its downstream port states "**Status: Playable.**" |
| [mstan/ndsrecomp](https://github.com/mstan/ndsrecomp) | Nintendo DS | Both DS processors lifted to C ahead of time and interleaved on one event scheduler | "Status: very early pre-alpha (v0.0.1)" |
| [mstan/cdirecomp](https://github.com/mstan/cdirecomp) | CD-i | SCC68070 to C, recompiling and running the console's entire CD-RTOS system ROM rather than stubbing it | "Very early development" and "**Gameplay is not yet reachable.**" |
| [mstan/gcnlle](https://github.com/mstan/gcnlle) | GameCube | PowerPC Gekko to C for the console's IPL boot ROM, on a fork of the DolRecomp engine, plus a net-new hardware runtime | "**Early development:** this is research software, not a general GameCube emulator and not ready for ordinary game use." |
| [mstan/xboxlle-probe](https://github.com/mstan/xboxlle-probe) | Xbox | Not a recompiler. An nxdk homebrew agent plus a Python host client that reads registers and memory from a real console | "THIS SOFTWARE CAN CRASH, CORRUPT, OR BRICK AN XBOX" |

## Shared components

Separately versioned repositories that other projects consume as git submodules. The first three are the ones no listing surfaces.

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

64 repositories, each a thin layer over one toolchain: a CMake glue file, per-game recompiler input, a small hand-written runtime shim, a `tools/` directory and a README. None of them contains a game file, and none contains the generated C. See [Port a game](/docs/guides/port-a-game) for what that layer actually consists of.

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

One further SNES repository is part of the fleet and is deliberately not named or linked here. Its license file says the repository is proprietary, confidential and intended to remain private, so this site holds it back pending a check with its owner. The same treatment is applied on [Licenses](/docs/fleet/licenses).

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

### Game Boy and Game Boy Color, on gbrecompiled

Three repositories, all pinning gbrecompiled at path `gb-recompiled` over an SSH URL.

| Repository | Note |
|---|---|
| [mstan/PokemonRedAndBlueRecomp](https://github.com/mstan/PokemonRedAndBlueRecomp) | |
| [mstan/PokemonYellowRecomp](https://github.com/mstan/PokemonYellowRecomp) | Structurally unusual: it builds its ROM from a decompilation project before recompiling it |
| [mstan/TetrisGBRecomp](https://github.com/mstan/TetrisGBRecomp) | |

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
| [mstan/PokemonStadiumRecomp](https://github.com/mstan/PokemonStadiumRecomp) | Nintendo 64 | N64Recomp fork | One of the two repositories in the fleet that actually contain upstream code. Uses RT64 for rendering |
| [mstan/PocketMonstersStadiumRecomp](https://github.com/mstan/PocketMonstersStadiumRecomp) | Nintendo 64 | N64Recomp fork | The other one. Consumes the framework through an `n64recomp.pin` file |

## Upstream projects

Four repositories this fleet learned from. Only the two N64 ports above contain any of their code; everywhere else the relationship is conceptual. See [Lineage and credit](/docs/fleet/lineage-and-credit) for exactly where that line falls.

| Repository | What it is | License |
|---|---|---|
| [N64Recomp/N64Recomp](https://github.com/N64Recomp/N64Recomp) | "a tool to statically recompile N64 binaries into C code that can be compiled for any platform". Ships a runtime recompilation backend as well as the ahead-of-time one | MIT |
| [N64Recomp/N64ModernRuntime](https://github.com/N64Recomp/N64ModernRuntime) | The runtime half of the same pair, which the generated C links against | GPL-3.0 |
| [Zelda64Recomp/Zelda64Recomp](https://github.com/Zelda64Recomp/Zelda64Recomp) | The port that demonstrated the model end to end. Default branch is `dev`, not `main` | GPL-3.0 |
| [rt64/rt64](https://github.com/rt64/rt64) | The renderer those ports use. Its texture tooling is not uniformly MIT: one shipped tool is GPL | MIT |

> **Warning.** All four ship an identical `CONTRIBUTING.md` whose first line is "AI must not be used to generate code for contributions to this project." This documentation is agent-facing and this fleet is built with AI assistance, so that policy is stated here plainly rather than left for an agent to discover after opening a pull request. Compare psxrecomp, which welcomes them. See [Contributing as an agent](/docs/agents/contributing-as-an-agent).

## What consumes what

Reading every `.gitmodules` file and every gitlink in the fleet turns up 165 submodule references spread over 71 of the 87 repositories. Fifteen repositories declare none. This table is the dependency graph collapsed to one row per shared component: it is what tells you how far a change to a shared repository actually reaches.

| Component | Consumers | Who |
|---|---|---|
| [recomp-ui](https://github.com/mstan/recomp-ui) | 58 gitlinks, plus 1 vendored tree and 1 broken declaration | Game ports on PlayStation, SNES, GBA, NES, Game Boy, Genesis, Virtual Boy and N64 |
| [psxrecomp](https://github.com/mstan/psxrecomp) | 18 | The PlayStation ports, at path `psxrecomp` or `psxrecomp-v4` |
| [gbarecomp](https://github.com/mstan/gbarecomp) | 14 | Every Game Boy Advance port |
| [nesrecomp](https://github.com/mstan/nesrecomp) | 10 | Every NES port |
| [snesrecomp](https://github.com/mstan/snesrecomp) | 7 gitlinks plus 1 vendored tree | Every SNES port |
| [recomp-net](https://github.com/TechnicallyComputers/recomp-net) | 4 | nesrecomp, psxrecomp and snesrecomp at `lib/recomp-net`; segagenesisrecomp at `external/recomp-net` |
| [gbrecompiled](https://github.com/mstan/gbrecompiled) | 3 | Every Game Boy port |
| [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) | 3 | Every Genesis port |
| [m68k-recomp-core](https://github.com/mstan/m68k-recomp-core) | 2 | segagenesisrecomp and cdirecomp, both at `external/m68k-recomp-core` |
| [z80-recomp-core](https://github.com/mstan/z80-recomp-core) | 2 | segagenesisrecomp and smsggrecomp, both at `external/z80-recomp-core` |
| [smsggrecomp](https://github.com/mstan/smsggrecomp) | 2 | Both Sega 8-bit ports |
| [vbrecomp](https://github.com/mstan/vbrecomp) | 1 | The Virtual Boy port |
| [retcomm-rbengine](https://github.com/TechnicallyComputers/retcomm-rbengine) | 1 | psxrecomp, at `lib/retcomm-rbengine` |
| [N64Recomp](https://github.com/N64Recomp/N64Recomp) | 1 | N64ModernRuntime |
| [N64ModernRuntime](https://github.com/N64Recomp/N64ModernRuntime) | 1 | Zelda64Recomp, at `lib/N64ModernRuntime` |
| [rt64](https://github.com/rt64/rt64) | 1 | Zelda64Recomp, at `lib/rt64` |

Three details from that survey are worth knowing before you assume a shared component is uniform across its consumers.

**recomp-ui is shared in intent and fanned out in practice.** Its 58 gitlinks pin 19 distinct commits, ranging from one commit behind its default branch to 231 behind. Two consumers point their submodule URL at a fork rather than the original, three suppress status reporting for it with `ignore = all`, and three pin named feature branches instead of the default one.

**The two CPU cores are in much better shape.** Both z80-recomp-core consumers pin the identical commit, which is also that repository's only commit. The two m68k-recomp-core consumers are 14 commits apart on one line of development, with cdirecomp behind rather than forked, and the shared decoder and validator are byte-identical between the two pins. All the drift is in the Genesis profile, which is exactly the split that repository's README prescribes.

**A vendored copy inside a game port is not the framework.** `PeriBluGaming/ToyStory2Recomp` and `Team-Resurgent/MegaManX-X` each carry a partial snapshot of a framework rather than a submodule, including older attribution files with materially different content. For any statement about a framework, read the framework repository.

## Two repositories that are no longer reachable

`TechnicallyComputers/Crash-Team-Racing-Recomp` and `TechnicallyComputers/Crash-Bash-Recomp` are referenced by game pages elsewhere on this site and no longer resolve. A control repository in the same organisation resolves normally, so this is not a network artefact: both have gone private or been deleted. They are recorded here rather than quietly dropped, and they are deliberately not linked, because a link would send a reader to a 404. Neither could be read, so this documentation says nothing about what they contained.

## Source

- The repository list, the toolchain attribution per game port and the canonical port layout come from each repository's `.gitmodules`, from the `*.pin` files used where a framework is not a submodule, and from each README.
- The dependency map comes from every `.gitmodules` file and every gitlink in the fleet, read together.
- Status quotations come from the README of the repository being quoted. Toolchain READMEs: [psxrecomp](https://github.com/mstan/psxrecomp/blob/master/README.md), [nesrecomp](https://github.com/mstan/nesrecomp/blob/master/README.md), [snesrecomp](https://github.com/mstan/snesrecomp/blob/main/README.md), [gbarecomp](https://github.com/mstan/gbarecomp/blob/main/README.md), [gbrecompiled](https://github.com/mstan/gbrecompiled/blob/master/README.md), [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/README.md), [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/README.md), [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/README.md), [ndsrecomp](https://github.com/mstan/ndsrecomp/blob/main/README.md), [cdirecomp](https://github.com/mstan/cdirecomp/blob/master/README.md), [gcnlle](https://github.com/mstan/gcnlle/blob/master/README.md), [xboxlle-probe](https://github.com/mstan/xboxlle-probe/blob/main/README.md).
- Shared component descriptions: [`m68k-recomp-core/README.md`](https://github.com/mstan/m68k-recomp-core/blob/main/README.md), [`z80-recomp-core/README.md`](https://github.com/mstan/z80-recomp-core/blob/main/README.md), [`recomp-ui/README.md`](https://github.com/mstan/recomp-ui/blob/master/README.md), [`recomp-net/README.md`](https://github.com/TechnicallyComputers/recomp-net/blob/main/README.md), [`recomp-net-server/README.md`](https://github.com/TechnicallyComputers/recomp-net-server/blob/main/README.md), [`retcomm-rbengine/README.md`](https://github.com/TechnicallyComputers/retcomm-rbengine/blob/main/README.md), [`retcomm-catalog/README.md`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/README.md).
- The upstream contribution policy: [`CONTRIBUTING.md`](https://github.com/N64Recomp/N64Recomp/blob/main/CONTRIBUTING.md), and its identical siblings in N64ModernRuntime, [Zelda64Recomp](https://github.com/Zelda64Recomp/Zelda64Recomp/blob/dev/CONTRIBUTING.md) and [rt64](https://github.com/rt64/rt64/blob/main/CONTRIBUTING.md).

## Next

- [Licenses](/docs/fleet/licenses) for what each of these repositories declares, including the 48 that declare nothing.
- [Lineage and credit](/docs/fleet/lineage-and-credit) for which two of them contain upstream code and which only share its ideas.
- [Port a game](/docs/guides/port-a-game) for what is inside one of the 64 game port repositories and how it consumes its toolchain.
- [Glossary](/docs/concepts/glossary) for the vocabulary every one of these repositories assumes you already have.
