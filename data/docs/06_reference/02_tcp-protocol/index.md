---
title: "TCP debug protocol"
summary: "The wire specification for the debug servers this fleet runs: framing and envelopes, both accepted spellings of the error key, the 26 command core set with arguments and responses, per-console extensions, and where a repository's protocol document disagrees with its own code."
section: "reference"
sectionTitle: "Reference"
pageType: "reference"
tags: ["Protocol", "Debugging", "Agents", "Tooling"]
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
updated: "2026-08-23"
---

Ten projects in this fleet are documented as running a debug server. You open a TCP socket to localhost, write one JSON object per line, and read one JSON line back carrying registers, memory, video, input state or the contents of a ring buffer. Nine repositories ship a document describing that server, each written in its own words, and none of them is a specification. This page is the specification those documents add up to: one wire format, one core command set, per-console extensions marked as extensions, and both spellings of the error key recorded as valid, because a client that works across the fleet has to accept both.

## What this page is, and what it is not

The transport is genuinely shared. Every one of the nine documents that specifies it specifies the same thing, and one of them says where it got it: [gcnlle](https://github.com/mstan/gcnlle)'s [`docs/TCP_COMMANDS.md`](https://github.com/mstan/gcnlle/blob/master/docs/TCP_COMMANDS.md) states that it "mirrors psxrecomp's `debug_server.c` (JSON-over-newline), sized to gcnrecomp", and [vbrecomp](https://github.com/mstan/vbrecomp)'s [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md) says it was "Adapted from `recomp-template/NES/TCP.md` with V810 / VB specifics."

What diverges is the command set, and it diverges by console rather than by whim: a Virtual Boy server answers `vip_state` because the Virtual Boy has a VIP. Treat the core set below as portable and everything under [per-console extensions](#per-console-extensions) as something to check before you depend on it. If you are an agent about to drive one of these servers rather than to read about it, [if you are an agent, start here](/docs/agents/start-here) covers when you are meant to.

> **Note.** Where a repository's protocol document and its dispatch table disagree, trust the dispatch table. The document is what someone meant to ship; the dispatch table is what will answer. [Where documents disagree with code](#where-documents-disagree-with-code) records every case found.

## The wire format

### Transport

| Property | Value |
|---|---|
| Address | TCP on `127.0.0.1`. gcnlle states the bind is localhost only |
| Concurrency | One client at a time |
| Framing | Line based. One request per line terminated by `\n`, one JSON response line back, terminated by `\n` |
| Encoding | JSON, one object per line. A bare command word is also accepted for the simplest commands |
| Maximum request line | 8192 bytes, which is `RECV_BUF_SIZE` in nesrecomp's `debug_server.c` |
| Service model | Single-threaded, non-blocking, polled once per frame. psxrecomp polls once per vblank, nesrecomp once per NES frame, segagenesisrecomp each frame with a non-blocking `recv()` |
| Latency | Do not expect sub-frame latency. ndsrecomp is the exception for one command: `ping` is answered on the I/O thread even while a frame is in flight |
| Session | The connection stays open. Responses come back on the same connection |

The clearest single statement of the rules is nesrecomp's, and the other documents restate it. From [`TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md) in nesrecomp:

```text
- TCP over `127.0.0.1`
- Single-threaded, non-blocking, polled once per NES frame on the runner
  side. Do not expect sub-frame latency.
- Line-based: send one command per line, terminated by `\n`. Receive one
  JSON response per line, terminated by `\n`.
- Two request encodings are accepted:
  - **JSON** (preferred): `{"cmd":"read_ppu","addr":"3F00","len":32,"id":7}`
  - **Bare**: `ping\n` — only for the simplest commands
- Responses are always single-line JSON: `{"ok":true,...}` or
  `{"ok":false,"err":"..."}`. The `id` field is echoed when supplied.
- Max command line: **8192 bytes** (`RECV_BUF_SIZE` in `debug_server.c`).
- Only one client at a time.
```

### Request and response envelopes

[psxrecomp](https://github.com/mstan/psxrecomp) states the three shapes most compactly, and gcnlle copies them verbatim. From [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md) in psxrecomp:

```text
Protocol: **JSON over newline**, one object per line, responses on same connection.

- Request shape: `{"id": N, "cmd": "<command>", ...params}`
- Success: `{"id": N, "ok": true, ...data}`
- Failure: `{"id": N, "ok": false, "error": "<msg>"}`
```

| Field | Where | Required | Meaning |
|---|---|---|---|
| `cmd` | request | Yes | The command name, matched by exact string compare |
| `id` | request | No | Correlation value. Echoed in the response when supplied |
| other keys | request | Per command | Command arguments, as named in the tables below |
| `ok` | response | Yes | `true` or `false`. Read this first, always |
| `err` or `error` | response | On failure | The message. Both spellings are in use, see below |
| other keys | response | Per command | The returned data, flattened into the response object rather than nested |

The bare form is the same request with no JSON wrapper: send `ping\n` and the server matches the whole line as a command name. It carries no arguments and no `id`, so use it only for heartbeats and one-word queries.

### Both error key spellings

This is the one place the transport genuinely differs, and it is documented nowhere in the fleet. A client that works across every project must accept both.

| Lineage | Failure envelope | Stated in |
|---|---|---|
| NES | `{"ok":false,"err":"..."}` | [`TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md) in nesrecomp, [`TCP.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/TCP.md) in YoshiNESRecomp |
| PlayStation, Game Boy Advance, Virtual Boy, CD-i, GameCube | `{"id": N, "ok": false, "error": "<msg>"}` | [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md) in psxrecomp, [`TCP.md`](https://github.com/mstan/gbarecomp/blob/main/TCP.md) in gbarecomp, [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md) in vbrecomp, [`TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md) in cdirecomp, [`docs/TCP_COMMANDS.md`](https://github.com/mstan/gcnlle/blob/master/docs/TCP_COMMANDS.md) in gcnlle |

The rule for a portable client: branch on `ok`, then read whichever of `err` and `error` is present. Never key your failure path on the presence of `error` alone, because half the fleet will look like a success to you.

### Unknown commands, budgets and observer safety

| Rule | Detail | Project |
|---|---|---|
| Unknown command | Names are matched against a NULL terminated `CmdEntry` table by exact string compare. An unmatched name returns `{"ok": false, "error": "unknown command"}` | psxrecomp, `runtime/src/debug_server.c` |
| Response budget | Inline responses are bounded to 2 seconds per zero-progress chunk and 15 seconds total. A client that exceeds the budget is disconnected | psxrecomp |
| Large responses | Anything bigger than the budget allows must use a `*_dump_file` variant, which writes to disk instead of the socket | psxrecomp |
| Client backpressure | The server is pumped on the main thread, so a slow client draining a large dump throttles the emulator. Cumulative stall is exported as `tcp_send_stall_ms` and `tcp_clients_dropped` in `psx_freeze_heartbeat.json` | psxrecomp |
| Observer safety | The whole handler runs with lockstep memory recording suppressed, so a diagnostic `read_ram` cannot appear in a recorded trace as a phantom guest operation. It is `ls_suppress_begin()` and `ls_suppress_end()` around every handler, centrally, and per-handler suppression must not be added | psxrecomp, `runtime/src/debug_server.c` |

Every rule in that table is stated by psxrecomp and by no other project's document. The rest of the fleet has published no unknown command shape, no response budget and no observer safety rule, so do not assume one.

## The core command set

These 26 commands are the portable subset: the ones that appear with the same name and the same meaning across projects rather than in one. The "documented in" column is the real answer for each, and it is not uniform. `watch` and `unwatch` are core in shape but appear in only two documents. If a command is missing from a project below, it is missing because that project's document does not list it, not because it was left out here.

| Command | Arguments | Response | Documented in | Notes |
|---|---|---|---|---|
| `ping` | none | Heartbeat. psxrecomp adds the current frame number, ndsrecomp returns `{"pong":true}`, cdirecomp `{ok,pong}`, gcnlle `{block, pc}`, gbarecomp's implementation returns `{"ok":true,"who":"gbarecomp_native"}` | psx, nes, gba, nds, cdi, vb, gcn, genesis, smsgg | The only command every server answers. Use it to prove the port is live before anything else |
| `frame` | none | Current frame number. nesrecomp adds the last executed function name | psx, nes, gba, vb, gcn | Alias of `ping` on gcnlle |
| `get_registers` | none | The full CPU register file, contents per architecture | psx, nes, gba, cdi, vb, gcn, genesis | Alias `regs`. psxrecomp returns 32 GPRs plus PC, HI and LO, and on native also COP0 SR/Cause/EPC, I_STAT and I_MASK. nesrecomp returns A, X, Y, S, P, flags, current bank and frame. cdirecomp returns `{ok,pc,sr,usp,d0..d7,a0..a7}`. ndsrecomp takes a `cpu` argument, 9 or 7 |
| `read_ram` | `addr`, `len` | Bytes as a hex string | psx, nes, vb, gcn, genesis | psxrecomp will return up to the full 2 MB in one response line; gcnlle caps at 64 KB. ndsrecomp and cdirecomp spell it `read_mem` |
| `dump_ram` | `addr`, `len` | Same as `read_ram` | psx, nes, vb, gcn | An alias on psxrecomp and gcnlle. On nesrecomp it is a bulk dump capped at 8192 bytes |
| `write_ram` | psxrecomp `addr`, `val`; gcnlle `addr`, `hex` | ok | psx, nes, vb, gcn | The argument names differ and so does the width: psxrecomp writes exactly one byte and the parameter is `val`, not `hex`. cdirecomp lists `write_mem` as planned, not live |
| `read_frame_ram` | `addr`, `len`, `frame` | RAM as of one ring buffer frame | psx, nes, vb | gbarecomp splits it per region: `read_frame_iwram`, `read_frame_ewram`, `read_frame_vram`, `read_frame_io` |
| `history` | none | Ring buffer stats, including how many frames are available | psx, nes, gba, vb | |
| `get_frame` | `frame` | The full frame record from the ring | psx, nes, gba, vb, genesis | Planned but not live on cdirecomp |
| `frame_range` | `start`, `end` | Frame records over a range | psx, nes, gba, vb, genesis | Maximum 200 frames on psxrecomp. segagenesisrecomp takes positional `<lo> <hi>` |
| `frame_timeseries` | `start`, `end`; segagenesisrecomp `<field> <lo> <hi>` | A compact timeseries | psx, nes, gba, vb, genesis | Maximum 200 frames on psxrecomp |
| `first_failure` | none | The first frame where verify mode diverged | psx, nes, gba | vbrecomp documents `first_divergence` for the same job. cdirecomp lists `first_divergence` as planned |
| `frame_diff` | one frame, or two | Verify diffs, or a two frame comparison of RAM, nametable, palette and OAM | nes, gba, vb | |
| `memory_diff` | `region`, one of `ram`, `nt`, `pal`, `oam`, `all` | Current state against a historical frame | nes, gba, vb | |
| `set_input` | psxrecomp `buttons`, optional `frames`, `lx`, `ly`, `rx`, `ry`; gcnlle `buttons`, `stick_x`, `stick_y`, `substick_x`, `substick_y`, `trigger_l`, `trigger_r`, `reset`; cdirecomp `mask[,dx,dy]` | Echoes the resulting state | psx, nes, gba, vb, gcn, cdi | Bit layouts are per console and not interchangeable. The PS1 mask is inverted, 0 means pressed. ndsrecomp uses `keys` with a `mask` and `touch` with `x`, `y`, `down` |
| `press` | buttons, frame count | ok | psx, nes, gba, vb | nesrecomp holds for 2 frames by default |
| `clear_input` | none | Removes input and analog axis overrides | psx, nes, gba, vb | |
| `screenshot` | optional `path` | psxrecomp writes a PNG of the current display, default `psx_screenshot.png` in the runtime working directory, and answers with one metadata line `{path,width,height}`. gcnlle decodes the XFB to PPM at `_work/screenshot.ppm` and answers `{path, width, height, xfb_addr, mean_luma}` | psx, nes, gba, vb, gcn, smsgg | Alias `screenshot_file`. The format is not uniform: PNG on NES where "BMP is prohibited", PPM on Game Boy, client-side BMP or PPM on CD-i. ndsrecomp returns pixels instead, through `framebuffer` |
| `watch` | `addr` | Byte level memory watchpoint, fires per frame on change | psx, genesis | Yoshi's NES port documents its own `watch`, `follow` and `follow_history` |
| `unwatch` | `addr` | Removes a watchpoint | psx, genesis | |
| `dispatch_miss_info` | none | Count plus a ring of `call_by_address` misses | nes, gba, vb, cdi | smsggrecomp spells it `dispatch_misses`. ndsrecomp has no command: it appends to `dispatch_misses.log` next to the runner. cdirecomp's oracle always answers 0, because an interpreter never misses |
| `pause` | none | Freeze execution | nes, gba, vb, genesis, cdi; psx (removed) | See the warning below |
| `continue` | none | Resume | nes, gba, vb; psx (removed); cdi planned | segagenesisrecomp has `run_frames N` instead |
| `step` | none, or a count | Single step | nes, gba, vb; psx (removed) | |
| `run_to_frame` | a frame number | Run until a frame | nes, gba, vb; psx (removed) | gbarecomp also has `run_to_pc`, `run_to_vblank` and `run_to_swi`; ndsrecomp has `run_to_event` |
| `quit` | none | Shut the runtime down cleanly | psx, nes, gba, vb, cdi, gcn, smsgg | cdirecomp answers `{ok,bye}` and closes the connection |

> **Warning.** Execution control is the one core group whose status differs by project. psxrecomp marks `pause`, `continue`, `step` and `run_to_frame` as "**REMOVED** -- still registered, but always returns an error", and names the replacement: query a ring buffer such as `fn_entry_tail`, `wtrace_dump` or `gpu_frame_dump`, or use `frame_range` and `read_frame_ram` against the live frame ring. ndsrecomp returns an error for `run_to_*` in play mode only, because "the frontend owns execution"; use `--serve` for command-driven execution. Every other server still documents all four as working, and several repositories forbid pausing on principle.

### Turning a server on

Most servers are not always listening.

| Project | How it is enabled |
|---|---|
| psxrecomp | The `PSX_DEBUG_TOOLS` build option, ON for Debug and RelWithDebInfo, OFF for Release. `--debug-port <n>` overrides the port |
| nesrecomp | A `debug.ini` file in the same directory as the game executable, or a game-specific CLI flag that enables debug mode |
| gbarecomp | Whenever `debug.ini` is present, or the `--verify` or `--oracle` flags are set, including in Release builds |
| ndsrecomp | `debug.ini`, plus `--serve` for the headless surface or `--interactive` for play mode |
| vbrecomp | `debug.ini` keys `runtime.debug_port` and `oracle.debug_port`, or `--port N` |
| segagenesisrecomp | `debug.ini` next to the executable. Precedence is `--port N`, then `port=N` in `debug.ini`, then the `DEFAULT_DEBUG_PORT` macro |
| gcnlle | Set `GCN_DEBUG_PORT`. "When unset, the rings still record, there is just no query surface" |
| smsggrecomp | `--port <N>`, off by default |
| cdirecomp | Per build |
| gbrecompiled | Not stated |

nesrecomp adds one environment variable worth knowing for boot work: `NESRECOMP_START_PAUSED=1` stops the runner at its first stable frame boundary so a client can inspect startup state before resuming.

## Per-console extensions

Everything below is an extension, not part of the core. Divergence here is hardware specific querying, which is the honest reason to open a project's own document rather than working from this page alone.

### PlayStation

[psxrecomp](https://github.com/mstan/psxrecomp), whose toolchain is described on the [PlayStation](/docs/platforms/playstation) page, has by far the largest surface: **292 commands registered, 279 on the native server and 61 on the Beetle oracle**, of which 47 have prose and 245 are index-only. "An index-only command still works, it just has no description here yet." The full alphabetical index is generated by `python tools/gen_tcp_commands.py`, and `--check` fails when it drifts.

| Group | Commands |
|---|---|
| Hardware state | `gpu_state`, `sio_state`, `irq_state`, `dma_state`, `event_state`, `overlay_state`, `gte_state`, `mdec_state` |
| Video | `read_vram` (native legacy name `vram_peek`, arguments `x`, `y`, `w`, `h`, maximum 128x128), `screenshot_hires`, `geom_correction`, `gp1_dump`, `gpu_frame_dump` |
| CD-ROM | `cdrom_sector_dump`, `cdrom_sector_history`, `cdrom_sector_history_clear` |
| Write and MMIO tracing | `wtrace_range`, `wtrace_dump`, `wtrace_clear`, `mmio_dump`, `mmio_clear`, and the boot-time forms `wtrace_boot_stats`, `wtrace_boot_summary`, `wtrace_boot_dump` |
| Snapshots and frontend | `set_snapshot`, `get_snapshots`, `turbo`, `turbo_state` |
| BIOS and tier tracing | `bios_info`, `hle_dump`, `bioscall_dump` |
| Tripwires | `s3_smear_watch`, `callret_watch` |
| Oracle only | `read_scratch`, and the DuckStation breakpoint family `pc_break`, `pc_unbreak`, `pc_break_list`, `pc_hit_last`, `pc_hit_clear` |

Two details a client will otherwise get wrong. `screenshot` captures native 15-bit VRAM and is "blind to anything that only exists in the hi-res mirror", so verify geometry correction and supersampling with `screenshot_hires`. And `wtrace_dump`'s address filter "is applied server-side over the FULL ring before the emit cap", so always pass `addr_lo` and `addr_hi` when hunting one buffer, or you will only see the oldest entries of the whole ring. Boot-time write ranges are set by environment variable rather than by command, with `PSX_WTRACE_BOOT=lo,hi[;lo,hi...]`, and the option is ignored in builds made with debug tools disabled.

### Nintendo DS

[ndsrecomp](https://github.com/mstan/ndsrecomp)'s document is the fleet's most complete small table, and every command that takes a CPU takes `cpu` as `9` or `7`, because the DS has two. The toolchain itself is on the [Nintendo DS](/docs/platforms/nintendo-ds) page.

| Command | Arguments | Returns |
|---|---|---|
| `ping` | none | `{"pong":true}` |
| `regs` | `cpu` | `{r:[16],cpsr,spsr,mode}` |
| `event_counts` | none | `{vblank9,vblank7,ipcsync_w,fifo9to7,fifo7to9,dma_done,timer_ovf}` |
| `io_state` | none | ARM9 and ARM7 `{ime,ie,if,postflg,ipcsync}`, `cpu_stop`, `num_frames`, and event counts |
| `run_to_event` | `event`, `count` | Advances until the named counter reaches `count`; `{reached,counts}` |
| `read_mem` | `cpu`, `addr`, `len` | `{hex}`, that CPU's own memory view |
| `read_io` | `cpu`, `addr`, `width` of 8, 16 or 32 | `{value}`, an exact width register read |
| `cartridge` | `max`, default 128, maximum 8192 | Presence and controller state plus a passive ring of ROMCTRL, command, data-ready and completion events |
| `read_region` | `region` | Raw region bytes |
| `framebuffer` | `engine`, A or B | `{w:256,h:192,rgb:<hex>}` |
| `audio_samples` | `start`, `count` up to 4096 | `{start,count,oldest,produced,pcm_s16le}` |
| `touch` | `x`, `y`, `down` | Injects a TSC touch. Native and oracle both accept it |
| `keys` | `mask` | Sets the DS button state |
| `gx_state` | none | Geometry engine internals: gate flags, raw GXSTAT, FIFO and PIPE levels, vertex and polygon counts, packed-GXFIFO protocol state |
| `gx_run_sample` | optional `count` | The latest, or the count-th, `GPU3D::Run()` invocation record |
| `gx_write_sample` | optional `count` | A ring of ARM9 writes into the 3D register window, with engine state before and after |
| `dma_sample` | optional `count` | A ring of all DMA channel completions. Native only |

Valid `read_region` values are `mainram` (0x02000000, 4 MB), `wram7` (0x03800000), `wramshared`, `vramA` through `vramI`, `palA`, `palB`, `oam`, `itcm` and `dtcm`. Play mode adds `frontend_stats`, `profile`, `deep_trace`, `black_band_scan` and `black_band_capture`.

The document also carries the rule that governs how you use any of it: "Comparing native vs oracle by 'frame N' is meaningless across engines. **Sync on counted hardware events** and only then read state." The counters it names are ARM9 VBlank IRQ count, ARM7 VBlank IRQ count, IPCSYNC write count, IPC FIFO send and receive count per direction, DMA completion count per CPU and channel, timer overflow count, and a named PC reached on a named CPU.

### Virtual Boy

[vbrecomp](https://github.com/mstan/vbrecomp) adds `vip_state`, `vsu_state`, `psw_state`, `psw_set`, `irq_state`, `irq_force`, `timer_state`, `pad_state`, `memory_map`, `opcode_coverage`, `function_listing`, `first_divergence`, `framebuf_diff`, `vip_diff`, `crash_status`, `freeze_status`, `disasm` and `disasm_range`. Two always-on rings have their own command families: `wtrace_stats` / `wtrace_dump` / `wtrace_reset` over 1 M store records shaped `{seq, cycle, pc, addr, value, width, region}`, and `fntrace_stats` / `fntrace_dump` / `fntrace_reset` over 256K call records shaped `{seq, cycle, pc, lp}`. State can be written as well as read:

```text
psw_set       — overwrite PSW (unpacks into exploded fields)
                {"cmd":"psw_set","value":"0x00000001"}
irq_force     — assert or deassert an IRQ source line
                {"cmd":"irq_force","source":1,"asserted":1}
                Sources: 0=INPUT 1=TIMER 2=EXPANSION 3=COMM 4=VIP
```

The frame ring holds 36,000 entries, about 12 minutes at 50.27 Hz, and each record carries CPU registers, VIP state, VSU state, pad state, interrupt controller state, timer state, the last executed function name and 32 bytes of game-specific data. `vip_state` deliberately differs by side: the runtime returns full state while the oracle returns only the writable register subset mednafen's `VIP_GetRegister` exposes.

### Game Boy Advance

[gbarecomp](https://github.com/mstan/gbarecomp) splits its surface in two. The always-on half is active whenever `debug.ini` is present, including in Release builds; the `rdb_*` reverse debugger half is emitted by the recompiler and costs nothing when off.

| Group | Commands |
|---|---|
| Monitoring | `get_cpsr`, `get_banked_regs`, `read_iwram`, `read_ewram`, `read_vram`, `read_pal`, `read_oam`, `read_io`, `io_state`, `read_rom`, `read_save`, `save_state`, `scheduler_state`, `ppu_state`, `dma_state`, `timer_state`, `irq_state`, `audio_state` |
| Ring queries | `read_frame_iwram`, `read_frame_ewram`, `read_frame_vram`, `read_frame_io`, `restore_frame` |
| Execution | `run_to_pc`, `run_to_vblank`, `run_to_swi` |
| Save states | `savestate_save {path}`, `savestate_load {path}` |
| Burndown rings | `cyc_anchor {pc, hits?}`, `mmio_cap {count?, start?}`, `irq_cap {count?}`, `state_hash`, `audio_cap {count?, start?}` |
| Comparison | `framebuf_diff`, `io_diff`, `ppu_diff`, `dma_diff`, `timer_diff`, `irq_diff` |
| Diagnostics | `call_stack`, `watchdog_status`, `unmapped_io_log`, `unknown_swi_log`, `symbol` |
| Oracle, needs `GBARECOMP_MGBA_ORACLE` | `emu_registers`, `emu_screenshot`, `read_emu_iwram`, `read_emu_ewram`, `read_emu_vram`, `read_emu_pal`, `read_emu_oam`, `emu_ppu_state`, `emu_dma_state`, `emu_timer_state`, `emu_irq_state`, `emu_swi_count`, `emu_vblank_count`, `emu_step`, `emu_step_to_vblank`, `emu_step_to_swi` |
| Reverse debugger | `rdb_status`, `rdb_range`, `rdb_range_clear`, `rdb_reset`, `rdb_count`, `rdb_dump`, `trace_calls`, `trace_calls_reset`, `get_call_trace`, `trace_blocks`, `trace_blocks_reset`, `trace_blocks_range`, `get_block_trace`, `rdb_break`, `rdb_break_clear`, `rdb_break_list`, `rdb_step_block`, `rdb_break_continue`, `rdb_watch_add`, `rdb_watch_clear`, `rdb_watch_list`, `rdb_watch_continue`, `rdb_parked`, `rdb_anchor_on`, `rdb_anchor_off`, `rdb_anchor_status`, `rdb_iwram_at_block`, `rdb_ewram_at_block` |

Response shapes are given explicitly for the burndown group: `state_hash` returns `{ok,cycles,iwram,ewram,vram,pal,oam,hash}`, an FNV-1a-64 over IWRAM, EWRAM, VRAM, PAL and OAM plus `g_runtime_cycles`, and `symbol {addr}` returns for example `{"ok":true,"name":"UpdateAnimationVariableFrames","offset":16}`. The `rdb_*` group is documented design rather than verified behaviour; see below.

### GameCube

[gcnlle](https://github.com/mstan/gcnlle) is built around three always-on rings, MMIO and block/PC at 262144 entries each and events at 65536, plus a checkpoint family that arms at dispatcher boundaries rather than at an arbitrary PC: `checkpoint_arm`, `checkpoint_status`, `checkpoint_resume` and `checkpoint_continue`. Ring and state queries are `mmio_dump`, `block_dump`, `gpr_probe_dump`, `pc_seen`, `event_dump`, `dsp_state`, `rtc_state`, `audio_state` and `gx_draw_state`. Co-simulation has its own family: `cosim_status`, `cosim_step {count}`, `cosim_run_to {pc, max_instructions?}`, `cosim_state` (alias `state_hash`), `cosim_cpu_bytes`, `cosim_pages {space?, start?, count?}` and `cosim_inject {kind: gpr|ram|timebase, ...}`. `GCN_COSIM=1` requires `GCN_DEBUG_PORT`.

Read `mean_luma` in a `screenshot` response before calling a black frame a bug: until the GX command processor is modelled, an all black image with `mean_luma` around 16 is the correct current output.

### CD-i

[cdirecomp](https://github.com/mstan/cdirecomp) is the one server that documents its response shapes inline for every command. Live: `ping`, `status`, `pause`, `video_state`, `video_frame`, `frame_hashes`, `video_scanline`, `screenshot`, `get_registers`, `read_mem`, `trace`, `set_input`, `emu_ikat_state`, `ikat_events`, `ciap_events`, `disc_state`, `mount_disc`, `eject_disc`, `dispatch_miss_info` and `quit`. `video_scanline` is explicitly side-effect free, and `read_mem` returns `"--"` for MMIO rather than reading it.

Documented as planned but not live: `write_mem`, `get_frame`, `frame_range`, `frame_timeseries`, `continue`, `run_frames N`, `os9_call_log`, `sector_log`, `mcd212_state`, `cdic_state`, `frame_diff`, `memory_diff`, `first_divergence`, `framebuf_diff`, and the `rdb_*` tiers. The oracle serves a strict subset: `ping`, `status`, `get_registers`, `read_mem`, `trace`, `dispatch_miss_info` and `quit`, with `status` carrying `"oracle":true`.

### NES

[nesrecomp](https://github.com/mstan/nesrecomp) adds the PPU and mapper surface: `read_nametable`, `read_oam`, `read_chr` and `mapper_state`. Its button bitmask is worth quoting because it is what `set_input` and `press` take:

```text
0x01 = Right    0x08 = Up
0x02 = Left     0x04 = Down
0x10 = Start    0x20 = Select
0x40 = B        0x80 = A
```

Game repositories extend the server further through `game_handle_debug_cmd()` in each game's `extras.c`. [SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp) adds `smb_state` and `smb_demo_state`, where `smb_state` reports `oper_mode`, `oper_task`, `player_x`, `player_y`, `score_hi`, `score_mid`, `score_lo`, `lives` and `frame_counter`, each named with the RAM address it reads. That document also records the fields it removed for being wrong, which is the right way to publish a game-specific surface.

### Sega Genesis, Master System and Game Gear

[segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) documents its server in `DEBUG.md` rather than a `TCP.md`. Its source describes the transport in the usual terms, "Protocol: line-delimited JSON over TCP (one JSON object per line). Single client at a time. Polled each frame with non-blocking `recv()`", while its command list is written in positional form, `read_memory <addr> <len>` and `frame_range <lo> <hi>`. Beyond the core it adds `read_memory`, `write_memory`, `read_vram`, `read_cram`, `read_vsram`, `read_z80_ram`, `vdp_state`, `fm_state`, `psg_state`, `z80_state`, `dump_vram`, `audio_stats`, `audio_wav`, `audio_delivery_dump`, `read_joypad_port`, `frame_info`, `ws_set`, a Tier-1 `rdb_*` family, a Tier-2.5 breakpoint family, an oracle-build `t3_*` and `rdb_oracle_*` family, `addr_history`, `memory_write_log`, `coverage_dump` and `fm_trace`. Per-game commands are consulted first: "`g_game_spec.commands[]` is consulted before built-ins fall through to the generic dispatcher".

[smsggrecomp](https://github.com/mstan/smsggrecomp) is the stated exception to the JSON request rule. Its commands are newline terminated with positional arguments such as `bus_ring <count>` and `frame <n>`, and replies are JSON. Its document also flags itself as a contract rather than an implementation: "Scaffold note: the rings and TCP server below are the *intended* surface". Treat it as a plan.

## Where documents disagree with code

Every case found. In each one the dispatch table is the authority.

| Project | The disagreement |
|---|---|
| ndsrecomp | The document's table lists 17 commands, plus five play-mode extras. The runner's dispatcher answers at least 42 more, read directly from `runner/src/debug_server.cpp`: `reset`, `static_coverage`, `exec_provenance`, `tier3_coverage`, `coverage_manifest`, `live_overlay_status`, `live_overlay_diagnostics`, `live_overlay_trigger`, `rtc_state`, `spi_sample`, `irq_sample`, `gx_polygon`, `gx_polygons`, `insn_sample`, `fifo_sample`, `net_sample`, `net_ring_dump`, `net_progress`, `local_mp_stats`, `net_state`, `net_replay_status`, `firmware_dump`, `firmware_replace`, `frontend_input_stats`, `frontend_input`, `frontend_exit`, `framebuffer_sync`, `hle_heat`, `mem_timing_profile`, `dispatch_stats`, `cart_save_info`, `cart_save`, `cart_save_flush`, `sched_state`, `run_to_pc`, `run_cycles`, `run_rounds`, `cp15_state`, `watch`, `tier3_trace`, `runtime_trace`, `turbo`. The gap is a tracked work item in the project's own plan, filed as "TCP.md full 30+ command reference" |
| vbrecomp | The reverse: the document over-documents. 25 names appear in `TCP.md` with no handler in `debug_server.c`: `history`, `get_frame`, `frame_range`, `frame_timeseries`, `read_frame_ram`, `restore_frame`, `dump_ram`, `write_ram`, `vsu_state`, `opcode_coverage`, `function_listing`, `step`, `run_to_frame`, `clear_input`, `frame_diff`, `memory_diff`, `first_divergence`, `framebuf_diff`, `vip_diff`, `dispatch_miss_info`, `watchdog_status`, `crash_status`, `freeze_status`, `disasm` and `disasm_range`. Some of that work exists as Python tools instead, `tools/_framebuf_diff.py`, `tools/_vip_diff.py` and `tools/_wram_diff.py`. Note also `watchdog` is implemented while `watchdog_status` is documented |
| gbarecomp | The whole `rdb_*` reverse debugger is documented, but in the surveyed checkout there is no `src/debug/reverse_debug.cpp`, no `GBARECOMP_REVERSE_DEBUG` symbol and no `--reverse-debug` flag in the recompiler. Treat those tables as design. In the other direction, `run_frames {n, keyinput?}` and `step_inst` are implemented and absent from the document |
| psxrecomp | Not a contradiction so much as a solved one. The document described 47 commands while the servers registered 292, so the fix was to generate the index: "Step 4 used to read 'Update this file', and that did not survive contact with reality". `python tools/gen_tcp_commands.py --check` now fails when the file drifts |

The DS and Virtual Boy cases point in opposite directions, and that is the useful lesson: a protocol document in this fleet can be behind its code or ahead of it. Neither direction is safe to assume.

## Adding a command

Four repositories state the same procedure and psxrecomp adds a step. Verbatim, from [`TCP.md`](https://github.com/mstan/gbarecomp/blob/main/TCP.md) in gbarecomp:

```text
1. Add a handler in `src/debug/tcp_debug_server.cpp` — or, for
   `rdb_*`, in `src/debug/reverse_debug.cpp`.
2. Register it in the dispatch table.
3. Mirror on the oracle side if it inspects emulator-internal state.
4. Document it in this file under the right section.
5. Rebuild the runtime.
6. **Never** add a side-channel debug log. If TCP can't see it, TCP
   needs to grow until it can.
```

The same six steps appear in nesrecomp's `TCP.md`, vbrecomp's `TCP.md` and cdirecomp's `TCP.md`. psxrecomp's variant adds a seventh: run `python tools/gen_tcp_commands.py` to refresh the generated index. Step 3 is the one that makes the whole design work: mirroring a command on the [oracle](/docs/concepts/glossary) with a matching name is what lets a tool switch ports and compare, and psxrecomp states the payoff plainly, that "a tool written against psx-runtime works unchanged against psx-beetle just by switching ports."

Step 6 is not advisory. psxrecomp states it as an absolute rule of the codebase: "The TCP server is the canonical instrumentation surface. Rule 3 in `CLAUDE.md` is absolute: **no `fprintf(stderr, …)` in source code, ever, for any reason**." Not every repository holds that line as tightly, so check the one you are in.

## Clients

A minimal client is 15 lines. Verbatim, from [`TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md) in nesrecomp:

```python
import socket, json

def send_cmd(cmd, port=4370):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(5)
    s.connect(('127.0.0.1', port))
    s.sendall((json.dumps(cmd) + '\n').encode())
    data = b''
    while b'\n' not in data:
        chunk = s.recv(4096)
        if not chunk: break
        data += chunk
    s.close()
    return json.loads(data.decode().strip())
```

For a single query the shell form is shorter. Verbatim, from [`CLAUDE.md`](https://github.com/mstan/LegendOfZeldaNESRecomp/blob/master/CLAUDE.md) in LegendOfZeldaNESRecomp:

```bash
# One-shot command
echo '{"cmd":"zelda_state"}' | ncat localhost 4370

# Read RAM (e.g., entity types at $034F-$035A)
echo '{"cmd":"read_ram","addr":847,"len":12}' | ncat localhost 4370
```

Two projects ship a client with generic pass-through, so every registered command is reachable without adding a mapping. psxrecomp's `python tools/debug_client.py <cmd> [args]` targets the native port, `--port 4380` targets the Beetle oracle, and `compare <cmd>` runs on both and diffs the results; extra `key=value` arguments become JSON fields, so `debug_client.py --port 4370 gpu_frame_dump frame=14528 count=65536` works with no code change. gcnlle's `python tools/gcn_debug_client.py [--port N] <cmd> [key=value ...]` behaves the same way, defaulting to port 4380 and returning 2 on missing arguments. psxrecomp's client exits 1 when the connection is refused, which makes it usable as a liveness gate.

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md), [`runtime/src/debug_server.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/debug_server.c), [`runtime/src/beetle_debug_server.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/beetle_debug_server.c), [`tools/debug_client.py`](https://github.com/mstan/psxrecomp/blob/master/tools/debug_client.py), [`tools/gen_tcp_commands.py`](https://github.com/mstan/psxrecomp/blob/master/tools/gen_tcp_commands.py).
- [nesrecomp](https://github.com/mstan/nesrecomp): [`TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md). Game-level extensions in [SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp)'s [`TCP.md`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/TCP.md), [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp)'s [`TCP.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/TCP.md) and [LegendOfZeldaNESRecomp](https://github.com/mstan/LegendOfZeldaNESRecomp)'s [`CLAUDE.md`](https://github.com/mstan/LegendOfZeldaNESRecomp/blob/master/CLAUDE.md).
- [gbarecomp](https://github.com/mstan/gbarecomp): [`TCP.md`](https://github.com/mstan/gbarecomp/blob/main/TCP.md) and [`src/debug/tcp_debug_server.cpp`](https://github.com/mstan/gbarecomp/blob/main/src/debug/tcp_debug_server.cpp).
- [ndsrecomp](https://github.com/mstan/ndsrecomp): [`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md), [`runner/src/debug_server.cpp`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/debug_server.cpp) and [`PLAN.md`](https://github.com/mstan/ndsrecomp/blob/main/PLAN.md).
- [vbrecomp](https://github.com/mstan/vbrecomp): [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md), [`runtime/src/debug_server.c`](https://github.com/mstan/vbrecomp/blob/master/runtime/src/debug_server.c) and [`runtime/src/beetle_debug_server.c`](https://github.com/mstan/vbrecomp/blob/master/runtime/src/beetle_debug_server.c).
- [cdirecomp](https://github.com/mstan/cdirecomp): [`TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md). [gcnlle](https://github.com/mstan/gcnlle): [`docs/TCP_COMMANDS.md`](https://github.com/mstan/gcnlle/blob/master/docs/TCP_COMMANDS.md) and [`tools/gcn_debug_client.py`](https://github.com/mstan/gcnlle/blob/master/tools/gcn_debug_client.py).
- [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp): [`DEBUG.md`](https://github.com/mstan/segagenesisrecomp/blob/master/DEBUG.md) and [`runner/cmd_server.c`](https://github.com/mstan/segagenesisrecomp/blob/master/runner/cmd_server.c). [smsggrecomp](https://github.com/mstan/smsggrecomp): [`DEBUG.md`](https://github.com/mstan/smsggrecomp/blob/main/DEBUG.md).

## Next

- [TCP port registry](/docs/reference/tcp-port-registry), because the port you connect to is assigned per project and four projects claim 4380.
- [Debug a divergence](/docs/guides/debug-a-divergence), the workflow this protocol exists to serve.
- [Machine-readable surfaces](/docs/agents/machine-surfaces), for the JSON outputs, exit codes and artefact files around this one.
- [Errors and exit codes](/docs/reference/errors-and-exit-codes), for what a tool returns when the socket is not there.
