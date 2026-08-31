---
title: "What is static recompilation?"
summary: "A game is translated before it runs, then built as a native program for your computer. The game code runs directly, while a runtime stands in for the old console around it."
pageType: "concept"
tags: ["Static recompilation", "Recompiler", "Runtime"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-31"
---

Static recompilation is a way to turn an old console game into a native app.

The starting point is the game's binary: the machine code on the disc or cartridge. Your computer cannot run that code directly, because it was made for a different machine.

A recompiler reads that old code before the game runs. It writes new source code that does the same work. Then a normal compiler builds that source code for your computer.

The result is a normal program. When you play it, your processor runs the game's translated logic directly.

## Why is it called static?

Static means the translation happens ahead of time.

The game is not being translated one instruction at a time while you play. Most of the hard work happened earlier, on a developer's machine, when the port was built.

That is different from an emulator. An emulator reads the game's old instructions while you play and acts them out on the modern machine.

## Is it always fully static?

That is the goal, but real games can make it complicated.

Some games load code later. Some jump through tables. Some copy code around in memory. If the tool cannot see that code ahead of time, the port may need another path while it is still being finished.

That path can still end in native code. A PlayStation game, for example, may load a new chunk from disc while it runs. A mature runtime can catch that chunk, translate it, keep it, and run it as compiled code later.

So keep two words separate:

**Native** means the game's logic runs as compiled code on your processor.

**Static** means the translation happened before the game ran.

A port can be native even when part of the work was not fully static yet.

## Why is it called recompilation?

The word is a little loose.

Many later games were built with compilers. For those games, recompilation means taking compiled machine code, turning it back into source code, and compiling it again for a new machine.

Older games are not always like that. NES and SNES games were often written by hand in assembly. Strictly, those games are being compiled this way for the first time.

The process is still the same enough that this site uses one word for all of it.

## What does the recompiler write?

The current projects here usually write C.

That does not mean static recompilation is defined by C. C is just the language these projects use today because normal compilers can build it almost anywhere.

The generated source code is not meant to be hand-edited. It is build output. If it is wrong, the fix belongs in the recompiler, the runtime, or the game's settings.

## What does the runtime do?

The game code still expects the old console around it.

It wants video, audio, controllers, timing, saves, memory behavior, and hardware registers. Your computer does not have that console hardware.

The runtime is the library that stands in for the console. The translated game code calls into it when it needs the machine around the game.

That is why a port is more than generated code. It is translated game logic plus a runtime that knows enough about the original console.

## What does this make possible?

A recompiled port can feel like a normal PC app.

It can have a launcher, controller settings, widescreen options, save states, rewind, mods, translations, and other features that are hard to add from outside a black-box emulator.

Those features still need discipline. The faithful game should be the baseline. Extra features should be optional, and with them off the port should behave like the original game.

## What is the hard part?

The hard part is not only translating instructions.

The hard part is knowing what is code in the first place. A game binary is just bytes. Some bytes are instructions. Some are data, graphics, audio, text, or tables. The tool has to tell the difference.

The other hard part is making one game feel finished. A build can compile and still have timing bugs, missing code paths, broken graphics, bad audio, or input problems.

That is why project maturity matters. PlayStation is the strongest starting point today. SNES is next. Other frameworks are at different stages.

## Where does emulation come in?

The game's own logic runs as native code. The console around it is recreated in software by the runtime. During development, a fallback interpreter may also catch code that has not been covered yet.

That is the honest answer. A recompiled port is not a traditional emulator running the game instruction by instruction, but it still needs software that stands in for the old machine.

See [is this emulation?](/docs/start/is-this-emulation) for the longer version.

## Next

- [How is a port made?](/docs/start/how-a-port-is-made): the process from game file to native app.
- [Is this emulation?](/docs/start/is-this-emulation): where the runtime and fallback interpreter fit.
- [Getting started](/docs/start/what-you-need): what you need before building anything.
- [Telling code from data](/docs/concepts/code-discovery): the hardest part in more detail.
