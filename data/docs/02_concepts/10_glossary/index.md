---
title: "What do these terms mean?"
summary: "Short definitions for common recomp words, written for readers who are still getting comfortable with the technical side."
pageType: "reference"
tags: ["Glossary", "Vocabulary", "Reference"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/smsggrecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/gcnlle"
  - "https://github.com/mstan/xboxlle-probe"
updated: "2026-08-30"
---

These are the words this site uses often.

Some terms are general. Some belong mostly to one console or one project. When that matters, the definition says so.

## A

### AOT

Ahead of time. Work done before the program runs. Static recompilation is usually AOT because the game code is translated before launch.

### Always-on ring

A debug buffer that records all the time. Developers read it after a bug happens. This is useful because many bugs are already gone by the time someone knows what to record.

## B

### Bank

A chunk of game data or generated output. On cartridge systems, a bank often means a piece of ROM that hardware can swap into the CPU's address space. Some projects use the word differently, so read the local context.

### Bank switching

Hardware swapping which ROM bank appears at a CPU address. This means one address can refer to different code or data at different times.

### Baserom

A user's own clean dump of a cartridge game. The project does not provide it.

### BIOS

System software from the original console. Some projects need a BIOS or firmware file. Some can use an open-source replacement. This site does not provide copyrighted retail BIOS files.

### Burndown

A checklist or scorecard for accuracy work. It records what has been checked, what reference was used, and what still needs work. See [What does correct enough mean?](/docs/concepts/accuracy-and-burndowns).

## C

### Cache

Saved build or runtime output that can be reused later. In some projects, code discovered while playing can be compiled and cached so it runs faster next time.

### Code discovery

Finding which bytes in a game file are instructions and where functions begin. See [How does a project tell code from data?](/docs/concepts/code-discovery).

### Co-simulation

Running the port beside a trusted reference and comparing them at the same points in game time. See [How do we compare a port to the original?](/docs/concepts/co-simulation).

### Correctness

How faithfully the port behaves compared with the original game on the original machine, within a stated scope.

### Cycle

A small unit of console time. Many timing problems are really cycle problems.

### Cycle accurate

Modeled closely enough that individual cycles matter. Be careful with this phrase: some projects use it as a goal, not a finished status.

## D

### Decoder

The part of a recompiler that reads machine instructions and translates them into another form.

### Determinism

The same starting state and same inputs produce the same result. Save states, rewind, recordings, and rollback netplay depend on it. See [Why does determinism matter?](/docs/concepts/determinism).

### Disc image

A user's own dump of a disc game. On PlayStation, this is often a `.cue` file with matching `.bin` tracks.

### Dispatch

The runtime choosing which translated function should handle a guest address.

### Dispatch miss

The game jumped to an address that has no translated function ready. A mature runtime may interpret it, log it, or feed it back into discovery.

### Divergence

A difference between the port and a reference during testing. The first divergence is the one developers want to find.

## E

### Emulation

Acting like another machine in software. Static recompilation avoids interpreting the main game code when it can, but the runtime still models console hardware. See [Is this emulation?](/docs/start/is-this-emulation).

## F

### Faithfulness

The port behaving like the original game. This is the real measurement, not just whether the app opens.

### Fallback interpreter

A small emulator inside the runtime. It can run code that was not translated ahead of time. It is slower than native code, but it keeps correctness first.

### Firmware

System software stored in or used by a console. Similar to BIOS in this context.

## G

### Game file

The game input the user provides, such as a cartridge dump or disc image. See [What is the game file contract?](/docs/concepts/the-game-file-you-supply).

### Generated code

Code written by the recompiler. It is build output. Developers should fix the recompiler, runtime, or config instead of hand-editing generated code.

### Guest

The old console or game being recreated. For example, a PlayStation game is guest code running inside a native port.

## H

### HLE

High level emulation. Replacing a piece of console behavior with native code that does the same job at a higher level. HLE is useful, but HLE-first can become a trap. See [What are HLE and LLE?](/docs/concepts/hle-and-lle).

### Host

The modern machine running the port.

## I

### Interpreter

Software that reads guest instructions and acts them out one at a time.

### Interrupt

A hardware event that makes the CPU stop what it is doing and run special code. Timing-sensitive games often care exactly when interrupts happen.

## L

### LLE

Low level emulation. Following the original machine closely, often by running or recompiling its own code. In these projects, faithful LLE is the floor that HLE is checked against.

## M

### Mapper

Cartridge hardware that changes which ROM data appears at which CPU addresses. This term is especially common for NES.

### Mod manifest

A file that describes a mod package, its version, its features, and the game version it targets.

## N

### Native

Running as compiled code for the host machine instead of being interpreted one instruction at a time. Native says what runs. Static says when the translation happened.

## O

### Oracle

A trusted reference used for comparison, usually a mature emulator. Co-simulation uses an oracle to decide whether the port still matches.

### Overlay

Code loaded into memory while the game runs, often replacing earlier code at the same address. This is especially important for PlayStation. See [What about code you cannot see ahead of time?](/docs/concepts/code-you-cannot-see-ahead-of-time).

## P

### Probe

A read-only debugging query or tool. A probe observes behavior; it is not necessarily a playable port.

### Provenance

Where something came from. In this ecosystem it can mean how code was discovered, where a hardware behavior was learned, or which files are safe to redistribute.

## R

### Recompiler

The build-time tool that reads a game's machine code and writes source code from it. See [What are the recompiler and runtime?](/docs/concepts/recompiler-and-runtime).

### Runtime

The native code that surrounds the translated game and provides console services: memory, graphics, audio, input, saves, timing, and more.

### Runtime recompilation

Translating code while the game is running because the code was not available earlier. This is different from pure AOT static recompilation, but the result can still be native code.

## S

### Save state

A snapshot of the machine that can be restored later.

### Static recompilation

Translating game code before the game runs, then compiling the result into a native program. See [What is static recompilation?](/docs/start/what-is-static-recompilation).

### Stub

Made-up behavior standing in for real console or game behavior. Stubs may help during experiments, but they should not become hidden correctness claims.

> **Warning.** Stubs rot quickly, especially when AI is involved. A stub can make
> a milestone look complete while hiding the real missing behavior. The safer
> rule is no stubs, ever: stop, find the real behavior, and make the faithful
> path work.

## T

### Timing model

How the port tracks the original console's time. See [When should timing be changed?](/docs/concepts/timing-models).

### Tier

A level in a runtime's dispatch path. In psxrecomp, for example, code may run as ahead-of-time native code, runtime-compiled code, or interpreter fallback. Do not assume every console uses the same ladder.

## Next

- [What is static recompilation?](/docs/start/what-is-static-recompilation)
- [How is a port made?](/docs/start/how-a-port-is-made)
- [What are HLE and LLE?](/docs/concepts/hle-and-lle)
- [Every repository](/docs/fleet/repositories)
