---
title: "Status vocabulary"
summary: "The two status vocabularies in play, the one each repository writes about itself and the one this site applies to its catalogue, what every term in each means, and how the two relate where they do not agree."
section: "reference"
sectionTitle: "Reference"
pageType: "reference"
tags: ["Status", "Vocabulary", "Fleet", "Catalogue"]
repos:
  - "https://github.com/mstan/FaxanaduRecomp"
  - "https://github.com/mstan/SuperMarioWorldRecomp"
  - "https://github.com/mstan/MegaManX6Recomp"
  - "https://github.com/Shy/BoktaiRecomp"
  - "https://github.com/OpokXeno/xenogears-recomp"
  - "https://github.com/Team-Resurgent/MegaManX-X"
  - "https://github.com/mstan/MetroidPrimeHuntersRecomp"
  - "https://github.com/mstan/PokemonStadiumRecomp"
updated: "2026-08-23"
---

Two different status vocabularies are in use, and they belong to different people. Each repository writes its own status line in its own words near the top of its README, with no shared list of allowed values and no central definition. This site, separately, tags every catalogue entry with fields chosen from a short fixed list, and those are the words printed on a game or hardware card. Neither vocabulary defines the other, and no term in one appears in the other, so a reader who checks a card against that project's README will often meet two different words for the same state. This page decodes both, says what each term does not promise, and ends on the relationship between them.

## Status terms the repositories use

Terms are grouped by strength of claim, strongest first, then by scope. Every example is quoted from the repository's own README.

