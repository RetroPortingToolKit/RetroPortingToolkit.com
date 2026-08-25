---
title: "Concepts"
summary: "The ten ideas every repository in this fleet assumes you already have, from the recompiler and runtime split to what the projects mean when they say a port is correct enough."
sectionTitle: "Concepts"
pageType: "reference"
tags: ["Concepts"]
updated: "2026-08-23"
---

Every repository in this fleet documents itself and none of them explains the technique. These ten pages are that missing layer. They are the ideas a README here takes for granted: what a recompiler and a runtime each do, why telling code from data in a binary is hard, how a project decides its output is correct, and what all the vocabulary means. Read them when a repository's own documentation stops making sense, or read them straight through if you intend to work on any of this.

- [The recompiler and the runtime](/docs/concepts/recompiler-and-runtime). The split every project repeats, and the exact interface between the two halves.
- [Telling code from data](/docs/concepts/code-discovery). The central difficulty of the whole technique, and what happens when it fails.
- [High level and low level](/docs/concepts/hle-and-lle). The fleet's sharpest architectural disagreement, with both sides' reasoning and no winner declared.
- [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time). Game code that only exists after a disc read, and the capture and compile path that reaches it.
- [Co-simulation](/docs/concepts/co-simulation). The fleet's decision procedure for correctness. If you read one concept page, read this one.
- [What correct enough means](/docs/concepts/accuracy-and-burndowns). How accuracy is turned into something measurable, and the current honest state per console.
- [Timing models](/docs/concepts/timing-models). How finely a build models guest time, and what a coarser model breaks.
- [Determinism](/docs/concepts/determinism). Save states, rewind and rollback netplay are one requirement in three costumes.
- [The game file you supply](/docs/concepts/the-game-file-you-supply). The contract every port makes with its user, in the projects' own words.
- [Glossary](/docs/concepts/glossary). Forty-one terms, defined as the fleet uses them, with the inconsistencies marked.
