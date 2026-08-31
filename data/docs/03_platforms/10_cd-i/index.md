---
title: "CD-i"
summary: "cdirecomp is a BIOS-focused research demo today: no commercial-game support claim, and only a rough Hotel Mario intro path has been shown."
pageType: "project"
tags: ["CD-i", "68000", "System ROM", "Research"]
repos:
  - "https://github.com/mstan/cdirecomp"
updated: "2026-08-30"
---

CD-i is a BIOS-focused research demo today.

[cdirecomp](https://github.com/mstan/cdirecomp) explores recompilation for a disc-based 68000 system where the system ROM matters before normal game-port work can be trusted.

This is not a commercial-game platform yet. The current public proof is very narrow: it can barely reach the Hotel Mario intro, with visual errors. Gameplay does not work.

Treat this as machine research, not a route for starting your own playable port.

## What does it translate?

CD-i uses a 68000-family CPU.

cdirecomp translates 68000 machine code into C and links it against a runtime that models the machine around it.

The important target today is the BIOS and system path. That comes before game compatibility.

The 68000 work is related to other 68000 recomp work in the ecosystem, especially [Sega Genesis](/docs/platforms/sega-genesis), but the console around the CPU is very different.

## What files does it need?

CD-i work can need both a system ROM and disc images.

Use legally obtained files. This site does not provide system ROMs, disc images, game files, or copyrighted retail BIOS files.

That requirement is part of why CD-i sits in the research group. The system path itself has to be proven before this becomes a normal game-port route.

## What makes CD-i hard?

The hard part is that the system software matters so much.

On some consoles, a game can be treated mostly as a self-contained cartridge or disc program. CD-i depends heavily on the BIOS and platform services around it.

That means shortcuts are risky. If the runtime guesses what the BIOS would have done, it might pass one screen and fail everywhere else.

The safer path is to model the low-level behavior first, then build higher-level convenience only after the faithful path can prove it.

## What is proven today?

The proof point is BIOS and early boot research.

Hotel Mario reaching an intro is a useful sign, but it is not a playable-game claim. Visual errors remain, and gameplay does not work.

Read it as a technical milestone, not a compatibility promise.

## What are the main limits?

- This is research, not a recommended first port target.
- No commercial game is supported today.
- Hotel Mario only reaches an early intro path, with visual errors.
- Gameplay does not work.
- BIOS and system behavior are still the main problem.

## Next

- [CD-i hardware page](/hardware/cd-i)
- [Sega Genesis](/docs/platforms/sega-genesis)
- [What are HLE and LLE?](/docs/concepts/hle-and-lle)
- [What about code you cannot see ahead of time?](/docs/concepts/code-you-cannot-see-ahead-of-time)
- [How do I recomp my own game?](/docs/start/recomp-your-own-game)
