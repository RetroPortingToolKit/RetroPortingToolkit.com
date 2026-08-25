---
title: "TCP port registry"
summary: "Which localhost port every debug server in this fleet listens on, which ports more than one project claims, how to move a port in each project, and what a second listener on the same port does to your results."
pageType: "reference"
tags: ["Protocol", "Debugging", "Tooling", "Agents"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/gcnlle"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/smsggrecomp"
updated: "2026-08-25"
---

Every debug server in this fleet listens on `127.0.0.1`. The port comes from whichever project the server belongs to, and each project chose on its own, so several picked the same number. Four projects claim port 4380. Two claim 19842.

Nothing breaks until you run two of them at once, and then the failure is quiet. A client cannot tell which process answered it. A second server left listening on a port is recorded as producing co-simulation differences that are not real. Below is the full list of ports, and what to do when two projects you need share one.

## The registry

Sorted by port. "What listens" names the process. On several ports that is a recompiled runtime in one project and a reference emulator, the [oracle](/docs/concepts/glossary), in another. [The TCP debug protocol](/docs/reference/tcp-protocol) covers what these servers answer once you connect.

| Port | Project | What listens | Documented in |
|---|---|---|---|
| 4370 | [psxrecomp](https://github.com/mstan/psxrecomp) | `psx-runtime`, the recompiled runtime | [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md), [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) |
| 4370 | [nesrecomp](https://github.com/mstan/nesrecomp) ports of Super Mario Bros., Dr. Mario, Faxanadu, The Legend of Zelda and Yoshi's Cookie | the native runner | [`TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md), and [`CLAUDE.md`](https://github.com/mstan/LegendOfZeldaNESRecomp/blob/master/CLAUDE.md) in LegendOfZeldaNESRecomp |
| 4370 | [gbrecompiled](https://github.com/mstan/gbrecompiled) | the native runtime. The PyBoy oracle is not given a TCP port in that document | [`README.md`](https://github.com/mstan/gbrecompiled/blob/master/README.md) |
| 4371 | psxrecomp | the DuckStation oracle. "Retired as the oracle on 2026-05-05 and is no longer built from this repository" | [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md) |
| 4371 | [SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp) | the Nestopia oracle | [`TCP.md`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/TCP.md) |
| 4372 | [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp) | the native runner | [`CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) |
| 4373 | Megaman3NESRecomp | the emulated runner | [`CLAUDE.md`](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md) |
| 4378 | [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) | the native runner, per the ports section of its debug document | [`DEBUG.md`](https://github.com/mstan/segagenesisrecomp/blob/master/DEBUG.md), [`runner/cmd_server.c`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/cmd_server.c) |
| 4379 | segagenesisrecomp | the oracle, per the same section | [`DEBUG.md`](https://github.com/mstan/segagenesisrecomp/blob/master/DEBUG.md) |
| 4380 | psxrecomp | `psx-beetle`, the Beetle PSX oracle | [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md), [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) |
| 4380 | [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp) | the native runner | [`TCP.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/TCP.md) |
| 4380 | [cdirecomp](https://github.com/mstan/cdirecomp) | the native runner | [`TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md), [`CLAUDE.md`](https://github.com/mstan/cdirecomp/blob/master/CLAUDE.md) |
| 4380 | segagenesisrecomp | the native runner, per the compiled-in default named in its boot smoke section | [`CLAUDE.md`](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md), [`DEBUG.md`](https://github.com/mstan/segagenesisrecomp/blob/master/DEBUG.md) |
| 4380 | [gcnlle](https://github.com/mstan/gcnlle) | `gcn_boot`, when `GCN_DEBUG_PORT` is set to this documented example value | [`docs/TCP_COMMANDS.md`](https://github.com/mstan/gcnlle/blob/master/docs/TCP_COMMANDS.md), [`tools/gcn_debug_client.py`](https://github.com/mstan/gcnlle/blob/master/tools/gcn_debug_client.py) |
| 4381 | YoshiNESRecomp | the Nestopia oracle | [`TCP.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/TCP.md) |
| 4381 | cdirecomp | the CeDImu oracle | [`TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md) |
| 4381 | segagenesisrecomp | the oracle, per the compiled-in default | [`DEBUG.md`](https://github.com/mstan/segagenesisrecomp/blob/master/DEBUG.md) |
| 4390 | [vbrecomp](https://github.com/mstan/vbrecomp) | `vb-runtime.exe` | [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md), [`CLAUDE.md`](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) |
| 4390 | [smsggrecomp](https://github.com/mstan/smsggrecomp) | the runner's command server | [`CLAUDE.md`](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md) |
| 4391 | vbrecomp | `vb-beetle.exe`, the Beetle VB oracle | [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md) |
| 5370 | nesrecomp port of Metroid | the native runner | [`TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md) |
| 19842 | [gbarecomp](https://github.com/mstan/gbarecomp) | the native runtime | [`TCP.md`](https://github.com/mstan/gbarecomp/blob/main/TCP.md), [`CLAUDE.md`](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) |
| 19842 | [ndsrecomp](https://github.com/mstan/ndsrecomp) | `nds_runner`, in both `--serve` and `--interactive` modes | [`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md) |
| 19843 | gbarecomp | the mGBA oracle | [`TCP.md`](https://github.com/mstan/gbarecomp/blob/main/TCP.md) |
| 19843 | ndsrecomp | the melonDS oracle, "one above native" | [`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md) |
| 19844 | gbarecomp | the NanoBoyAdvance oracle | [`TCP.md`](https://github.com/mstan/gbarecomp/blob/main/TCP.md) |
| 19872 | [RubySapphireRecomp](https://github.com/mstan/RubySapphireRecomp) | Ruby | [`CLAUDE.md`](https://github.com/mstan/RubySapphireRecomp/blob/main/CLAUDE.md) |
| 19882 | RubySapphireRecomp | Sapphire | [`CLAUDE.md`](https://github.com/mstan/RubySapphireRecomp/blob/main/CLAUDE.md) |
| 19887 | [DragonBallZLegacyOfGokuRecomp](https://github.com/mstan/DragonBallZLegacyOfGokuRecomp) | the native runtime | [`CLAUDE.md`](https://github.com/mstan/DragonBallZLegacyOfGokuRecomp/blob/main/CLAUDE.md) |
| 19888 | [DragonBallZLegacyofGokuIIRecomp](https://github.com/mstan/DragonBallZLegacyofGokuIIRecomp) | the native runtime | [`CLAUDE.md`](https://github.com/mstan/DragonBallZLegacyofGokuIIRecomp/blob/main/CLAUDE.md) |
| 19889 | [DragonBallZBuusFuryRecomp](https://github.com/mstan/DragonBallZBuusFuryRecomp) | the native runtime | [`CLAUDE.md`](https://github.com/mstan/DragonBallZBuusFuryRecomp/blob/main/CLAUDE.md) |
| 19892 | [EmeraldRecomp](https://github.com/mstan/EmeraldRecomp) | the native runtime | [`CLAUDE.md`](https://github.com/mstan/EmeraldRecomp/blob/main/CLAUDE.md) |
| Not fixed | gcnlle | Dolphin, on whatever `GCN_TRACE_TCP_PORT` is set to. No default is documented | [`docs/TCP_COMMANDS.md`](https://github.com/mstan/gcnlle/blob/master/docs/TCP_COMMANDS.md) |
| Not fixed | smsggrecomp | `--port <N>`, off by default. Its debug document has not chosen an oracle port | [`DEBUG.md`](https://github.com/mstan/smsggrecomp/blob/main/DEBUG.md) |

## Where ports collide

### Port 4380

Four projects claim it, and one more names it as its example value.

| Claimant | What it is |
|---|---|
| psxrecomp | `psx-beetle`, the Beetle PSX oracle |
| YoshiNESRecomp | the native runner |
| cdirecomp | the native runner |
| segagenesisrecomp | the native runner, per its compiled-in default |
| gcnlle | the documented example value for `GCN_DEBUG_PORT`, and the default in its own client script |

The clash you will hit is psxrecomp against one of the three native runners. A PlayStation co-simulation session already holds 4380 for its oracle, so starting cdirecomp, segagenesisrecomp or Yoshi without moving a port puts two servers on one number. From outside, only `ping` tells you which one you reached: psxrecomp returns a frame number, cdirecomp returns `{ok,pong}`.

### Port 4370

psxrecomp's `psx-runtime` shares it with five nesrecomp game ports, Super Mario Bros., Dr. Mario, Faxanadu, The Legend of Zelda and Yoshi's Cookie, and with gbrecompiled. Same problem: any two of those at once collide.

### Ports 19842 and 19843

gbarecomp and ndsrecomp use the same pair: native on 19842, oracle on 19843. Nintendo DS work hits this one most often, because a Game Boy Advance session and a DS session are both easy to have open at the same time.

### Ports 4371 and 4381

The `+1` numbers have the same collisions as the ports below them. 4381 is the Nestopia oracle for Yoshi, the CeDImu oracle for CD-i and segagenesisrecomp's oracle. 4371 is both psxrecomp's retired DuckStation oracle and Super Mario Bros.' Nestopia oracle.

### Port 4390

vbrecomp's `vb-runtime` and smsggrecomp's runner. This one is least likely to bite you. smsggrecomp's server does not start unless you pass `--port <N>`, and its own document calls the whole surface intended rather than shipped. Both repositories still claim the number.

### Where a project's own documents disagree

Two projects give two different ports for themselves. This page cannot settle it for you.

| Project | The disagreement |
|---|---|
| segagenesisrecomp | The ports section of `DEBUG.md` gives native 4378 and oracle 4379. The boot smoke section of the same document gives "compiled-in default port: native=4380, oracle=4381", and `CLAUDE.md` gives 4380. Check `DEFAULT_DEBUG_PORT` in `runner/cmd_server.c` for the build you have, or pass `--port N` and stop guessing |
| smsggrecomp | `CLAUDE.md` names 4390. `DEBUG.md` says the server is opened by `--port <N>` and is off by default, and no oracle port has been chosen. `DEBUG.md` also flags its whole server section as the intended surface rather than shipped behaviour |

### The native plus one convention

The fleet has one rule for choosing an oracle port. gbarecomp's `TCP.md` states it as "Convention: native odd port + 1 = oracle port. Same as in nesrecomp and snesrecomp." ndsrecomp states the same idea as "Oracle (melonDS): `127.0.0.1:19843` (one above native)".

The `+1` half holds across the whole table above. The "odd port" half does not: 19842, 4370, 4380 and 4390 are all even. Use the arithmetic and ignore the odd and even part.

## Running two of these at once

### Move the port, do not move the process

Every project documents a way to change its port. Use it instead of closing the session you already have running.

| Project | How to change the port |
|---|---|
| psxrecomp | `--debug-port <n>` on the runtime, or `[runtime] debug_port` in the game's TOML. The compile-time default is `DEFAULT_DEBUG_PORT`, 4370 |
| nesrecomp and its game ports | `debug.ini` in the same directory as the game executable, or the game's own debug-mode CLI flag |
| gbarecomp | `debug.ini` next to the executable |
| ndsrecomp | `--port N` on `nds_runner`, default 19842. `debug.ini` is named as the configuration path |
| vbrecomp | `--port N`, or `debug.ini` keys `runtime.debug_port` and `oracle.debug_port`, or `[runtime] debug_port` and `[runtime] oracle_port` in the game TOML |
| segagenesisrecomp | Precedence is `--port N`, then `port=N` in `debug.ini`, then the `DEFAULT_DEBUG_PORT` macro |
| gcnlle | The `GCN_DEBUG_PORT` environment variable. With it unset "the rings still record, there is just no query surface" |
| smsggrecomp | `--port <N>`. The server does not start without it |

vbrecomp's example configuration sets both halves of a pair in one file. Verbatim, from [`debug.ini.example`](https://github.com/mstan/MarioTennisVirtualBoyRecomp/blob/master/debug.ini.example) in MarioTennisVirtualBoyRecomp:

```ini title="debug.ini.example"
[runtime]
debug_port = 4390
window_title = "vbrecomp - runtime"

[oracle]
debug_port = 4391
window_title = "vbrecomp - Beetle VB oracle"

[debug]
; Always-on ring sizes. 36000 frames @ 50.27 Hz = ~12 min coverage.
frame_ring_size  = 36000
fntrace_ring_size = 1048576
wtrace_ring_size  = 1048576
; [snip] the file continues with stub_abort_fatal, which is not a port setting
```

> **Note.** ndsrecomp and vbrecomp both name `debug.ini` as the per-build port configuration. No parser for it was found in their tracked runtime sources. If a `debug.ini` port setting has no effect, use the command line flag.

### One listener per port, one client per listener

Two rules, both easy to break.

Every server takes **one client at a time**. A second connection is not a second session.

**Two listeners on one port invent divergences instead of raising an error.** ndsrecomp's issue log records it. With more than one listener on 19842 or 19843, a stale server answers your probes, and a co-simulation run reports differences that do not exist. Its fix is a routine: kill by port before any probe, keep exactly one process per port, and start a fresh server pair for each scenario. That holds for every project in the table above.

psxrecomp's `tools/debug_client.py` exits 1 when the connection is refused, so a script can check whether anything is listening. [Errors and exit codes](/docs/reference/errors-and-exit-codes) has the rest.

### Do not renumber quietly

nesrecomp's `TCP.md` states the rule for the whole fleet: "Do not change a project's ports without updating sibling docs". Those sibling documents live in separate repositories, so it is a manual edit in each one. If you move a port for good rather than for one session, update that project's document and this page together.

## Other localhost ports in the fleet

These are not debug servers, but they take localhost ports on the same machine. Four repositories carry an `.mcp.json`, each declaring a Ghidra server over SSE on a different port. [Machine-readable surfaces](/docs/agents/machine-surfaces) covers what those servers are for.

| Port | Project | What listens |
|---|---|---|
| 7777 | psxrecomp | Ghidra over SSE at `http://localhost:7777/sse`, declared twice, as `ghidra` and `ghidra_psx` |
| 2222 | ndsrecomp | Ghidra over SSE. Its plan notes that the server "requires a program open in CodeBrowser to expose its tools" |
| 4000 | gbrecompiled | Ghidra over SSE |
| 8078 | [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp) | Ghidra over SSE, declared as `ghidra_smw` |

Several repositories require a reachable Ghidra MCP server but ship no `.mcp.json`, among them nesrecomp, Megaman3NESRecomp and YoshiNESRecomp. An agent working in one of those has no configured server to reach.

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md), [`CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md), [`runtime/runtime.cmake`](https://github.com/mstan/psxrecomp/blob/master/runtime/runtime.cmake), [`.mcp.json`](https://github.com/mstan/psxrecomp/blob/master/.mcp.json).
- [nesrecomp](https://github.com/mstan/nesrecomp): [`TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md), which carries the per-game port list and the renumbering rule. Game ports: [SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/TCP.md), [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp/blob/master/TCP.md), [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp/blob/master/CLAUDE.md), [LegendOfZeldaNESRecomp](https://github.com/mstan/LegendOfZeldaNESRecomp/blob/master/CLAUDE.md).
- [gbarecomp](https://github.com/mstan/gbarecomp): [`TCP.md`](https://github.com/mstan/gbarecomp/blob/main/TCP.md). [ndsrecomp](https://github.com/mstan/ndsrecomp): [`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md), [`ISSUES.md`](https://github.com/mstan/ndsrecomp/blob/main/ISSUES.md), [`.mcp.json`](https://github.com/mstan/ndsrecomp/blob/main/.mcp.json).
- [vbrecomp](https://github.com/mstan/vbrecomp): [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md), and [`debug.ini.example`](https://github.com/mstan/MarioTennisVirtualBoyRecomp/blob/master/debug.ini.example) in MarioTennisVirtualBoyRecomp.
- [cdirecomp](https://github.com/mstan/cdirecomp): [`TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md). [gcnlle](https://github.com/mstan/gcnlle): [`docs/TCP_COMMANDS.md`](https://github.com/mstan/gcnlle/blob/master/docs/TCP_COMMANDS.md).
- [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp): [`DEBUG.md`](https://github.com/mstan/segagenesisrecomp/blob/master/DEBUG.md) and [`runner/cmd_server.c`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/cmd_server.c). [smsggrecomp](https://github.com/mstan/smsggrecomp): [`DEBUG.md`](https://github.com/mstan/smsggrecomp/blob/main/DEBUG.md). [gbrecompiled](https://github.com/mstan/gbrecompiled): [`README.md`](https://github.com/mstan/gbrecompiled/blob/master/README.md).
- Game repositories with their own ports: [RubySapphireRecomp](https://github.com/mstan/RubySapphireRecomp), [DragonBallZLegacyOfGokuRecomp](https://github.com/mstan/DragonBallZLegacyOfGokuRecomp), [DragonBallZLegacyofGokuIIRecomp](https://github.com/mstan/DragonBallZLegacyofGokuIIRecomp), [DragonBallZBuusFuryRecomp](https://github.com/mstan/DragonBallZBuusFuryRecomp), [EmeraldRecomp](https://github.com/mstan/EmeraldRecomp), each in its own `CLAUDE.md`.

## Next

- [TCP debug protocol](/docs/reference/tcp-protocol), for what to send once you have the right port.
- [Debug a divergence](/docs/guides/debug-a-divergence), where you run a native process and an oracle process together.
- [PlayStation](/docs/platforms/playstation) and [Nintendo DS](/docs/platforms/nintendo-ds), the two toolchains whose ports collide with the most others.
- [If you are an agent, start here](/docs/agents/start-here), if you came here to drive one of these servers.
