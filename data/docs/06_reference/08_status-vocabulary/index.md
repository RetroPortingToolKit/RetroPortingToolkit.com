---
title: "Status vocabulary"
summary: "The words this site uses for project maturity, what they mean, and what they do not promise."
pageType: "reference"
tags: ["Status", "Vocabulary", "Catalog"]
updated: "2026-08-30"
---

Status words are easy to overread.

`Playable` does not always mean finished. `Alpha` does not always mean useless. `Tech demo` does not always mean the idea failed.

This page explains how this site uses those words. It is a shared vocabulary for the site, not a legal guarantee and not a replacement for a project's own release notes.

## The two things we label

This site labels two different things.

| Label type | What it describes |
|---|---|
| Port status | How far one game port appears to be. |
| Platform maturity | How far the system-level framework appears to be. |

Do not mix them.

A game can be playable on an early framework. A framework can be strong while one game port is still rough.

## Port status

Port status describes one game.

| Status | Meaning | What it does not promise |
|---|---|---|
| Released | A public release exists. | That every mode is perfect. |
| Playable | The game can be played meaningfully. | Exhaustive testing. |
| Playable alpha | The game plays, but bugs and missing polish are expected. | A finished port. |
| Partial | Some important part works and some important part does not. | End-to-end play. |
| Tech demo | Enough works to prove the approach for that game. | A normal player experience. |
| Research | Investigation is happening. | That a playable build exists. |

If a page says exactly what was tested, believe that narrower statement first.

## Platform maturity

Platform maturity describes the recomp ecosystem for a system.

| Maturity | Meaning |
|---|---|
| Gold standard | The reference point for the rest of the ecosystem. Strong tooling, proven ports, and real outside usage. |
| Silver standard | Strong and useful, but not as broad or proven as the gold standard yet. |
| Alpha | Public and useful for real work, but still changing and still missing important polish or optimization. |
| Experimental | Can run real software in some cases, but the shape is still settling. |
| Tech demo | Exists to prove a path. Do not read it as a general porting platform yet. |
| Research | Earlier than a tech demo, or focused on discovery more than releases. |

Today, PlayStation is the gold standard reference. SNES is the silver standard reference. Other systems vary from alpha to tech demo depending on how much they can run and how much project support exists around them.

That ordering is practical, not emotional. It describes how much confidence a developer should have when starting work.

## Availability

Availability describes how a user can get the port.

| Availability | Meaning |
|---|---|
| Public build | A downloadable build is available. |
| Source only | The project is public, but the user builds it locally. |
| No public release | The work may exist, but there is no public build to use. |

Source-only is not automatically bad. Some projects choose it because users need to build from their own legally obtained game file.

## Read the smallest truthful claim

Prefer the narrowest claim on the page.

If a page says "playable through the intro", it is not playable end to end.

If a page says "one game boots", the platform is not ready for the whole library.

If a page says "known softlock", that softlock matters even when the card says `Playable alpha`.

Status words help you scan. Details still decide what you should expect.

## Avoid status inflation

Do not upgrade a status word because the idea is promising.

A port is not `Playable` because it boots. A platform is not `Alpha` because a technical demo exists. A public repository is not the same thing as a supported release.

Use plain words. Overstating maturity wastes the reader's time and creates support burden for the wrong people.
