---
title: "Command line reference"
summary: "Every command line tool in the fleet: one real command you can run, then a full flag table with type, default and meaning, for the recompilers, the runtimes, the packagers and the debug clients."
pageType: "reference"
tags: ["CLI", "Reference", "Tooling"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/smsggrecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/cdirecomp"
  - "https://github.com/mstan/vbrecomp"
updated: "2026-08-25"
---

Every command line tool in this fleet, with its flags. The recompilers here read a game's compiled code and write C source. The runtimes run the result. The packagers and debug clients sit around them.

You supply your own game file. None of these tools ships one.

Tools are grouped by project, psxrecomp first because it has the most, then the rest alphabetically. Flags are alphabetical inside each table. Exit codes are on [errors and exit codes](/docs/reference/errors-and-exit-codes), and terms are defined in [the glossary](/docs/concepts/glossary).

## psxrecomp

### psxrecomp build

The shipped `psxrecomp.exe` is a C++ binary with one subcommand. Its usage text lists the BIOS images it takes: OpenBIOS, SCPH1001, SCPH101, SCPH5552, or any 512 KiB PS1 BIOS dump you supply.

```sh
psxrecomp build --disc /path/game.cue --bios /path/SCPH1001.BIN --output /path/MyGameRecomp --name "My Game"
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--bios` | path | required | A `.BIN` BIOS dump. Must be exactly 512 KiB or the tool rejects it |
| `--disc` | path | required | `game.cue`, `.bin`, `.iso` or `.chd` |
| `-h`, `--help` | flag | | Print usage and exit 0 |
| `--name` | string | derived | Project title |
| `--output`, `-o` | dir | required | Must not exist, or must be an empty directory |

### psxrecomp_cli.py

The headless CLI. Six subcommands: `verify-disc`, `generate`, `rebuild`, `pgo-train`, `ensure-toolchain`, `ensure-emitters`. The three flags below are added to `verify-disc`, `generate`, `rebuild` and `pgo-train`.

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--config` | path | `game.toml` | game.toml path |
| `--json-progress` | flag | off | Switch stdout to one JSON object per line. Human-readable text moves to stderr; every event carries `event` and `t`, elapsed seconds to three places |
| `--project-root` | path | `""` | Game project root |

### psxrecomp_cli.py verify-disc

Hash-checks a dump against the `[prepare_disc]` section of `game.toml`.

```sh
python psxrecomp_cli.py verify-disc --config game.toml --disc tomba/tomba.cue
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--disc` | path | required | Disc to hash-check |
| `--skip-hash-check` | flag | off | Skip the digest comparison |

### psxrecomp_cli.py generate

Regenerates the BIOS backends, prepares the disc, and writes the game's C source.

```sh
python psxrecomp_cli.py generate --config game.toml --disc tomba/tomba.cue --bios bios/SCPH1001.BIN
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--bios` | path | `""` | Optional retail BIOS dump, staged as `bios/SCPH1001.BIN` and regenerated |
| `--disc` | path | `""` | Source dump or working cue/bin |
| `--force-bios` | flag | off | Regenerate OpenBIOS even when `generated/` backends exist |
| `--force-emitters` | flag | off | Rebuild the emitters even when the binaries exist |
| `--force-prepare` | flag | off | Re-run disc preparation |
| `--gen-marker` | path | `""` | Expected marker under the output directory |
| `--no-toolchain-download` | flag | off | Do not download `cmake-clang-v1` when emitters are missing |
| `--skip-hash-check` | flag | off | Skip disc digest verification |

### psxrecomp_cli.py rebuild

Runs the CMake build, plus the PGO step when `game.toml` turns it on. PGO is profile guided optimization: build, run the game and measure it, then build again using the measurements.

```sh
python psxrecomp_cli.py rebuild --config game.toml --build-dir build --target psx-runtime --cmake-extra -DPSX_NETPLAY=ON
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--build-dir` | path | required | CMake build directory to build |
| `--cmake-extra` | string, repeatable | `[]` | Extra `cmake` arguments |
| `--disc` | path | `""` | Disc used for the PGO training run |
| `--exe-basename` | string | `""` | Product binary basename override |
| `--force-pgo` | flag | off | Run PGO even without `[pgo] enabled=true` |
| `--no-pgo` | flag | off | Skip PGO even when `[pgo] enabled=true` |
| `--no-toolchain-download` | flag | off | Do not fetch `cmake-clang-v1` when no local pack is found |
| `--pgo-audio` | flag | off | Allow host speakers during training, overriding the mute default |
| `--pgo-hide-video` | flag | off | Force a headless training run with no on-screen video. This is the default |
| `--pgo-mute` | flag | off | Force host speakers muted during training. This is the default |
| `--pgo-video` | flag | off | Show a game window during training, including host present paths |
| `--prune-after` | csv | `""` | After success, free disk: `toolchain`, `build-intermediates`, `build-tree`, `all` |
| `--target` | string | `psx-runtime` | Build target |
| `--toolchain-zip` | path | `""` | Offline `cmake-clang-v1-*.zip` to install into the shared cache |
| `--train-runs` | int | 0 | Override `[pgo] train_runs`, framework default 2 |
| `--train-secs` | int | 0 | Override `[pgo] train_secs`, framework default 60 |

### psxrecomp_cli.py pgo-train

Runs the PGO cycle on its own: rebuild, train, use. Same flags as `rebuild`, minus the toolchain and prune options. `--force-pgo` is on by default. `--no-pgo` exists only so the two flag sets match.

```sh
python psxrecomp_cli.py pgo-train --config game.toml --build-dir build --disc tomba/tomba.cue --train-secs 90
```

### psxrecomp_cli.py ensure-toolchain

Downloads or unpacks `cmake-clang-v1` into the shared cache. This subcommand does not take `--config`.

```sh
python psxrecomp_cli.py ensure-toolchain --project-root . --min-version 1.0.9
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--download` | flag | off | Force download even when a pack is cached |
| `--from-zip` | path | `""` | Install from a local `cmake-clang-v1-*.zip`, offline |
| `--json-progress` | flag | off | JSONL progress on stdout |
| `--min-version` | semver | `""` | Require `retcomm-toolchain.json` version at or above this |
| `--no-download` | flag | off | Resolve only from env, cache or the project `toolchain/` |
| `--project-root` | path | `""` | Game project root, optional |

### psxrecomp_cli.py ensure-emitters

Builds `psxrecomp-game` and `psxrecomp-bios` when they are missing.

```sh
python psxrecomp_cli.py ensure-emitters --project-root . --force
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--force` | flag | off | Rebuild even when emitter binaries exist |
| `--json-progress` | flag | off | JSONL progress on stdout |
| `--no-download` | flag | off | Do not fetch `cmake-clang-v1` |
| `--project-root` | path | `""` | Game project root, optional |

### psxrecomp-game

The game emitter. Usage, verbatim from [`recompiler/src/main_psx.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/main_psx.cpp):

