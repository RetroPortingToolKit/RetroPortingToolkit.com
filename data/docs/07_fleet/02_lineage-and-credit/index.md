---
title: "Lineage and credit"
summary: "Exactly which repositories in this fleet contain upstream N64Recomp code, which only share its ideas, and what our documentation owes each upstream project."
section: "fleet"
sectionTitle: "Fleet"
pageType: "concept"
tags: ["Lineage", "Credit", "Licensing"]
repos:
  - "https://github.com/N64Recomp/N64Recomp"
  - "https://github.com/N64Recomp/N64ModernRuntime"
  - "https://github.com/Zelda64Recomp/Zelda64Recomp"
  - "https://github.com/rt64/rt64"
  - "https://github.com/mstan/PokemonStadiumRecomp"
  - "https://github.com/mstan/PocketMonstersStadiumRecomp"
updated: "2026-08-23"
---

This fleet owes the upstream N64 static recompilation stack a real debt, and almost all of it is a debt of ideas rather than of code. Two repositories here build against forks of that stack and are licensed accordingly. Everywhere else the relationship is conceptual: the same technique, the same architectural split, the same distribution model, written independently for consoles that share no instruction set with the N64. "Built on" and "inspired by" are different claims, and this page keeps them apart.

## The two repositories that inherit code

