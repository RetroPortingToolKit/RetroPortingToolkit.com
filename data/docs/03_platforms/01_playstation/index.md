---
title: "PlayStation"
summary: "psxrecomp is the gold-standard framework today: it translates PS1 game code and BIOS code, handles streamed overlays, and keeps a faithful low-level path underneath convenience features."
pageType: "project"
tags: ["PlayStation", "MIPS R3000A", "GTE", "Overlays"]
repos:
  - "https://github.com/mstan/psxrecomp"
updated: "2026-08-30"
---

PlayStation is the strongest recomp path in this ecosystem today.

[psxrecomp](https://github.com/mstan/psxrecomp) translates PlayStation game code into C, compiles that C into native code, and links it against a runtime that models the console around the game.

It also handles the part that makes PlayStation difficult: games often stream new code from the disc while they run. psxrecomp can capture that code, compile it, cache it, and use it later.

That combination is why this site uses psxrecomp as the gold-standard reference.

## What does it translate?

PlayStation games run on a MIPS R3000A CPU.

psxrecomp translates that MIPS machine code. It can also translate a PlayStation BIOS image. The generated code is then built as native code for the host machine.

The runtime provides the rest of the console: memory, disc behavior, graphics, audio, input, timing, saves, and fallback execution.

This is the split used across the ecosystem: [recompiler plus runtime](/docs/concepts/recompiler-and-runtime).

## What files does it need?

For a game project, you provide your own legally obtained PlayStation disc image.

Some paths also use a BIOS. psxrecomp can use OpenBIOS, a legal open-source BIOS alternative, for some framework work. A retail BIOS path requires a legally obtained BIOS.

This site does not provide game files or copyrighted retail BIOS files.

## Why is PlayStation harder than a simple cartridge?

A PlayStation game is usually much larger than the console's RAM.

The game loads one chunk of code, runs it, then loads another chunk over the same area later. Those chunks are called overlays.

A pure build-time pass cannot see every overlay before the game runs. psxrecomp handles that with fallback interpretation, capture, compilation, and caching.

The safe rule is content matching: compiled overlay code only runs when the live bytes in memory still match the bytes it was compiled from.

See [What about code you cannot see ahead of time?](/docs/concepts/code-you-cannot-see-ahead-of-time).

## What are the execution tiers?

psxrecomp has a practical ladder:

1. Native code translated ahead of time.
2. Native overlay code compiled after the game loads it.
3. Interpreter fallback for code that has not been translated yet.

The important point is that lower tiers are slower, not less faithful. A missed path should become a performance problem and a discovery task, not fake behavior.

## What about HLE?

psxrecomp keeps the low-level BIOS path as the reference.

Higher-level helpers can make setup easier or skip some slow startup behavior, but they sit above the faithful path. They do not replace the need for a correctness floor.

That is the pattern described in [What are HLE and LLE?](/docs/concepts/hle-and-lle).

## What makes PlayStation a good first target?

The framework is the most mature one here.

It has a clearer build path, a stronger runtime, a useful overlay story, and a better model for how new game projects should grow. It is still not magic. A generated project is a starting point, not a promise that the game is done.

For a first serious attempt, PlayStation is the best place to learn the full shape of the work.

## What are the main limits?

- Not every game is fully native all the time.
- Overlay coverage improves as more code paths are found and captured.
- A generated game project still needs game-specific work.
- HLE paths should be checked against the faithful low-level path.
- Faithfulness is measured by behavior, not just by whether the game boots.

## Next

- [PlayStation games](/hardware/playstation)
- [Developer quickstart](/docs/start/quickstart)
- [How do I recomp my own game?](/docs/start/recomp-your-own-game)
- [What about code you cannot see ahead of time?](/docs/concepts/code-you-cannot-see-ahead-of-time)
- [What are HLE and LLE?](/docs/concepts/hle-and-lle)
