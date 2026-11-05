---
title: "Optimize a port without losing accuracy"
summary: "Wait for a trusted faithful baseline, measure the real workload, replace one seam at a time with host-native HLE, prove it matches, and keep only the changes that win in a matched before-and-after run."
pageType: "guide"
tags: ["Performance", "HLE", "LLE", "Optimization", "Measurement"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/xboxllr"
updated: "2026-11-04"
---

This guide is for a port that already runs correctly and now needs to run faster.

If the port is not correct yet, stop here. Speed work on an unproven port means you are measuring a moving target, and a fast wrong answer is harder to catch than a slow one. The idea behind this guide is on [How does host-native HLE make a port faster?](/docs/concepts/host-native-hle).

## Before you start

You need:

- a faithful LLE build that players trust;
- a repeatable route through the game, driven by inputs, save states or guest milestones, not by waiting a number of seconds;
- a way to capture frames, state hashes or other output, such as the [TCP debug protocol](/docs/reference/tcp-protocol);
- a quiet PC to measure on.

## Step 1. Wait for a trusted baseline

The LLE build is your reference for everything that follows. Make sure it deserves that.

A good signal is players pushing the game hard and finding it behaves like the original. For several ports, that signal was speedrunners performing glitches and tricks that worked the same way they do on real hardware.

**Checkpoint.** You have a build you would accept as the definition of correct.

## Step 2. Pick a workload and measure it

Choose a stretch of real gameplay that is slow or that you want to make faster. A busy boss fight, a widescreen scene or a high internal resolution are good choices.

Measure CPU time per frame for the whole process. If the game is locked to its original speed, frames per second will not show you anything until it starts dropping frames. Milliseconds per frame show the headroom you have.

Then split the cost by cause: CPU translation, dispatch, video, audio, presentation, waiting. You want to know which part is expensive before you touch anything.

**Checkpoint.** You can name the one or two subsystems that cost the most in this workload.

## Step 3. Measure your noise floor

Run the same build twice, back to back, on the same route. The difference between those two runs is your noise.

Any "improvement" smaller than that difference is not a result. A bigger number is not automatically safe either. On one GBA renderer change, CPU time fell 12.9%. Two runs of the unchanged build already differed by 3.4%, and the paired before-and-after runs spread by 4.6 points, so it was called inconclusive and stayed off by default.

**Checkpoint.** You know how big a change has to be before you believe it.

## Step 4. Choose a seam

A seam is a boundary where a group of LLE parts can be replaced as one.

Good seams have a clear entry and a clear output. A whole scanline, a draw list, a DMA transfer, a kernel service call or a decompression routine are typical. The bigger the group behind one seam, the more work an HLE part can skip.

Write down the contract before you write code:

- what goes in;
- what comes out;
- what memory changes;
- what errors and edge cases exist;
- what order things happen in, and how much guest time passes.

## Step 5. Write the host-native HLE

Write the replacement for the host, not for the console. Work in rows, tiles or batches. Use the GPU where it fits. Keep data in a native format until the end.

Rules for the code:

- Same entry point and same contract as the LLE parts it replaces.
- Selected when the game is built. Keep the LLE build working.
- No live switching between paths during play.
- Assembly and SIMD only behind CPU, OS and ABI build gates, with a portable version behind the same interface.
- Never fake a result to make a test pass.

## Step 6. Prove it matches

Run the same inputs through the LLE build and the HLE build.

For an exact replacement, the output should match exactly. GBA's line compositor was checked byte for byte across 128 test frames covering every video mode, then on real gameplay in two games.

For an approximation, write down what it trades away and check that effect.

If they differ, find the first frame where they differ. [Debug a divergence](/docs/guides/debug-a-divergence) covers how.

**Checkpoint.** You can show the HLE build gives the same answer.

## Step 7. Measure before and after

Build both versions. Play the same stretch of gameplay on the same PC, back to back, with the same settings. Compare CPU time per frame.

- Keep the change only if it beats your noise floor.
- Measure per game. A gain in one game does not cancel a loss in another.
- Do not add up gains from separate changes. Measure the combined package.

**Checkpoint.** The change is faster by more than the noise, in the workload you chose.

## Step 8. Record what you threw away

Most ideas will not win. That is normal.

On PlayStation, 10 changes shipped and 12 were thrown out. One native geometry engine made Ape Escape 22% slower. On Genesis, about a dozen ideas, including new FM synth kernels, were measured and reverted.

Write down each rejected idea with its measurement. The next person will want to try it too.

## Common mistakes

| Mistake | Why it hurts |
|---|---|
| Optimizing before the port is correct. | You lose your reference, and every later fix moves the target. |
| Trusting a microbenchmark. | A faster helper does not matter unless the real game gets faster. |
| Comparing unmatched runs. | A different scene, setting or background load can look like a win. |
| Reporting FPS on a speed-locked game. | FPS stays at the cap. Report milliseconds per frame. |
| Calling an approximation identical. | It hides a real difference from the next person who debugs it. |
| Leaving the LLE build broken. | You lose the only thing that can check your HLE. |
| Shipping assembly without a fallback. | Another platform stops building or crashes. |
