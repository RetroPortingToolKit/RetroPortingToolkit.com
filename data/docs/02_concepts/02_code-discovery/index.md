---
title: "How does a project tell code from data?"
summary: "A game file is just bytes. Before a recompiler can translate it, the project has to find which bytes are instructions and which bytes are not."
pageType: "concept"
tags: ["Code discovery", "Recompiler"]
updated: "2026-08-30"
---

A game file is just bytes.

Some bytes are program instructions. Some are graphics, music, text, tables, padding, or other data. The file usually does not label them for you.

Before a recompiler can translate a game, it has to find the code. That step is called **discovery**.

![A short sequence of bytes can look like valid instructions from one starting point and nonsense from another.](./discovery.svg)

## Why is this hard?

The tool cannot translate every byte as code.

Data can look like code by accident. A sprite, a sound table, or a list of numbers may decode into instructions that look real but never run. If the recompiler treats that data as code, the port can become wrong in strange ways.

The tool also cannot ignore code it does not understand. If the game jumps to a function that was never translated, the port needs a fallback or the game stops there.

Good discovery is the balance: find the real code, avoid fake code, and leave room for the project to learn more while the game runs.

## Where does discovery start?

The project begins from places the console guarantees.

That might be a reset address, an interrupt address, a known executable header, or another entry point the hardware defines. From there, the tool follows calls, jumps, and branches.

When the code jumps through a table or computes an address at runtime, the tool may need help from project settings or later test runs.

## What about assembly games?

Many older games were written partly or fully in assembly.

Strictly, that code was not "compiled" from C or another high-level language the first time. It was still assembled into machine code. Recompilation still applies here because the port is translating the machine instructions that shipped in the game.

So for NES, SNES, and other assembly-heavy systems, "recompiled" means: find the original machine instructions and translate them into a modern native build.

## Can decompilations help?

Yes.

A good decompilation or disassembly can act like a map. It may identify functions, name useful addresses, or show which ranges are data instead of code.

That does not mean the port ships somebody else's decompilation. The port still builds from the game file the user provides. The decompilation helps the project understand that file.

Super Mario World is a good example of this kind of help. Community knowledge and disassembly work can make SNES discovery clearer without changing the basic contract of the port.

## What happens when discovery misses something?

A missed function is not automatically a disaster.

Mature runtimes usually have an interpreter fallback. If the game reaches code that was not translated, the interpreter can run it more slowly while the project records what happened.

That feedback helps the next build. The goal is not to stay in the interpreter forever. The goal is to learn the missing path, translate it, and make the port faster and more complete.

## Next

- [What are the recompiler and runtime?](/docs/concepts/recompiler-and-runtime)
- [What about code you cannot see ahead of time?](/docs/concepts/code-you-cannot-see-ahead-of-time)
- [How do we compare a port to the original?](/docs/concepts/co-simulation)
- [How is a port made?](/docs/start/how-a-port-is-made)
