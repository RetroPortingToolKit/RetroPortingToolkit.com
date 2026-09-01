---
title: "TCP port registry"
summary: "How to avoid debug-server port collisions, move ports for a run, and keep restart-heavy TCP debugging reliable."
pageType: "reference"
draft: true
tags: ["Protocol", "Debugging", "Tooling", "Agents"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/smsggrecomp"
updated: "2026-08-30"
---

Debug servers usually listen on localhost.

The port number is chosen by the project. Some projects currently overlap.

That is fine until you run two at once. Then a client may connect to the wrong process and give you a false result.

This page is not trying to bless the current defaults. Long term, the projects should stop conflicting. Until then, treat ports as part of your run setup.

## Why does this matter?

A port collision can look like a real bug.

If an old server is still listening, your debug client may ask the wrong process for state. In co-simulation, that can create a fake divergence. The port did not disagree with the oracle. Your harness talked to the wrong thing.

Before a serious run, know which process owns each port.

## What is the native plus one pattern?

Many co-simulation setups use a pair of ports.

The native port listens on one number. The oracle listens on the next number.

This pattern is useful, but it is not globally reserved. Two projects can still choose the same pair.

So treat the pattern as a convenience, not a registry. Pick a pair for the run, make sure nothing else is listening there, and record what you used.

## How do I avoid collisions?

Use a clean routine:

1. pick the port pair for this run;
2. stop stale processes using that pair;
3. start the native runtime;
4. start the oracle, if needed;
5. `ping` both sides;
6. verify that each response identifies the process you expected.

Do this before reading a serious result.

## How do I move a port?

Most projects provide one of these:

| Method | Where it usually appears |
|---|---|
| `--debug-port N` | Runtime command line. |
| `--port N` | Runtime or oracle command line. |
| `debug.ini` | Beside the executable. |
| `game.toml` | Project runtime configuration. |
| Compile-time default | Framework source or CMake option. |

Prefer the command line for one-off debugging. It is obvious in logs and does not change project defaults.

If you change a default permanently, update the project docs and this registry together.

## Why not use MCP ports here?

This page is about game/debug TCP ports.

MCP servers are different tooling. For this workflow, TCP is usually preferred because the game process may restart often. A plain TCP client can reconnect to a fresh runtime without keeping a long-lived tool session alive.

Use MCP for tools that are meant to stay connected. Use TCP for restart-heavy runtime debugging.

## Quick checklist

Before a co-simulation or scripted debug run:

- close stale runtimes;
- choose non-conflicting ports;
- start exactly one native process per native port;
- start exactly one oracle process per oracle port;
- `ping` both;
- check that the response is from the expected project;
- record the ports in the run notes.
