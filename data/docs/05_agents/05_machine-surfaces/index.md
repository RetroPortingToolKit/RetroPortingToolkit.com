---
title: "Machine-readable surfaces"
summary: "Every part of this fleet an agent can drive programmatically: the TCP debug servers, JSON and JSONL outputs, exit code conventions including the CTest 77 skip, the artefact files written next to a build, the input script language, and the four Ghidra MCP configurations."
section: "agents"
sectionTitle: "Agents"
pageType: "reference"
tags: ["Agents", "Tooling", "Verification"]
repos:
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/vbrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/gcnlle"
  - "https://github.com/mstan/SuperMetroidRecomp"
updated: "2026-08-23"
---

Most of this fleet is driven by a human watching a game window, but not all of it. There is a debug server you can open a socket to, output modes that emit JSON instead of prose, exit codes you can branch on, artefact files written next to every build, a scripting language for controlled play sessions, and four Ghidra MCP configurations. This page is the inventory, with enough detail to use each surface without reading the repositories first. Where a project has not documented something, this page says so rather than guessing. If you have not read [if you are an agent, start here](/docs/agents/start-here) and [rules of the codebase](/docs/agents/house-invariants), read those first: they govern when you are allowed to use any of this.

## What you can drive

| Surface | What it gives you | Where it is |
|---|---|---|
| TCP debug server | Live register, memory, video and input access on a running build | Nine projects, one document each |
| JSON and JSONL outputs | Benchmarks, traces, crash reports, metadata sidecars | Per project, listed below |
| Exit codes | Pass or fail signals from gates, scripted sessions and comparison tools | Per tool, listed below |
| Artefact files | Dispatch misses, coverage, traces, screenshots, written beside the executable | Per project, listed below |
| Input script language | A repeatable play session with assertions and a chosen exit code | nesrecomp and Megaman3NESRecomp |
| MCP servers | Ghidra disassembly over SSE | Four `.mcp.json` files |

## The TCP debug protocol

Nine repositories ship a protocol document: `TCP.md` in SuperMarioBrosNESRecomp, YoshiNESRecomp, cdirecomp, gbarecomp, ndsrecomp, nesrecomp and vbrecomp, and `TCP_COMMANDS.md` in psxrecomp and gcnlle. All nine describe the same transport. The full specification, with argument and return shapes per command, is [the TCP debug protocol reference](/docs/reference/tcp-protocol); what follows is what you need to open a connection and know what you are looking at.

### Transport

| Property | Value |
|---|---|
| Address | TCP on `127.0.0.1` |
| Concurrency | One client at a time |
| Framing | Line based: one request per line terminated by `\n`, one JSON response line back |
| Request encoding | JSON preferred, a bare word accepted for the simplest commands |
| Response | `{"ok":true,...}` on success, an error object on failure |
| Correlation | The `id` field is echoed when supplied |
| Maximum line | 8192 bytes |
| Latency | Polled once per frame on the runner side in nesrecomp, so do not expect sub-frame latency |

### The two error key spellings

This is the one place the transport genuinely differs, and a client that works across the fleet must accept both spellings.

