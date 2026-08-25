---
title: "Lineage and credit"
summary: "How the projects in this fleet descend from each other: the framework the others were modelled on, the two CPU cores several toolchains share, the shared netplay stack, and the commit each game port pins."
pageType: "concept"
tags: ["Lineage", "Credit", "Licensing"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/m68k-recomp-core"
  - "https://github.com/mstan/z80-recomp-core"
  - "https://github.com/mstan/recomp-ui"
  - "https://github.com/TechnicallyComputers/recomp-net"
updated: "2026-08-25"
---

The toolchains here are not independent projects. One of them is the model the
others were built from. Two CPU frontends were pulled out of one framework and
are now shared repositories. The netplay code is a single library that four
toolchains link. Every game port records the exact framework commit it was built
against. Those are the lines of descent inside the fleet, and each one can be
checked in the repositories themselves.

## psxrecomp is the model the others name

[psxrecomp](https://github.com/mstan/psxrecomp) is the PlayStation toolchain.
The others name it as their model, by name, in their own documents.

- [snesrecomp](https://github.com/mstan/snesrecomp) calls its accuracy scorecard
  "modeled on the psxrecomp `ACCURACY_BURNDOWN.md` 7-axis methodology", ports its
  timing plan from psxrecomp's, and cites psxrecomp's co-simulation document as
  the "proven PSX reference impl".
- [nesrecomp](https://github.com/mstan/nesrecomp) models the same scorecard
  "1:1". It also refused part of the design and wrote down why. psxrecomp has
  several execution tiers for code that only arrives while the game is running.
  A NES cartridge is complete before the build starts, so those tiers would have
  nothing to do.
- [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) mirrors
  psxrecomp's co-simulation harness, counts guest cycles the psxrecomp way, and
  injects widescreen the PSX way.
- [gbarecomp](https://github.com/mstan/gbarecomp) takes the same scorecard, the
  same co-simulation design, and the idea of treating the console BIOS as an
  ordinary program.
- [ndsrecomp](https://github.com/mstan/ndsrecomp) models its dispatch tiers on
  psxrecomp and lists itself in the same family.
- [gcnlle](https://github.com/mstan/gcnlle) states the goal in one line.

From [`docs/DESIGN.md`](https://github.com/mstan/gcnlle/blob/master/docs/DESIGN.md):

```text title="docs/DESIGN.md"
Build a **static recompiler for the Nintendo GameCube**, in the same mold as
our existing PlayStation project (`psxrecomp`).
```

The copying is not only design. Every PlayStation game port builds its releases
from a workflow copied out of psxrecomp, and the copy says so in its first line.

## Two CPU cores are shared repositories now

[m68k-recomp-core](https://github.com/mstan/m68k-recomp-core) is the Motorola
68000 frontend. It did not start as a shared repository. The Genesis toolchain
wrote it, the CD-i toolchain copied it, and the copy then went its own way.

From [`PROVENANCE.md`](https://github.com/mstan/m68k-recomp-core/blob/main/PROVENANCE.md):

```text title="PROVENANCE.md"
The author-owned frontend originated in `segagenesisrecomp`. CD-i copied the
frontend from `segagenesisrecomp` commit `5aa0c4f` on 2026-05-28 and developed
SCC68070/OS-9 behavior independently afterward.
```

Both now consume the extracted repository, at `external/m68k-recomp-core`. The
shared decoder and validator are byte-identical between the two pins. All the
difference sits in the Genesis profile, which is the split the README asks for.

[z80-recomp-core](https://github.com/mstan/z80-recomp-core) does the same for
the Zilog Z80, a chip that turns up in two different roles. On the Master System
and Game Gear it is the console's main CPU. On the Genesis it drives the
cartridge sound. Both toolchains pin the identical commit, which is also that
repository's only commit.

[recomp-ui](https://github.com/mstan/recomp-ui), the launcher and settings
screen, began the same way, inside one console's project.

From [`README.md`](https://github.com/mstan/recomp-ui/blob/master/README.md):

```text title="README.md"
It is the reusable extraction of the SNES-recomp "launcher_ng" launcher,
generalized behind a small C ABI.
```

Today 58 game ports pin it, across eight consoles.

## One netplay stack, four consumers

Netplay is not rewritten per console. Four repositories under
`TechnicallyComputers` hold it.

| Repository | What it does | Who uses it |
|---|---|---|
| [recomp-net](https://github.com/TechnicallyComputers/recomp-net) | The netcode library. C11, version 0.1.0 | psxrecomp, nesrecomp, snesrecomp, segagenesisrecomp |
| [retcomm-rbengine](https://github.com/TechnicallyComputers/retcomm-rbengine) | Rollback host policy. recomp-net owns the wire, this owns the feel | psxrecomp |
| [recomp-net-server](https://github.com/TechnicallyComputers/recomp-net-server) | The lobby and signalling service, in Rust | Run as a service, not linked |
| [retcomm-catalog](https://github.com/TechnicallyComputers/retcomm-catalog) | JSON manifests of shipped titles | The RetComM Launcher, over HTTP |

Only one part of that stack is console-specific: a packet type in recomp-net for
Game Boy Advance link cable transfers.

## Small parts that travelled

Two components moved between projects and are credited at every stop.

The screen colour table in snesrecomp is adapted from psxrecomp, and
snesrecomp's attribution file records the exact revision it was taken from.
[DKC2Recomp](https://github.com/mstan/DKC2Recomp) then vendors that
psxrecomp-derived component under `third_party/psxrecomp_color_lut/`, carrying
all three of its license texts.

The ShadowVerifier and the colour science core came from outside the fleet, from
[JRickey/gba-recomp](https://github.com/JRickey/gba-recomp), with the author's
permission. gbarecomp and snesrecomp implemented it first. segagenesisrecomp
credits it as ported "through the gbarecomp/snesrecomp implementations with
permission". psxrecomp and [vbrecomp](https://github.com/mstan/vbrecomp) carry
their own versions in C.

## Every game port pins a commit

A game port is a thin repository over one framework, joined by a git submodule
pinned to a single commit. That pin records which version of the framework the
port was built against.

The pins are not uniform. The 58 recomp-ui gitlinks point at 19 different
commits. The furthest behind is 231 commits back from the default branch and the
closest is one. Two ports point the submodule URL at a fork instead of the
original, and three pin a named feature branch. Two other repositories have left
the submodule mechanism and carry a snapshot of a framework as an ordinary
directory, so a fact about a framework should be read in the framework
repository, never in one of those copies.

## Code that came from outside the fleet

Three cases, all of them stated by the repository itself.

- [gbrecompiled](https://github.com/mstan/gbrecompiled) is a development fork.
  Its README names the canonical project, `arcanite24/gb-recompiled`, and the
  second upstream whose runtime work was merged in.
- gcnlle vendors a fork of `ExpansionPak/DolRecomp` as its recompiler and
  records the upstream base commit, the fork commit and the dates in
  [`recompiler/UPSTREAM.md`](https://github.com/mstan/gcnlle/blob/master/recompiler/UPSTREAM.md).
  That code is GPL-3.0-or-later.
- Two Nintendo 64 ports build on a framework this fleet did not write and are
  GPLv3 as a result. That platform's history is on
  [Nintendo 64](/hardware/nintendo-64) and on each game's page.

## Source

- psxrecomp as the named model: [`SNES_ACCURACY_BURNDOWN.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_ACCURACY_BURNDOWN.md) and [`SNES_COSIM.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_COSIM.md), [`NES_ACCURACY_BURNDOWN.md`](https://github.com/mstan/nesrecomp/blob/master/NES_ACCURACY_BURNDOWN.md) and [`docs/MULTITIER_PORT_PROPOSAL.md`](https://github.com/mstan/nesrecomp/blob/master/docs/MULTITIER_PORT_PROPOSAL.md), [`COSIM.md`](https://github.com/mstan/segagenesisrecomp/blob/master/COSIM.md), [`GBA_ACCURACY_BURNDOWN.md`](https://github.com/mstan/gbarecomp/blob/main/GBA_ACCURACY_BURNDOWN.md), [`ndsrecomp/README.md`](https://github.com/mstan/ndsrecomp/blob/main/README.md), [`gcnlle/docs/DESIGN.md`](https://github.com/mstan/gcnlle/blob/master/docs/DESIGN.md). The copied release workflow: [`TombaRecomp/.github/workflows/release.yml`](https://github.com/mstan/TombaRecomp/blob/master/.github/workflows/release.yml).
- The shared cores: [`m68k-recomp-core/PROVENANCE.md`](https://github.com/mstan/m68k-recomp-core/blob/main/PROVENANCE.md) and [`README.md`](https://github.com/mstan/m68k-recomp-core/blob/main/README.md), [`z80-recomp-core/README.md`](https://github.com/mstan/z80-recomp-core/blob/main/README.md), [`recomp-ui/README.md`](https://github.com/mstan/recomp-ui/blob/master/README.md).
- The netplay stack: [`recomp-net/README.md`](https://github.com/TechnicallyComputers/recomp-net/blob/main/README.md), [`retcomm-rbengine/README.md`](https://github.com/TechnicallyComputers/retcomm-rbengine/blob/main/README.md), [`recomp-net-server/README.md`](https://github.com/TechnicallyComputers/recomp-net-server/blob/main/README.md), [`retcomm-catalog/README.md`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/README.md).
- The travelling parts: [`snesrecomp/THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/snesrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md), [`segagenesisrecomp/THIRD-PARTY-LICENSES.md`](https://github.com/mstan/segagenesisrecomp/blob/master/THIRD-PARTY-LICENSES.md).
- Code from outside: [`gbrecompiled/README.md`](https://github.com/mstan/gbrecompiled/blob/master/README.md), [`gcnlle/recompiler/UPSTREAM.md`](https://github.com/mstan/gcnlle/blob/master/recompiler/UPSTREAM.md).
- The pins come from every `.gitmodules` file and every gitlink in the fleet, read together.

## Next

- [Every repository](/docs/fleet/repositories) for the full dependency map and where each project named here sits.
- [The recompiler and the runtime](/docs/concepts/recompiler-and-runtime) for the shared design, in code.
- [Licenses](/docs/fleet/licenses) for what each repository declares.
- [Provenance](/docs/fleet/provenance) for how one project records where its code came from.