[PokemonStadiumRecomp](https://github.com/mstan/PokemonStadiumRecomp) and [PocketMonstersStadiumRecomp](https://github.com/mstan/PocketMonstersStadiumRecomp) are downstream of that stack in the legal sense, and say so themselves:

> It is built on the N64Recomp toolchain and depends on a set of companion
> forks maintained alongside it:
>
> - [N64Recomp](https://github.com/mstan/N64Recomp) — the static recompiler
> - [N64ModernRuntime](https://github.com/mstan/N64ModernRuntime) — the runtime that stands in for the N64's operating system
> - [rt64](https://github.com/mstan/rt64) — the graphics renderer

Both track those forks through a `n64recomp.pin` file their setup scripts read and enforce, and both ship a `COPYING` file containing GPLv3, which is the correct consequence of linking N64ModernRuntime. Their READMEs name the component licenses accurately: N64ModernRuntime GPL-3.0, N64Recomp MIT, rt64 MIT. The pin file even records what copyleft demands, noting that "the v0.4.0-beta RELEASE binary was built against 62a4754 (below); re-release against this sha to keep the GPL source-correspondence exact." The contents of those three forks are not documented here beyond what those two repositories say about them.

PokemonStadiumRecomp is archived. Its README gives the reason in the first person, that N64Recomp's "architecture is structurally unsound", which is a maintainer's judgement about fit for their own purposes and not a claim this site makes.

No other repository in this fleet is a fork of N64Recomp, contains its code, or is derived from it.

## What the rest of the fleet inherits

Three things, all of them designs.

**Static recompilation as a technique you can ship.** N64Recomp made it practical for whole console games, and does not claim to have invented it: its README says "This is not the first project that uses static recompilation on game console binaries", crediting jamulator and the IDO static recompilation project, "my main inspiration for making this." [psxrecomp](https://github.com/mstan/psxrecomp)'s own notes call N64Recomp a "proven static recompilation model for N64".

**The recompiler and runtime split.** Every toolchain here repeats it as directory structure, `recompiler/` beside `runtime/` or `runner/`. Ten independent codebases do not arrive at the same two directories by accident, so the repetition is itself the evidence of a shared inheritance. Upstream's version of the split, a generic operating system layer in `ultramodern` and a recompiler-specific adapter in `librecomp`, is the clearest published statement of the pattern. See [the recompiler and the runtime](/docs/concepts/recompiler-and-runtime).

**The distribution model.** Ship the translated executable, never the assets. psxrecomp names upstream when it states this:

> Release executables (and per-game overlay caches) contain statically recompiled (machine-translated) builds of the original code, the same distribution model used by other static recompilation projects such as N64: Recompiled.

Shared dependencies are not lineage. N64Recomp and psxrecomp both vendor rabbitizer for MIPS decoding, and both sides vendor sljit. Each carries its own credit: rabbitizer by Decompollaborate, sljit by Zoltan Herczeg under BSD-2-Clause.

## What is independent here

**Low level BIOS as foundation and oracle.** psxrecomp (see [PlayStation](/docs/platforms/playstation)) architects everything around a recompiled BIOS, which it calls "the foundation and the correctness oracle", with [high level emulation](/docs/concepts/glossary) optional and opt-out. [gbarecomp](https://github.com/mstan/gbarecomp) recompiles the real GBA BIOS with high level emulation opt-in, and [gcnlle](https://github.com/mstan/gcnlle) is named for the approach. There is no upstream equivalent: `ultramodern` "is a reimplementation of much of the core functionality of libultra", high level emulation of the operating system layer. The N64 has no user facing BIOS in the PlayStation sense, so this is a difference of situation as much as of philosophy.

**Co-simulation against an oracle.** Also absent upstream: no oracle directory, no lockstep harness and no reference emulator integration in any of the four repositories. This fleet has `oracle/` in cdirecomp, gbarecomp, gcnlle and ndsrecomp, and `cosim/` in snesrecomp. Even the fleet's own N64 fork added it, as "additive ares-oracle cosim hooks".

**Interpreter tiers, and one claim to avoid.** Upstream has no interpreter in its shipping path: a missing function prints, asserts and exits. Several runtimes here keep a small interpreter tier deliberately. But N64Recomp is **not** ahead of time only. It ships LiveRecomp, an sljit backend that recompiles at run time, plus a roadmap item for loading code at runtime for mod support. The difference is purpose, not capability: upstream recompiles at run time to run mods, psxrecomp to reach game code that only exists after a disc read.

Two smaller points. The shared `recomp-ui` launcher is not descended from Zelda64Recomp's interface; it is a Dear ImGui extraction of the SNES-recomp launcher. And most toolchains here are PolyForm Noncommercial 1.0.0, which is not OSI approved and not GPL compatible, so this fleet is not open source in the same sense the upstream tools are. The [license census](/docs/fleet/licenses) has the detail.

## Why no attribution file names N64Recomp

There are eleven third party attribution and notice files across the fleet, and not one mentions N64Recomp, N64ModernRuntime, Zelda64Recomp, RT64, ultramodern, librecomp or Wiseguy. That is correct rather than an oversight. An attribution file records code a repository carries or links, and those toolchains carry none of it. The two repositories that do consume upstream code credit it in their README license sections instead, because neither has a `THIRD_PARTY_ATTRIBUTION.md`.

## What our pages owe each upstream project

Documentation containing no upstream code triggers no license obligation. Naming things correctly is owed anyway, and copying source changes the picture at once.

| project | license | copyright line | what we must do |
|---|---|---|---|
| [N64Recomp](https://github.com/N64Recomp/N64Recomp) | The MIT License (MIT) | "Copyright (c) 2024 Wiseguy" | Call it **N64: Recompiled**, link it, credit the design to Wiseguy, and repeat its own credit to prior art. Ship the full `LICENSE` with any copied source. |
| [N64ModernRuntime](https://github.com/N64Recomp/N64ModernRuntime) | GNU General Public License, Version 3 | none in the file, FSF preamble only | Attribute to the N64ModernRuntime contributors, invent no copyright holder, name both `ultramodern` and `librecomp`, and say that anything linking them must be conveyed under GPL-3.0 with corresponding source. |
| [Zelda64Recomp](https://github.com/Zelda64Recomp/Zelda64Recomp) | GNU General Public License, Version 3 | none in the file | Credit it as the exemplar finished port, and carry its own thanks to the decompilation team when describing its features. |
| [RT64](https://github.com/rt64/rt64) | MIT License | "Copyright (c) 2024 RT64 Contributors" | Attribute to the collective, not an individual, and carry the README caveat that emulator plugin support and ray tracing "are not available in this repository yet." |

One subtlety our pages must not get wrong: RT64's texture tooling is not uniformly MIT. Rice hashing "is licensed under GPL, making it incompatible with RT64's licensing", so "RT64 includes a separate tool licensed under the GPL to work around the problems mentioned above." The renderer is MIT, and at least one shipped tool is not.

## Contributing upstream

All four upstream repositories carry an identical `CONTRIBUTING.md`, and its first line is their policy:

> AI must not be used to generate code for contributions to this project.

Their reasons include that "AI-generated code is based upon sources of unknown origins and may not be compatible with the license of the project", and the file addresses automated contributors directly. We report that as their policy and respect it. This fleet is built with AI assistance and these pages are read by agents, so the instruction is plain: if you are preparing a patch for any of those four repositories, write it yourself. The policy covers contributions. It says nothing about reading, using, linking to or documenting these projects, and the licenses above govern those.

## Source

- [N64Recomp](https://github.com/N64Recomp/N64Recomp): [`LICENSE`](https://github.com/N64Recomp/N64Recomp/blob/main/LICENSE), [`README.md`](https://github.com/N64Recomp/N64Recomp/blob/main/README.md), [`CONTRIBUTING.md`](https://github.com/N64Recomp/N64Recomp/blob/main/CONTRIBUTING.md).
- [N64ModernRuntime](https://github.com/N64Recomp/N64ModernRuntime): [`COPYING`](https://github.com/N64Recomp/N64ModernRuntime/blob/main/COPYING), [`README.md`](https://github.com/N64Recomp/N64ModernRuntime/blob/main/README.md).
- [Zelda64Recomp](https://github.com/Zelda64Recomp/Zelda64Recomp): [`COPYING`](https://github.com/Zelda64Recomp/Zelda64Recomp/blob/dev/COPYING), [`README.md`](https://github.com/Zelda64Recomp/Zelda64Recomp/blob/dev/README.md).
- [RT64](https://github.com/rt64/rt64): [`LICENSE`](https://github.com/rt64/rt64/blob/main/LICENSE), [`README.md`](https://github.com/rt64/rt64/blob/main/README.md), [`TEXTURE-PACKS.md`](https://github.com/rt64/rt64/blob/main/TEXTURE-PACKS.md).
- [PokemonStadiumRecomp](https://github.com/mstan/PokemonStadiumRecomp): [`README.md`](https://github.com/mstan/PokemonStadiumRecomp/blob/main/README.md), [`n64recomp.pin`](https://github.com/mstan/PokemonStadiumRecomp/blob/main/n64recomp.pin), [`setup.sh`](https://github.com/mstan/PokemonStadiumRecomp/blob/main/setup.sh). [PocketMonstersStadiumRecomp](https://github.com/mstan/PocketMonstersStadiumRecomp): [`README.md`](https://github.com/mstan/PocketMonstersStadiumRecomp/blob/main/README.md).

## Next

- [Licenses](/docs/fleet/licenses), the full census, including repositories with no license file.
- [Every repository](/docs/fleet/repositories), for where each project named here sits.
- [The recompiler and the runtime](/docs/concepts/recompiler-and-runtime), the inherited design, in code.
- [Contributing as an agent](/docs/agents/contributing-as-an-agent), for how contribution works inside this fleet, which is not upstream.