| Lineage | Failure envelope | Documented in |
|---|---|---|
| NES | `{"ok":false,"err":"..."}` | [`TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md) in nesrecomp, [`TCP.md`](https://github.com/mstan/YoshiNESRecomp/blob/master/TCP.md) in YoshiNESRecomp |
| PlayStation, Game Boy Advance, Virtual Boy, CD-i, GameCube | `{"id": N, "ok": false, "error": "<msg>"}` | [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md) in psxrecomp, and the same envelope in gbarecomp, vbrecomp, cdirecomp and gcnlle |

The psxrecomp envelope also puts `id` first and is the one gcnlle copies verbatim. Read `ok` to decide success, then read whichever of `err` or `error` is present.

### The common core

Present in every server, with the spellings each project uses. UNKNOWN means the project's own document does not say.

| Command | psx | nes | vb | gba | nds | cdi | gcn |
|---|---|---|---|---|---|---|---|
| `ping` | yes | yes | yes | yes | yes | yes | yes |
| `get_registers` (`regs`) | yes | yes | yes | yes | yes (`regs`, per cpu) | yes | yes |
| `read_ram` / `dump_ram` | yes | yes | yes | yes | `read_mem` (per cpu) | `read_mem` | yes |
| `write_ram` | yes | yes | yes | yes | UNKNOWN | planned | yes |
| `screenshot` | yes | yes | yes | yes | `framebuffer` | yes | UNKNOWN |
| `set_input` / `press` / `clear_input` | yes | yes | yes | yes | `keys` / `touch` | `set_input` | UNKNOWN |
| `history` / `get_frame` / `frame_range` / `frame_timeseries` | yes | yes | yes | yes | no (event counts instead) | planned | no (rings instead) |
| `dispatch_miss_info` | UNKNOWN | yes | yes | yes | log file | yes | UNKNOWN |
| `first_divergence` / `first_failure` | `first_failure` | `first_failure` | `first_divergence` | UNKNOWN | harness side | planned | UNKNOWN |

Each server then adds hardware queries for its own console, which is the reason to open the specific document: `vip_state`, `vsu_state` and `psw_state` on Virtual Boy; `gx_state`, `gx_run_sample`, `gx_write_sample` and `dma_sample` on Nintendo DS; `read_nametable`, `read_oam`, `read_chr` and `mapper_state` on NES; `gte_state`, `mdec_state`, `gp1_dump` and `gpu_frame_dump` on PlayStation; `video_state`, `ikat_events`, `ciap_events` and `mount_disc` on CD-i; `checkpoint_arm`, `checkpoint_continue`, `pc_seen` and `gpr_probe_dump` on GameCube.

### Turning the server on

Most servers are not always running.

| Project | How it is enabled |
|---|---|
| nesrecomp | A `debug.ini` file in the same directory as the game executable, or a game specific CLI flag that enables debug mode |
| gbarecomp | Active whenever `debug.ini` is present, or the `--verify` or `--oracle` CLI flags are set, including Release builds |
| gcnlle | Set the `GCN_DEBUG_PORT` environment variable, for example `4380` |

Ports are assigned per project and they collide: 4380 is claimed by the psx-beetle oracle, Yoshi's native runtime, cdirecomp's native runtime and segagenesisrecomp at once, and 4370 by psx-runtime and five different NES games. The stated convention is native port plus one for the oracle, although the Game Boy Advance pair 19842 and 19843 does not match the wording that names an odd native port. The full allocation is on [the TCP port registry](/docs/reference/tcp-port-registry).

### A client, in two forms

From [`TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md) in nesrecomp:

```python title="TCP.md"
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

The same file warns that inline Python in bash often fails due to shell escaping on Windows, and says to write a `.py` file rather than using `python -c "..."`. For a single query, the shell form is easier. From [`CLAUDE.md`](https://github.com/mstan/LegendOfZeldaNESRecomp/blob/master/CLAUDE.md) in LegendOfZeldaNESRecomp:

```bash
# One-shot command
echo '{"cmd":"zelda_state"}' | ncat localhost 4370