```text title="recompiler/src/main_psx.cpp"
Usage: {} --config <game.toml>
       {} <PS1-EXE file> [--seeds <file>] [--out-dir <dir>] [--strict] [--inspect]
Example: {} SCUS_942.36 --seeds seeds/functions.txt --out-dir generated --strict
```

| Flag | Type | Meaning |
|---|---|---|
| `--codegen-hash` | flag | Print the baked emitter-source hash and exit, one machine-parseable hex line |
| `--config <toml>` | path | Canonical mode: read `game.toml`. The `=` form is also accepted |
| `--extra-funcs`, `--seeds <file>` | path | Function seed list |
| `--inspect` | flag | Inspect only |
| `--out-dir <dir>` | dir | Output directory |
| `--overlay` | flag | Overlay mode |
| `--overlay-config-hash <v>` | string | Overlay config hash |
| `--project-root <dir>` | dir | Resolve the BIOS profile against this directory instead of the working directory. Required for callers that cannot choose their working directory |
| `--strict` | flag | Strict translation |
| `--ws-config <toml>` | path | Widescreen config |

### psxrecomp-bios

The BIOS emitter. It compiles the `boot_slice.c` it just wrote to check its own output, so it needs a C compiler on PATH. Without one it fails, and that check cannot be skipped. Use `psxrecomp-bios --config <path.toml>`; `--rom`, `--out-dir`, `--cc`, `--discover` and `--emit-full` also parse. Its header comment gives the older positional form and the exit codes:

