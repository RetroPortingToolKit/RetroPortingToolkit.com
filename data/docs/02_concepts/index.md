---
title: "Concepts"
summary: "The core ideas behind recomp ports, explained before the docs get console-specific."
sectionTitle: "Concepts"
pageType: "reference"
tags: ["Concepts"]
updated: "2026-08-31"
---

This section explains the ideas behind recomp ports.

Start here when a guide uses a word you do not know yet, or when you want to understand what a port is doing under the hood. These pages are still high level. They are meant to make the technical docs easier, not replace them.

- [What are the recompiler and runtime?](/docs/concepts/recompiler-and-runtime). The two main parts most projects are built around.
- [How does a project tell code from data?](/docs/concepts/code-discovery). Why finding the real program inside a game file is hard.
- [What are HLE and LLE?](/docs/concepts/hle-and-lle). Two ways to handle console behavior around the game.
- [What about code you cannot see ahead of time?](/docs/concepts/code-you-cannot-see-ahead-of-time). What happens when a game creates or loads code while it is running.
- [How do we compare a port to the original?](/docs/concepts/co-simulation). How projects check whether the translated code still behaves correctly.
- [What does correct enough mean?](/docs/concepts/accuracy-and-burndowns). How faithfulness becomes a list of concrete problems to fix.
- [When should timing be changed?](/docs/concepts/timing-models). Why timing changes are advanced work and need measurement.
- [Why does determinism matter?](/docs/concepts/determinism). Why save states and rewind need repeatable behavior.
- [What is the game file contract?](/docs/concepts/the-game-file-you-supply). What the project expects you to provide, and why the site does not provide it.
- [What do these terms mean?](/docs/concepts/glossary). Short definitions for common recomp words.
