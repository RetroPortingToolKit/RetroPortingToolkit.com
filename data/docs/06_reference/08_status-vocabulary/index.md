---
title: "Status vocabulary"
summary: "The two sets of status words in use, the one each repository writes about itself and the one this site puts on its cards, what every term means, and how the two relate where they do not agree."
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
updated: "2026-08-25"
---

Two sets of status words are in use, and different people write them.

Each repository writes its own status line, in its own words, near the top of its README. There is no shared list of allowed values. This site, separately, tags every catalogue entry with fields from a short fixed list, and those are the words printed on a game or hardware card.

The two sets share no terms. Check a card against that project's README and you will often find two different words for the same state. Both are decoded below, with what each term does not promise.

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
| **Private playtest scaffold** | The repository exists and no public release is offered. | A build you can obtain. | [MetalWarriorsSNESRecomp](https://github.com/TechnicallyComputers/MetalWarriorsSNESRecomp/blob/main/README.md): "This repo is not a public release." |
| **Experimental** | Ships, is opt-in, and is expected to have visible defects. Usually attached to one feature rather than to the port. | Correct behaviour while it is enabled. | [SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/README.md), on its widescreen mode: "It is experimental and buggy" |
| **Hidden and disabled** | A feature merged into the repository but deliberately unreachable in shipped builds. | That you can turn it on. | [MegaManX-X](https://github.com/Team-Resurgent/MegaManX-X/blob/main/README.md): "There is no launcher control, config key, or default keybind for it in shipped builds" |
| **No Longer Maintained** | The repository and its releases stay up and the source stays buildable. No further work is planned. | Bugfixes or future releases. | [PokemonStadiumRecomp](https://github.com/mstan/PokemonStadiumRecomp/blob/main/README.md): "As of August 2026, this project is no longer maintained." |

## Words that qualify a status claim

These are not status words, but they sit next to one and change what it means. The [glossary](/docs/concepts/glossary) covers the fleet's vocabulary as a whole.

| Term | Meaning in the fleet | Cited in |
|---|---|---|
| **oracle** | The reference emulator or disassembly the recompiled build is diffed against. Nestopia on NES, snes9x on SNES, mGBA on GBA, DuckStation on PS1. A claim of "zero oracle divergence" is a claim about a comparison, described in [co-simulation](/docs/concepts/co-simulation). | [MinishCapRecomp `CLAUDE.md`](https://github.com/mstan/MinishCapRecomp/blob/main/CLAUDE.md) |
| **dispatch miss** | A call to an address the recompiler produced no entry for, which is a [code discovery](/docs/concepts/code-discovery) gap. Treated as a blocking defect, so a status line coexisting with open dispatch misses is a weaker claim than it looks. | [MegaManX6Recomp `CLAUDE.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/CLAUDE.md) |
| **self-improving**, **self-healing** | Uncovered code runs interpreted on first hit, then compiles to native and caches, so the binary speeds up with use. It also means coverage is admitted to be incomplete. | [BoktaiRecomp `README.md`](https://github.com/Shy/BoktaiRecomp/blob/main/README.md) |
| **tier down** | Falling back from compiled native code to the interpreter for a specific call. | [MegaManX-X `recomp/bank00.cfg`](https://github.com/Team-Resurgent/MegaManX-X/blob/main/recomp/bank00.cfg) |
| **overlay** | PS1 code streamed off disc at run time, not present in the boot executable, and therefore not statically recompilable until it has been observed. | [MegaManX6Recomp `README.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/README.md) |
| **regen** | Re-running the recompiler over the game file to reproduce the generated C, as in [port a game](/docs/guides/port-a-game). | [SuperMarioWorldRecomp `README.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/README.md) |

## Where the repository vocabulary is inconsistent

The table above maps what the repositories say. It is not a list they agreed on. Five things make it risky to compare two status lines directly.

**There is no shared list.** No repository in the survey defines these terms for any other repository. Each status line is a sentence its own maintainer wrote, and the definitions above are read back out of those sentences.

**Ten of the seventeen terms are built on the word "playable", and the extra word carries the meaning.** "Playable" on its own claims more than "playable bring-up". Nobody has written down how much more. Drop the extra word and you have thrown away the content.

**Two terms hedge with "believed", and the hedge is real.** SuperMarioWorld's "believed fully playable" is followed by a list of worlds and special content nobody has played through by hand yet. The hedge is not modesty. It is scope.

**Some status lines carry a version, some do not.** MegaManX6 and MegaManX4 tag theirs with a version at the alpha stage, and Emerald and MegaManZero tag their bring-up lines. You cannot compare a status word that carries a version with one that does not.

**Some of these words describe a feature, not the port.** "Experimental" describes SuperMarioBrosNESRecomp's widescreen mode, which ships as an opt-in package of the kind [write a mod](/docs/guides/write-a-mod) covers. "Hidden and disabled" describes one feature inside MegaManX-X. Check what the word is attached to before you read it as a verdict on the whole port.

None of these words say what a release contains; that is [release a port](/docs/guides/release-a-port). None of them say whether your own game file will be accepted; that is [the game file you supply](/docs/concepts/the-game-file-you-supply).

This list came from a survey of 64 repositories and is not proven complete. If a status word is not above, read the sentence in its own README instead of mapping it onto the nearest row here. The [repository index](/docs/fleet/repositories) is how you find that README.

## This site's catalogue vocabulary

The catalogue on this site uses none of the words above. Each entry carries fields that print as pills on its card, chosen from a short fixed list by whoever wrote the entry. That is the point: 80 entries, 67 games and 13 hardware pages, described in the same few words so they can be compared on one screen. It is also the limit, because a fixed list cannot say what a project says about itself.

The site publishes no definitions for these values. The readings below come from how each one is used across the catalogue. The counts are exact.

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

Carried by all 80 entries, and usually the field a reader wants.

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

The site publishes no rule separating the two, so read `maturity` as a rough ordering of the toolchains against each other, nothing more.

## How the two vocabularies relate

Two systems, different authors, different jobs. A repository status line is free prose, written by that project about itself and updated when its authors decide something changed. A catalogue field is one of a few fixed values, applied here, so 80 entries stay comparable.

They do not line up at all. Not one of the seventeen repository terms above appears as a catalogue value, and not one of the ten catalogue values appears as a repository status term. "Playable alpha" was found in no README. "Playable bring-up", "public alpha" and "believed fully playable" are not values this site can record.

So the same project is often described twice, in words that do not match. Two real examples:

- **They agree.** Pokémon Yellow's card says "Source only", and its README says the recompiled executable is ROM-derivative, so it too is built locally and never shipped. Different words, same fact.
- **They diverge.** Boktai's card says "Public build", while its README says "Prebuilt binaries are not distributed: a recompiled binary embeds translated ROM code, so everyone builds their own."

Neither is wrong. They are kept in different places and can describe different moments in a project's life. What matters is knowing which one to use.

**Use the card to compare across the fleet.** It is the only vocabulary applied the same way to all 80 entries, so it is the only one that supports a sentence like "most of the catalogue is a playable alpha with a public build". README sentences cannot be added up that way.

**Use the repository's README for what a project claims today.** Its authors wrote it and they are the ones who update it, so it is the authority on that project's own position, including every qualifier the fixed list cannot carry.

Where the two disagree about one project, the README wins on that project, and the card wins on where that project sits next to the rest. If you are deciding whether to download something, read both.

## Source

- [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp), [YoshisCookieRecomp](https://github.com/mstan/YoshisCookieRecomp), [GumshoeNESRecomp](https://github.com/mstan/GumshoeNESRecomp), [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp) and [SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp): the NES status lines, each in `README.md`.
- [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp), [MegaManX-X](https://github.com/Team-Resurgent/MegaManX-X) and [MetalWarriorsSNESRecomp](https://github.com/TechnicallyComputers/MetalWarriorsSNESRecomp): the SNES status lines.
- [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp), [MegaManX4Recomp](https://github.com/mstan/MegaManX4Recomp) and [xenogears-recomp](https://github.com/OpokXeno/xenogears-recomp): the PS1 preview and alpha wording.
- [BoktaiRecomp](https://github.com/Shy/BoktaiRecomp), [EmeraldRecomp](https://github.com/mstan/EmeraldRecomp), [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp) and [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp): the GBA bring-up and coverage wording, plus the oracle rule in [`CLAUDE.md`](https://github.com/mstan/MinishCapRecomp/blob/main/CLAUDE.md).
- [MetroidPrimeHuntersRecomp](https://github.com/mstan/MetroidPrimeHuntersRecomp) and [PokemonStadiumRecomp](https://github.com/mstan/PokemonStadiumRecomp): public alpha, and the maintenance notice.
- This site's own content, `data/games/` and `data/hardware/`, for the `status`, `availability` and `maturity` counts. Every figure in the catalogue section was counted across all 80 entries on 2026-08-23.

## Next

- [Every repository](/docs/fleet/repositories), to find the README a status word came from.
- [Glossary](/docs/concepts/glossary), for the fleet's vocabulary beyond status.
- [Proving it with co-simulation](/docs/concepts/co-simulation), for what "zero oracle divergence" measures.
- [Port a game](/docs/guides/port-a-game), for why most of these lines say preview rather than finished.