# Read RAM (e.g., entity types at $034F-$035A)
echo '{"cmd":"read_ram","addr":847,"len":12}' | ncat localhost 4370
```

If the query you need does not exist, three repositories document the same ritual for adding one: write the handler, register it in the dispatch table, mirror it on the oracle side, document it in that repository's protocol file, and rebuild. All three end with the same prohibition, stated in nesrecomp as "**Never** add a side-channel debug log instead. If TCP can't see it, TCP needs to grow until it can."

## JSON and structured output

| Surface | What it is | Project |
|---|---|---|
| `logs/game_benchmark.json` | Written by `tools/benchmark_emulators.py --json-out` | gbrecompiled |
| `*_metadata.json` sidecars | Emitted next to generated projects; preferred over scraping generated C | gbrecompiled |
| `build/last_run_report.json` | Always-on post mortem on crash or exit: CPU state, recomp stack, abandons, tier2 coverage, dispatch-log ring, DB/PB ring, and a game specific section | SuperMetroidRecomp |
| `*.jsonl` WRAM traces | `SNESRECOMP_WRAM_TRACE_FILE` on the recomp side, `SNESREF_TRACE_FILE` on the oracle side | SuperMetroidRecomp |
| `gbaref_trace.jsonl` | Enabled by the `GBAREF_TRACE` environment variable, diffed by `oracle/ref_diff.py` | gbarecomp |
| Co-simulation hash JSONL | Per frame state hashes consumed by `tools/nes_cosim.py diff` | nesrecomp |
| `address_aliases.json` | A required artefact before full BIOS recompilation | psxrecomp |
| `recomp/sm_decomp_symbols.json` | Dispatch target tables for authorized indirect calls | SuperMetroidRecomp |
| `--json mesen_vs_recomp.json` | Audio comparison output | smsggrecomp |
| `--json-out cap.json` | Virtual Boy audio capture | vbrecomp |

## Exit codes

| Tool or gate | Convention | Project |
|---|---|---|
| Co-simulation gates | "Gates print PASS/FAIL and exit non-zero on FAIL (CI-gateable)" | nesrecomp, [`COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md) |
| `sm_widescreen_visual_smoke` | Skips with code 77 when artifacts are missing, the CTest skip convention | SuperMetroidRecomp |
| Input script `EXIT [code]` | Exits with the code you choose, default 0, which makes a scripted play session a pass or fail gate | nesrecomp |
| Interpreter self-test | Expects exit code 0; the exit code equals the number of failures | nesrecomp, [`docs/PHASE1_HANDOFF.md`](https://github.com/mstan/nesrecomp/blob/master/docs/PHASE1_HANDOFF.md) |
| Frame comparison tool | Writes an absolute-difference PPM and returns a failing exit code for any mismatch | DKC2Recomp |
| Documented failure path | Terminates immediately with exit code 3 | MinishCapRecomp, [`ISSUES.md`](https://github.com/mstan/MinishCapRecomp/blob/main/ISSUES.md) |

Code 77 is the trap worth naming twice. CTest treats it as a skip, so a suite containing nothing but skipped tests still reports success. Branch on the per test result, not the suite's exit status. The wider table of error strings and codes is on [errors and exit codes](/docs/reference/errors-and-exit-codes).

## Artefacts written next to the build

These are files, not commands, and reading them is often faster than driving the debug server.

| Artefact | Format | Project |
|---|---|---|
| `dispatch_misses.toml` | TOML beside the executable, empty means clean | segagenesisrecomp |
| `dispatch_misses.log` | Text, one per CPU on Nintendo DS | ndsrecomp, vbrecomp, smsggrecomp |
| `recomp_master_misses.toml.frag` | TOML fragment written at runtime by the self healing path | gbarecomp |
| `recomp_seed_proposals.toml` | Machine written proposals, merged by a human only | gbarecomp |
| `C:/temp/ppu_trace.csv` | `W,ADDR,VALUE,PC,FRAME` | nesrecomp |
| `C:/temp/mapper_trace.csv` | `BANK_SWITCH,bank,PC,FRAME` | nesrecomp |
| `mode_trace.csv` | Verify mode, one row per frame, native and emulator columns | GumshoeNESRecomp |
| Sidecar `.log` files | `[name]`, then `Ghidra:`, then `Rationale:`, next to each hardware `.c` file | nesrecomp, gbrecompiled |
| Screenshots | PNG on NES, where BMP is prohibited as too large for token limits; PPM on Game Boy; BMP or PPM client side on CD-i | nesrecomp, gbrecompiled, cdirecomp |

## The input script language

nesrecomp and Megaman3NESRecomp document the same script language verbatim, which turns a play session into something an agent can run unattended and assert on.

| Command | Description |
|---------|-------------|
| `WAIT <n>` | Wait n frames |
| `HOLD <BTN>` | Hold button (A B SELECT START UP DOWN LEFT RIGHT) |
| `RELEASE <BTN>` | Release button |
| `TURBO ON\|OFF` | Toggle fast-forward |
| `SCREENSHOT [file]` | Save PNG to C:/temp/ |
| `LOG <msg>` | Print message to stdout |
| `SAVE_STATE <path>` | Save state to file |
| `LOAD_STATE <path>` | Restore state from file |
| `WAIT_RAM8 <hex_addr> <hex_val>` | Block until g_ram[addr]==val (30s timeout) |
| `ASSERT_RAM8 <hex_addr> <hex_val> [msg]` | Assert RAM value |
| `EXIT [code]` | Exit with code (default 0) |

Invoked as, from [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md) in nesrecomp:

```batch
GameRecomp.exe rom.nes --script C:/temp/session.txt > C:/temp/stdout.txt 2>&1
```

Note one interaction with [how changes go wrong here](/docs/agents/failure-modes): `TURBO ON` can change what you measure, so a script used to reproduce a divergence should not use it. The button bitmask, for setting input over TCP rather than by script, is documented in [`TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md) in nesrecomp:

```text title="TCP.md"
0x01 = Right    0x08 = Up
0x02 = Left     0x04 = Down
0x10 = Start    0x20 = Select
0x40 = B        0x80 = A
```

## MCP server configurations

Four `.mcp.json` files exist in the fleet. All four are Ghidra over SSE, and all four use a different port.

| Repository | Server name | Type | URL |
|---|---|---|---|
| [psxrecomp](https://github.com/mstan/psxrecomp) | `ghidra`, `ghidra_psx` | sse | `http://localhost:7777/sse` |
| [ndsrecomp](https://github.com/mstan/ndsrecomp) | `ghidra` | sse | `http://localhost:2222/sse` |
| [gbrecompiled](https://github.com/mstan/gbrecompiled) | `ghidra` | sse | `http://localhost:4000/sse` |
| [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp) | `ghidra_smw` | sse | `http://localhost:8078/sse` |

The complete file, from [`.mcp.json`](https://github.com/mstan/psxrecomp/blob/master/.mcp.json) in psxrecomp:

```json title=".mcp.json"
{
  "mcpServers": {
    "ghidra": {
      "type": "sse",
      "url": "http://localhost:7777/sse"
    },
    "ghidra_psx": {
      "type": "sse",
      "url": "http://localhost:7777/sse"
    }
  }
}
```

The tool an agent calls to prove Ghidra is up is named consistently across repositories: `mcp__ghidra__get_program_info`, with `mcp__ghidra__get_code` for a disassembly at an address. Both names appear in nesrecomp, gbrecompiled and Megaman3NESRecomp.

> **Warning.** Three repositories gate all work on Ghidra MCP being reachable and ship no `.mcp.json` at all: nesrecomp, Megaman3NESRecomp and YoshiNESRecomp. An agent in those repositories has no configured server to reach, and the working configuration lives outside the tree. [When you cannot run the game](/docs/agents/when-you-cannot-run-the-game) covers what to do about a gate you cannot satisfy.

## What is not automated

Nothing in this fleet watches your change on your behalf. Four repositories carry a workflow file, and none of the 36 agent instruction files mentions continuous integration at all.

| Repository | Workflow | Triggers | What it runs |
|---|---|---|---|
| [xboxlle-probe](https://github.com/mstan/xboxlle-probe) | `.github/workflows/ci.yml` | `push`, `pull_request` | `python -m py_compile host/xbox_probe.py`, then `python -m unittest discover -s tests -v`, then clones the pinned nxdk and builds the XBE, asserting `test -s bin/default.xbe` |
| [psxrecomp](https://github.com/mstan/psxrecomp) | `.github/workflows/cli-release.yml` | `workflow_dispatch` and published releases only | Builds the CLI under MSYS2 MINGW64, runs `cli_boot_path_test` via ctest, smoke tests `psxrecomp.exe --help`, uploads and attaches the zip |
| [snesrecomp](https://github.com/mstan/snesrecomp) | `native-analyzer.yml`, `cli-release.yml` | `pull_request`, `push` to main, `workflow_dispatch`, `release` | Three OS matrix; on Linux `cargo fmt -- --check` and `cargo clippy --locked --release --all-targets -- -D warnings`; plus pyinstaller packaging and `python tools/smoke_cli_package.py` |
| [TombaRecomp](https://github.com/mstan/TombaRecomp) | `.github/workflows/release.yml` | `workflow_dispatch` with version and bump inputs | The multi platform release template for a PlayStation game repository |

The psxrecomp workflow explains its own deliberate absence from pull requests, and the reasoning is worth reading before you propose adding a check anywhere in this fleet. From [`.github/workflows/cli-release.yml`](https://github.com/mstan/psxrecomp/blob/master/.github/workflows/cli-release.yml):

```yaml title=".github/workflows/cli-release.yml"
# Release packaging ONLY. Deliberately does NOT run on pull_request or on
# pushes to master.
#
# It ran on both until 2026-07-25 and was a net negative: the Windows `build`
# job failed often enough that a red check stopped carrying information, so it
# was routinely ignored -- at which point it is pure noise plus CI minutes. A
# check nobody trusts is worse than no check, because it still costs attention.
```

## Source

- [mstan/nesrecomp](https://github.com/mstan/nesrecomp): [`TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md), [`CLAUDE.md`](https://github.com/mstan/nesrecomp/blob/master/CLAUDE.md), [`COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md)
- [mstan/psxrecomp](https://github.com/mstan/psxrecomp): [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md), [`.mcp.json`](https://github.com/mstan/psxrecomp/blob/master/.mcp.json), [`.github/workflows/cli-release.yml`](https://github.com/mstan/psxrecomp/blob/master/.github/workflows/cli-release.yml)
- [mstan/vbrecomp](https://github.com/mstan/vbrecomp): [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md), and [mstan/gbarecomp](https://github.com/mstan/gbarecomp): [`TCP.md`](https://github.com/mstan/gbarecomp/blob/main/TCP.md)
- [mstan/ndsrecomp](https://github.com/mstan/ndsrecomp): [`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md), and [mstan/cdirecomp](https://github.com/mstan/cdirecomp): [`TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md)
- [mstan/gcnlle](https://github.com/mstan/gcnlle): [`docs/TCP_COMMANDS.md`](https://github.com/mstan/gcnlle/blob/master/docs/TCP_COMMANDS.md)
- [mstan/SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp): [`CLAUDE.md`](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md), and [mstan/gbrecompiled](https://github.com/mstan/gbrecompiled): [`AGENTS.md`](https://github.com/mstan/gbrecompiled/blob/master/AGENTS.md)
- [mstan/LegendOfZeldaNESRecomp](https://github.com/mstan/LegendOfZeldaNESRecomp): [`CLAUDE.md`](https://github.com/mstan/LegendOfZeldaNESRecomp/blob/master/CLAUDE.md)

## Next

- [The TCP debug protocol](/docs/reference/tcp-protocol) for the normative wire format, the full command tables and the per console extensions.
- [Checking your own work](/docs/agents/verification-rituals) for which of these surfaces each repository expects you to use before claiming a result.
- [How changes go wrong here](/docs/agents/failure-modes) for what the miss logs, coverage reports and skip codes above are actually catching.
- [Contributing as an agent](/docs/agents/contributing-as-an-agent) for how to record what a tool told you, in a form the next session can use.
