---
title: "What are HLE and LLE?"
summary: "LLE follows the console closely. HLE replaces part of the console with native code. Build the faithful LLE floor first, then let one host-native HLE replace several LLE parts behind the same contract. That is where most of the speed comes from."
pageType: "concept"
tags: ["Architecture", "LLE", "HLE", "Correctness", "Performance"]
repos:
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/xboxllr"
updated: "2026-11-04"
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

## Can one HLE replace several LLE parts?

Yes. This is the most useful idea on this page.

An LLE version of a console is usually built from many small parts. Each one copies one piece of hardware or one firmware routine. That is good for correctness, because each part can be checked against the real machine. It is often slow, because the game pays for every small step, even when the steps only exist because of how the old hardware was wired.

One HLE part is allowed to replace a whole group of those LLE parts. We call this **N LLE to 1 HLE**.

The rule is a contract:

- **Same entry.** The HLE part is called from the same place, with the same inputs, as the first LLE part it replaces.
- **Same output.** It produces the same result the last LLE part would have produced.
- **Same visible effects.** Anything the game can observe stays the same: memory it writes, errors it reports, the order things happen in, and how much guest time passes.

What happens in between does not have to match. The HLE part can skip steps, merge steps, cache work, or do the job a completely different way. That freedom is where the speed comes from.

A small example. A game draws one line of the screen. In LLE, the console's video chip looks up a tile, then a palette entry, then decides priority, then blends, one pixel at a time. An HLE version can decode eight pixels of a tile at once, decide window rules once per line, and keep colors in a native format until the line is finished. The game sees the same line. The PC does far less work.

## What is host-native friendly HLE?

It is HLE written for the computer the port runs on, not for the console it came from.

The question is not "how did the hardware do this?" The LLE path already answers that. The question is "what is the fastest way for a modern PC to give the same answer?"

That can mean:

- doing work on the GPU instead of the CPU;
- processing a row, a tile, or a batch instead of one pixel or one call;
- keeping data in a format the PC handles well, then converting once at the end;
- sending a few large draw batches instead of many small ones;
- skipping work whose result the game never reads.

Host-native does not mean one operating system or one CPU. A port that uses SIMD or assembly must keep a portable version behind the same interface, so every supported platform still builds and runs. A faster path that breaks another platform is not an optimization.

## How do LLE and HLE combine for speed?

The order matters.

1. **Build the faithful LLE floor first.** Prove it against real hardware behavior and real players. For several of these projects, the signal that the floor was ready was speedrunners using glitches and tricks that behaved like the original.
2. **Measure where the time goes.** Profile the real game, not a guess.
3. **Pick a seam.** Choose a group of LLE parts that costs a lot and has a clear boundary.
4. **Write one HLE part for that seam.** Keep the entry, output and visible effects the same.
5. **Check it against LLE.** Compare the same inputs through both builds.
6. **Keep it only if it wins.** Measure the same stretch of gameplay before and after. Throw it away if it is not faster.

Each subsystem can be swapped on its own. A port can use HLE graphics with LLE audio, or the reverse. The choice is made when the game is built, so normal play runs one path, not both. The LLE build stays available as the reference.

Not every replacement is exact. Some HLE is a deliberate approximation, such as a different filter or a tolerance on floating point results. That is allowed when the trade is written down and its effect is checked. It should never be described as identical to LLE.

## How do you know an HLE part is right?

Compare it to the LLE part it replaced.

- **Exact replacements** should match LLE exactly. For graphics, that can mean byte-identical frames across a set of test scenes.
- **Approximate replacements** are checked at their boundary, with the tolerance written down.
- **When they disagree**, find the first frame or event where they differ. That is what [co-simulation](/docs/concepts/co-simulation) is for.

Two implementations agreeing is not proof on its own, especially when they share code. Real hardware behavior is the authority. The LLE path is the closest thing to it that the project controls.

The deeper version of this, with measured results from nine toolchains, is [How does host-native HLE make a port faster?](/docs/concepts/host-native-hle).

## How do projects use this today?

psxrecomp is the clearest mature example. It can run with a low-level BIOS path, and it can also use higher-level helpers for convenience. The important part is that the lower-level path remains available as the reference.

snesrecomp leans on a faithful interpreter as its floor. That is a good fit for SNES work, where correctness and timing details matter a lot and many games are close to the hardware.

gbarecomp keeps its original per-pixel screen renderer as the LLE path. Its HLE line compositor matched it byte for byte across 128 test frames before it became the default. Its GPU renderer for high resolutions sits on top of that. See [Game Boy Advance](/docs/platforms/game-boy-advance).

XboxLLR is built around this split from the start. Low-level devices and original code set each service's contract. Shared host-native services for files, memory, scheduling, input, graphics and audio then replace them. See [Original Xbox](/docs/platforms/xbox).

Other systems are at different levels of maturity. The useful question is not "does this project use HLE?" The useful question is "what checks the HLE path?"

## What should users take away?

For players, HLE and LLE are mostly invisible. A good port should just behave like the original game.

For developers, the distinction matters. HLE can be a practical tool, but it should not be used to fake progress. The port needs a faithful path that can catch mistakes.

The short version: faithful first, then fast. Let one host-native HLE part replace as many LLE parts as it can, as long as the game cannot tell the difference.
