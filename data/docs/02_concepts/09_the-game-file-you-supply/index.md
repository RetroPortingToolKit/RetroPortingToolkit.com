---
title: "The game file you supply"
summary: "Every port here needs a game file you already have. The repositories ship none, the runner checks the one you give it, and this is the contract in the projects' own words."
pageType: "concept"
tags: ["Game files", "Verification", "Licensing"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/ndsrecomp"
updated: "2026-08-27"
---

Nothing here plays a game on its own. Every port is a program that needs a file
you already have: a disc image, a cartridge dump, or a console system ROM,
depending on the machine. The repositories do not contain that file. Neither do
the release archives. That much is the same everywhere. What differs by console
is which files you need and how many, and what differs by port is what happens
when the one you gave it is wrong, which is usually that it refuses to start.

> **You provide this.** Every port in this fleet needs a game file you supply
> from your own media. No repository here ships one.

## What the projects say they do not ship

This is not one project being careful. The same paragraph turns up across nine
consoles and at least six repository owners, usually under a heading called
`Legal` or `What you must supply`.

The PlayStation framework, [psxrecomp](https://github.com/mstan/psxrecomp),
says it for the disc and the BIOS both, in its [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md):

```text title="README.md"
Use only disc and retail BIOS files you obtained legally. PSXRecomp does not
include those copyrighted files; it includes only the redistributable OpenBIOS
image. Generated game and retail BIOS source is derived from your files, so do
not redistribute it.
```

Eight PlayStation game repositories under
[TechnicallyComputers](https://github.com/TechnicallyComputers) carry the same
paragraph as each other, adding that the disc image is ignored by Git.

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
heading and names both files a CD-i title needs.

From [`README.md`](https://github.com/mstan/cdirecomp/blob/master/README.md):

```text title="README.md"
## What you must supply

cdirecomp ships **no copyrighted material** — no BIOS ROM, no disc images, and
no game-derived generated code. To run anything you must provide, from your own
legally dumped media:

- A CD-i player **system ROM** (e.g. a 512 KiB `cdi490a.rom`).
- A CD-i title as a raw **Mode-2 `.cue` + `.bin`** image.
```

Across the repositories surveyed for this site, none contains a game ROM, a disc
image, a retail BIOS, coprocessor firmware, or generated code derived from a
ROM. The one console image redistributed anywhere in the fleet is psxrecomp's
`bios/openbios.bin`, which is MIT licensed and ships with its notice.
[Provenance](/docs/fleet/provenance) covers the BIOS question in full.

## Disc image, cartridge dump, or system ROM

What you supply depends on the console, and each project records the shape it
expects in a file kept beside the code.

- **PlayStation.** A `.cue` file plus its `.bin` track files, described in the
  port's own `DISC.md`. Both the image and any extracted executable stay local
  and are ignored by Git.
- **Game Boy Advance.** The ROM and the console BIOS, because gbarecomp boots
  every game through the recompiled BIOS rather than skipping it. Each port
  keeps a `baserom.md` saying so.
- **CD-i.** A player system ROM plus a raw Mode-2 `.cue` and `.bin` pair, as
  quoted above. See [CD-i](/docs/platforms/cd-i).
- **SNES.** For a few titles, coprocessor firmware as well as the ROM. The Cx4
  data used by some Capcom games is not part of the game ROM and is not shipped
  by [snesrecomp](https://github.com/mstan/snesrecomp).

One project is different in kind.
[PokemonYellowRecomp](https://github.com/mstan/PokemonYellowRecomp) builds its
base image locally from open decompilations, and says so plainly: the repository
is source only, and a supplied game is needed only to verify byte for byte
against the stock base.

## How the file is checked

Verification is a per port arrangement rather than one mechanism, and it lives
in a per console file: `DISC.md` on the PlayStation ports, `baserom.md` on the
Game Boy Advance ones. Each pairs a table of hashes with a do-not-commit rule,
and each names one region and one revision rather than a game in general.
Recompiled code is keyed to exact bytes at exact addresses, so a near miss is
not a near miss. It is a different program.

This site does not reproduce those hashes. Open the repository's own file, which
is the one the project maintains and the one the runner agrees with.

## What a project will not accept

Several ports write out the rejection list, and it is more specific than "the
wrong file".

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

[BoktaiRecomp](https://github.com/Shy/BoktaiRecomp) records what ignoring that
rule cost it, in [`baserom.md`](https://github.com/Shy/BoktaiRecomp/blob/main/baserom.md):

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

## What happens when the file is wrong

Where a port says what it does, it treats refusing as correct behaviour rather
than a rough edge. BoktaiRecomp's runner will not launch unless both the ROM and
the BIOS verify: "You supply your own legally-dumped copy, and the runner
refuses to launch on anything else." That is one port's statement about one
game, and it is not a promise this site can make for every build in the fleet.

The same instinct shows up below the file level, and there it is SNES specific.
snesrecomp's Cx4 firmware loader "reports loudly rather than silently computing
on zeros" when no firmware is present, and its DSP-1 fallback stops rather than
inventing output for a command it has not verified. A wrong or missing input
produces a stop, not a guess.

## The wording the projects use

Where a project attaches a condition, it is that project's condition, and this
site reports it as one. The repositories variously say "legally obtained",
"legally dumped", "lawfully obtained", and, in gcnlle's case, "media they are
authorized to use". Those are requirements the projects place on their users.
This site does not characterise the legality of anything and does not describe
how to obtain a game file.

The wording is short everywhere. MetroidNESRecomp takes two sentences:
"**You must supply your own Metroid ROM.** No copyrighted game data is included
in this repository." It says what the repository lacks and what you must
bring, and stops there.

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md). [cdirecomp](https://github.com/mstan/cdirecomp): [`README.md`](https://github.com/mstan/cdirecomp/blob/master/README.md). [ndsrecomp](https://github.com/mstan/ndsrecomp): [`README.md`](https://github.com/mstan/ndsrecomp/blob/main/README.md)
- [gbarecomp](https://github.com/mstan/gbarecomp): [`bios/README.md`](https://github.com/mstan/gbarecomp/blob/main/bios/README.md). [snesrecomp](https://github.com/mstan/snesrecomp): [`THIRD_PARTY_ATTRIBUTION.md`](https://github.com/mstan/snesrecomp/blob/main/THIRD_PARTY_ATTRIBUTION.md). [gcnlle](https://github.com/mstan/gcnlle): [`THIRD_PARTY_NOTICES.md`](https://github.com/mstan/gcnlle/blob/master/THIRD_PARTY_NOTICES.md)
- Ports: [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp) [`baserom.md`](https://github.com/mstan/MinishCapRecomp/blob/main/baserom.md), [BoktaiRecomp](https://github.com/Shy/BoktaiRecomp) [`baserom.md`](https://github.com/Shy/BoktaiRecomp/blob/main/baserom.md), [PokemonYellowRecomp](https://github.com/mstan/PokemonYellowRecomp) [`README.md`](https://github.com/mstan/PokemonYellowRecomp/blob/main/README.md), [MetroidNESRecomp](https://github.com/mstan/MetroidNESRecomp) [`README.md`](https://github.com/mstan/MetroidNESRecomp/blob/main/README.md), [Klonoa](https://github.com/TechnicallyComputers/Klonoa-Door-to-Phantomile) [`README.md`](https://github.com/TechnicallyComputers/Klonoa-Door-to-Phantomile/blob/master/README.md)

## Next

- [Getting started](/docs/start/what-you-need) for the practical prerequisites
  before a first build.
- [Provenance](/docs/fleet/provenance) for the BIOS question across the fleet.
- [Licenses](/docs/fleet/licenses) for what each repository declares.
- [Glossary](/docs/concepts/glossary) for baserom, disc image and oracle.
