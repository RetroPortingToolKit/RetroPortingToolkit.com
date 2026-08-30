---
title: "Is this emulation?"
summary: "Not in the usual sense. The game's own logic runs as native code, but the port still needs a runtime for the old console around it. Unfinished ports may also use a fallback interpreter until all code is covered."
pageType: "concept"
tags: ["Emulation", "Execution model", "Honesty"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-30"
---

Not in the way most players mean it.

In an emulator, the emulator is the program. It reads the old game's instructions while you play and acts them out for the modern machine.

In a recompiled port, the game is the program. The game's own code has already been translated and compiled for your computer. When you play, your processor runs that translated game code directly.

There is still software standing in for the old console. That part matters, and it is where the answer gets more careful.

## What runs natively?

The game's own logic runs as native code.

That means the code that decides where the player moves, what enemies do, how menus work, and how the game state changes is compiled for your computer. It is not being read one instruction at a time by an emulator during play.

This is the main difference. The port is not a general box for playing every game on that console. It is one game, rebuilt as one app.

## What does the runtime do?

The game still expects a console around it.

It asks for graphics, sound, input, timing, memory, save data, and other hardware behavior. Your PC does not have a Super Nintendo PPU or a PlayStation GPU inside it.

The runtime answers those requests. It is a normal library linked into the port. It stands in for the old machine around the game, the way any modern app uses libraries and operating system services around its own code.

Some of that work is hardware simulation. That does not make the whole port a traditional emulator. It means native game code is running on top of a runtime that knows how the old console behaved.

## Why is there sometimes an interpreter?

Some games hide code until they are running.

A game might load a new chunk from disc. It might jump through a table. It might build or copy code in a way the static pass did not fully see. Mature toolchains try to cover this before release, but unfinished ports can still have gaps.

A fallback interpreter is a safety net for those gaps. It runs missed code the slow way so the port can keep going instead of crashing at the first unknown address.

That fallback is not the goal. Projects measure it and work it down. A finished port should have full coverage and should not need the fallback during normal play.

## What does this mean when I download a port?

It should feel like a normal app.

You launch it. It checks the game file it needs from you. Then it runs that game as its own program.

You are not choosing a console core, loading a ROM into a general emulator, or tuning emulator settings before you can start. The port is built for that one game.

## Is any emulation involved at all?

Yes, depending on what you mean by emulation.

The game's own logic is native code. The console around it is recreated in software. During development, a fallback interpreter or a separate comparison emulator may also be used to find mistakes.

So the honest answer is narrow:

The port is not a traditional emulator running the game instruction by instruction. It is a native port with a runtime for the old hardware around it.

## Where should I look for a specific console?

Each console is different. PlayStation, SNES, NES, and the smaller projects do not all handle code coverage, hardware, or fallback paths the same way.

Use the [platform pages](/docs/platforms) for the current answer on one console. Use [what static recompilation is](/docs/start/what-is-static-recompilation) if you want the core idea before the details.

## Next

- [How is a port made?](/docs/start/how-a-port-is-made): the full path from game file to native app.
- [What static recompilation is](/docs/start/what-is-static-recompilation): the translation step in plain language.
- [The platform pages](/docs/platforms): where each console's exact answer lives.
- [High level and low level](/docs/concepts/hle-and-lle): how projects decide where the old hardware is recreated.
