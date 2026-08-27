---
title: "Co-simulation"
summary: "Run the port next to a known good emulator from the same reset, stop both at the same point in game time, compare the whole machine, and halt at the first difference: that first difference is the bug."
pageType: "concept"
tags: ["Correctness", "Testing", "Co-simulation"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-27"
---

A recompiler turns a game's machine code into code you can compile. Nothing about the result proves it still behaves like the console. Co-simulation is how a project finds out.

Take an emulator that already runs the game correctly and run it beside the port: same game file, same reset, same input. Both stop at the same point in game time, called a checkpoint. There you compare the whole machine: every register, all of memory, every device. The first checkpoint where they differ is where the port stopped behaving like the console, and everything after it is consequence.

## Why a known good emulator?

Most projects can already run a game two ways: the compiled code, and the small interpreter that catches what the recompiler has not reached yet. Comparing those two only proves they agree with each other. [nesrecomp](https://github.com/mstan/nesrecomp) says why that is not enough:

> **Self-agreement is NOT accuracy.** "The recompiled C agrees with our own runner's
> interpreter / our own APU" proves *backend equivalence*, not *correctness* — both can be
> identically wrong.

So the reference is an emulator somebody else wrote and other people already trust. It is not perfect either, but the port and the reference are unlikely to be wrong in the same way.

## The reference emulator

The pattern is the same everywhere this is done well. Take a known good emulator core and change it so nothing inside it stays private: every CPU register, all of memory and the state of each device can be read from outside while the game runs. Then give it a TCP server that speaks the same commands, in the same format, as the port's own debug server. Once both sides answer the same questions the same way, one tool can ask each of them for the same thing and compare the two answers, and every tool already written for the port works on the reference for free.

[psxrecomp](https://github.com/mstan/psxrecomp) does this on PlayStation. Its build produces a second program, `psx-beetle`, which wraps the Beetle PSX emulator core and gives it "a debug server exposing the SAME wire-protocol commands as psx-runtime, on a different port (4380). No recomp code linked." That core is cloned from upstream, pinned to one commit and patched with the hooks the project needs. The port listens on port 4370 and the reference on 4380, both take `get_registers` and `read_ram`, and one client runs a command on each and diffs the replies.

The same shape turns up on other consoles: [snesrecomp](https://github.com/mstan/snesrecomp) names a bsnes core as its outside reference, notes that a stock libretro core only stops on frame boundaries, and keeps the whole co-simulation build out of every release.

> **You provide this.** Every co-simulation run needs a game file, and you supply your own. See [the game file you supply](/docs/concepts/the-game-file-you-supply).

## The first difference, not the last symptom

A bug shows itself late. The screen goes black, a character falls through the floor, the music stops. By then the machine has been wrong for a while, and what you can see is a consequence of something you cannot. psxrecomp's debugging rules put it in five words:

> Never debug the final symptom.

Co-simulation turns that rule into a tool. It halts at the first checkpoint where the two machines disagree, so whatever it halts on is the first difference by construction. You are not picking between ideas about the bug. You are reading the moment it started.

![The rungs are guest cycles, not clock time. Each side folds every hash into a running total, so the first total that differs is the first difference, and the sub-hash under it names the part that split.](./lockstep.svg)

## The clock both sides count

To compare two machines you have to catch them at the same moment. That is the hard part, because they do not move in the same units. The port runs a whole block of compiled code at a time. The emulator runs one instruction at a time. Left alone, they never stop in the same place.

So both sides count something that comes out of the game, not out of the host. On PlayStation that is guest cycles, and checkpoints sit on fixed cycle boundaries, never at a point in host time.

The number also has to mean the same thing on both sides, because a port and a reference can charge different cycle counts for the same instruction. A frame rate that looks right hides that drift, so psxrecomp measures it directly: `tools/cycle_compare.py` arms the same guest address on both processes and diffs the cycle counts.

## What gets hashed

Comparing all of memory at every checkpoint would be slow, so each side squeezes its state into one number, a hash, and the hashes are compared instead. One rule decides what goes in: everything that can change what the game does next, and nothing that belongs to the host machine. Miss a piece of state and the tool goes blind, reporting agreement it never checked. Include a host-only value and it reports a difference that is not real.

Under the whole machine hash, each side also keeps a small hash per part: CPU, RAM, video memory, sound, timers and so on. When the run halts, those say which part of the machine split first, before anyone compares bytes.

## The tests that test the test

A comparison tool can fail in the worst way possible: it can report that everything matches while it is looking at nothing. So the tool is tested before anybody believes it.

1. **Run each side against itself.** Zero differences, both times. That proves the harness repeats and no host-only state leaked in.
2. **Compare byte by byte every so often**, even when the hashes agree. A difference there is a bug in the tool.
3. **Inject a fault on purpose.** Flip one byte of memory in one run. The tool has to halt at exactly that place and name the right part of the machine.

Check 3 is the one that matters, because a broken tool passes the first two easily. A hash that always returns the same number reports perfect agreement forever.

## What co-simulation does not prove

It does not prove the port matches the console's hardware. It proves the port matches an emulator, and where the two are wrong in the same way the comparison stays quiet.

It is blind to anything outside the compared state. The picture you see and the sound you hear are not in the hash, so clean checkpoints are not a reason to ship.

One class of bug sits underneath the method: a recompiler can be wrong by never producing a function at all, which shows up as a jump into nothing, not as a hash that differs. That is [telling code from data](/docs/concepts/code-discovery).

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md), [`runtime/CMakeLists.txt`](https://github.com/mstan/psxrecomp/blob/master/runtime/CMakeLists.txt), [`runtime/src/beetle_debug_server.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/beetle_debug_server.c), [`docs/beetle-linux.md`](https://github.com/mstan/psxrecomp/blob/master/docs/beetle-linux.md), [`PRINCIPLES.md`](https://github.com/mstan/psxrecomp/blob/master/PRINCIPLES.md)
- psxrecomp, the clock, the hashing and the self-checks: [`tools/cycle_compare.py`](https://github.com/mstan/psxrecomp/blob/master/tools/cycle_compare.py), [`runtime/include/cosim_state.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/cosim_state.h), [`docs/internal/COSIM_ORACLE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/internal/COSIM_ORACLE.md), [`tools/cosim.py`](https://github.com/mstan/psxrecomp/blob/master/tools/cosim.py)
- [nesrecomp](https://github.com/mstan/nesrecomp): [`NES_ACCURACY_BURNDOWN.md`](https://github.com/mstan/nesrecomp/blob/master/NES_ACCURACY_BURNDOWN.md). [snesrecomp](https://github.com/mstan/snesrecomp): [`SNES_COSIM.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_COSIM.md)

## Next

- [Set up co-simulation](/docs/guides/set-up-co-simulation) stands one up, with real commands.
- [Debug a divergence](/docs/guides/debug-a-divergence) is what to do once a run halts.
- [What correct enough means](/docs/concepts/accuracy-and-burndowns) turns a clean run into a claim.
- [Timing models](/docs/concepts/timing-models) is the usual reason a port and a reference disagree at all.