```text
// CLI:
//   psxrecomp-bios <bios.bin> <out_dir> [--cc <path-to-c-compiler>]
//
// Exit codes:
//   0  success: walk completed, all instructions translated, boot_slice.c
//      compiled cleanly, manifest written, unsupported_ops.json == "[]".
//   1  any failure (file size, walk, unsupported, codegen self-validate, ...).
//   2  CLI usage error.
```

### psxrecomp-toml

The fourth binary in the CLI package. It reads a PS-X EXE and writes a complete `game.toml`, detecting `load_address`, `entry_pc`, `text_size` and `stack_base`. It can also write a seeds file of JAL targets.

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `-h`, `--help` | flag | | Show help |
| `--id <str>` | string | auto-detect or empty | Game ID in the TOML |
| `--include-after-return` | flag | off | Add addresses after `jr $ra` to seeds. More coverage, may include some data addresses |
| `--name <str>` | string | derived from EXE | Game name in the TOML |
| `--output <path>` | path | stdout | Write `game.toml` here |
| `--seeds <path>` | path | none | Also write a JAL-target seed file |
| `--stdout` | flag | off | Force output to stdout even with `--output` |

### psx-runtime

The runtime binary, the thing a player launches. The command below is the framework's own example.

`psx-runtime` is the CMake target name, not the file name. The framework's build writes `PSXRecomp`; a game repository writes a name from the game's title. Run whichever file is in your build directory.

```sh
./build/psx-runtime --game game.toml --disc tomba/tomba.cue
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--bios <path>` | path | compile-time | Override the compiled-in BIOS path. A bare positional argument is a deprecated alias |
| `--debug-port <n>` | int | 4370 | Override the TCP debug server port, for multiple instances |
| `--disc <path>` | path | from game config | Override the disc path |
| `--game <toml>` | path | none | Load a game config: disc, memory card, window title and debug port |
| `--headless` | flag | off | Skip the SDL window and audio; use TCP screenshots and state |
| `--launcher` | flag | off | Force the GUI launcher |
| `--memcard-dir <path>` | dir | from game config | Override card, save and options state |
| `--net-bind H:P` | host:port | `0.0.0.0:7777` | Local UDP bind |
| `--net-delay N` | int | 2 | Input delay in simulation ticks |
| `--net-input-player N` | int | auto | Host device to sample, 0 for P1, 1 for P2 |
| `--net-peer H:P` | host:port | none | Peer host and port |
| `--net-session-id N` | int | 1 | Must match the peer |
| `--net-slot N` | 0 or 1 | none | Local player slot |
| `--netplay` | flag | off | Enable delay-sync LAN. `PSX_NETPLAY=1` does the same |
| `--no-launcher` | flag | off | Skip the GUI launcher and boot straight in |
| `--renderer <name>` | `software`, `opengl`, `vulkan` | from config | Override the renderer |

### psxrecomp tools/build_cli.py

Builds the CLI archive that gets shipped. It configures with `-DPSXRECOMP_STATIC_CLI=ON`, builds the four CLI targets, and puts `psxrecomp` at the archive root with the other three under `libexec/`.

```sh
python tools/build_cli.py release
```

| Argument | Type | Default | Meaning |
|---|---|---|---|
| `configuration` | positional, `release` or `debug` | `release` | Build configuration |
| `--build-dir` | path | `recompiler/build-cli` | CMake build directory |
| `--dist-dir` | path | `dist` | Package output directory |
| `--skip-build` | flag | off | Package tools already present in `--build-dir` |

