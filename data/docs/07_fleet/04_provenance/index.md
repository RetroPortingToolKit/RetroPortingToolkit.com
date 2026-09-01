---
title: "Provenance"
summary: "How cdirecomp records where every line of its device code came from, quoted step by step, and what each toolchain in the fleet says about BIOS and firmware it does or does not ship."
pageType: "concept"
tags: ["Provenance", "Attribution", "BIOS", "Engineering practice"]
repos:
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-25"
---

Nobody has documented these consoles completely. So the people writing a
recompiler read hardware specifications, run other people's emulators, and reuse
code from their own earlier projects. Provenance is the record of which of those
a given line of code came from.
[cdirecomp](https://github.com/mstan/cdirecomp) keeps that record in a 57 line
file, and it is the only project here that writes the practice down as a rule.

## The line the record draws

The file opens by drawing one line.

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
# Source provenance

This record covers the source that builds `CdiRuntime` and the author-owned
`CdiRecomp` frontend. It distinguishes implementation inputs from optional
black-box validation tools.
```

An implementation input is something you write code from. A validation tool is
something you only compare against. Once they have separate names, every
component has to be filed under one of them.

## The practice, step by step

### A basis and a test per device

The body is a table: the component, the independent basis it was written from,
and the project's own evidence that the result is right. Three rows of it:

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
| Component | Independent implementation basis | Project evidence |
|---|---|---|
| 68000 decode, code generation, and interpreter | Author-owned `segagenesisrecomp` frontend ancestry; Motorola 68000 architecture and SCC68070 timing/exception documentation | `recompiler/PROVENANCE.txt`, `runner/tests/m68k_arith_test.c`, generated-code differential tests |
| SCC68070 exception frames, timers, interrupt controller, and UART | SCC68070 User Manual, especially exception processing and sections 2.13.1–2.13.12 | `runner/tests/periph_test.c`, BIOS boot and co-simulation gates |
| DS1216 phantom clock/NVRAM | Analog Devices DS1216 data sheet: serial key, register layout, oscillator, BCD calendar, and SRAM pass-through | `runner/tests/cdi_nvram_test.c` |
```

The middle column says where the code came from. The right column names the test
that pins it. No row cites another emulator as a basis.

### Publish the specification sources

A basis is only checkable if you can open it, so the file gives URLs.

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
Specification locations used during the rewrite:

- SCC68070 User Manual: <https://d-nb.info/880525312/04>
- Analog Devices DS1216 product page/data sheet: <https://www.analog.com/en/products/ds1216.html>
- ICDIA CD-i technical-document catalog: <https://www.icdia.co.uk/techdocs/>
```

### What an emulator is for

Three sentences carry the whole document.

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
The device implementations above were rewritten without copying third-party
emulator source. Optional emulators may be run as black-box behavioral
comparators; their output is test evidence, not implementation authority.
```

"Test evidence, not implementation authority" is the line to keep. An emulator
can tell you that you are wrong. It cannot tell you what to write.

### Measure, then print the number

The project does not assert independence. It measures and reports.

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
The 2026-07-14 final audit found no exact sequence of 24 or more code tokens
shared between project source and either local third-party checkout. Validation
aligned 659,998 near-full-boot instruction transitions with zero skips,
resynchronizations, timing mismatches, or cumulative cycle drift; all focused
unit tests and Release shell/media/navigation smokes passed.
```

### Keep the oracle out of the build

The comparator is named, and the file says where it is not.

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
## Excluded third-party tools

CeDImu is an optional, git-ignored local oracle checkout. Its source, local
patches, and resulting `CdiOracle` binary are not part of this repository's
player or recompiler targets and are never packaged.
```

A release contains the runtime only. The recompiler, the oracle, development
tools, user-supplied ROM and disc images, traces and build outputs are all
excluded.

### Remove it from history too

Deleting a vendored tree leaves it in every earlier commit. This project says
what it did.

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
The formerly vendored AGPL clown68000/clowncommon trees and their cycle-probe
adapter were removed on 2026-07-14. Neither `CdiRuntime` nor `CdiRecomp` now
includes, links, or requires them. Local historical checkouts remain ignored.
Ahead of this repository's public release the entire `external/clown68000` and
`external/clowncommon` history was stripped with `git filter-repo`, so no
vendored third-party emulator source remains in any commit.
```

The recompiler subtree carries a matching note: CD-i cycle timing now comes from
the project's own SCC68070 model, transcribed from the user manual, and no
third-party CPU core is compiled or linked.

### Record inherited code with a commit

Code from the author's own earlier project is recorded as precisely as code
written from a specification: repository, branch, commit, what was copied, and
the date.

From [`recompiler/PROVENANCE.txt`](https://github.com/mstan/cdirecomp/blob/master/recompiler/PROVENANCE.txt):

```text title="recompiler/PROVENANCE.txt"
Ancestor: F:\Projects\segagenesisrecomp\SonicTheHedgehogRecomp\segagenesisrecomp
Branch:   dev
Commit:   5aa0c4f (sonic3: add Sonic 3 (USA) standalone mode)
Copied:   author-owned recompiler/src 68000 frontend
Date:     2026-05-28

The frontend came from another repository by the same author and has since
diverged for CD-i. GenesisRom naming remains pending shared-module extraction.
```

### Write the rule down

The file ends by turning the record into policy.

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
## Audit rule

Any future production implementation must cite a hardware specification,
author-owned ancestor, or project-owned experiment/test. Third-party source may
be isolated as a separately licensed development tool, but it must not be used
as source text for the player implementation or enter a player/recompiler build.
```

## Why keep a record like this?

Each piece is cheap to write and answers a question that cannot be answered
later. Where the DS1216 clock came from has a row, a data sheet URL and a test
file, not somebody's memory. The audit gives a threshold and a result, so the
claim is bounded. The oracle is git-ignored and named as excluded, so a
development tool cannot ship by accident.

[ndsrecomp](https://github.com/mstan/ndsrecomp) applies the same reasoning to a
choice made before any code was written. A dependency was rejected, and the
reason was recorded next to the one picked instead.

From [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/ndsrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md):

```text title="THIRD_PARTY_ATTRIBUTION.md"
**xBRZ was rejected on licensing grounds.** DeSmuME's texture upscaling
vendors Zenju's xBRZ (`desmume/src/filter/xbrz.cpp`), which carries
`GNU General Public License: http://www.gnu.org/licenses/gpl-3.0` with no
"or later" clause, plus a MAME-specific linking exception that does not
apply here. Combining GPL-3.0-only code into this runner would force the
whole executable to be conveyed as GPL-3.0 exactly, stripping the "or
later" option from every downstream recipient. xBRZ is "xBR, Zenju
enhanced", so xBR-lv2 is the same algorithm family without that cost. No
DeSmuME source is used.
```

## What the projects have not proved

ndsrecomp ran the same kind of audit and said at once what it does not establish.

From [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/ndsrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md):

```text title="THIRD_PARTY_ATTRIBUTION.md"
The native implementation uses melonDS as a behavioral and timing reference.
An audit before the first public release found no exact normalized six-line
code block shared between the tracked native recompiler/runtime sources and
the pinned melonDS source tree. That mechanical check cannot prove independent
authorship; provenance comments and the repository history remain the primary
record.
```

The same file carries a dated correction naming a notice that was missing.

From [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/ndsrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md):

```text title="THIRD_PARTY_ATTRIBUTION.md"
  Correction, 2026-08-16: this section previously listed all seven of
  those files as byte-identical to upstream. They were not — the adaptive
  widescreen work modified them without recording a change notice. The
  patches and this list are the correction; no upstream behaviour claim
  was affected, but the GPLv3 §5(a) notice was missing and is now present.
```

cdirecomp's [`BIOS-CLOSEOUT.md`](https://github.com/mstan/cdirecomp/blob/master/BIOS-CLOSEOUT.md)
closed a milestone on 2026-07-14: the non-launching CD-RTOS player shell running
on a user-supplied CD-i 490 system ROM. Then it says what it did not prove.

From [`BIOS-CLOSEOUT.md`](https://github.com/mstan/cdirecomp/blob/master/BIOS-CLOSEOUT.md):

```text title="BIOS-CLOSEOUT.md"
## What moves to the next chapter

The closeout does not claim that every SCC68070 facility or every possible ROM
path has executed. I2C, DMA, MMU translation, additional exception variants,
CIAP application-sector delivery, audio, and dynamically loaded OS-9 code stay
on the platform/game backlog. They are no longer speculative blockers for a
BIOS shell that does not use them; the Hotel Mario loader path will drive their
implementation and add focused regressions when it reaches them.
```

The regression that proves the milestone is `tools/bios_options_smoke.py`. It
creates a fresh battery image, lets the real BIOS set it up, reboots from that
image, clicks through Options, Storage and Exit, and confirms that a headless run
neither loads nor rewrites player NVRAM.

## The same discipline elsewhere in the fleet

Other repositories apply pieces of it without writing a `PROVENANCE.md`.

**Only metadata crosses from a decompilation.**
[MinishCapRecomp](https://github.com/mstan/MinishCapRecomp) states what enters
its repository from an open decompilation project.

From [`README.md`](https://github.com/mstan/MinishCapRecomp/blob/main/README.md):

```text title="README.md"
Only **symbol metadata** (function names, addresses, sizes) from the
[`zeldaret/tmc`](https://github.com/zeldaret/tmc) decompilation enters this repo —
never its C source, PC-port runner, or toolchain. **The ROM is never
redistributed**; you supply your own legally-dumped copy.
```

**An unlicensed upstream is an assumption, not a grant.**
[SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp)
claims no more than it knows about a repository that publishes no license.

From [`THIRD-PARTY-LICENSES/README.md`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/THIRD-PARTY-LICENSES/README.md):

```text title="THIRD-PARTY-LICENSES/README.md"
**That repository publishes no license.** Verified 2026-08-07 via the GitHub
API (`license: null`); the repository root carries no license file. For the
initial Captain Falcon release, the project owner has directed this project to
treat the community/decomp-derived controller as permissively reusable. That
is a project publication assumption, not a verified upstream license grant or
a legal conclusion about the upstream repository.
```

The same file explains why a submodule is not redistribution. It records a URL
and a commit, and the ingest script copies only names and addresses: no ROM
bytes, no instruction text, no commentary.

**A vendoring with a reproducible transform.**
[snesrecomp](https://github.com/mstan/snesrecomp)'s attribution file gives the
steps to regenerate its vendored 65816 core from upstream, and names the opcode
harness that checks the result.

## The BIOS question, per project

A console BIOS is the sharpest case: a file the project neither wrote nor owns.
The answers differ by console, in each repository's own words.

### PlayStation: one image is bundled

[psxrecomp](https://github.com/mstan/psxrecomp) is the only project here that
ships a console image, and it is a from-scratch replacement, not a dump.

From [`docs/BIOS_SELECTION.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BIOS_SELECTION.md):

```text title="docs/BIOS_SELECTION.md"
A PlayStation game needs a BIOS. PSXRecomp can supply one — **OpenBIOS**, an
MIT-licensed, from-scratch PS1 BIOS from the PCSX-Redux project that we are
allowed to redistribute — so a player can be handed a build and a disc image and
just play. A player who prefers their own dumped retail BIOS can use that
instead.

Both recompiled BIOS backends are linked into every normal build. The OpenBIOS
image itself and its MIT notice are staged in `bios/` beside the executable;
the retail image is never shipped and comes from the player. Which backend runs
is decided when the game launches, not when it is built.
```

The `bios/` directory holds four files. What is missing matters too.

| File | What it is |
|---|---|
| `openbios.bin` | The bundled OpenBIOS image, 524,288 bytes |
| `OpenBIOS.LICENSE` | Its MIT notice |
| `OpenBIOS.toml` | Build profile, upstream pins, image identity |
| `SCPH1001.toml` | Build profile for the retail backend. No retail image is present |

The image's identity and redistributable status live in the config, not in prose.

From [`bios/OpenBIOS.toml`](https://github.com/mstan/psxrecomp/blob/master/bios/OpenBIOS.toml):

```toml title="bios/OpenBIOS.toml"
[program.image]
sha256          = "fabe498fbf224e4721f12f31b6f5fe0659205e341dc4e5c5f91b9bd1a1011c57"
license         = "MIT"
redistributable = true
```

No BIOS chosen means OpenBIOS. A BIOS the player chose means that BIOS. OpenBIOS
can also be switched off per title, and then the player must supply a retail
dump.

From [`docs/BIOS_SELECTION.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BIOS_SELECTION.md):

```text title="docs/BIOS_SELECTION.md"
Set `openbios = false` only for a title with a **verified** OpenBIOS
incompatibility. Per-title compatibility is not implied by the framework
supporting OpenBIOS — verify a title before shipping it that way.
```

The document closes with one packaging rule: the notice and the image travel
together.

From [`docs/BIOS_SELECTION.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BIOS_SELECTION.md):

```text title="docs/BIOS_SELECTION.md"
## Attribution

OpenBIOS is MIT-licensed. Its notice is vendored at `bios/OpenBIOS.LICENSE`,
with the upstream source pin and build recipe in `bios/OpenBIOS.toml` and
attribution in `THIRD_PARTY_ATTRIBUTION.md`. Builds that ship it credit the
PCSX-Redux authors in the launcher, whether or not the licence compels it.

Native runtime builds automatically stage both `bios/openbios.bin` and
`bios/OpenBIOS.LICENSE`. Release packaging must copy that directory as a unit;
shipping the image without its notice violates the distribution contract.

Retail BIOS images are **not** redistributable and are never shipped. A player
using one supplies their own dump.
```

The notice also credits [uC-sdk](https://github.com/grumpycoders/uC-sdk), whose
permissively licensed code is linked into the OpenBIOS binary and whose own terms
require the mention.

### CD-i: nothing is bundled

cdirecomp ships no BIOS at all. Its `README.md` says it ships no copyrighted
material, no BIOS ROM, no disc images and no game-derived generated code. The
player system ROM comes from the user. See [CD-i](/docs/platforms/cd-i).

### Game Boy Advance: required, never bundled

gbarecomp needs the console BIOS and does not ship it. It runs the real BIOS
instruction by instruction rather than stubbing it.

From [`bios/README.md`](https://github.com/mstan/gbarecomp/blob/main/bios/README.md):

```text title="bios/README.md"
Drop your own dump of the GBA BIOS here as `gba_bios.bin`. The binary
**is not in git** (it's copyrighted Nintendo code) but the `.toml` /
`.md` / `.sym` files in this folder ARE tracked, so the path layout
matches between developer machines.
```

That is also why it does not high level emulate the SWIs, stub the intro, or
fast-forward through boot: the BIOS is part of what it recompiles through. See
[High level and low level](/docs/concepts/hle-and-lle).

### Nintendo DS: retail dumps by default

ndsrecomp offers both and says which one is authoritative.

From [`README.md`](https://github.com/mstan/ndsrecomp/blob/main/README.md):

```text title="README.md"
An opt-in no-dump path also exists (`--freebios --generated-firmware
--boot direct`): the recompiled [FreeBIOS](https://github.com/mstan/freebios)
(the DraStic BIOS replacement, BSD-2-Clause, vendored as the
`third_party/freebios` submodule) plus a synthesized firmware image with a
persisted per-install identity. The retail dumps remain the default and the
oracle-diffed source of truth.
```

The vendored notice states the limit of that path.

From [`vendor/freebios/README.md`](https://github.com/mstan/ndsrecomp/blob/main/vendor/freebios/README.md):

```text title="vendor/freebios/README.md"
FreeBIOS can only pair with `--boot direct` (it cannot boot the firmware
menu), and the retail-dump path remains the default and the oracle-diffed
source of truth.
```

### SNES: coprocessor firmware is not shipped

Some SNES cartridges carry a coprocessor with its own data ROM, separate from the
game ROM. snesrecomp does not redistribute the Cx4 data ROM, `.gitignore` refuses
it, and the loader reports loudly when it is missing instead of computing on
zeros. The requirement is measured: on Mega Man X2's boot self-test the Cx4 program
reads all 1024 data-ROM entries. Where no firmware exists, the DSP-1 high level
model answers only the commands it has verified.

## Source

- [mstan/cdirecomp](https://github.com/mstan/cdirecomp): [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md), [`recompiler/PROVENANCE.txt`](https://github.com/mstan/cdirecomp/blob/master/recompiler/PROVENANCE.txt), [`BIOS-CLOSEOUT.md`](https://github.com/mstan/cdirecomp/blob/master/BIOS-CLOSEOUT.md), [`README.md`](https://github.com/mstan/cdirecomp/blob/master/README.md)
- [mstan/psxrecomp](https://github.com/mstan/psxrecomp): [`docs/BIOS_SELECTION.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BIOS_SELECTION.md), [`bios/OpenBIOS.toml`](https://github.com/mstan/psxrecomp/blob/master/bios/OpenBIOS.toml), [`bios/OpenBIOS.LICENSE`](https://github.com/mstan/psxrecomp/blob/master/bios/OpenBIOS.LICENSE), [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/psxrecomp/blob/master/THIRD_PARTY_ATTRIBUTION.md)
- [mstan/ndsrecomp](https://github.com/mstan/ndsrecomp): [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/ndsrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md), [`README.md`](https://github.com/mstan/ndsrecomp/blob/main/README.md), [`vendor/freebios/README.md`](https://github.com/mstan/ndsrecomp/blob/main/vendor/freebios/README.md)
- [mstan/gbarecomp](https://github.com/mstan/gbarecomp): [`bios/README.md`](https://github.com/mstan/gbarecomp/blob/main/bios/README.md)
- [mstan/snesrecomp](https://github.com/mstan/snesrecomp): [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/snesrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md)
- [mstan/MinishCapRecomp](https://github.com/mstan/MinishCapRecomp): [`README.md`](https://github.com/mstan/MinishCapRecomp/blob/main/README.md)
- [mstan/SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp): [`THIRD-PARTY-LICENSES/README.md`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/THIRD-PARTY-LICENSES/README.md)
