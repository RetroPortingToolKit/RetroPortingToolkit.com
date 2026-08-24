---
title: "The game file you supply"
summary: "The contract every port in this fleet makes with its user: you supply the disc image, cartridge dump or system ROM, the runtime verifies it before anything runs, and the repositories state that they distribute none of it."
section: "concepts"
sectionTitle: "Concepts"
pageType: "concept"
tags: ["Game files", "Verification", "Licensing"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/ndsrecomp"
updated: "2026-08-23"
---

Nothing in this fleet plays a game on its own. Every port is a program that
needs a file you already have: a disc image, a cartridge dump, or a console
system ROM, depending on the console. The repositories do not contain that
file, and the release archives do not contain it. That much is the same
everywhere. What differs by console is which files you need and how many, and
what differs by port is what the runner does when the one you gave it is
wrong, which is usually to refuse to start. This page states the shared
contract once, in the projects' own words, then lists the per console shape, so
the rest of the wiki can link here instead of restating it.

> **You provide this.** Every port in this fleet needs a game file you supply
> from your own media. No repository here ships one.

## What the projects say they do not distribute

The wording is not one project's caution. It recurs across nine consoles and at
least six repository owners, usually under a heading called `Legal` or
`What you must supply`.

The PlayStation framework, [psxrecomp](https://github.com/mstan/psxrecomp),
states it for both the disc and the BIOS.

From [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md):

```text title="README.md"
Use only disc and retail BIOS files you obtained legally. PSXRecomp does not
include those copyrighted files; it includes only the redistributable OpenBIOS
image. Generated game and retail BIOS source is derived from your files, so do
not redistribute it.
```

Eight PlayStation game repositories under
[TechnicallyComputers](https://github.com/TechnicallyComputers) carry the same
paragraph as each other, adding the rule that the disc image is ignored by Git.

From [`README.md`](https://github.com/TechnicallyComputers/Klonoa-Door-to-Phantomile/blob/master/README.md):

```text title="README.md"
## Legal

You must own the original game. Disc images under `disc/` are gitignored and
must never be committed. Retail BIOS dumps are not redistributed; OpenBIOS is
used for Generate unless you supply your own SCPH locally.
```

On Game Boy Advance the same paragraph appears in four Nintendo game repos with
only the trademark sentence changed.

From [`README.md`](https://github.com/mstan/MinishCapRecomp/blob/main/README.md):

```text title="README.md"
## Legal

This project contains **no copyrighted ROM data, no Nintendo BIOS, and no decomp
source** — only original recompiler/runtime code and symbol metadata. **You must
supply your own legally-dumped ROM** (and BIOS, where the runtime requires one).
The Legend of Zelda and The Minish Cap are trademarks of Nintendo; this project is
an unaffiliated, non-commercial preservation and research effort.
```

[cdirecomp](https://github.com/mstan/cdirecomp) gives the requirement its own
section heading, and names both files a CD-i title needs.

From [`README.md`](https://github.com/mstan/cdirecomp/blob/master/README.md):

```text title="README.md"
## What you must supply

cdirecomp ships **no copyrighted material** — no BIOS ROM, no disc images, and
no game-derived generated code. To run anything you must provide, from your own
legally dumped media:

- A CD-i player **system ROM** (e.g. a 512 KiB `cdi490a.rom`).
- A CD-i title as a raw **Mode-2 `.cue` + `.bin`** image.
```

[ndsrecomp](https://github.com/mstan/ndsrecomp) extends the list past the ROM to
the things a careless commit could add later.

From [`README.md`](https://github.com/mstan/ndsrecomp/blob/main/README.md):

```text title="README.md"
This repository intentionally contains no Nintendo BIOS, firmware, ROM, save
data, generated recompiled code, or binary embedding those materials. The
checked-in showcase images are manually selected demonstration screenshots;
do not add raw captures, save files, generated banks, or dumped game material.
```

[gcnlle](https://github.com/mstan/gcnlle) words the user's side differently from
every other repository in the fleet, and the difference is worth noticing.

From [`THIRD_PARTY_NOTICES.md`](https://github.com/mstan/gcnlle/blob/master/THIRD_PARTY_NOTICES.md):

```text title="THIRD_PARTY_NOTICES.md"
## User-supplied data

Nintendo GameCube firmware, DSP ROMs, games, save files, generated IPL source,
and screenshots are not distributed by this repository. Users must supply any
required dumps from hardware or media they are authorized to use.
```

Across the repositories surveyed for this site, no repository contains a game
ROM, a disc image, a retail BIOS, coprocessor firmware, or generated
ROM-derived C. The one console image redistributed anywhere in the fleet is
psxrecomp's `bios/openbios.bin`, which is MIT licensed and ships with its
notice. That is a statement about what those files are, and this page draws no
conclusion beyond it. [Provenance](/docs/fleet/provenance) covers the BIOS
question in full.

## Disc image, cartridge dump, or system ROM

What you supply depends on the console, and each project records the shape it
expects in a file kept beside the code.

- **PlayStation.** A `.cue` file plus its `.bin` track files, described in the
  port's own `DISC.md`. Eight of those files exist, one per game. Both the image
  and any extracted executable are local only and gitignored.
- **Game Boy Advance.** The ROM and the console BIOS, because gbarecomp boots
  every game through the recompiled BIOS rather than skipping it. Eleven
  `baserom.md` files exist across the GBA ports; the shortest form of the rule,
  in three of them, is that the ROM is user-provided under `roms/` and must
  never be committed. See
  [`bios/README.md`](https://github.com/mstan/gbarecomp/blob/main/bios/README.md).
- **CD-i.** A player system ROM plus a raw Mode-2 `.cue` and `.bin` pair, as
  quoted above. See [CD-i](/docs/platforms/cd-i).
- **SNES.** For a few titles, coprocessor firmware as well as the ROM. The Cx4
  data ROM used by some Capcom games is not part of the game ROM, is not shipped
  by [snesrecomp](https://github.com/mstan/snesrecomp), and is refused by
  `.gitignore`.

One project in the fleet is different in kind.
[PokemonYellowRecomp](https://github.com/mstan/PokemonYellowRecomp) builds its
base image locally from open decompilations rather than asking for a dump, and
says so plainly in its `README.md`: the repository is source only, and a
supplied game is needed only if you want to verify byte for byte against the
stock base.

## How the file is checked

Verification is a per port arrangement rather than one mechanism, and it lives
in a per console file. The identity records are `DISC.md` on the PlayStation
ports and `baserom.md` on the Game Boy Advance ports. Each pairs a hash table with a do-not-commit rule,
and each names a specific region and revision rather than a game in general: a
USA revision 0 release, a US v1.0 ROM, a v1.0 that is not the v1.1. Recompiled C
is keyed to exact bytes at exact addresses, so a near miss is not a near miss,
it is a different program.

This site does not reproduce those hashes. Open the repository's own `DISC.md`
or `baserom.md`, which is the file the project maintains and the file the
runtime agrees with. Two PlayStation ports also mark which of their hashes were
computed locally rather than taken from a canonical database, which is a useful
habit to look for.

## What a project will not accept

Several ports state the rejection list explicitly, and it is more specific than
"the wrong file".

From [`baserom.md`](https://github.com/mstan/MinishCapRecomp/blob/main/baserom.md):

```text title="baserom.md"
## What we don't accept

- Trimmed ROMs (header pad removed). The original cartridge image is
  what hardware sees, including pad bytes.
- IPS/UPS-patched ROMs (translation patches, randomizers, etc.).
  Recompiler output is keyed to specific opcodes at specific
  addresses; a patched ROM is a different game and needs its own
  hash entry.
- Decomp-built ROMs. The decomp produces a byte-different artifact;
  even if it boots, it isn't the original cartridge.
```

[BoktaiRecomp](https://github.com/Shy/BoktaiRecomp) explains why the rule costs
something real when it is ignored, and records the debugging time it spent.

From [`baserom.md`](https://github.com/Shy/BoktaiRecomp/blob/main/baserom.md):

```text title="baserom.md"
### Use a clean dump — this matters more for Boktai than for most games

Two kinds of patched Boktai ROM circulate widely, and both break this project:

- **Sensor patches** replace the cartridge photodiode reads with a constant, so
  the game no longer talks to the hardware this project emulates. The solar
  sensor becomes inert — the whole point of the port, gone.
- **Intro patches** (cracktros) change the header/logo region. One of these cost
  real debugging time here: an oracle screenshot showed a scene group's
  "GREETINGS '10" splash on a 2004 game, which is how the dump was identified as
  patched at all.
```

[FireRedLeafGreenRecomp](https://github.com/mstan/FireRedLeafGreenRecomp) records
a rejection that actually happened during setup: a re-padded file whose SHA-1
matched neither supported revision was refused and never copied in. The details
are in
[`variants/firered/baserom.md`](https://github.com/mstan/FireRedLeafGreenRecomp/blob/main/variants/firered/baserom.md).

## What happens when the file is wrong

Where a port states what it does, it treats refusal as the correct behaviour
rather than a rough edge. BoktaiRecomp's `baserom.md` states that the runner
refuses to launch unless both the ROM and the BIOS verify, and its `README.md`
adds that "You supply your own legally-dumped copy, and the runner refuses to
launch on anything else." That is one port's statement about one game and it is
quoted as such; it is not a guarantee this site can make on behalf of every
build in the fleet.

The same instinct shows up below the file level, and there it is SNES specific.
snesrecomp's Cx4 firmware
loader "reports loudly rather than silently computing on zeros" when no firmware
is present, and its DSP-1 high level fallback stops rather than fabricating
output if it meets a command it has not verified. A wrong or missing input
produces a stop, not a guess.

## The wording the projects use

Where a project attaches a condition, it is the project's condition, and this
site reports it as one. The repositories variously say "legally obtained",
"legally dumped", "lawfully obtained", and, in gcnlle's case, "media they are
authorized to use". Those are requirements the projects place on their users.
This site does not characterise the legality of anything and does not describe
how to obtain a game file.

The most restrained wording in the fleet is also the shortest. vbrecomp's
[`LICENSE`](https://github.com/mstan/vbrecomp/blob/master/LICENSE) says, in full,
"This project ships no ROM data." MetroidNESRecomp's
[`README.md`](https://github.com/mstan/MetroidNESRecomp/blob/main/README.md)
takes two sentences: "**You must supply your own Metroid ROM.** No copyrighted
game data is included in this repository." Each asserts what the repository
lacks and what the user must supply, and stops. This documentation matches that
restraint deliberately.

> **Note.** Not every repository words this the same way, and a few attach no
> condition at all. MarioTennisVirtualBoyRecomp's
> [`README.md`](https://github.com/mstan/MarioTennisVirtualBoyRecomp/blob/master/README.md)
> is the shortest of those: "Provide your own cart dump." Where projects differ,
> [Licenses](/docs/fleet/licenses) and
> [Lineage and credit](/docs/fleet/lineage-and-credit) record the difference
> rather than averaging it.

## Source

- [mstan/psxrecomp](https://github.com/mstan/psxrecomp): [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md)
- [mstan/snesrecomp](https://github.com/mstan/snesrecomp): [`README.md`](https://github.com/mstan/snesrecomp/blob/main/README.md), [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/snesrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md)
- [mstan/gbarecomp](https://github.com/mstan/gbarecomp): [`bios/README.md`](https://github.com/mstan/gbarecomp/blob/main/bios/README.md)
- [mstan/cdirecomp](https://github.com/mstan/cdirecomp): [`README.md`](https://github.com/mstan/cdirecomp/blob/master/README.md)
- [mstan/ndsrecomp](https://github.com/mstan/ndsrecomp): [`README.md`](https://github.com/mstan/ndsrecomp/blob/main/README.md)
- [mstan/gcnlle](https://github.com/mstan/gcnlle): [`THIRD_PARTY_NOTICES.md`](https://github.com/mstan/gcnlle/blob/master/THIRD_PARTY_NOTICES.md)
- [mstan/MinishCapRecomp](https://github.com/mstan/MinishCapRecomp): [`README.md`](https://github.com/mstan/MinishCapRecomp/blob/main/README.md), [`baserom.md`](https://github.com/mstan/MinishCapRecomp/blob/main/baserom.md)
- [Shy/BoktaiRecomp](https://github.com/Shy/BoktaiRecomp): [`README.md`](https://github.com/Shy/BoktaiRecomp/blob/main/README.md), [`baserom.md`](https://github.com/Shy/BoktaiRecomp/blob/main/baserom.md)
- [mstan/FireRedLeafGreenRecomp](https://github.com/mstan/FireRedLeafGreenRecomp): [`variants/firered/baserom.md`](https://github.com/mstan/FireRedLeafGreenRecomp/blob/main/variants/firered/baserom.md)
- [mstan/PokemonYellowRecomp](https://github.com/mstan/PokemonYellowRecomp): [`README.md`](https://github.com/mstan/PokemonYellowRecomp/blob/main/README.md)
- [mstan/vbrecomp](https://github.com/mstan/vbrecomp): [`LICENSE`](https://github.com/mstan/vbrecomp/blob/master/LICENSE)
- [mstan/MetroidNESRecomp](https://github.com/mstan/MetroidNESRecomp): [`README.md`](https://github.com/mstan/MetroidNESRecomp/blob/main/README.md)
- [mstan/MarioTennisVirtualBoyRecomp](https://github.com/mstan/MarioTennisVirtualBoyRecomp): [`README.md`](https://github.com/mstan/MarioTennisVirtualBoyRecomp/blob/master/README.md)
- [TechnicallyComputers/Klonoa-Door-to-Phantomile](https://github.com/TechnicallyComputers/Klonoa-Door-to-Phantomile): [`README.md`](https://github.com/TechnicallyComputers/Klonoa-Door-to-Phantomile/blob/master/README.md)

## Next

- [What you need](/docs/start/what-you-need) for the practical prerequisites
  before a first build, this contract included.
- [Provenance](/docs/fleet/provenance) for the BIOS question across the fleet
  and how one project documents where its code came from.
- [Licenses](/docs/fleet/licenses) for what each repository declares, and for
  the 48 that declare nothing.
- [Glossary](/docs/concepts/glossary) for `baserom`, `disc image` and `oracle`
  as this fleet uses them.
