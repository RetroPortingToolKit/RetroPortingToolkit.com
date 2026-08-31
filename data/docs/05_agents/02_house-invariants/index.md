---
title: "Rules to give an AI agent"
summary: "The core rules an AI agent should follow when working on recomp projects."
pageType: "reference"
tags: ["Agents", "Conventions", "Correctness"]
updated: "2026-08-30"
---

This is the rule sheet to give an agent before it edits a recomp project.

The local repository can be stricter. When it is, follow the repository. When it is silent, use these rules.

## Fix the tool, not generated output

Generated C is build output.

If generated output is wrong, the fix belongs in one of these places:

- the recompiler
- the runtime
- the game config
- the discovery input

Then regenerate.

Do not hand-edit generated files. The next regeneration deletes the fix and keeps the bug.

## No stubs

A missing implementation should fail loudly.

Do not return a fake success value. Do not skip a hardware event. Do not add "temporary" behavior that lets the game continue while lying about what happened.

Stubs are rot. AI makes this worse because it can produce confident, clean-looking stubs quickly.

If behavior is unknown, the agent should investigate, fail loudly, or stop with a clear note.

## Find the first divergence

When native and oracle disagree, the earliest mismatch is the bug to debug.

Later differences are usually consequences. A later screenshot, register value, audio glitch, or crash may only be the result of the first bad write.

## Align on hardware events

Do not compare two runs by frame number unless the project proves that frame number means the same thing on both sides.

Prefer hardware events:

- VBlank
- DMA completion
- timer overflow
- interrupt return
- a specific PC reaching a specific function
- a known synchronization register or bus event

This matters more on systems with multiple CPUs or independent devices.

## Use always-on traces

Prefer ring buffers and history queries that were recording before the bug happened.

The best workflow is: run the game, see a bug, then ask what happened before it.

Arming a trace and rerunning can change timing. It can also miss intermittent failures.

## Treat dispatch misses as blocking

A dispatch miss means the runtime tried to call code that was not generated.

That can skip a whole subroutine without crashing. Resolve dispatch misses before chasing graphics, audio, or gameplay symptoms.

## Build the missing tool

If the debug server cannot answer the question, add the query when that is reasonable.

Do not use a private print or one-off script as the only proof. The next person should be able to ask the same question.

## Unknown is allowed

Guessing is worse than saying "unknown."

If source material is stale, contradictory, or inaccessible, the agent should state the limit and continue from evidence it can check.

## Prove the change

A good recomp change leaves proof:

- build output
- test output
- dispatch-miss status
- coverage status
- oracle comparison
- screenshot or frame capture
- trace or TCP result

The proof must match the claim. Do not use a screenshot to prove timing. Do not use a compile to prove correctness.

## Do not commit private inputs

Never commit:

- game files
- retail BIOS files
- disc dumps
- private saves
- local generated junk
- large diagnostic output

Use hashes and small fixtures when a test needs identity.

## Keep identity gates strict

If the project expects one game revision, do not weaken the check so another dump passes.

Running the wrong revision through the right port creates real-looking bugs with the wrong root cause.

## Leave a clean handoff

The agent should end with:

- what changed
- what was tested
- what could not be tested
- what evidence supports the claim
- what remains unknown

Short and exact is better than polished and vague.
