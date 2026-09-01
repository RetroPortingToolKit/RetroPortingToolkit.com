---
title: "Debug a divergence"
summary: "When a port disagrees with the reference, start from the first visible split, classify the failure, and fix the recompiler, runtime, or game config instead of patching generated code."
pageType: "guide"
tags: ["Debugging", "Co-simulation", "Correctness"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/SuperMarioWorldRecomp"
updated: "2026-08-30"
---

A divergence means the port and the reference stopped agreeing.

That reference might be an emulator oracle, an interpreter path, a previous known-good run, or a hardware-event trace. The important part is that you are comparing the port to something more trusted than your eyes.

Do not start by guessing. Start by finding the first moment where the two runs split.

## What should I check first?

Check for missed code before anything else.

A dispatch miss means the game jumped to code the recompiler did not translate. That can make the game skip a whole subroutine and keep running in a broken state.

If the project writes a dispatch-miss log, read it after every run. If it is not empty, fix discovery or configuration first.

Do not debug graphics, audio, timing, or gameplay while known code is missing.

## What does the report tell me?

A good divergence report tells you:

- where the two runs stopped agreeing;
- which part of the machine differs first;
- what each side thought the state was;
- what happened shortly before the split.

The first difference matters more than the biggest symptom.

A black screen ten frames later may have started as one bad register write. A bad sound effect may have started as a timer or DMA issue. A crash may have started as a missed overlay.

## Why not just inspect the broken screen?

Visible symptoms are late.

By the time a player sees a black screen, the real bug may already be several systems back.

Walk backward:

1. find the last good checkpoint;
2. find the first bad checkpoint;
3. find the first changed subsystem;
4. find the write or instruction that made it change;
5. fix the layer that produced that write.

That is slower than guessing, but it avoids fixing the symptom instead of the cause.

## What tools are usually involved?

Most mature projects grow a TCP debug server.

That server lets tools ask the running port for state: registers, memory, frame captures, screenshots, input state, timing counters, dispatch misses, and recent trace rings.

TCP is preferred here over MCP because debug clients restart often. Ports crash. Oracles restart. Harnesses reconnect. A plain TCP surface handles that better than a long-lived tool session that can get confused when the process under it disappears.

This is also useful for AI-assisted debugging. A tool can take a screenshot, press inputs, read state, compare memory, and report what changed without needing a human to stare at the window.

TCP input is not a replacement for real gameplay testing. It is useful for visual verification and basic control: moving through menus, pressing buttons, walking in a straight line, or repeating simple actions that are not timing-sensitive.

The exact commands differ by project. The shape is the same: expose the machine state through a tool surface instead of sprinkling one-off print statements through the runtime.

## How do I classify the bug?

Use the first difference to decide where the fix belongs.

| First bad thing | Likely layer |
|---|---|
| Wrong instruction result. | Recompiler or decoder. |
| Correct CPU state, wrong video memory. | Runtime hardware model or DMA path. |
| Correct memory, wrong pixels. | Renderer or presentation path. |
| Code jumps to an unknown address. | Discovery or overlay handling. |
| State changes at the wrong time. | Timing or scheduler. |
| Only one game needs a known address. | Game config. |

Do not edit generated code. Fix the source of generation or the runtime, then regenerate.

## What if the comparison tool is wrong?

That can happen.

A comparator can be blind if it fails to read real state, compares empty values, or accidentally ignores the field that changed.

Before trusting a green comparison, prove the tool can fail. Inject a known difference and make sure the run reports it in the right place.

A green run only means something if the harness is able to catch a red one.

## What if the game is slow?

First, check whether the game is actually running native code.

A fallback interpreter can keep a game moving while missing paths are discovered, but it is slower. If too much code stays in fallback, the port may work but feel bad.

Then check observer cost. Debug tools can slow the process if they ask for large dumps or screenshots too often.

After that comes real optimization work.

This can be a large phase, especially on later systems. Recompilation is not automatically fast enough just because code becomes native. The runtime, renderer, scheduler, memory model, audio path, debug hooks, and generated code shape can all matter.

Like emulator performance work, this may take many passes. It can take weeks, even with AI helping. Measure before optimizing, and keep correctness checks close while changing performance-sensitive code.

A timing shortcut that helps one game can break another.

## What should my bug report include?

A useful report includes:

1. the game and platform;
2. the framework revision;
3. the expected behavior;
4. the observed behavior;
5. the first divergence, not only the final symptom;
6. the subsystem that differs first;
7. the suspected layer;
8. the fix or next command needed;
9. the re-test plan.

That is enough for someone else to continue the investigation.

## What should I avoid?

Do not:

- edit generated code by hand;
- add game-specific hacks to a shared runtime;
- stub a missing function so the game keeps moving;
- silence an unmapped hardware read because it is noisy;
- call a green run meaningful before the comparator is tested.

Missing information is not permission to guess. Add the tool you need, then run the test again.