Sibling `tools/build_cli.py` scripts exist in nesrecomp, snesrecomp and gbarecomp. The gbarecomp one takes `--cmake`, `--python` (default `sys.executable`) and `--output`, and produces `gbarecomp-cli-windows-x86_64.zip`.

### psxrecomp tools/regen_bios.sh

Regenerates a BIOS backend. `--config` is the only flag it accepts. Anything else is rejected, so a typo cannot quietly regenerate the default profile instead.

```sh
tools/regen_bios.sh --config bios/OpenBIOS.toml
```

| Name | Type | Default | Meaning |
|---|---|---|---|
| `--config <profile.toml>` | path | `bios/SCPH1001.toml` | BIOS profile to regenerate |
| `PSXRECOMP_BIOS_BUILD` | env, path | none | Build directory, resolved relative to the framework root and not to your shell's working directory |
| `PSXRECOMP_BIOS_STEMS` | env, list | `OpenBIOS;SCPH1001` | Which profiles the runtime expects |

### psxrecomp tools/setup_dev.sh

Developer setup for macOS and Linux, run once. It prints `[ok]`, `[missing]` or `[warn]` for `cmake`, `python3`, `ninja` and a C compiler, then builds the CLI, the recompiler tools and the BIOS-only runtime. It creates no per-game runtime targets.

| Name | Type | Default | Meaning |
|---|---|---|---|
| `BUILD_TYPE` | env | `Release` | CMake build type |
| `CLI_BUILD_DIR` | env, path | `recompiler/build-cli` | CLI build directory |
| `RUNTIME_BUILD_DIR` | env, path | `runtime/build-dev` | Runtime build directory |

### psxrecomp tools/debug_client.py

The TCP debug client. With no arguments it opens an interactive prompt. Extra `key=value` arguments become JSON fields, and numbers stay numbers, so every server command is reachable.

```sh
python tools/debug_client.py --port 4370 gpu_frame_dump frame=14528 count=65536
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `args` | positional, zero or more | none | Command, then `key=value` pairs |
| `--ds` | flag | off | Shorthand for `--port 4371` |
| `--host` | string | `127.0.0.1` | Target host |
| `--port` | int | 4370 native | Target port |

A `compare` form, `python tools/debug_client.py compare <cmd>`, runs one command on both sides and shows the differences.

### psxrecomp project_studio

A separate CLI for game repositories, at `tools/new_project_layout/project_studio/cli.py`. It sets a project up and then runs it. Top-level subcommands are `audit`, `plan`, `apply`, `ops`, `gui`, `git` and `build`. Its `git` group adds `status`, `ensure-submodules`, `ensure-nested`, `set-branch`, `update-submodules`, `update-nested`, `commit-nested`, `pull`, `commit`, `push` and `release`. Its `build` group is `configure` (`--build-type` default `Release`, `--generator` default auto, `--extra`), `compile` (`--target` default `psx-runtime`, `--jobs` default 0), `run` (`--exe`, `--args`), `stop` and `status`; all of them take `--root` (required), `--build-dir` (default `build-release`) and `--dry-run`.

## cdirecomp

Four binaries, all driven by positional arguments. Both harnesses also take `--stop-frame N`, which stops right after field N is published so two runs line up, and `--stop-seq`.

### CdiRecompBios

| Command | What it does |
|---|---|
| `CdiRecompBios.exe bios/cdi490a.rom --emit` | Recompile the CD-RTOS system ROM to C |

### CdiRecomp

| Command | What it does |
|---|---|
| `CdiRecomp.exe "path/to/Game (Region).cue"` | Inventory a CD-i disc: tracks, volume descriptor, OS-9 modules |

### CdiRuntime

| Command | What it does |
|---|---|
| `CdiRuntime.exe bios/cdi490a.rom` | Boot the system ROM you supply to the player shell |
| `CdiRuntime.exe bios/cdi490a.rom --disc "path/to/Game.cue"` | Boot with a Mode-2 disc mounted |

### CdiOracle

| Command | What it does |
|---|---|
| `CdiOracle.exe bios/cdi490a.rom --steps 100000 --hold` | Run the CeDImu oracle |

## gbarecomp

### gbarecomp build

The Python wrapper around the emitter.

```powershell
.\gbarecomp.exe build `
  --rom "C:\Games\MyGame.gba" `
  --output "C:\Projects\MyGameRecomp"
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--codegen-shards` | int, 2 to 256 | none | Shard count |
| `--config` | path | none | Per-game TOML configuration |
| `--entry` | hex | none | Entry address |
| `--force` | flag | off | Update a non-empty output folder |
| `--max-functions` | int | none | Limit discovered functions |
| `--output` | dir | required | New folder for generated source |
| `--rom` | path | required | A `.gba` ROM you supply |
| `--symbols` | path | none | Imported symbol TSV |
| `--verbose` | flag | off | Show all recompiler diagnostics |
| `--version` | flag | | Print the version |

### gba_recompile

The native emitter. It has two modes and you pick one: `--rom` and `--bios` together are rejected. `--config` can be repeated. The first file is the base, later files merge on top, and the base wins every conflict. Usage, verbatim from [`tools/gba_recompile/main.cpp`](https://github.com/mstan/gbarecomp/blob/main/tools/gba_recompile/main.cpp):

```text title="tools/gba_recompile/main.cpp"
gba_recompile --rom <path> [--entry HEX] [--symbols TSV]
              [--data-symbols TSV] [--config TOML]...
              [--out DIR] [--rom-base HEX]
              [--max-functions N] [--codegen-shards N]
              [--output-prefix IDENTIFIER_PREFIX]

  Cart-recompile mode. Discovers functions reachable from
  --entry + --symbols seeds and writes two or more deterministic
  <out>/recompiled_NNN.cpp shards + recompiled.h +
  dispatch_table.cpp. Monolithic cart output is prohibited.

