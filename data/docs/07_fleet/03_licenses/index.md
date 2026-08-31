---
title: "Licenses"
summary: "A repository-by-repository license census for the fleet, plus the third-party licenses each toolchain bundles or links."
pageType: "reference"
tags: ["Licensing", "Attribution", "Fleet"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
updated: "2026-08-31"
---

Every license below was read from the license file itself, not from a README
summary. Repositories that declare nothing are listed too: a missing license
file is a fact you need. This is what the files say. It is not legal advice.

## The census in numbers

| Measure | Count |
|---|---|
| Repositories surveyed | current fleet |
| Carrying a license file (`LICENSE`, `LICENSE.md`, `COPYING`, `LICENSE-recompiler`) | many |
| Carrying no license file at all | many |
| Distinct license identities found | 5 |

The five identities are PolyForm Noncommercial 1.0.0, MIT, GPL-3.0, a
proprietary all rights reserved notice, and one PolyForm text carrying no
copyright holder.

## Frameworks and toolchains

| Repository | License | Source file | Notes |
|---|---|---|---|
| [mstan/psxrecomp](https://github.com/mstan/psxrecomp) | PolyForm Noncommercial 1.0.0 | [`LICENSE`](https://github.com/mstan/psxrecomp/blob/master/LICENSE) | Holder `Copyright (c) 2026 Matthew Stan`. Carries the appended paragraph below |
| [mstan/snesrecomp](https://github.com/mstan/snesrecomp) | PolyForm Noncommercial 1.0.0 | [`LICENSE`](https://github.com/mstan/snesrecomp/blob/main/LICENSE) | Appended paragraph |
| [mstan/nesrecomp](https://github.com/mstan/nesrecomp) | PolyForm Noncommercial 1.0.0 | [`LICENSE`](https://github.com/mstan/nesrecomp/blob/master/LICENSE) | Appended paragraph |
| [mstan/gbarecomp](https://github.com/mstan/gbarecomp) | PolyForm Noncommercial 1.0.0 | [`LICENSE`](https://github.com/mstan/gbarecomp/blob/main/LICENSE) | Appended paragraph |
| [mstan/cdirecomp](https://github.com/mstan/cdirecomp) | PolyForm Noncommercial 1.0.0 | [`LICENSE`](https://github.com/mstan/cdirecomp/blob/master/LICENSE) | Appended paragraph |
| [mstan/segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) | PolyForm Noncommercial 1.0.0 | [`LICENSE-recompiler`](https://github.com/mstan/segagenesisrecomp/blob/master/LICENSE-recompiler) and [`LICENSE.md`](https://github.com/mstan/segagenesisrecomp/blob/master/LICENSE.md) | Two license files whose text is not the same. See below |
| [mstan/ndsrecomp](https://github.com/mstan/ndsrecomp) | MIT | [`LICENSE`](https://github.com/mstan/ndsrecomp/blob/main/LICENSE) | Holder `Copyright (c) 2026 Matthew Stanley`. Covers the project's own source; the shipped `nds_runner` binary is a GPL-3.0-or-later combined work |
| [mstan/vbrecomp](https://github.com/mstan/vbrecomp) | MIT | [`LICENSE`](https://github.com/mstan/vbrecomp/blob/master/LICENSE) | 53 lines: the MIT text plus an in-file `# Attribution` section |
| [mstan/smsggrecomp](https://github.com/mstan/smsggrecomp) | **None** | no license file | README states the license is "Not yet declared" |

## Shared services and components

| Repository | License | Source file | Notes |
|---|---|---|---|
| [TechnicallyComputers/retcomm-rbengine](https://github.com/TechnicallyComputers/retcomm-rbengine) | MIT | [`LICENSE`](https://github.com/TechnicallyComputers/retcomm-rbengine/blob/main/LICENSE) | |
| [TechnicallyComputers/retcomm-catalog](https://github.com/TechnicallyComputers/retcomm-catalog) | **None** | no license file | No README license section either |
| [mstan/m68k-recomp-core](https://github.com/mstan/m68k-recomp-core) | PolyForm Noncommercial 1.0.0 | [`LICENSE`](https://github.com/mstan/m68k-recomp-core/blob/main/LICENSE) | Holder `Copyright (c) 2026 Matthew Stan`. Appended paragraph |
| [mstan/z80-recomp-core](https://github.com/mstan/z80-recomp-core) | PolyForm Noncommercial 1.0.0 | [`LICENSE`](https://github.com/mstan/z80-recomp-core/blob/main/LICENSE) | Appended paragraph. Also carries `LICENSES/SUPERZAZU-MIT.txt` for the Z80 core it derives from |
| [mstan/recomp-ui](https://github.com/mstan/recomp-ui) | MIT | [`LICENSE`](https://github.com/mstan/recomp-ui/blob/master/LICENSE) | Holder `Copyright (c) 2026 Matthew Stanley` |

## Game repositories that carry a license file

| Repository | License | Source file | Notes |
|---|---|---|---|
| [mstan/TombaRecomp](https://github.com/mstan/TombaRecomp) | PolyForm Noncommercial 1.0.0 | `LICENSE` | Appended paragraph |
| [mstan/Tomba2Recomp](https://github.com/mstan/Tomba2Recomp) | PolyForm Noncommercial 1.0.0 | `LICENSE` | Appended paragraph |
| [mstan/ApeEscapeRecomp](https://github.com/mstan/ApeEscapeRecomp) | PolyForm Noncommercial 1.0.0 | `LICENSE` | Appended paragraph |
| [mstan/MegaManX4Recomp](https://github.com/mstan/MegaManX4Recomp) | PolyForm Noncommercial 1.0.0 | `LICENSE` | Appended paragraph |
| [mstan/MegaManX5Recomp](https://github.com/mstan/MegaManX5Recomp) | PolyForm Noncommercial 1.0.0 | `LICENSE` | Appended paragraph |
| [mstan/MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp) | PolyForm Noncommercial 1.0.0 | `LICENSE` | Plus a `THIRD-PARTY-LICENSES/` directory |
| [mstan/TsumuLightRecomp](https://github.com/mstan/TsumuLightRecomp) | PolyForm Noncommercial 1.0.0 | `LICENSE` | Appended paragraph |
| [mstan/MinishCapRecomp](https://github.com/mstan/MinishCapRecomp) | PolyForm Noncommercial 1.0.0 | `LICENSE` | Appended paragraph |
| [mstan/DragonBallZBuusFuryRecomp](https://github.com/mstan/DragonBallZBuusFuryRecomp) | PolyForm Noncommercial 1.0.0 | `LICENSE` | Appended paragraph |
| [mstan/SonicTheHedgehogRecomp](https://github.com/mstan/SonicTheHedgehogRecomp) | PolyForm Noncommercial 1.0.0 | `LICENSE.md` | No copyright holder line anywhere in the file |
| [Shy/BoktaiRecomp](https://github.com/Shy/BoktaiRecomp) | PolyForm Noncommercial 1.0.0 | `LICENSE` | `Copyright (c) 2026 Shy (github.com/Shy)` |
| [OpokXeno/xenogears-recomp](https://github.com/OpokXeno/xenogears-recomp) | PolyForm Noncommercial 1.0.0 | `LICENSE` | `Copyright (c) 2026 OpokXeno`. 98 lines, no appended paragraph |
| [Alexbeav/syphon-filter-2-recompiled](https://github.com/Alexbeav/syphon-filter-2-recompiled) | PolyForm Noncommercial 1.0.0 | `LICENSE` | `Copyright (c) 2026 Matthew Stan`, not the repository owner. See below |
| [mstan/DKC2Recomp](https://github.com/mstan/DKC2Recomp) | MIT | `LICENSE` | `Copyright (c) 2026 DKC2 Port contributors`. An MIT game repo built on a PolyForm-NC framework |
| [mstan/MetroidPrimeHuntersRecomp](https://github.com/mstan/MetroidPrimeHuntersRecomp) | MIT | `LICENSE` | Built on the MIT `ndsrecomp`, whose runner binary is GPL-3.0-or-later |
| [mstan/MarioTennisVirtualBoyRecomp](https://github.com/mstan/MarioTennisVirtualBoyRecomp) | MIT | `LICENSE.md` | The grant is explicitly scoped. See below |

One more repository in the fleet carries a proprietary all rights reserved
notice. That same file says the repository is meant to stay private, so this
site does not name, link or describe it until its owner has been asked.

## Repositories with no license file

This site does not state or imply a license for repositories that carry no license file.

**mstan, Game Boy Advance (11).** `DragonBallZLegacyOfGokuRecomp`,
`DragonBallZLegacyofGokuIIRecomp`, `EmeraldRecomp`, `FireRedLeafGreenRecomp`,
`RubySapphireRecomp`, `MarioKartSuperCircuitRecomp`, `MegaManZeroRecomp`,
`ShrekGBAVideoRecomp`, `SuperMarioAdvance2Recomp`, `SuperMarioAdvance4Recomp`,
`WarioWareTwistedRecomp`.

**mstan, NES (10).** `DrMarioNesRecomp`, `DuckHuntNESRecomp`, `FaxanaduRecomp`,
`GumshoeNESRecomp`, `LegendOfZeldaNESRecomp`, `Megaman3NESRecomp`,
`MetroidNESRecomp`, `SuperMarioBrosNESRecomp`, `YoshiNESRecomp`,
`YoshisCookieRecomp`.

**mstan, SNES (5).** `MegaManXSNESRecomp`, `StarFoxSNESRecomp`,
`SuperMarioWorldRecomp`, `SuperMetroidRecomp`, `ZeldaAlttPSNESRecomp`.

**mstan, Game Gear, Master System, Genesis (5).** `SonicBlastGGRecomp`,
`SonicTheHedgehogSMSRecomp`, `smsggrecomp`, `Sonic3AndKnucklesRecomp`,
`SonicTheHedgehog2Recomp`.

**TechnicallyComputers (11).** `Bomberman-Fantasy-Race-Recomp`,
`Bomberman-World-Recomp`, `BombermanPartyEditionRecomp`,
`Klonoa-Door-to-Phantomile`,
`Marvel-vs.-Capcom-Clash-of-Super-Heroes-Recomp`, `MastersOfTerasKasiRecomp`,
`Metal-Slug-X-Recomp`, `Rampage---Through-Time-Recomp`,
`Street-Fighter-Alpha-3-Recomp`, `TwistedMetal4Recomp`, `retcomm-catalog`.

**Others (2).** `PeriBluGaming/ToyStory2Recomp`, `Team-Resurgent/MegaManX-X`.

### Repositories that state the position themselves

Several of them say so in the README. Where a project says it, the project is
quoted.

From [`README.md`](https://github.com/mstan/SonicBlastGGRecomp/blob/main/README.md):

```text title="README.md"
## License

Not yet declared. Code in this repo is original. The *Sonic Blast* ROM and any
data derived from it are **not** in this repo and are not licensed for
redistribution.
```

From [`README.md`](https://github.com/mstan/StarFoxSNESRecomp/blob/main/README.md):

```text title="README.md"
## License

Not yet declared. Original project code and vendored dependencies retain their
respective ownership and licensing status. The *Star Fox* ROM and all data
extracted from it are not part of this repository and are not licensed for
redistribution.
```

[Team-Resurgent/MegaManX-X](https://github.com/Team-Resurgent/MegaManX-X) and
[mstan/MegaManXSNESRecomp](https://github.com/mstan/MegaManXSNESRecomp) carry an
identical third wording, adding that vendored dependencies under `third_party/`
retain their own licenses.

One repository uses a different phrase.
[MetroidNESRecomp](https://github.com/mstan/MetroidNESRecomp)'s `README.md`
calls the nesrecomp framework and its own game code "provided as-is for
educational and research purposes". That sentence is MetroidNESRecomp's. The
nesrecomp framework it names is PolyForm Noncommercial 1.0.0, so the phrase is
not the framework's license text and does not apply to the rest of the fleet.

## Where a headline license is narrower than it looks

Three repositories say directly that their headline license does not cover the
whole tree or the shipped binary.

**ndsrecomp.** From [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/ndsrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md):

```text title="THIRD_PARTY_ATTRIBUTION.md"
The MIT grant covers this project's own source. It does not and cannot relicense
the third-party code described below, and it does not make every build artifact
redistributable under MIT terms. In particular, the native runner links vendored
melonDS sources, so the `nds_runner` **executable** is a combined work whose
distribution must comply with GPL-3.0-or-later — see
[melonDS vendored GPU3D (runner)](#melonds-vendored-gpu3d-runner) below. The
recompiler, the generated banks, and all `ndsref`-independent tooling stay
outside that boundary and are distributable under MIT alone.
```

**MarioTennisVirtualBoyRecomp.** From [`LICENSE.md`](https://github.com/mstan/MarioTennisVirtualBoyRecomp/blob/master/LICENSE.md):

```text title="LICENSE.md"
This licence covers ONLY the build glue + per-game CMake wiring + this
repo's documentation. It does NOT cover:

  - The Mario's Tennis ROM and any data derived from it (e.g.,
    `generated/marios_tennis_*.c`, screenshots of the running cart).
    Those are © Nintendo. Do not redistribute. You must dump the cart
    you own.

  - The vbrecomp framework (separate repo at github.com/mstan/vbrecomp,
    MIT-licensed under its own `LICENSE` file).

  - The Beetle VB libretro core (cloned separately under `beetle-vb/`,
    GPL-licensed by its respective contributors).
```

**DKC2Recomp.** From [`README.md`](https://github.com/mstan/DKC2Recomp/blob/main/README.md):

```text title="README.md"
## License

Project-owned source is available under the [MIT License](LICENSE). Vendored
dependencies and submodules retain their own licenses. In particular, the
PSXRecomp-derived screen-color component is PolyForm Noncommercial 1.0.0 with
an MIT/Apache-2.0 color-science lineage; the complete notices are in
`third_party/psxrecomp_color_lut/` and it is not relicensed by the root MIT
license. Nintendo and Rare
own their respective game content and trademarks; no license in this
repository grants rights to that content.
```

That `third_party/psxrecomp_color_lut/` directory carries all three texts:
`LICENSE-APACHE-2.0.txt`, `LICENSE-MIT.txt`, and
`LICENSE-POLYFORM-NONCOMMERCIAL-1.0.0.txt`.

## Third-party licenses the toolchains bundle or link

Five canonical attribution files exist, at
[psxrecomp](https://github.com/mstan/psxrecomp/blob/master/THIRD_PARTY_ATTRIBUTION.md),
[snesrecomp](https://github.com/mstan/snesrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md),
[gbarecomp](https://github.com/mstan/gbarecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md),
[ndsrecomp](https://github.com/mstan/ndsrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md)
and [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/THIRD_PARTY_ATTRIBUTION.md).
Four more carry variant filenames: cdirecomp's `THIRD-PARTY-NOTICES.md`,
DKC2Recomp's `THIRD_PARTY_NOTICES.md`, and segagenesisrecomp's
`THIRD-PARTY-LICENSES.md`. Two repositories use a directory instead,
`MegaManX6Recomp/THIRD-PARTY-LICENSES/` and
`SuperMarioBrosNESRecomp/THIRD-PARTY-LICENSES/`. These files are the authority
for what a build contains, not the README.

### psxrecomp

| Component | Role | License stated |
|---|---|---|
| OpenBIOS, from [PCSX-Redux](https://github.com/grumpycoders/pcsx-redux) `src/mips/openbios` | Bundled free PS1 BIOS image, statically recompiled | MIT |
| [uC-sdk](https://github.com/grumpycoders/uC-sdk) | Linked into the OpenBIOS binary | "a mixture of permissive (non-reciprocal) licenses that require this mention" |
| TinyCC (TCC) | Overlay compiler shipped to players, invoked as a subprocess | LGPL-2.1 |
| JRickey/gba-recomp | ShadowVerifier and colour-science core, re-implemented in C | MIT OR Apache-2.0, "used with permission" |
| SDL2 | Windowing, input, audio, via game repos | zlib |

psxrecomp calls TinyCC aggregation rather than linkage, and says why. TinyCC is
not vendored in the repository. `tools/compile_overlays.py` runs it as a
separate program to build overlay shards into a DLL. In the attribution file's
words, "Nothing in the runtime links against libtcc, so this is aggregation with
a separate program rather than LGPL linkage." The same file notes that no script
in the repository fills the end-user overlay toolchain bundle, so if release
packaging supplies it, the TinyCC notice has to travel with it there.

### snesrecomp

| Component | Role | License stated |
|---|---|---|
| libretro API header (`tools/snesref/libretro.h`) | Developer-only frontend | MIT, full text reproduced |
| SDL2 | snesref frontend, not vendored | zlib |
| bsnes libretro core | Developer oracle, not vendored | GPLv3 |
| Snes9x libretro core | Developer oracle, not vendored | "Snes9x non-commercial license" |
| psxrecomp colour LUT (`runner/src/snes/color_lut.{c,h}`) | Screen colour | PolyForm Noncommercial 1.0.0 over an MIT OR Apache-2.0 lineage |
| ares | Cx4 / Hitachi HG51B S169 coprocessor | ISC, full text reproduced |
| ares | DSP-1 / NEC uPD7725 coprocessor | ISC |
| ares | SA-1 coprocessor | ISC |
| [LakeSnes](https://github.com/angelo-wf/lakesnes) | 65816 interpreter core `interp816` | MIT, full text reproduced |
| perplexes/snesrecomp | Rust native-analyzer foundation | "License declared by the upstream crate: MIT" |
| DerrickGold/ar-recomp | Named as performance inspiration only, no code taken | not applicable |

The file also states that the developer-only label is not a waiver.

From [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/snesrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md):

```text title="THIRD_PARTY_ATTRIBUTION.md"
The `tools/snesref/.gitignore` rules exclude SDL packages and binaries,
`snesref.exe`, and `*_libretro.dll`. A developer-only label does not waive a
dependency's terms if someone distributes it; downstream packages must either
comply with the selected dependency's license or continue to require developers
to supply it separately.
```

### gbarecomp

| Component | Role | License stated |
|---|---|---|
| JRickey/gba-recomp | MP2K driver detection, colour LUT, cartridge RTC, audio shadow, MP2K shadow mixer | MIT OR Apache-2.0, "used with the author's permission" |
| mGBA, vendored at `third_party/mgba` | BIOS SWI high level emulation routines | MPL-2.0 |

gbarecomp records that portions of `src/runtime/bios_hle.cpp` are derived from
mGBA and remain subject to MPL-2.0, and that the upstream source is vendored at
`third_party/mgba/src/gba/bios.c` to satisfy the license's source-availability
requirement.

### ndsrecomp

The largest attribution file in the fleet, at 252 lines.

| Component | Role | License stated |
|---|---|---|
| gbarecomp | ARMv4T core, recompiler driver, function finder | Upstream PolyForm Noncommercial 1.0.0; ported portions offered here under MIT because the copyright owner is the same |
| melonDS (oracle, cloned into an ignored directory) | Reference implementation | GPL-3.0-or-later |
| melonDS GPU3D, vendored | 3D geometry engine and software rasterizer in the runner | GPL-3.0-or-later |
| melonDS Wifi and net glue, vendored | Wi-Fi device model and network backend | GPL-3.0-or-later |
| libpcap public headers, vendored inside the melonDS net tree | Networking | BSD |
| libslirp 4.8.0, vendored inside the melonDS net tree | Networking | BSD-3-Clause |
| melonPrimeDS | Control-scheme reference | GPL-3.0-or-later, inherited |
| Hyllian xBR-lv2 | Optional texture upscaler rules | MIT |
| mGBA | Behavioural and ARM7 timing reference, not vendored | MPL-2.0 |
| [FreeBIOS](https://github.com/mstan/freebios), the DraStic BIOS replacement by Gilead Kutnick | Opt-in no-dump boot images | BSD-2-Clause |

### vbrecomp

| Component | Role | License stated |
|---|---|---|
| JRickey/gba-recomp | Audio shadow differential verifier, re-implemented in C | MIT OR Apache-2.0, "used with the author's permission" |
| Mednafen Beetle VB | Oracle backend | GPL. "vbrecomp does not redistribute it" |

### segagenesisrecomp

| Component | Role | License stated |
|---|---|---|
| ymfm | YM2612 FM synthesis | BSD-3-Clause |
| superzazu/z80 | Z80 sound-CPU core | MIT |
| clowncommon | Integer types and C helpers | ISC |
| SDL2 | Windowing, input, rendering, audio | zlib |
| tomlc99 | TOML parsing | MIT |
| ShadowVerifier and colour science | Opt-in audio and video enhancements | MIT OR Apache-2.0 |
| Dear ImGui | Launcher UI, added at build time by game repos | MIT |
| stb_image, stb_truetype, stb_image_write | Image and font helpers | "Public domain or MIT" |
| tinyfiledialogs | Native ROM file picker | zlib |
| Lato | Launcher typeface | SIL Open Font License 1.1 |

Its compliance notes set out the whole model in four lines.

From [`THIRD-PARTY-LICENSES.md`](https://github.com/mstan/segagenesisrecomp/blob/master/THIRD-PARTY-LICENSES.md):

```text title="THIRD-PARTY-LICENSES.md"
## Compliance notes

- Native release binaries contain no AGPL code. Release packaging must still
  follow [RELEASING.md](RELEASING.md) and include every applicable notice.
- The shipped binary must not contain a game ROM. Users supply their own ROM;
  `*.bin` is ignored and the runtime loads it separately.
- Generated C compiled into a game executable is a machine translation of ROM
  code. The project's own license cannot grant rights to third-party game code.
- This inventory is informational, not legal advice.
```

The same file records a dependency that was dropped. No clownmdemu, clown68000
or clownz80 remains in the current source, the recompiler or the native release
paths. Those retired oracle components exist only in git history.

### Per-game attribution files

| Repository | What it records |
|---|---|
| [mstan/DKC2Recomp](https://github.com/mstan/DKC2Recomp/blob/main/THIRD_PARTY_NOTICES.md) | Launcher notices: Dear ImGui MIT, SDL2 zlib, GCC runtime with the Runtime Library Exception, Lato under OFL 1.1, LakeSnes-derived APU and S-DSP MIT. Plus the cover art notice below |
| [mstan/MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp) `THIRD-PARTY-LICENSES/` | xdelta3 3.0.11 relicensed Apache-2.0 by its original author, so no GPL obligation. `error_recalc` is GPLv3-or-later and invoked as a separate process |
| [mstan/SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp) `THIRD-PARTY-LICENSES/` | An unlicensed upstream, handled as an explicit publication assumption rather than a license grant |

DKC2Recomp records why an image ships at all. The North American retail cover is
there "only to identify the supported game and region", the art and trademarks
stay copyright Nintendo and Rare, and the project claims no ownership.

MegaManX6Recomp states what its one GPL tool means for packaging.

From [`THIRD-PARTY-LICENSES/README.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/THIRD-PARTY-LICENSES/README.md):

```text title="THIRD-PARTY-LICENSES/README.md"
- Because it is a **separate process**, its GPL terms do **not** extend to this
  project's PolyForm-NC code. If a release ships the error_recalc binary before
  the replacement below lands, that release must also make the error_recalc
  source available per GPLv3 (§6).
```

## Where a project's tooling is not uniformly under one license

| Repository | The split |
|---|---|
| mstan/ndsrecomp | MIT project source; the `nds_runner` binary is a GPL-3.0-or-later combined work; the recompiler, generated banks and `ndsref`-independent tooling stay MIT |
| mstan/psxrecomp | PolyForm-NC framework; MIT OpenBIOS image bundled with it; LGPL-2.1 TinyCC invoked as a separate process at release time |
| mstan/MegaManX6Recomp | PolyForm-NC project code; one GPLv3-or-later tool invoked as a separate process; one Apache-2.0 tool |
| mstan/DKC2Recomp | MIT root; a vendored PolyForm-NC colour component with an MIT OR Apache-2.0 lineage, not relicensed by the root |
| mstan/MarioTennisVirtualBoyRecomp | MIT scoped to build glue, CMake wiring and documentation; the vbrecomp framework and the GPL Beetle VB core are outside it |
| mstan/segagenesisrecomp | Two license files in one repository whose text differs |
| mstan/snesrecomp | PolyForm-NC framework; ISC and MIT vendored cores; GPLv3 and non-commercial oracle cores that are not vendored |

## Deviations and open questions

**The appended PolyForm paragraph.** Twenty-two license files in the fleet
append this to the end of the stock PolyForm Noncommercial 1.0.0 text, two of
them in the shared CPU cores added to the census above.

From [`LICENSE`](https://github.com/mstan/psxrecomp/blob/master/LICENSE):

```text title="LICENSE"
For the avoidance of doubt, the licensor's intent is to restrict uses where
profit is derived from this software. Non-profit personal, educational,
or community use is welcome regardless of organizational context.

For commercial licensing inquiries, contact: https://1379.tech
```

Three PolyForm files in the fleet do not carry it: `OpokXeno/xenogears-recomp`,
`mstan/SonicTheHedgehogRecomp`, and `mstan/segagenesisrecomp`'s `LICENSE.md`.

**PolyForm text with no copyright holder.** `mstan/SonicTheHedgehogRecomp`'s
`LICENSE.md` and `mstan/segagenesisrecomp`'s `LICENSE.md` are byte identical and
name no licensor. The only copyright string in either file is PolyForm's own
worked example. The license file does not say who the licensor is.

**Two license files in one repository.** `mstan/segagenesisrecomp` has both
`LICENSE-recompiler`, 100 lines with a named holder and the appended paragraph,
and `LICENSE.md`, 73 lines with neither. A consumer repository's README,
`Sonic3AndKnucklesRecomp`, points at `LICENSE.md`.

**A community repository carrying the framework author's copyright.**
`Alexbeav/syphon-filter-2-recompiled`'s `LICENSE` names
`Copyright (c) 2026 Matthew Stan` although the repository owner is Alexbeav.
Nothing says whether that is intended. `Shy/BoktaiRecomp` and
`OpokXeno/xenogears-recomp` both name their own owners, so the fleet is not
uniform here.

**Do not read a framework's license from a vendored copy.**
`PeriBluGaming/ToyStory2Recomp` and `Team-Resurgent/MegaManX-X` each hold a
partial snapshot of a framework, including an older attribution file that says
different things. The ToyStory2 copy documents an sljit overlay backend and has
no OpenBIOS or TinyCC section at all. `OpokXeno/xenogears-recomp` carries
psxrecomp as a submodule pointing at that owner's own fork. For any framework
fact, read `mstan/psxrecomp` and `mstan/snesrecomp` directly.

**Not established from the files.** The license of
`TechnicallyComputers/retcomm-catalog`. And whether release archives really ship
the notices their repositories require, because this census read repositories,
not built packages.

## Source

- [mstan/psxrecomp](https://github.com/mstan/psxrecomp): [`LICENSE`](https://github.com/mstan/psxrecomp/blob/master/LICENSE), [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/psxrecomp/blob/master/THIRD_PARTY_ATTRIBUTION.md)
- [mstan/snesrecomp](https://github.com/mstan/snesrecomp): [`LICENSE`](https://github.com/mstan/snesrecomp/blob/main/LICENSE), [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/snesrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md)
- [mstan/gbarecomp](https://github.com/mstan/gbarecomp): [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/gbarecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md)
- [mstan/ndsrecomp](https://github.com/mstan/ndsrecomp): [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/ndsrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md), [`docs/references.md`](https://github.com/mstan/ndsrecomp/blob/main/docs/references.md)
- [mstan/vbrecomp](https://github.com/mstan/vbrecomp): [`LICENSE`](https://github.com/mstan/vbrecomp/blob/master/LICENSE), [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/vbrecomp/blob/master/THIRD_PARTY_ATTRIBUTION.md)
- [mstan/segagenesisrecomp](https://github.com/mstan/segagenesisrecomp): [`LICENSE-recompiler`](https://github.com/mstan/segagenesisrecomp/blob/master/LICENSE-recompiler), [`LICENSE.md`](https://github.com/mstan/segagenesisrecomp/blob/master/LICENSE.md), [`THIRD-PARTY-LICENSES.md`](https://github.com/mstan/segagenesisrecomp/blob/master/THIRD-PARTY-LICENSES.md)
- [mstan/DKC2Recomp](https://github.com/mstan/DKC2Recomp): [`README.md`](https://github.com/mstan/DKC2Recomp/blob/main/README.md), [`THIRD_PARTY_NOTICES.md`](https://github.com/mstan/DKC2Recomp/blob/main/THIRD_PARTY_NOTICES.md)
- [mstan/MarioTennisVirtualBoyRecomp](https://github.com/mstan/MarioTennisVirtualBoyRecomp): [`LICENSE.md`](https://github.com/mstan/MarioTennisVirtualBoyRecomp/blob/master/LICENSE.md)
- [mstan/MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp): [`THIRD-PARTY-LICENSES/README.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/THIRD-PARTY-LICENSES/README.md)
- [mstan/SonicBlastGGRecomp](https://github.com/mstan/SonicBlastGGRecomp): [`README.md`](https://github.com/mstan/SonicBlastGGRecomp/blob/main/README.md)
- [mstan/StarFoxSNESRecomp](https://github.com/mstan/StarFoxSNESRecomp): [`README.md`](https://github.com/mstan/StarFoxSNESRecomp/blob/main/README.md)
- The shared components: [`m68k-recomp-core/LICENSE`](https://github.com/mstan/m68k-recomp-core/blob/main/LICENSE), [`z80-recomp-core/LICENSE`](https://github.com/mstan/z80-recomp-core/blob/main/LICENSE), [`recomp-ui/LICENSE`](https://github.com/mstan/recomp-ui/blob/master/LICENSE)

## Next

- [Every repository](/docs/fleet/repositories) for what each of these
  repositories is and which toolchain it belongs to.
- [Provenance](/docs/fleet/provenance) for how one project records where its
  code came from, and for the BIOS question across the fleet.
- [Lineage and credit](/docs/fleet/lineage-and-credit) for how these projects
  descend from each other.
- [The game file you supply](/docs/concepts/the-game-file-you-supply) for the
  one thing no license in this table covers.
