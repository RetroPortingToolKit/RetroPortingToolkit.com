---
title: "Telling code from data"
summary: "A game file is a flat collection of bytes. Before a recompiler can translate it, it has to work out which bytes are instructions."
pageType: "concept"
tags: ["Code discovery", "Recompiler"]
updated: "2026-08-29"
---

A cartridge or disc image does not label its contents. Instructions sit beside graphics, music, text and tables. The first job of a recompiler is therefore discovery: finding the code and leaving everything else alone.

![A short sequence of bytes can look like valid instructions from one starting point and nonsense from another.](./discovery.svg)

## The basic approach

1. Start at addresses the hardware guarantees, such as a reset or interrupt entry point.
2. Follow calls, jumps and branches from those known points.
3. Look for code that is reached indirectly through tables or data-driven addresses.
4. Check each candidate before treating it as a function.
5. Watch for addresses that appear only while the game is running.

The first two steps are evidence. The middle steps are informed guesses. A runtime fallback handles anything that cannot be proven before launch.

## Why it is difficult

Instructions vary in length on many older CPUs, so starting one byte off can make every following instruction look wrong. Data is the harder trap: a graphic or a table can decode as perfectly plausible machine code. A good discovery pass is designed to reject harmful false positives without pretending it can be perfect.

Some systems add another complication. A CPU may switch instruction modes, or the game may load new code into the same memory area during play. In those cases, the same address can mean different things at different times.

## What this means for a port

Discovery quality determines how much of a game can be compiled ahead of time. Missing code does not automatically mean the project is unusable; it means that particular path needs more analysis, a runtime fallback, or both. This is why a port's status is always about a specific game and revision, not a promise about an entire console.

For the practical consequences, read [code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time) and the [platform guide](/docs/platforms). The implementation details and current commands belong in each toolchain's repository.

## Next

- [The recompiler and the runtime](/docs/concepts/recompiler-and-runtime)
- [Co-simulation](/docs/concepts/co-simulation)
- [Platforms](/docs/platforms)
