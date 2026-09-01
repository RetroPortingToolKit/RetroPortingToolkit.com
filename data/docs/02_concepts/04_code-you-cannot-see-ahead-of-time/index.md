---
title: "What about code you cannot see ahead of time?"
summary: "Some games load or create code while they run. A recomp project handles that with fallback execution, capture, and later translation."
pageType: "concept"
tags: ["Overlays", "PlayStation", "Code discovery", "Nintendo DS", "Game Boy Advance"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-30"
---

Static recompilation happens before the game runs.

That works well when the code is already present in the game file. But some games load code later, after the port has already started.

The most common example is an **overlay**. A game loads one chunk of code into memory, runs it, then loads a different chunk over the same address later.

The recompiler cannot translate code it has not seen yet. So the runtime needs a plan.

## Does the game crash when this happens?

It should not.

Mature runtimes keep an interpreter fallback. If the game reaches code that was not compiled ahead of time, the interpreter can run those instructions one at a time.

That is slower than native code, but it keeps the game moving and gives the project a chance to learn what was missing.

## Why is PlayStation the main example?

PlayStation games often stream code from the disc into RAM while the game is running.

The console only has 2 MB of main RAM. A game can be much larger than that, so it swaps code in and out as needed. One level, menu, cutscene, or mode may use code that was not present at startup.

That makes psxrecomp the strongest example of this problem. It needs to handle code that appears later, not just code that was hard to find.

## What does capture mean?

**Capture** means recording the code bytes when the game loads them.

Timing matters. The runtime wants the bytes as delivered, before the game changes them. It also watches which addresses actually execute, because that tells the recompiler where real functions begin.

Captured code can then be translated later.

## What does cache mean?

**Cache** means keeping the translated result so the same code can run natively next time.

If you visit an area of a game and the project captures an overlay there, a later run may already know about it. That area can become faster because the port no longer has to interpret that code.

This is why a PlayStation recomp can improve as more of the game is explored and captured.

## Why does the runtime check the bytes again?

The same memory address can hold different overlays at different times.

Address alone is not enough. The runtime has to check that the bytes in memory still match the code it compiled earlier.

If the bytes match, it can run the cached native code.

If they do not match, it falls back to the interpreter and may capture the new version.

That rule keeps the failure direction safe: wrong or stale native code should not run just because it lives at the same address.

## Do all consoles need this?

No.

NES is the simple negative case. The whole program is usually visible in the cartridge image, so there is usually no streamed code to discover later.

SNES can still benefit from fallback and feedback, but it does not copy the full PlayStation overlay model.

Nintendo DS has overlays, but they are usually known from the game format. That changes the problem.

Game Boy Advance does not stream code from a disc, but a game can still build or move code in memory. A fallback path can still be useful.

The real question is not cartridge versus disc. The real question is: can the bytes the CPU executes change after the build-time recompiler has looked?
