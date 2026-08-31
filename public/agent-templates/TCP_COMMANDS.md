# TCP_COMMANDS.md

This file documents the debug TCP protocol for this recomp project.

If the project uses `TCP.md` instead, rename this file.

## Connection

- host: `127.0.0.1`
- native port:
- oracle/reference port, if any:
- one client at a time:
- enabled by:

## Framing

Requests are newline-delimited JSON:

```json
{"id":1,"cmd":"ping"}
```

Responses are newline-delimited JSON:

```json
{"id":1,"ok":true}
```

Failure responses use:

```json
{"id":1,"ok":false,"error":"message"}
```

If this project uses `err` instead of `error`, document that here and keep clients compatible with both.

## Core Commands

| Command | Purpose | Example |
|---|---|---|
| `ping` | Check that the server is alive. | `{"id":1,"cmd":"ping"}` |
| `get_registers` | Read CPU registers. |  |
| `read_ram` | Read memory. |  |
| `write_ram` | Write memory, if supported. |  |
| `screenshot` | Capture visible output. |  |
| `set_input` | Set basic input. |  |
| `clear_input` | Release input. |  |
| `dispatch_miss_info` | Report missing generated functions. |  |

Delete commands the project does not support. Add system-specific commands below.

## System-Specific Commands

| Command | Purpose | Example |
|---|---|---|
|  |  |  |

## Input Notes

TCP input is useful for menus, simple actions, and repeatable screenshots.

It is not a replacement for skilled gameplay testing unless the project has a precise input script system.

## Timing Notes

Document whether TCP commands are polled once per frame, once per tick, or by another schedule.

If commands can affect timing, say so here.
