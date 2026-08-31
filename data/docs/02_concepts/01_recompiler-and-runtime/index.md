---
title: "What are the recompiler and runtime?"
summary: "Most recomp ports have two major parts: a tool that translates the game before launch, and a runtime that acts like the console around it."
pageType: "concept"
tags: ["Architecture", "Recompiler", "Runtime"]
updated: "2026-08-30"
---

Most recomp ports have two major parts.

The **recompiler** is a tool used while building the port. It reads the game's machine code and writes new source code from it. That happens before the port starts.

The **runtime** is the program that runs beside the translated game. It provides the parts of the console the game still expects: memory, video, audio, input, saves, timing, and sometimes a fallback interpreter.

The recompiler turns the game's instructions into native code. The runtime gives that native code a world to live in.

## Why does the port need both?

Translated game code is not enough by itself.

A game does not only do math and jump between functions. It reads controllers. It draws graphics. It talks to sound hardware. It waits for timing. It saves data. It expects memory to behave like the original console.

Your PC does not have that console inside it, so the runtime fills that role.

## What happens during a build?

The usual flow looks like this:

1. The project checks the game file.
2. The recompiler finds and translates the game's code.
3. A normal compiler builds the generated source.
4. The generated code and runtime are linked together.
5. The result runs like a normal app.

Some projects also compile a BIOS or other system software. Some do not need one. It depends on the console.

## What happens while the port is running?

The translated game code runs natively.

When it needs console behavior, it calls the runtime. The runtime answers those requests by acting like the original hardware or firmware closely enough for the game to behave correctly.

If the game reaches code that was not translated ahead of time, the runtime may use an interpreter. That is slower, but it keeps the game correct while the project learns about that missing code path.

## Which side owns a bug?

A good first question is: did the translated instruction do the wrong thing, or did the console around it behave wrong?

If an instruction was decoded incorrectly, that is usually a recompiler bug.

If input, audio, graphics, saves, timing, or hardware behavior is wrong, that is usually runtime work.

The split matters because a runtime fix can improve many games on the same console, while a discovery or translation fix may change the generated code for one game or one class of games.

## What does this mean for users?

For players, it mostly means a finished port should feel like a normal application.

For developers, it means the work is not just "turn ROM into C." A real port is translated game code plus a runtime that is faithful enough to make the game behave like it did on original hardware.

## Next

- [How does a project tell code from data?](/docs/concepts/code-discovery)
- [What about code you cannot see ahead of time?](/docs/concepts/code-you-cannot-see-ahead-of-time)
- [How do we compare a port to the original?](/docs/concepts/co-simulation)
- [How do I recomp my own game?](/docs/start/recomp-your-own-game)