gba_recompile --bios <path>
              [--config TOML] [--out DIR] [--max-functions N]

  BIOS-recompile mode. rom_base=0x00000000, default --out is
  src/runtime/generated_bios. Seeds reset (0x00 ARM),
  SWI (0x08 ARM), IRQ (0x18 ARM). Output is
  bios_recompiled.{cpp,h} + bios_dispatch_table.cpp.
```

`--symbol-map` and `--no-symbol-map` are also parsed, but the usage text above does not list them.

## ndsrecomp

### nds_recompile

```sh
./recompiler/build/nds_recompile --config bios/biosnds9.toml \
  --bin bios/biosnds9.rom --out generated --bank arm9_bios
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--audit` | flag | off | Audit only |
| `--bank <name>` | string | none | Bank name, for example `arm9_bios` |
| `--bin <binary>` | path | required | Input binary |
| `--coalesce-fallthroughs` | flag | off | Requires `--validate-live-bytes` and rejects `--hle-manifest` |
| `--config <toml>` | path | required | Bank configuration |
| `--dispatch-only` | flag | off | Emit dispatch only |
| `--hle-manifest <path>` | path | none | HLE manifest |
| `--max-function-bytes <n>` | uint32 | none | Function size cap |
| `--out <dir>` | dir | none | Output directory |
| `--preceding-dispatch <path>` | path, repeatable | none | Preceding dispatch tables |
| `--shards <n>` | unsigned | 1 | Shard count |
| `--stable-address-shards` | flag | off | Address-stable sharding |
| `--unsafe-live-direct-calls` | flag | off | Allow unvalidated live direct calls |
| `--validate-live-bytes` | flag | off | Validate live bytes |
| `--validated-live-direct-calls` | flag | off | Allow validated live direct calls |

## nesrecomp

### nesrecomp build

The Python wrapper, version 0.3.0 in this checkout.

```powershell
.\nesrecomp.exe build `
  --rom "C:\Games\MyGame.nes" `
  --game "C:\Projects\MyGamePort\game.toml" `
  --output "C:\Projects\MyGameRecomp"
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--force` | flag | off | Allow updating a non-empty output folder |
| `--game` | path | none | An existing `game.toml` |
| `--name` | string | none | Output or project name |
| `--output` | dir | required | New folder for generated source |
| `--rom` | path | required | A `.nes` ROM you supply |
| `--verbose` | flag | off | Show all native recompiler diagnostics |
| `--version` | flag | | Print `nesrecomp 0.3.0` |