| Term | What it means as the projects use it | What it does not promise | Example |
|---|---|---|---|
| **Fully playable** | End-to-end completion has been observed, sometimes by a named external tester with a linked recording. | Platforms other than the one named. | [MegaManX-X](https://github.com/Team-Resurgent/MegaManX-X/blob/main/README.md): "The game has been tested and is playable end to end on Windows" |
| **Believed to be 100% playable** | Every mode was exercised and a reference emulator showed no divergence. The hedge is deliberate. | Certainty. It reports a test result, not a proof. | [YoshisCookieRecomp](https://github.com/mstan/YoshisCookieRecomp/blob/master/README.md): "Both 1P and VS modes tested through full gameplay with zero oracle divergence against Nestopia." |
| **Believed fully playable** | Hand-verified through part of the game, with the rest expected to behave the same and explicitly not verified. | The specific content the README lists as not yet hand-verified. | [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/README.md): "believed fully playable" |
| **Playable** | Runs from the title through the content the maintainer tested, with no known blocking bug. The sentence after it says what was tested. | Exhaustive playtesting. Faxanadu's own line adds that it is not 100% playtested. | [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp/blob/master/README.md): "The game runs from title screen through credits. No outstanding known bugs." |
| **Playable end-to-end with one known cosmetic bug** | Playable, with the single outstanding defect named in the status line and cross-referenced to `ISSUES.md`. | Zero defects. It promises that exactly one is known and written down. | [GumshoeNESRecomp](https://github.com/mstan/GumshoeNESRecomp/blob/master/README.md): "Status: Playable end-to-end with one known cosmetic bug." |
| **Playable preview** | Boots and plays, saves work, no known crashes, and it carries a version tag. | A verified playthrough to the end. | [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp/blob/master/README.md): "It has not yet been verified all the way to the end, so treat it as a very playable preview rather than a certified full playthrough." |
| **Early playable preview** | The same claim at an earlier version, with more rough edges expected. | Anything the row above does not. | [MegaManX4Recomp](https://github.com/mstan/MegaManX4Recomp/blob/master/README.md): "Early playable preview" |
| **Playable bring-up** | Boots through the BIOS into gameplay. Static coverage is incomplete and the runtime falls back for uncovered code. | A finished port, in its own words. | [EmeraldRecomp](https://github.com/mstan/EmeraldRecomp/blob/main/README.md): "This is a static-recompilation base + runner, not a finished port." |
| **Playable static-first bring-up** | The same, phrased to stress that the static path is the primary one. | Full static coverage. | [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp/blob/main/README.md): "The entire game has not been exhaustively proven static: an uncovered target falls back to the instruction interpreter, is reported, and can be folded into a later static corpus." |
| **Playable, early, self-improving** | Playable with incomplete coverage, and the binary gets faster with play because uncovered paths compile to native and cache. | Consistent performance on a first run. | [BoktaiRecomp](https://github.com/Shy/BoktaiRecomp/blob/main/README.md): "Coverage is not yet fully static." |
| **Alpha** | Boots and plays the opening. Scope is explicitly bounded and everything past it is unverified. | Anything beyond the opening. | [xenogears-recomp](https://github.com/OpokXeno/xenogears-recomp/blob/master/README.md): "no complete playthrough has been done; treat every area past the opening as unverified" |
| **Public alpha** | An alpha that has an actual public release, with the expected failure modes enumerated. | Stability. It predicts crashes, hangs, rendering and audio issues, input quirks, networking failures and desyncs. | [MetroidPrimeHuntersRecomp](https://github.com/mstan/MetroidPrimeHuntersRecomp/blob/main/README.md): "Public alpha - bugs are expected." |
| **Work in progress** | Some systems function and the named ones do not. | The systems it names as untested. They may softlock. | [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/README.md): "Boss fights, passwords, and special weapons are untested and may softlock." |
| **In-development preview** | The fleet-wide banner. Every mstan-family README opens with it, above whatever its own status line says. | Anything about the specific game. It is a statement about the fleet, so read the status line below it. | [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/README.md): "These are in-development previews, not finished ports" |
| **Private playtest scaffold** | The repository exists and no public release is offered. | A build you can obtain. | [MetalWarriorsSNESRecomp](https://github.com/TechnicallyComputers/MetalWarriorsSNESRecomp/blob/main/README.md): "This repo is not a public release." |
| **Experimental** | Ships, is opt-in, and is expected to have visible defects. Usually attached to one feature rather than to the port. | Correct behaviour while it is enabled. | [SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/README.md), on its widescreen mode: "It is experimental and buggy" |
| **Hidden and disabled** | A feature merged into the repository but deliberately unreachable in shipped builds. | That you can turn it on. | [MegaManX-X](https://github.com/Team-Resurgent/MegaManX-X/blob/main/README.md): "There is no launcher control, config key, or default keybind for it in shipped builds" |
| **No Longer Maintained** | The repository and its releases stay up and the source stays buildable. No further work is planned. | Bugfixes or future releases. | [PokemonStadiumRecomp](https://github.com/mstan/PokemonStadiumRecomp/blob/main/README.md): "As of August 2026, this project is no longer maintained." |

## Words that qualify a status claim

These are not status words, but they appear beside one and change what it means. The [glossary](/docs/concepts/glossary) is canonical for the fleet's vocabulary as a whole.

| Term | Meaning in the fleet | Cited in |
|---|---|---|
| **oracle** | The reference emulator or disassembly the recompiled build is diffed against. Nestopia on NES, snes9x on SNES, mGBA on GBA, DuckStation on PS1. A claim of "zero oracle divergence" is a claim about a comparison, described in [co-simulation](/docs/concepts/co-simulation). | [MinishCapRecomp `CLAUDE.md`](https://github.com/mstan/MinishCapRecomp/blob/main/CLAUDE.md) |
| **dispatch miss** | A call to an address the recompiler produced no entry for, which is a [code discovery](/docs/concepts/code-discovery) gap. Treated as a blocking defect, so a status line coexisting with open dispatch misses is a weaker claim than it looks. | [MegaManX6Recomp `CLAUDE.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/CLAUDE.md) |
| **self-improving**, **self-healing** | Uncovered code runs interpreted on first hit, then compiles to native and caches, so the binary speeds up with use. It also means coverage is admitted to be incomplete. | [BoktaiRecomp `README.md`](https://github.com/Shy/BoktaiRecomp/blob/main/README.md) |
| **tier down** | Falling back from compiled native code to the interpreter for a specific call. | [MegaManX-X `recomp/bank00.cfg`](https://github.com/Team-Resurgent/MegaManX-X/blob/main/recomp/bank00.cfg) |
| **overlay** | PS1 code streamed off disc at run time, not present in the boot executable, and therefore not statically recompilable until it has been observed. | [MegaManX6Recomp `README.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/README.md) |
| **regen** | Re-running the recompiler over the game file to reproduce the generated C, as in [port a game](/docs/guides/port-a-game). | [SuperMarioWorldRecomp `README.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/README.md) |

## Where the repository vocabulary is inconsistent

The table above is a map of what the repositories say, not a taxonomy they agreed on. Six specific things make it unreliable to compare two status lines directly.

**There is no shared enum.** No repository in the survey defines these terms for any other repository. Each status line is a sentence its own maintainer wrote, and the definitions above are read back out of those sentences.

**Ten of the eighteen terms are built on the word "playable", and the qualifier carries the meaning.** "Playable" alone is a stronger claim than "playable bring-up", which is stronger than nothing, but the distance between them is not defined anywhere. A reader who strips the qualifier has thrown away the content.

**Two terms hedge with "believed", and the hedge is real.** SuperMarioWorld's "believed fully playable" is followed by an explicit list of worlds and special content that are not yet hand-verified. The hedge is not modesty, it is scope.

**Some status lines carry a version, some do not.** MegaManX6 and MegaManX4 tag theirs with a version at the alpha stage, and Emerald and MegaManZero tag their bring-up lines. A status word without a version is not comparable to one with a version.

**A README carries two claims at different scopes.** The fleet-wide banner sits above the per-game status line on every mstan-family README. They are not the same statement, and only the second one is about the game you are looking at.

**Some of these words qualify a feature, not the port.** "Experimental" describes SuperMarioBrosNESRecomp's widescreen mode, which ships as an opt-in package of the kind [write a mod](/docs/guides/write-a-mod) covers, and "hidden and disabled" describes one feature inside MegaManX-X. Check what the word is attached to before reading it as a verdict on the whole port.

None of these words describe what a release contains, which is [release a port](/docs/guides/release-a-port), and none of them tell you whether your particular dump will be accepted, which is [the game file you supply](/docs/concepts/the-game-file-you-supply).

Finally, this list is what a survey of 64 repositories found, and it was not proven exhaustive. A status word that does not appear above should be read from the sentence in its own README, not mapped onto the nearest row here, and the [repository index](/docs/fleet/repositories) is how you find that README. A status shown outside a repository, including on this site's own cards, is a different vocabulary again, and it is next.

## This site's catalogue vocabulary

The catalogue on this site reuses none of the words above. Every entry carries frontmatter fields that print as pills on its card, and those fields are drawn from a short fixed list applied by whoever wrote the entry. That is the point of them: 80 entries, 67 games and 13 hardware pages, all describable in the same handful of words so they can be compared on one screen. It is also their limit, because a fixed list cannot say what a project says about itself.

The site does not publish definitions for these values. The readings below are drawn from how each one is actually applied across the catalogue, and the counts are exact.

### `status`

Carried by 79 of the 80 entries. One game page, Mega Man X for Original Xbox, has no `status` at all.

| Value | Count | What it means on this site | What it does not promise |
|---|---|---|---|
| **Playable alpha** | 52 | The fleet's normal state: the port boots and plays, and work continues. Roughly two thirds of the catalogue carries it, so read it as the baseline for an entry here rather than as a warning about one. | A finished port or a verified playthrough. It also does not mean the repository calls itself an alpha; the survey above found most do not use that word. |
| **Released** | 8 | Work that reached a version its authors published as a release. Applied to games only. | Availability. Pepsiman carries "Released" next to "No public release", so the two fields move independently. |
| **Partial** | 8 | Part of the target runs and part does not. Six games, plus the Master System and Game Gear and the Nintendo 64 hardware pages. | Which part. The card does not say, and the repository's `ISSUES.md` is where that lives. |
| **Tech demo** | 6 | Enough runs to demonstrate the toolchain against that target, and no more. Five games plus the Virtual Boy hardware page. | Playability end to end. |
| **Research** | 5 | Investigation rather than a working port. Four of the five are frontier hardware pages: Nintendo DS, GameCube, CD-i and the original Xbox. | That anything runs yet. |

### `availability`

Carried by all 80 entries, and usually the field a reader actually wants.

| Value | Count | What it means on this site | What it does not promise |
|---|---|---|---|
| **Public build** | 70 | A build can be obtained without compiling it yourself. | That the game is finished. 49 entries carry "Public build" and "Playable alpha" together, so a downloadable build is the fleet's ordinary condition and says nothing about completeness. |
| **Source only** | 8 | No build is offered and you compile it yourself. Two games and six hardware pages. | A judgement about quality. It records a distribution decision, and some projects make that decision deliberately because a recompiled binary embeds translated game code. |
| **No public release** | 2 | The site's strongest negative on this axis, on one game and one hardware page. | Nothing further. It does not imply there is no repository: the original Xbox entry links to [xboxlle-probe](https://github.com/mstan/xboxlle-probe), while the Pepsiman entry carries no repository link at all. |

### `maturity`

This is where "Beta" comes from, and it is not a game status. `maturity` appears on all 13 hardware pages and on no game page, so it grades a toolchain rather than a port.

| Value | Count | Applied to | What it does not promise |
|---|---|---|---|
| **Beta** | 5 | PlayStation, Super Nintendo, NES, Game Boy Advance, Sega Genesis | Anything a project claims. No repository in the survey above uses "Beta" as a status word. |
| **Alpha** | 8 | Game Boy, Master System and Game Gear, Nintendo 64, Nintendo DS, Virtual Boy, GameCube, CD-i, original Xbox | A relation to the repository status lines. Several toolchains marked Alpha here carry games the projects themselves call playable. |

The site does not publish the criterion that separates the two, so treat `maturity` as a coarse ordering of the toolchains against each other and nothing more.

## How the two vocabularies relate

They are two systems with different authors and different jobs. A repository status line is free prose, written by that project about itself, updated when its authors decide something changed. A catalogue field is one of a few fixed values, applied here, so that 80 entries stay comparable.

They do not map one to one, and the gap is total rather than partial. Not one of the eighteen repository terms surveyed above appears as a catalogue value, and not one of the ten catalogue values appears as a repository status term. "Playable alpha" was found in no README. "Playable bring-up", "public alpha" and "believed fully playable" are not values this site can record.

So the same project is often described twice, in words that do not line up. Two real examples, one of each kind:

- **They agree.** Pokémon Yellow's card says "Source only", and its README says the recompiled executable is ROM-derivative, so it too is built locally and never shipped. Different words, same fact.
- **They diverge.** Boktai's card says "Public build", while its README says "Prebuilt binaries are not distributed: a recompiled binary embeds translated ROM code, so everyone builds their own."

Neither vocabulary is wrong in those cases, because they are maintained in different places and can describe different moments in a project's life. What matters is knowing which to use.

**Use the card for comparison across the fleet.** It is the only vocabulary applied uniformly to all 80 entries, so it is the only one that supports a statement like "most of the catalogue is a playable alpha with a public build". No set of README sentences can be added up that way.

**Use the repository's README for what a project currently claims.** It is the only vocabulary its authors wrote and the only one they update, so it is the authority on that project's own position, including every qualifier the fixed list cannot carry.

Where the two disagree about one project, the README wins on that project and the card wins on where that project sits relative to the rest. If you are deciding whether to download something, read both.

## Source

- [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp), [YoshisCookieRecomp](https://github.com/mstan/YoshisCookieRecomp), [GumshoeNESRecomp](https://github.com/mstan/GumshoeNESRecomp), [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp) and [SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp): the NES status lines, each in `README.md`.
- [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp), [MegaManX-X](https://github.com/Team-Resurgent/MegaManX-X) and [MetalWarriorsSNESRecomp](https://github.com/TechnicallyComputers/MetalWarriorsSNESRecomp): the SNES status lines and the fleet-wide banner.
- [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp), [MegaManX4Recomp](https://github.com/mstan/MegaManX4Recomp) and [xenogears-recomp](https://github.com/OpokXeno/xenogears-recomp): the PS1 preview and alpha wording.
- [BoktaiRecomp](https://github.com/Shy/BoktaiRecomp), [EmeraldRecomp](https://github.com/mstan/EmeraldRecomp), [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp) and [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp): the GBA bring-up and coverage wording, plus the oracle rule in [`CLAUDE.md`](https://github.com/mstan/MinishCapRecomp/blob/main/CLAUDE.md).
- [MetroidPrimeHuntersRecomp](https://github.com/mstan/MetroidPrimeHuntersRecomp) and [PokemonStadiumRecomp](https://github.com/mstan/PokemonStadiumRecomp): public alpha, and the maintenance notice.
- This site's own content, `data/games/` and `data/hardware/`, for the `status`, `availability` and `maturity` counts. Every figure in the catalogue section was counted across all 80 entries on 2026-08-23.

## Next

- [Every repository](/docs/fleet/repositories), to find the README a status word came from.
- [Glossary](/docs/concepts/glossary), for the fleet's vocabulary beyond status.
- [Proving it with co-simulation](/docs/concepts/co-simulation), for what "zero oracle divergence" is actually measuring.
- [Port a game](/docs/guides/port-a-game), for why most of these lines say preview rather than finished.
