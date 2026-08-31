---
title: "What are HLE and LLE?"
summary: "LLE follows the console closely. HLE replaces part of the console with native code. HLE is useful, but HLE-first becomes a trap without a faithful floor."
pageType: "concept"
tags: ["Architecture", "LLE", "HLE", "Correctness"]
repos:
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-31"
---

Two short terms show up a lot in recomp projects: **LLE** and **HLE**.

**LLE** means low level emulation. It follows the console closely. That can mean running the console's own firmware, recompiling it, or interpreting the original instructions.

**HLE** means high level emulation. It replaces some console behavior with native code that does the same job at a higher level.

Example: a game asks the console BIOS to read something from a disc.

With LLE, the console's own BIOS code handles the request.

With HLE, the port may skip that BIOS code and answer the request with native code.

## Is HLE bad?

No.

HLE can make a port easier to use, faster, or easier to ship. For example, a project might use HLE to skip a slow boot screen, route file access through a modern system, or replace a well-understood service with native code.

The danger is not HLE itself. The danger is HLE that becomes the only truth.

If the port replaces console behavior and has no faithful version to compare against, a wrong answer can look correct just because the game kept running.

## What is the rule?

The developer rule is: **faithful LLE is always the floor.**

That floor can be a recompiled BIOS, a recompiled system ROM, an interpreter, a trusted emulator used for comparison, or another path that follows the original machine closely.

HLE can sit above that floor. It can be faster. It can be easier to use. It can remove a BIOS or ROM file requirement when a legal replacement is good enough for the job.

But HLE should not define correctness by itself.

The LLE path is the blueprint and the success criteria. A higher-level replacement is acceptable when it behaves like the faithful path for the thing it replaces.

## Why is HLE-first a trap?

An HLE shortcut can be good enough for one game.

That is the trap.

If the project only needs one game to boot, a hand-written answer may look fine. The game asks for one behavior, the shortcut returns something close enough, and the milestone turns green.

That is why HLE can start to look like a stub. It is not automatically fake behavior, but it can become fake behavior if it replaces the console without being checked against the faithful path.

But a console ecosystem is bigger than one game. The next game may use the same BIOS call, hardware feature, timing detail, or edge case differently. Then the shortcut is no longer a shortcut. It is a game-specific hack that other games inherit.

Enough of those hacks turn the framework into a pile of special cases. They become hard to remove because something already depends on them.

LLE fights that drift. It keeps the project tied to what the machine actually did, even before every game needs every feature.

That matters later. A feature that one early game never used may become required by a later game. If the floor stays faithful, the project has a place to implement that feature correctly instead of guessing around old HLE behavior.

## Where does HLE fit?

HLE is still useful.

It can make a port faster. It can make setup easier. It can avoid asking the user for a BIOS or ROM file when a legal high-level replacement is appropriate. It can also make a finished port feel more like a normal modern app.

The key is order.

Build or keep the faithful path first. Use it as the reference. Then add HLE where it helps, with the LLE path still available to check it.

This is why mature projects care about [co-simulation](/docs/concepts/co-simulation), reference emulators, fallback paths, and selectable low-level modes. They are not just developer tools. They keep convenience from silently becoming incorrect behavior.

## How do projects use this today?

psxrecomp is the clearest mature example. It can run with a low-level BIOS path, and it can also use higher-level helpers for convenience. The important part is that the lower-level path remains available as the reference.

snesrecomp leans on a faithful interpreter as its floor. That is a good fit for SNES work, where correctness and timing details matter a lot and many games are close to the hardware.

Other systems are at different levels of maturity. The useful question is not "does this project use HLE?" The useful question is "what checks the HLE path?"

## What should users take away?

For players, HLE and LLE are mostly invisible. A good port should just behave like the original game.

For developers, the distinction matters. HLE can be a practical tool, but it should not be used to fake progress. The port needs a faithful path that can catch mistakes.

## Next

- [How do we compare a port to the original?](/docs/concepts/co-simulation)
- [What does correct enough mean?](/docs/concepts/accuracy-and-burndowns)
- [What are the recompiler and runtime?](/docs/concepts/recompiler-and-runtime)
- [PlayStation](/docs/platforms/playstation)