### NESRecomp

The native emitter. It writes `generated/<prefix>_full.c` and `generated/<prefix>_dispatch.c`. Usage, verbatim from [`recompiler/src/main_nes.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/main_nes.c):

```text title="recompiler/src/main_nes.c"
Usage:
  NESRecomp <rom.nes>                        Recompile ROM to C
  NESRecomp <rom.nes> --game <game.toml>     Recompile with game config

Options:
  --game <path>          Game-specific config (trampolines, dispatch tables, etc.)
                         If omitted, auto-detects ./game.toml or uses defaults.
  --output-prefix <name> Override game.toml output_prefix. Lets a multi-variant
                         game regen one game.toml under distinct prefixes so the
                         per-bank split files never collide (e.g. zelda_stock /
                         zelda_hd).
  --proposal-out <path>  Write a proposed game.toml based on auto-discovery.
  --help, -h             Show this help message.
```

## segagenesisrecomp

### GenesisRecomp

Usage, verbatim from [`recompiler/src/main_genesis.c`](https://github.com/mstan/segagenesisrecomp/blob/master/recompiler/src/main_genesis.c):

```text title="recompiler/src/main_genesis.c"
Usage: GenesisRecomp <rom.md|rom.bin> [--game <path/to/game.toml>] [--output-dir <directory>] [--reverse-debug] [--fail-on-unsupported]
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--fail-on-unsupported` | flag | `false` | Fail rather than continue on an unsupported instruction |
| `--game <path>` | path | none | Per-game TOML |
| `--output-dir <dir>` | dir | `generated` | Output directory |
| `--reverse-debug` | flag | `false` | Emit reverse-debugger hooks |

### boot_smoke.py

The boot check. It keeps a baseline on disk, and by default compares a fresh run against it.

```sh
python tools/boot_smoke.py --game sonic1 --port 4380 --dump-on-diff
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--dump-on-diff` | flag | off | Dump the full 64KB of work RAM next to the game directory on a difference |
| `--frames` | int | short boot | Stretch the run, for example 300 for the title screen |
| `--game` | string | required | Game key, for example `sonic1` |
| `--port` | int | none | Runner debug port |
| `--write-baseline` | flag | off | Capture a fresh baseline after an intentional change |

### zone_smoke.py

The picture check. It hashes the framebuffer during a scripted run and compares that against a baseline stored in the repository.

```sh
python tools/zone_smoke.py --game sonic2 \
    --input ../../SonicTheHedgehog2Recomp/tools/smoke_enter_level_run_right.input \
    --hash-frames 60
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--game` | string | required | Game key |
| `--hash-frames` | int | none | Emit a framebuffer hash line every N wall frames |
| `--input` | path | required | Scripted button timeline |
| `--keep-log` | flag | off | Save the runner's full stderr |
| `--write-baseline` | flag | off | Capture a baseline |

The runner takes `--input-script <path>`, a scripted button timeline that can also check RAM values, and `--hash-frames N`.

### package_release.py

The packager. It copies only files on an allowlist. Its flags and the rules behind them are on [release a port](/docs/guides/release-a-port).

## smsggrecomp

### SmsRecomp

Usage, verbatim from [`recompiler/src/main_sms.c`](https://github.com/mstan/smsggrecomp/blob/main/recompiler/src/main_sms.c):

```text title="recompiler/src/main_sms.c"
usage: SmsRecomp [<rom>] --game <game.toml> [--flat-step [--flat-step-variant <image>]...]
```

Regenerating from a ROM you supply overwrites `generated/<prefix>_{full,dispatch,layout}.c`. Rebuild the runner afterwards.

## snesrecomp

### snesrecomp build

```powershell
.\snesrecomp.exe build --rom "C:\Games\My Game\game.sfc" --output "C:\Projects\MyGameRecomp"
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--name` | string | ROM filename | Project title |
| `--output`, `-o` | dir | required | New output directory |
| `--rom` | path | required | A `.sfc` or `.smc` ROM you supply |

A separate script, `tools/build_native_analyzer.py`, builds and tests the `snesrecomp-analyze` binary. It takes `--test`.

## vbrecomp

### vb-runtime and vb-beetle

Both binaries take `--port N`, which overrides the compiled-in default: 4390 for `vb-runtime`, 4391 for `vb-beetle`. The same values can be set through `debug.ini` keys `runtime.debug_port` and `oracle.debug_port`.

```sh
./build/runtime/vb-runtime --port 4390      # vb-runtime.exe on Windows
```

Four Python helpers ship with it. `tools/_ping.py --port 4390` checks a server is up. `tools/_wtrace_summary.py` reads the write trace a page at a time, counting writes by 4 KB target page and by source PC. `tools/_wram_diff.py` compares work RAM between 4390 and 4391 byte by byte, and `tools/_vip_diff.py` compares the VIP registers.

## Source

- psxrecomp: [`recompiler/src/main_cli.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/main_cli.cpp), [`psxrecomp_cli.py`](https://github.com/mstan/psxrecomp/blob/master/psxrecomp_cli.py), [`recompiler/src/main_psx.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/main_psx.cpp), [`recompiler/src/main_bios.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/main_bios.cpp), [`recompiler/src/main_toml.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/main_toml.cpp), [`runtime/src/main.cpp`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/main.cpp), [`tools/build_cli.py`](https://github.com/mstan/psxrecomp/blob/master/tools/build_cli.py), [`tools/regen_bios.sh`](https://github.com/mstan/psxrecomp/blob/master/tools/regen_bios.sh), [`tools/setup_dev.sh`](https://github.com/mstan/psxrecomp/blob/master/tools/setup_dev.sh), [`tools/debug_client.py`](https://github.com/mstan/psxrecomp/blob/master/tools/debug_client.py), [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md)
- nesrecomp: [`tools/cli.py`](https://github.com/mstan/nesrecomp/blob/master/tools/cli.py), [`recompiler/src/main_nes.c`](https://github.com/mstan/nesrecomp/blob/master/recompiler/src/main_nes.c)
- snesrecomp: [`snesrecomp_cli.py`](https://github.com/mstan/snesrecomp/blob/main/snesrecomp_cli.py). gbarecomp: [`tools/cli.py`](https://github.com/mstan/gbarecomp/blob/main/tools/cli.py), [`tools/gba_recompile/main.cpp`](https://github.com/mstan/gbarecomp/blob/main/tools/gba_recompile/main.cpp)
- segagenesisrecomp: [`recompiler/src/main_genesis.c`](https://github.com/mstan/segagenesisrecomp/blob/master/recompiler/src/main_genesis.c), [`DEBUG.md`](https://github.com/mstan/segagenesisrecomp/blob/master/DEBUG.md)
- smsggrecomp: [`recompiler/src/main_sms.c`](https://github.com/mstan/smsggrecomp/blob/main/recompiler/src/main_sms.c). ndsrecomp: [`recompiler/src/main.cpp`](https://github.com/mstan/ndsrecomp/blob/main/recompiler/src/main.cpp). cdirecomp: [`README.md`](https://github.com/mstan/cdirecomp/blob/master/README.md), [`TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md)
- vbrecomp: [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md), [`README.md`](https://github.com/mstan/vbrecomp/blob/master/README.md)

## Next

- [Build a toolchain](/docs/guides/build-a-toolchain) builds every binary listed here.
- [Errors and exit codes](/docs/reference/errors-and-exit-codes) is what these tools return when they fail.
- [TCP debug protocol](/docs/reference/tcp-protocol) is the command surface the debug clients speak.
- [Machine-readable surfaces](/docs/agents/machine-surfaces) is the same ground written for an agent driving the tools.
