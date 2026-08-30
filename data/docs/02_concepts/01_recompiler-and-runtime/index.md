---
title: "The recompiler and the runtime"
summary: "A recompiler turns a game's binary into source code; a runtime supplies the console services that source code expects."
pageType: "concept"
tags: ["Architecture", "Recompiler", "Runtime"]
updated: "2026-08-29"
---

Static recompilation has two cooperating halves.

The **recompiler** is a build-time tool. It reads the game's machine code, works out which bytes are instructions, and writes ordinary source code. That work happens before the port starts.

The **runtime** is the program the port runs with. It provides the console's memory, display, sound, input, saves and timing, then connects those services to the generated code. It can also interpret a small piece of code when the build could not discover it in advance.

## The boundary

Generated code does not reach directly into your computer. It talks through a small interface supplied by the runtime: registers, memory reads and writes, jumps, and calls. That boundary keeps hardware details in one place.

An instruction quirk belongs in the recompiler; a controller or audio fix belongs in the runtime. Correcting the runtime can improve every game that uses it.

## What happens during a build

1. You provide a game file that you own.
2. The recompiler discovers and translates the game's code.
3. A normal compiler builds the generated source.
4. The runtime and generated game are linked into a native application.
5. Code discovered only while playing is handled by the runtime's fallback path.

The generated program is still a port, not a finished game. Booting is an important milestone, but testing, input, timing, graphics, audio and saves all need their own pass.

## Why this split matters

Improving discovery or translation changes generated source. Improving the runtime changes the environment every generated game runs inside. When a bug appears, asking which side owns the behavior is often the fastest way to find the right fix.

For a practical starting point, use the [platform guide](/docs/platforms) and [how do I recomp my own game?](/docs/start/recomp-your-own-game). Implementation details live in each project's repository rather than on this page.

## Next

- [What is static recompilation?](/docs/start/what-is-static-recompilation)
- [Telling code from data](/docs/concepts/code-discovery)
- [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time)
- [Glossary](/docs/concepts/glossary)
