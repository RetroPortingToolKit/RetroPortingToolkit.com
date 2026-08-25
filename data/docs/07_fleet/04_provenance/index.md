---
title: "Provenance"
summary: "How cdirecomp records where every line of its device code came from, step by step and quoted, and what each toolchain in the fleet says about BIOS and firmware it does or does not ship."
pageType: "concept"
tags: ["Provenance", "Attribution", "BIOS", "Engineering practice"]
repos:
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-23"
---

A recompiler runs on hardware nobody has documented completely, so its authors
read specifications, run other people's emulators, and inherit code from their
own earlier projects. Provenance is the record of which of those a given line
came from. [cdirecomp](https://github.com/mstan/cdirecomp) keeps that record as
a 57 line file ending in a standing rule, and it is the only document in the
fleet that sets the practice out as a rule rather than a habit. This page
reports that practice and then reports what each toolchain says about BIOS and
firmware, in the projects' own words.

## The distinction the record turns on

The file opens by saying what it covers and by drawing one line.

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
# Source provenance

This record covers the source that builds `CdiRuntime` and the author-owned
`CdiRecomp` frontend. It distinguishes implementation inputs from optional
black-box validation tools.
```

Everything else follows from that sentence. An implementation input is something
you write code from. A validation tool is something you only compare against.
Once the two are named separately, every component has to be filed under one of
them.

## The practice, step by step

### Name a basis and a test for every device

The body of the file is a table with three columns: the component, the
independent basis its implementation was written from, and the project's own
evidence that the result is right. Three of its rows:

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
| Component | Independent implementation basis | Project evidence |
|---|---|---|
| 68000 decode, code generation, and interpreter | Author-owned `segagenesisrecomp` frontend ancestry; Motorola 68000 architecture and SCC68070 timing/exception documentation | `recompiler/PROVENANCE.txt`, `runner/tests/m68k_arith_test.c`, generated-code differential tests |
| SCC68070 exception frames, timers, interrupt controller, and UART | SCC68070 User Manual, especially exception processing and sections 2.13.1–2.13.12 | `runner/tests/periph_test.c`, BIOS boot and co-simulation gates |
| DS1216 phantom clock/NVRAM | Analog Devices DS1216 data sheet: serial key, register layout, oscillator, BCD calendar, and SRAM pass-through | `runner/tests/cdi_nvram_test.c` |
```

The middle column says what the code was written from. The right column names
the test file that pins the result. No row cites another emulator as an
implementation basis.

### Publish the specification sources

A basis is only checkable if a reader can open it, so the file lists the
documents by URL rather than by name.

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
Specification locations used during the rewrite:

- SCC68070 User Manual: <https://d-nb.info/880525312/04>
- Analog Devices DS1216 product page/data sheet: <https://www.analog.com/en/products/ds1216.html>
- ICDIA CD-i technical-document catalog: <https://www.icdia.co.uk/techdocs/>
```

### State the rule about third-party emulators explicitly

Three sentences carry the weight of the whole document.

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
The device implementations above were rewritten without copying third-party
emulator source. Optional emulators may be run as black-box behavioral
comparators; their output is test evidence, not implementation authority.
```

"Test evidence, not implementation authority" is the phrase to lift. An oracle
tells you that you are wrong. It does not tell you what to write.

### Run a mechanical similarity audit and record its exact result

The project does not assert independence, it measures something and reports the
number it got.

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
The 2026-07-14 final audit found no exact sequence of 24 or more code tokens
shared between project source and either local third-party checkout. Validation
aligned 659,998 near-full-boot instruction transitions with zero skips,
resynchronizations, timing mismatches, or cumulative cycle drift; all focused
unit tests and Release shell/media/navigation smokes passed.
```

### Isolate the oracle so it cannot leak into a build

The comparator is named, and the file states where it is not.

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
## Excluded third-party tools

CeDImu is an optional, git-ignored local oracle checkout. Its source, local
patches, and resulting `CdiOracle` binary are not part of this repository's
player or recompiler targets and are never packaged.
```

The same section states that production packaging is runtime only, and that the
recompiler, the oracle, development tools, user-supplied ROM and disc images,
traces and build outputs are never packaged into a runtime release.

### When a dependency is removed, remove it from history too

Deleting a vendored tree from the working copy leaves it in every earlier
commit. This project says what it did about that.

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
The formerly vendored AGPL clown68000/clowncommon trees and their cycle-probe
adapter were removed on 2026-07-14. Neither `CdiRuntime` nor `CdiRecomp` now
includes, links, or requires them. Local historical checkouts remain ignored.
Ahead of this repository's public release the entire `external/clown68000` and
`external/clowncommon` history was stripped with `git filter-repo`, so no
vendored third-party emulator source remains in any commit.
```

The recompiler subtree carries a matching note, adding that CD-i cycle emission
now uses the project's own SCC68070 timing model transcribed from the user
manual, and that no third-party CPU core is compiled, linked, or needed.

### Record inherited code as an inheritance, with a commit

Code that came from the author's own earlier project is recorded as precisely as
code that came from a specification: repository, branch, commit, what was
copied, and the date.

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

### Write the rule down as a standing rule

The file ends by turning the record into a policy for work that has not happened
yet, which is the part that makes it a discipline rather than a description.

From [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md):

```text title="PROVENANCE.md"
## Audit rule

Any future production implementation must cite a hardware specification,
author-owned ancestor, or project-owned experiment/test. Third-party source may
be isolated as a separately licensed development tool, but it must not be used
as source text for the player implementation or enter a player/recompiler build.
```

## Why a project would keep a record like this

Nothing above is expensive at the time it is written, and each piece answers a
question that is otherwise unanswerable later.

- **A question about origin gets a file-level answer.** "Where did the DS1216
  clock come from" has a row, a data sheet URL and a test file, rather than
  somebody's recollection.
- **A claim is bounded by what was measured.** The audit reports a token
  threshold and a result, rather than saying "clean" and leaving the reader to
  guess what was checked.
- **A development tool cannot become a shipped one by accident.** The oracle is
  git-ignored, excluded from the player and recompiler targets, and named in the
  file as excluded.
- **A removed dependency is actually gone.** Stripping it from history means a
  later reader does not find it and draw a conclusion from it.

[ndsrecomp](https://github.com/mstan/ndsrecomp) applies the same reasoning to a
decision made before any code was written: a dependency was rejected, and the
reason was recorded next to the one chosen instead.

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

## The limits the projects state about themselves

The practice is only useful if it does not oversell. Two of these documents
state their own limits, and one records a mistake it found and fixed.

ndsrecomp ran the same kind of similarity audit as cdirecomp and immediately
said what it does not establish.

From [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/ndsrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md):

```text title="THIRD_PARTY_ATTRIBUTION.md"
The native implementation uses melonDS as a behavioral and timing reference.
An audit before the first public release found no exact normalized six-line
code block shared between the tracked native recompiler/runtime sources and
the pinned melonDS source tree. That mechanical check cannot prove independent
authorship; provenance comments and the repository history remain the primary
record.
```

The same file carries a dated self-correction naming a notice that was missing.

From [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/ndsrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md):

```text title="THIRD_PARTY_ATTRIBUTION.md"
  Correction, 2026-08-16: this section previously listed all seven of
  those files as byte-identical to upstream. They were not — the adaptive
  widescreen work modified them without recording a change notice. The
  patches and this list are the correction; no upstream behaviour claim
  was affected, but the GPLv3 §5(a) notice was missing and is now present.
```

cdirecomp's [`BIOS-CLOSEOUT.md`](https://github.com/mstan/cdirecomp/blob/master/BIOS-CLOSEOUT.md)
closes a milestone: the non-launching CD-RTOS player shell on the user-supplied
CD-i 490 system ROM, closed on 2026-07-14, with application loading and gameplay
explicitly out of scope. It lists what the recompiled ROM now does, names the
regression that proves it, and records the evidence retained. Then it says what
it did not prove.

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

That regression is named rather than described: `tools/bios_options_smoke.py`
creates a fresh battery image, lets the real BIOS initialise it, reboots from
that image, clicks through Options, Storage and Exit via relative IKAT reports,
and confirms that headless execution neither loads nor rewrites player NVRAM.

## The same discipline elsewhere in the fleet

Other repositories apply pieces of it without writing a `PROVENANCE.md`.

**Only metadata crosses from a decompilation.**
[MinishCapRecomp](https://github.com/mstan/MinishCapRecomp) states exactly what
enters the repository from an open decompilation project.

From [`README.md`](https://github.com/mstan/MinishCapRecomp/blob/main/README.md):

```text title="README.md"
Only **symbol metadata** (function names, addresses, sizes) from the
[`zeldaret/tmc`](https://github.com/zeldaret/tmc) decompilation enters this repo —
never its C source, PC-port runner, or toolchain. **The ROM is never
redistributed**; you supply your own legally-dumped copy.
```

**An unlicensed upstream is handled as an assumption, not a grant.**
[SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp)
refuses to claim more than it knows about a repository that publishes no
license.

From [`THIRD-PARTY-LICENSES/README.md`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/THIRD-PARTY-LICENSES/README.md):

```text title="THIRD-PARTY-LICENSES/README.md"
**That repository publishes no license.** Verified 2026-08-07 via the GitHub
API (`license: null`); the repository root carries no license file. For the
initial Captain Falcon release, the project owner has directed this project to
treat the community/decomp-derived controller as permissively reusable. That
is a project publication assumption, not a verified upstream license grant or
a legal conclusion about the upstream repository.
```

The same file explains why a submodule is not a redistribution: it records a URL
and a commit, and the ingest script copies only names and addresses, no ROM
bytes, no instruction text, and none of the disassembly's own commentary.

**A vendoring with a reproducible transform.**
[snesrecomp](https://github.com/mstan/snesrecomp)'s attribution file records the
exact steps to regenerate its vendored 65816 core from upstream, and names the
directed opcode harness that validates the result.

**A boundary statement instead of a bare license.**
[gcnlle](https://github.com/mstan/gcnlle)'s notices name the subsystems the
runtime retains exclusive ownership of even while adapting an upstream design,
and [xboxlle-probe](https://github.com/mstan/xboxlle-probe)'s `NOTICE.md`
records the source commit, the original author, and what the standalone version
added.

## The BIOS question, per project

A console BIOS is the sharpest case for all of this, because it is a file the
project neither wrote nor owns. The fleet's answers differ by console, and each
repository words its own.

### PlayStation: one image is bundled, the retail image is not

[psxrecomp](https://github.com/mstan/psxrecomp) is the only project in the fleet
that redistributes a console image, and it is a from-scratch replacement rather
than a dump.

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

The `bios/` directory contains exactly four files, and what is absent is as
informative as what is present.

| File | What it is |
|---|---|
| `openbios.bin` | The bundled OpenBIOS image, 524,288 bytes |
| `OpenBIOS.LICENSE` | Its MIT notice |
| `OpenBIOS.toml` | Build profile, upstream pins, image identity |
| `SCPH1001.toml` | Build profile for the retail backend. No retail image is present |

The image's identity and its redistributable status are recorded in the config
rather than asserted in prose.

From [`bios/OpenBIOS.toml`](https://github.com/mstan/psxrecomp/blob/master/bios/OpenBIOS.toml):

```toml title="bios/OpenBIOS.toml"
[program.image]
sha256          = "fabe498fbf224e4721f12f31b6f5fe0659205e341dc4e5c5f91b9bd1a1011c57"
license         = "MIT"
redistributable = true
```

The user-facing contract is that no BIOS chosen means OpenBIOS, and a BIOS the
player explicitly chose means that BIOS. One caveat is easy to lose when
summarising: OpenBIOS can be switched off per title, and then a retail dump is
required and the player is prompted for one.

From [`docs/BIOS_SELECTION.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BIOS_SELECTION.md):

```text title="docs/BIOS_SELECTION.md"
Set `openbios = false` only for a title with a **verified** OpenBIOS
incompatibility. Per-title compatibility is not implied by the framework
supporting OpenBIOS — verify a title before shipping it that way.
```

The document closes with the attribution and packaging obligations, including
the one that the notice and the image travel together.

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

The vendored notice also credits [uC-sdk](https://github.com/grumpycoders/uC-sdk),
whose permissively licensed code is linked into the OpenBIOS binary and whose
own terms require the mention, so both PCSX-Redux and uC-sdk are named wherever
this site describes that binary in detail.

### CD-i: nothing is bundled

cdirecomp ships no BIOS at all. Its `README.md` says it ships no copyrighted
material, no BIOS ROM, no disc images and no game-derived generated code, and
that the player system ROM comes from the user. What it documents instead is the
closeout above: a whole BIOS milestone completed against a user-supplied system
ROM, with the evidence and the remaining gaps both written down. See
[CD-i](/docs/platforms/cd-i).

### Game Boy Advance: mandatory, never bundled

gbarecomp needs the console BIOS and does not ship it, because it interprets the
real BIOS rather than stubbing it.

From [`bios/README.md`](https://github.com/mstan/gbarecomp/blob/main/bios/README.md):

```text title="bios/README.md"
Drop your own dump of the GBA BIOS here as `gba_bios.bin`. The binary
**is not in git** (it's copyrighted Nintendo code) but the `.toml` /
`.md` / `.sym` files in this folder ARE tracked, so the path layout
matches between developer machines.
```

The same file gives the reasoning: gbarecomp runs the actual GBA BIOS
instruction by instruction, does not high level emulate the SWIs, does not stub
the intro, and does not fast-forward through boot, because the BIOS is part of
what it recompiles through. See [High level and low level](/docs/concepts/hle-and-lle).

### Nintendo DS: retail dumps are the default, a free replacement is opt-in

ndsrecomp offers both, and is explicit about which is authoritative.

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

### SNES: coprocessor firmware is required and is not shipped

Some SNES cartridges carry a coprocessor with its own internal data ROM, which
is not part of the game ROM. snesrecomp does not redistribute the Cx4 data ROM,
`.gitignore` refuses it, and the loader reports loudly rather than silently
computing on zeros when it is absent. The claim that it is required is measured,
not assumed: on Mega Man X2's boot self-test the Cx4 program reads all 1024
data-ROM entries. Where no firmware is available, the independently derived
DSP-1 high level model handles only the command set it has verified and stops
rather than fabricating output on an unverified command.

## Source

- [mstan/cdirecomp](https://github.com/mstan/cdirecomp): [`PROVENANCE.md`](https://github.com/mstan/cdirecomp/blob/master/PROVENANCE.md), [`recompiler/PROVENANCE.txt`](https://github.com/mstan/cdirecomp/blob/master/recompiler/PROVENANCE.txt), [`BIOS-CLOSEOUT.md`](https://github.com/mstan/cdirecomp/blob/master/BIOS-CLOSEOUT.md), [`README.md`](https://github.com/mstan/cdirecomp/blob/master/README.md)
- [mstan/psxrecomp](https://github.com/mstan/psxrecomp): [`docs/BIOS_SELECTION.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BIOS_SELECTION.md), [`bios/OpenBIOS.toml`](https://github.com/mstan/psxrecomp/blob/master/bios/OpenBIOS.toml), [`bios/OpenBIOS.LICENSE`](https://github.com/mstan/psxrecomp/blob/master/bios/OpenBIOS.LICENSE), [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/psxrecomp/blob/master/THIRD_PARTY_ATTRIBUTION.md)
- [mstan/ndsrecomp](https://github.com/mstan/ndsrecomp): [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/ndsrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md), [`README.md`](https://github.com/mstan/ndsrecomp/blob/main/README.md), [`vendor/freebios/README.md`](https://github.com/mstan/ndsrecomp/blob/main/vendor/freebios/README.md)
- [mstan/gbarecomp](https://github.com/mstan/gbarecomp): [`bios/README.md`](https://github.com/mstan/gbarecomp/blob/main/bios/README.md)
- [mstan/snesrecomp](https://github.com/mstan/snesrecomp): [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/snesrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md)
- [mstan/MinishCapRecomp](https://github.com/mstan/MinishCapRecomp): [`README.md`](https://github.com/mstan/MinishCapRecomp/blob/main/README.md)
- [mstan/SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp): [`THIRD-PARTY-LICENSES/README.md`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/THIRD-PARTY-LICENSES/README.md)
- [mstan/gcnlle](https://github.com/mstan/gcnlle): [`THIRD_PARTY_NOTICES.md`](https://github.com/mstan/gcnlle/blob/master/THIRD_PARTY_NOTICES.md)
- [mstan/xboxlle-probe](https://github.com/mstan/xboxlle-probe): [`NOTICE.md`](https://github.com/mstan/xboxlle-probe/blob/main/NOTICE.md)

## Next

- [Licenses](/docs/fleet/licenses) for what each repository declares and what
  the toolchains bundle or link.
- [The game file you supply](/docs/concepts/the-game-file-you-supply) for the
  contract on the other side of the BIOS question.
- [PlayStation](/docs/platforms/playstation) and [CD-i](/docs/platforms/cd-i)
  for the two toolchains that answer the BIOS question most differently.
- [Lineage and credit](/docs/fleet/lineage-and-credit) for where the technique
  came from, and [Every repository](/docs/fleet/repositories) for the rest of
  the fleet.
