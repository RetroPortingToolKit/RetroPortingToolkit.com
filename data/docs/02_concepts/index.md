---
title: "Concepts"
summary: "The ten ideas every repository in this fleet assumes you already have, from the two halves of a toolchain to what these projects mean when they say a port is correct enough."
sectionTitle: "Concepts"
pageType: "reference"
tags: ["Concepts"]
updated: "2026-08-25"
---

Every repository here documents itself, and none of them explains the technique. These ten pages are that missing layer: the things a README here takes for granted. Read them when a repository's own documentation stops making sense, or read them straight through if you plan to work on any of this.

- [The recompiler and the runtime](/docs/concepts/recompiler-and-runtime). Every project is two programs. This is what each one does.
- [Telling code from data](/docs/concepts/code-discovery). A binary does not say which bytes are instructions. This is the hardest part of the job.
- [High level and low level](/docs/concepts/hle-and-lle). The fleet's sharpest disagreement, with both sides and no winner declared.
- [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time). Code that only exists once the game is running, and how a PlayStation port catches it.
- [Co-simulation](/docs/concepts/co-simulation). How these projects decide whether the translation is correct. If you read one page here, read this one.
- [What correct enough means](/docs/concepts/accuracy-and-burndowns). How accuracy is turned into something you can measure, and where each console stands.
- [Timing models](/docs/concepts/timing-models). How closely a build tracks the console's clock, and what a looser model breaks.
- [Determinism](/docs/concepts/determinism). Save states, rewind and netplay all need the game to repeat itself exactly.
- [The game file you supply](/docs/concepts/the-game-file-you-supply). The contract every port makes with its user, in the projects' own words.
- [Glossary](/docs/concepts/glossary). Forty-five terms, defined the way the fleet uses them, with the contradictions marked.
