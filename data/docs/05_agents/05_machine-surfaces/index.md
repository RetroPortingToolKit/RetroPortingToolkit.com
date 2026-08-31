---
title: "Debug surfaces agents can use"
summary: "The debug servers, logs, JSON outputs, traces, and scripts that make AI-assisted recomp work observable."
pageType: "reference"
tags: ["Agents", "Tooling", "Verification"]
updated: "2026-08-30"
---

An agent should not rely only on the game window.

Recomp projects often expose machine-readable surfaces: TCP debug servers, JSON reports, trace files, screenshots, input hooks, and test exit codes.

These surfaces let the agent observe the running game without guessing.

## Useful surfaces

| Surface | What it gives |
|---|---|
| TCP debug server | Live queries against a running build. |
| Screenshot or frame capture | Visual output for human or AI review. |
| Input commands | Basic menu navigation and simple actions. |
| Dispatch-miss artifact | Missing generated functions. |
| Coverage report | Static coverage, interpreter fallback, healed code, and similar status. |
| Trace ring | Recent hardware, memory, CPU, or renderer events. |
| JSON or JSONL output | Structured logs for scripts and diffs. |
| Exit codes | Pass, fail, or skip status for automation. |
| Ghidra MCP | Disassembly and annotations when static analysis is needed. |

Use the surface that answers the question. A visual screenshot does not prove a timing claim.

## TCP debug servers

TCP is a good fit for recomp work because clients restart constantly.

During development, the user may rebuild, relaunch, crash, and relaunch again. A simple TCP client can disconnect and reconnect cleanly. Heavier harnesses may handle repeated process restarts worse.

Most TCP servers use newline-delimited JSON:

- one request per line
- one response per line
- `ok: true` for success
- `ok: false` for failure

Older servers do not all spell errors the same way. A client should handle both `error` and `err`.

## What TCP can drive

TCP input is useful for:

- pressing Start or A
- moving through menus
- clearing dialogs
- walking in a straight line
- taking repeatable screenshots
- letting an AI compare visible output

It is not enough for intense gameplay, tight timing, or subtle player control unless the project has a precise input script system.

## Screenshots and frame capture

Prefer a capture path that represents what the player actually sees.

Some projects expose multiple capture modes. A raw framebuffer may miss a high-resolution renderer layer, post-processing, or final presentation.

If the visual claim is important, use the best capture path the project provides.

## Trace rings

Trace rings are strongest when they are always on.

The agent can run the game, see a bug, then ask what happened before it. That is better than arming a trace and hoping the same timing happens again.

Useful rings include:

- CPU history
- memory writes
- DMA events
- renderer events
- input events
- dispatch misses
- timing counters

Query the narrowest useful range. Huge dumps are slow and hard to read.

## JSON output

Structured output is for scripts and comparison tools.

Good JSON output has stable fields and small records. JSONL is useful for traces because each event is one line.

If a project adds a new machine-readable output, document:

- how to enable it
- where it writes
- whether it is always on
- what one record means
- whether it changes timing

## Exit codes

Scripts should return useful exit codes.

At minimum:

| Code | Meaning |
|---|---|
| `0` | Success. |
| non-zero | Failure. |
| `77` | Skipped when running under CTest. |

If a tool uses more detail, document it near the tool. Do not make another project guess.

## Ghidra MCP

Use Ghidra when the question requires disassembly or data structure work.

Prefer the configured headless MCP workflow for these projects. Do not launch the GUI just to inspect a function.

Ghidra is not runtime proof. It can explain what the original code should do. The agent still needs to prove the recompiled build does it.

## When a surface is missing

If a project lacks the query the agent needs, add it to the debug surface when that is reasonable.

Do not hide one-off evidence in a private script or a console print that disappears after the session. The next person should be able to ask the same question.
