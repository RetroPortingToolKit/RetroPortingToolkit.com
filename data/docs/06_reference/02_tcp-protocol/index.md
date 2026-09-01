---
title: "TCP debug protocol"
summary: "How debug clients talk to running ports: one localhost TCP socket, one JSON command per line, and simple commands for state, screenshots, input, and comparison."
pageType: "reference"
tags: ["Protocol", "Debugging", "Agents", "Tooling"]
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

Most mature ports expose a small TCP debug server.

A tool connects to `127.0.0.1`, sends one command, and reads one response. The command can ask for registers, memory, screenshots, input state, timing, or recent trace data.

This is a development surface. It is not meant to be a polished player feature.

## Why TCP?

TCP is boring, and that is the point.

Debug work restarts processes constantly. Ports crash. Oracles restart. Harnesses launch new pairs over and over.

A plain TCP client can reconnect after each restart. A longer-lived tool session, such as MCP, is more likely to be confused by a process disappearing underneath it.

For these harnesses, TCP is usually the more reliable choice.

## What does a request look like?

The common shape is one JSON object per line:

```json
{"cmd":"ping"}
```

A response is also one JSON object:

```json
{"ok":true}
```

Many commands take extra fields:

```json
{"cmd":"read_ram","addr":4096,"len":32}
```

Some older servers also accept a bare word like `ping`. Prefer JSON for anything with arguments.

## What should a client expect?

Expect these rules unless a project says otherwise:

| Rule | What it means |
|---|---|
| Localhost only | The server listens on `127.0.0.1`. |
| One line in, one line out | Newline framing keeps clients simple. |
| One client at a time | A second client may fail or steal the session. |
| Not sub-frame | Most servers are pumped once per frame or from the main loop. |
| JSON success flag | Read `ok` before trusting any other field. |
| Two error spellings | Some servers return `error`; others return `err`. Handle both. |

Do not assume every command exists everywhere. Each console has its own hardware, so each server grows its own command set.

## What are the common commands?

Common command families are:

| Family | Examples |
|---|---|
| Heartbeat | `ping`, `status`, `frame` |
| CPU state | `get_registers`, `regs` |
| Memory | `read_ram`, `read_mem`, `read_region` |
| Video | `screenshot`, `framebuffer`, `read_vram` |
| Input | `set_input`, `press`, `clear_input`, `keys`, `touch` |
| History | `history`, `get_frame`, `frame_range`, trace rings |
| Comparison | `state_hash`, `frame_diff`, `memory_diff`, subsystem diffs |
| Missed code | `dispatch_miss_info`, dispatch-miss logs |
| Control | `pause`, `continue`, `step`, `run_to_frame`, `quit` |

The names are not perfectly consistent. Treat this table as a vocabulary guide, not a promise that every command exists on every platform.

## How does input help?

TCP input is useful for simple, repeatable actions.

An AI or script can:

- press Start on a title screen;
- move through menus;
- hold a direction for a few frames;
- capture screenshots before and after an action;
- verify that a basic screen transition happened.

It is not a replacement for real playtesting. Tight platforming, combat, rhythm, and timing-sensitive gameplay still need a person or a purpose-built input script.

## How does this help co-simulation?

Co-simulation needs two machines to answer the same questions.

One process is the port. The other is the reference. The coordinator asks both for state at the same guest-time checkpoint and compares the answers.

The two servers do not need every command in the world. They need matching commands for the state the harness compares.

See [Set up co-simulation](/docs/guides/set-up-co-simulation).

## What should not go through TCP?

Avoid using TCP as a dumping ground.

If a response is huge, write it to a file and return the filename. Large socket responses can stall the main loop and create fake performance problems.

Also keep observer effects out of recorded guest state. A debug read should not appear as if the game itself touched memory.

## What if a command is missing?

Add the tool surface you need.

Do not work around missing visibility by adding one-off print statements everywhere. A repeated debugging question deserves a real command.

When adding a command, keep it small:

1. add the handler;
2. register the command;
3. mirror it on the oracle if co-simulation needs it;
4. document the request and response shape;
5. rebuild and test the debug path.
