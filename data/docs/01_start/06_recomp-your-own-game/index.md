---
title: "How do I recomp my own game?"
summary: "Start with a realistic console, use a game file you own, expect a loop of build, run, observe, and fix. PlayStation is the strongest starting point today."
pageType: "guide"
tags: ["Tutorial", "PlayStation"]
updated: "2026-08-30"
---

You can try, but it is not a one-click conversion.

A recompiler can do a lot of work for you. It can find code, translate it, build a native app, and give you a place to start. It cannot promise that every game works the first time.

Think of it as starting a port project, not pressing a convert button.

## Which console should I start with?

Start with PlayStation unless you have a specific reason not to.

psxrecomp is the most mature framework in this ecosystem today. It has the strongest starter path and the clearest route from a disc image to a generated project.

SNES is the next strongest framework, especially when a game has a strong public disassembly or decompilation to help guide discovery. It is less of a single beginner path than PlayStation, but the results can be excellent.

Other consoles are at different stages. Some are useful examples. Some are research projects. Some are not yet a practical path to a playable port.

## What do I need before I start?

You need three things:

1. A game file you own, in the format the project expects.
2. A BIOS or system file, if that console needs one.
3. The normal build tools from [what do I need to get started?](/docs/start/what-you-need).
4. A realistic target console from the [platform pages](/docs/platforms).

The files matter. The port is built for exact bytes, not just a title. A different version of the same game may need different work.

For BIOS files, follow the platform page. Some projects can use an open-source BIOS alternative. Others need a retail BIOS dump you provide yourself.

## What does the first pass do?

The first pass tries to create a project that builds.

On PlayStation, the starter flow can inspect your disc, create the project layout, generate code, and build the result. That is the best current route for a first attempt.

The result may boot. It may get to menus. It may crash. It may run with missing audio, broken graphics, timing problems, or fallback interpreter use. That is normal early-port work.

The measurement is faithfulness. The question is not only "does it run?" The better question is "does it behave like the original game?"

## What happens after it builds?

You run the game and observe what happens.

Start simple. Does it boot? Does it show video? Does input work? Can you reach gameplay? Can you save and load? Does audio behave? Does it keep running after a few minutes?

Each answer tells you where to look next.

## Where does the real work go?

The real work is the loop.

Find missing code. Fix discovery. Regenerate. Build again. Compare behavior. Fix the runtime or game settings. Test again.

As the console framework matures, that loop gets shorter for later games. The goal is not to hand-build every game from scratch. The goal is a shared framework that keeps learning from each port.

## When should I ask for help?

Ask when you have a clear first failure.

Include the game, the console, the toolchain revision, the command you ran, and the first useful error or symptom. "It does not work" is hard to act on. "It boots, then jumps to an unknown address after the title screen" gives someone a real starting point.

If an AI assistant is helping, make it read the platform page first. Then make it explain what it is about to try before it changes anything.

## What should I not do?

Do not edit generated code by hand.

Do not assume a nearly matching game file is good enough.

Do not copy old commands from a random page if the platform page or project has moved on.

Do not treat one game's result as a promise about the whole console.

## Next

- [Quickstart](/docs/start/quickstart): build the psxrecomp pipeline before aiming at a game.
- [The platform pages](/docs/platforms): choose a realistic console.
- [The game file you supply](/docs/concepts/the-game-file-you-supply): why exact game files matter.
- [Code you cannot see ahead of time](/docs/concepts/code-you-cannot-see-ahead-of-time): why some games need more than the first static pass.
