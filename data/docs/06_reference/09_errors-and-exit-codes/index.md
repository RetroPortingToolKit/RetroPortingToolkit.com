---
title: "Errors and exit codes"
summary: "What every tool in the fleet returns when it fails, how the debug protocol reports errors, and the documented failures with their causes and fixes, so a script or an agent can act on a result instead of guessing."
pageType: "reference"
tags: ["Reference", "Errors", "Exit codes"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/gcnlle"
  - "https://github.com/mstan/gbrecompiled"
  - "https://github.com/mstan/SuperMarioWorldRecomp"
updated: "2026-08-25"
---

A tool that fails is only useful if you can tell what went wrong. Below are every exit code the fleet's tools define, the two error shapes the debug protocol uses, and the documented failures with their causes and fixes.

Every row comes from a tool's own source or its own documentation. Where a tool states no exit codes, this page says so. A guessed exit code in a script is worse than none.

## Exit codes by tool

| Tool | Code | Meaning |
|---|---|---|
| `psxrecomp_cli.py` | 0 | Success |
| `psxrecomp_cli.py` | 1 | Runtime error |
| `psxrecomp_cli.py` | 2 | Usage error |
| `psxrecomp_cli.py` | 3 | Disc verification failed |
| `psxrecomp build` | 0 | Success, and the code returned for `--help` |
| `psxrecomp build` | 1 | Any thrown error, including a BIOS that is not exactly 512 KiB |
| `psxrecomp build` | 2 | Invoked with no arguments |
| `psxrecomp-bios` | 0 | Walk completed, all instructions translated, `boot_slice.c` compiled cleanly, manifest written, `unsupported_ops.json` empty |
| `psxrecomp-bios` | 1 | Any failure: file size, walk, unsupported instruction, codegen self-validation |
| `psxrecomp-bios` | 2 | CLI usage error |
| `tools/regen_bios.sh` | 2 | Any flag other than `--config`, rather than silently regenerating the default |
| `tools/debug_client.py` | 1 | Connection refused |
| `nesrecomp build` (`tools/cli.py`) | 2 | `FileNotFoundError`, `RuntimeError` or `ValueError` |
| `snesrecomp build` | 1 | `OSError`, `RuntimeError` or `ValueError` |
| `nds_recompile` | 2 | Unknown argument, or missing `--config` or `--bin` |
| `GenesisRecomp` | 1 | Invoked with no arguments |
| `gcn_debug_client.py` | 2 | Missing arguments |
| `boot_smoke.py` | 0 | Match, or baseline written |
| `boot_smoke.py` | 1 | Divergence against the baseline |
| `boot_smoke.py` | 2 | Connection, runner or ring-eviction error |
| `boot_smoke.py` | 3 | No baseline file present |
| `zone_smoke.py` | 0 | Match |
| `zone_smoke.py` | 1 | Divergence, meaning visible behaviour changed |
| `zone_smoke.py` | 2 | Environment or runner error |
| `zone_smoke.py` | 3 | No baseline yet |
| `package_release.py` | non-zero | Any compliance failure |
| `package_setup_host.sh` | 1 | `psxrecomp/` or `recomp-ui/` absent from the tree, or `--embed-toolchain` passed with no toolchain directory |
| `build_all.bat` (FaxanaduRecomp) | 2 | Stage 2 failed: regenerating the game C |
| `build_all.bat` (FaxanaduRecomp) | 3 | Stage 3 configure failed |
| `build_all.bat` (FaxanaduRecomp) | 4 | Stage 3 build failed |
| A compiler under memory pressure | -1 | No diagnostic, empty output. This is an over-subscribed `-j`, not a source bug |

Any tool not listed here does not document its exit codes. Treat non-zero as failure and nothing finer.

## The CTest convention

**Exit code 77 means skipped in CTest**, and the fleet uses it. SuperMetroidRecomp's widescreen visual smoke test exits 77 when its artifacts are missing, so a test that cannot run reports as skipped instead of as a pass or a failure.

Three more rules govern what gets registered with CTest at all.

- **An unregistered test cannot fail.** psxrecomp's testing document states it as a rule: if you add a test, add it to `ctest` in the same commit, because a test that cannot fail is not a test.
- **A test that needs a game file is deliberately not registered.** segagenesisrecomp's `l1_decoder_test` is built but left out of CTest because it requires a ROM the user supplies.
- **CI excludes the suites that need inputs it does not have.** BoktaiRecomp runs `ctest --test-dir build -E "oracle|bios_intro_flawless" --output-on-failure`, excluding the two suites that need a vendored oracle checkout and a BIOS.

`--output-on-failure` is the fleet's standard CTest flag. A failure you cannot read is a failure you will just run again.

## Error shapes on the debug protocol

The wire protocol is JSON over newline, one object per line. There are two response shapes, and a client has to handle both spellings of the error key.

| Shape | Meaning | Where |
|---|---|---|
| `{"id": N, "ok": true, ...data}` | Success | Every server |
| `{"id": N, "ok": false, "error": "<msg>"}` | Failure | psxrecomp, gbarecomp, vbrecomp, cdirecomp |
| `{"ok": false, "err": "<msg>"}` | Failure | nesrecomp and its game repositories |

Four things to know before you write a client.

- A command line longer than **8192 bytes** is rejected, and every server takes **one client at a time**.
- On psxrecomp an inline response is bounded at 2 seconds per zero-progress chunk and **15 seconds total**. A client that goes over is disconnected. Anything bigger uses the `*_dump_file` variants, which write to disk instead of the socket.
- An unknown argument to `nds_recompile` prints `unknown arg: <a>`.
- Some commands error by design. psxrecomp's `pause`, `continue`, `step` and `run_to_frame` are removed but still registered, so they always error. ndsrecomp's `run_to_*` commands error in play mode, because the frontend owns execution there.

## Configure and build failures

| Symptom | Cause | Fix | Source |
|---|---|---|---|
| `Cannot find source file: .../generated/OpenBIOS_full.c`, then `No SOURCES given to target: psx-runtime` | Fresh clone. The recompiled BIOS C is build output, is not tracked, and CMake does not fall back | `bash tools/regen_bios.sh --config bios/OpenBIOS.toml` before configuring the runtime | [`psxrecomp/docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) |
| `No recompiled BIOS backend available` at configure time | Same cause | Same fix. The runtime reads `<framework>/generated/<stem>_full.c` and `<stem>_dispatch.c`, and that location is fixed | [`psxrecomp/docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) |
| `regen_bios: no usable recompiler build dir found` | The script builds the BIOS emitter but never configures it | Build the recompiler first. `PSXRECOMP_BIOS_BUILD` resolves relative to the framework root, not your shell's working directory | [`psxrecomp/docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) |
| Fingerprint-mismatch warning at configure time | The BIOS emitter changed but `generated/` was not refreshed, and the recompiler and runtime are separate CMake trees | Re-run `tools/regen_bios.sh`, which records the emitter fingerprint the warning checks | [`psxrecomp/tools/regen_bios.sh`](https://github.com/mstan/psxrecomp/blob/master/tools/regen_bios.sh) |
| `ninja: error: loading 'build.ninja': GetLastError() = 2`, or CMake cannot load the cache | A build was run in a directory that was never successfully configured. `CMakeCache.txt` is written before the generate step | Re-run the same `cmake -S ... -B ...` and read the real configure error. Delete the build directory if it recurs | [`psxrecomp/docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) |
| MinGW: `Error: too many sections`, or an object file fails to assemble | Windows COFF objects have a 32,768 section limit, and generated C or the debug server can exceed it on older binutils | Add `-Wa,-mbig-obj` to those compile options. Binutils 2.40 and newer generally do not need it | [`psxrecomp/docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) |
| `cmake --build` dies with no diagnostic, exit -1 | Memory exhaustion on multi-megabyte translation units at `-O3` | Lower `-j`, to 2 or 1 | [`SuperMarioWorldRecomp/RELEASE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/RELEASE.md), [`psxrecomp/docs/TESTING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/TESTING.md) |
| `SDL3 3.4+ was not found` | Network access blocked, or `PSX_SDL3_FETCH` turned off | Install a system SDL3 package and set `SDL3_DIR`, or re-enable `-DPSX_SDL3_FETCH=ON` | [`psxrecomp/docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) |
| `SDL2 MSVC dev package not found` | Only when `-DPSX_SDL_BACKEND=SDL2` is selected | Place the prebuilt SDL2 pack beside the repository, or use MSYS2 and MinGW with SDL2 on pkg-config | [`psxrecomp/docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) |
| Configure fails with `FATAL_ERROR` on `PSX_RECOMP_UI=ON` | The `recomp-ui` submodule is absent | Clone with `--recurse-submodules`, or pass `-DPSX_RECOMP_UI=OFF` | [`psxrecomp/docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) |
| CMake reports it is not able to compile a simple test program, under MSYS2 | The msys2 mingw64 gcc needs its own bin directory on PATH for its runtime DLLs | `export PATH="/c/msys64/mingw64/bin:$PATH"` before configuring | [`gcnlle/build.sh`](https://github.com/mstan/gcnlle/blob/master/build.sh) |
| `error C3861: '__builtin_clz': identifier not found` | MSVC compiling gbarecomp's `bios_hle.cpp`, which uses a GCC and Clang builtin | Build with MSYS2 MinGW on Windows | [`BoktaiRecomp/.github/workflows/ci.yml`](https://github.com/Shy/BoktaiRecomp/blob/main/.github/workflows/ci.yml) |
| Spurious link errors after a regeneration adds or removes generated banks | Generated banks are globbed, so new files are not in the build until you reconfigure | Reconfigure the build directory | [`DKC2Recomp/ISSUES.md`](https://github.com/mstan/DKC2Recomp/blob/main/ISSUES.md) |
| A mingw gcc build fails on permissions | mingw gcc needs Windows-style `TMP` and `TEMP`, or it falls back to a directory it cannot write | Set `TMP` and `TEMP` to a writable Windows-style path | [`DKC2Recomp/ISSUES.md`](https://github.com/mstan/DKC2Recomp/blob/main/ISSUES.md) |
| Python or CMake mangles Windows path arguments | The msys2 or devkitPro binary on PATH rewrites Windows paths | Use the native Windows Python, and the mingw64 `cmake.exe` by absolute path | [`DKC2Recomp/ISSUES.md`](https://github.com/mstan/DKC2Recomp/blob/main/ISSUES.md), [`cdirecomp/TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md) |
| `-DSNESRECOMP_BUILD_VERSION=0.10.0` ends up as `"0"` | PowerShell rewrites the unquoted form, which would ship crash reports that cannot be tied to a release | Quote it as `"-DSNESRECOMP_BUILD_VERSION:STRING=0.10.0"` | [`SuperMarioWorldRecomp/RELEASE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/RELEASE.md) |
| `WinError 2` from a psxrecomp Python codegen test | A relative recompiler path passes the test's own file check and then fails inside `subprocess.run` on Windows | Pass the recompiler as an absolute path | [`psxrecomp/docs/TESTING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/TESTING.md) |

## Runtime and correctness failures

| Symptom | Cause | Fix | Source |
|---|---|---|---|
| The game silently skips whole subroutines | A dispatch miss: the dispatcher found no generated function for an address. Called a silent game-breaking bug in four toolchains | Read `dispatch_misses.log` next to the executable, add the listed functions to `game.toml [functions]`, regenerate, rebuild, repeat until empty | [`gbarecomp/DEBUG.md`](https://github.com/mstan/gbarecomp/blob/main/DEBUG.md), [`vbrecomp/TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md), [`smsggrecomp/DEBUG.md`](https://github.com/mstan/smsggrecomp/blob/main/DEBUG.md) |
| Areas of a psxrecomp game stay slow and never go native | Overlays never compiled. In development the `gcc` tier needs `gcc` on `PATH`, otherwise those areas stay in the interpreter | Put `gcc` on `PATH`. End-user packages bundle a compiler instead | [`psxrecomp/docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md) |
| Frames drop to a fraction of normal speed while a debug client is attached | The debug server is pumped on the main thread, and a client trickle-draining large dumps throttles it | Check `tcp_send_stall_ms` and `tcp_clients_dropped` in `psx_freeze_heartbeat.json` first. Use the `*_dump_file` variants | [`psxrecomp/TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md) |
| A screenshot looks clean but the player sees a broken frame | `screenshot` captures native 15-bit VRAM and is blind to anything that exists only in the hi-res mirror | Use `screenshot_hires` | [`psxrecomp/TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md) |
| A gcnlle screenshot is entirely black | Until the GX command processor is modelled the menu never draws, so black is the correct current output | Read `mean_luma` in the response, near 16 for black, before concluding it is a bug | [`gcnlle/docs/TCP_COMMANDS.md`](https://github.com/mstan/gcnlle/blob/master/docs/TCP_COMMANDS.md) |
| An enhancement flag is on but nothing changes | Both enhancements fall back to the faithful path on anything they cannot prove is projected geometry | Query `geom_correction` twice and diff the counters for a rate | [`psxrecomp/TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md) |
| A probe writes to guest RAM and the write is invisible | On segagenesisrecomp the runner-side RAM shadow does not propagate to the memory that snapshots and the frame record read from | Write through the bus path, `m68k_write8` or `m68k_write16` | [`segagenesisrecomp/DEBUG.md`](https://github.com/mstan/segagenesisrecomp/blob/master/DEBUG.md) |
| A trace query returns nothing because the events predate the query | The ring was not always-on, or is too small for the window. A 1 M entry oracle ring rolled over after about 100 frames in one case | Size the ring, do not probe faster. SNES exposes ring sizes as build variables | [`SuperMarioWorldRecomp/docs/TROUBLESHOOTING.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/docs/TROUBLESHOOTING.md) |
| A write-trace dump does not contain the buffer you are hunting | The address filter is applied over the full ring before the emit cap, so without it you see only the oldest entries | Always pass `addr_lo` and `addr_hi` | [`psxrecomp/TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md) |
| A `read_ram` poll appears as guest activity in a lockstep trace | Observer reads leaking into the recorded trace as phantom guest operations, producing a false divergence | Already fixed centrally by suppressing lockstep recording around every handler. Do not add per-handler logic that could be forgotten | [`psxrecomp/runtime/src/debug_server.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/debug_server.c) |
| Native boots but skips a BIOS intro the oracle plays | The two processes are not both running through their real BIOS | Stop debugging the game and fix the BIOS boot path first, because every later divergence is polluted by it | [`gbarecomp/DEBUG.md`](https://github.com/mstan/gbarecomp/blob/main/DEBUG.md) |
| An exe cannot be relinked on Windows, reporting permission denied | The exe file lock can persist after process exit | Kill the process by image name, delete the exe if the linker still fails, then rebuild | [`psxrecomp/DEBUG.md`](https://github.com/mstan/psxrecomp/blob/master/DEBUG.md) |
| A debugging session built on a handoff that turns out to be wrong | A stale hypothesis. In the recorded case the handoff said a handler was never installed, and live inspection proved it was | Update the problem statement before changing code | [`psxrecomp/DEBUG.md`](https://github.com/mstan/psxrecomp/blob/master/DEBUG.md) |

## Packaging and release failures

| Symptom | Cause | Fix | Source |
|---|---|---|---|
| A release zip shipped the ROM | The build copies the ROM next to the exe, so zipping the build folder sweeps it in. This happened once, in a published release | Package with the allowlist tool, which refuses when a ROM, dump or junk file is present | [`segagenesisrecomp/RELEASING.md`](https://github.com/mstan/segagenesisrecomp/blob/master/RELEASING.md) |
| A Linux or Steam Deck user extracts the zip and the launcher finds no fonts | `Compress-Archive` writes Windows backslashes into ZIP entry names | Write portable `/` entry names, then re-read the archive and reject Windows-only names | [`SuperMarioWorldRecomp/RELEASE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/RELEASE.md), [`psxrecomp/tools/create_release_zip.py`](https://github.com/mstan/psxrecomp/blob/master/tools/create_release_zip.py) |
| A macOS build dies at startup reporting it failed to load SDL3 | A dlopen'd library that `otool -L` cannot see, because Homebrew's SDL2 is often a shim over SDL3 | Package with `packaging/package_macos.sh`, which finds and copies it | [`gbarecomp/packaging/README.md`](https://github.com/mstan/gbarecomp/blob/main/packaging/README.md) |
| A macOS `.app` bundle is killed before printing anything | Assets must sit beside the executable, where `codesign` treats them as code, so the bundle cannot hold a valid signature | Ship a flat directory, which is not bundle-validated and works signed or unsigned | [`gbarecomp/packaging/README.md`](https://github.com/mstan/gbarecomp/blob/main/packaging/README.md) |
| A Linux tarball breaks on another machine, or loses hardware acceleration | Over-bundling. glibc, libstdc++, the loader and the graphics stack belong to the host | Bundle only what `package_linux.sh` bundles | [`gbarecomp/packaging/README.md`](https://github.com/mstan/gbarecomp/blob/main/packaging/README.md) |
| A Windows exe fails at launch with `0xc000007b` | A MinGW build dynamically imports SDL and the GCC runtime DLLs, and finds a different-architecture copy earlier on the search path | Build with the static runtime option, on by default for MinGW Release, which removes every non-system import | [`psxrecomp/runtime/runtime.cmake`](https://github.com/mstan/psxrecomp/blob/master/runtime/runtime.cmake) |
| A bare exe is published and does not run | It needs its SDL DLL and the launcher assets tree | Ship exactly one asset per platform, never a bare exe | [`FaxanaduRecomp/RELEASE.md`](https://github.com/mstan/FaxanaduRecomp/blob/master/RELEASE.md) |
| The setup-host packager refuses a host exe | The exe was not built with the current framework, so its version stamp is missing or disagrees with `VERSION`. This produced a netplay list-filter bug | Rebuild against the current framework, then repackage | [`psxrecomp/tools/package_setup_host.sh`](https://github.com/mstan/psxrecomp/blob/master/tools/package_setup_host.sh) |
| AppImage state lands inside the read-only payload | The AppRun did not export `$APPIMAGE`, so state anchored inside the squashfs mount | Use `tools/build-linux.sh`, whose layout test fails the build on exactly this | [`SuperMarioWorldRecomp/RELEASE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/RELEASE.md) |
| `adb devices` shows a device as `unauthorized` | USB debugging not accepted on the handset | Unlock the device, accept the prompt, and re-run until it shows as a device | [`gbrecompiled/ANDROID.md`](https://github.com/mstan/gbrecompiled/blob/master/ANDROID.md) |
| Android build fails with `SDL2_SOURCE_DIR is required` | The generated Android project fails early when that variable is missing | Export `SDL2_SOURCE_DIR`, or pass it inline to gradle | [`gbrecompiled/ANDROID.md`](https://github.com/mstan/gbrecompiled/blob/master/ANDROID.md) |
| A CI check goes red so often that nobody reads it | A check nobody trusts still costs attention | psxrecomp's answer was to delete the untrusted check and keep only release packaging | [`psxrecomp/.github/workflows/cli-release.yml`](https://github.com/mstan/psxrecomp/blob/master/.github/workflows/cli-release.yml) |

## Documented commands that are not in this checkout

An error can also mean the command was never built. Three cases are recorded. Treat them as documentation running ahead of the code, not as a bug.

- gbarecomp's `TCP.md` describes a reverse debugger family, `rdb_*`, gated on a `--reverse-debug` flag and a build option. In this checkout neither the flag nor the build option nor the source file exists, so those tables are the documented design, not verified behaviour. Two implemented commands, `run_frames` and `step_inst`, are missing from that document in the other direction.
- Several vbrecomp commands that its `TCP.md` lists are not in the dispatch chain, including `dump_ram`, `write_ram`, `history`, `step`, `run_to_frame`, `frame_diff` and `first_divergence`. `watchdog` is implemented while `watchdog_status` is documented.
- cdirecomp marks a set of commands as planned and not live, among them `write_mem`, `get_frame`, `frame_range`, `continue`, `frame_diff` and `first_divergence`.

## What is not documented

Two gaps, stated so nobody fills them with a guess. Most tools in the fleet state no exit codes at all, and the table above is the complete set that do. And nothing signs release artefacts, apart from one ad-hoc macOS signature, so there is no signature check failure to document.

## Source

- psxrecomp: [`docs/BUILDING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/BUILDING.md), [`docs/TESTING.md`](https://github.com/mstan/psxrecomp/blob/master/docs/TESTING.md), [`DEBUG.md`](https://github.com/mstan/psxrecomp/blob/master/DEBUG.md), [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md), [`psxrecomp_cli.py`](https://github.com/mstan/psxrecomp/blob/master/psxrecomp_cli.py), [`recompiler/src/main_bios.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/main_bios.cpp), [`recompiler/src/main_cli.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/main_cli.cpp)
- segagenesisrecomp: [`DEBUG.md`](https://github.com/mstan/segagenesisrecomp/blob/master/DEBUG.md), [`RELEASING.md`](https://github.com/mstan/segagenesisrecomp/blob/master/RELEASING.md), [`README.md`](https://github.com/mstan/segagenesisrecomp/blob/master/README.md)
- gbarecomp: [`DEBUG.md`](https://github.com/mstan/gbarecomp/blob/main/DEBUG.md), [`TCP.md`](https://github.com/mstan/gbarecomp/blob/main/TCP.md), [`packaging/README.md`](https://github.com/mstan/gbarecomp/blob/main/packaging/README.md)
- nesrecomp: [`tools/cli.py`](https://github.com/mstan/nesrecomp/blob/master/tools/cli.py), [`TCP.md`](https://github.com/mstan/nesrecomp/blob/master/TCP.md). snesrecomp: [`snesrecomp_cli.py`](https://github.com/mstan/snesrecomp/blob/main/snesrecomp_cli.py). ndsrecomp: [`recompiler/src/main.cpp`](https://github.com/mstan/ndsrecomp/blob/main/recompiler/src/main.cpp), [`TCP.md`](https://github.com/mstan/ndsrecomp/blob/main/TCP.md)
- vbrecomp: [`TCP.md`](https://github.com/mstan/vbrecomp/blob/master/TCP.md). cdirecomp: [`TCP.md`](https://github.com/mstan/cdirecomp/blob/master/TCP.md). gcnlle: [`build.sh`](https://github.com/mstan/gcnlle/blob/master/build.sh), [`docs/TCP_COMMANDS.md`](https://github.com/mstan/gcnlle/blob/master/docs/TCP_COMMANDS.md). gbrecompiled: [`ANDROID.md`](https://github.com/mstan/gbrecompiled/blob/master/ANDROID.md)
- Game repositories: [`SuperMarioWorldRecomp/RELEASE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/RELEASE.md), [`SuperMarioWorldRecomp/docs/TROUBLESHOOTING.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/docs/TROUBLESHOOTING.md), [`FaxanaduRecomp/RELEASE.md`](https://github.com/mstan/FaxanaduRecomp/blob/master/RELEASE.md), [`DKC2Recomp/ISSUES.md`](https://github.com/mstan/DKC2Recomp/blob/main/ISSUES.md), [`SuperMetroidRecomp/CLAUDE.md`](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md), [`BoktaiRecomp/.github/workflows/ci.yml`](https://github.com/Shy/BoktaiRecomp/blob/main/.github/workflows/ci.yml)

## Next

- [Command line reference](/docs/reference/cli) is the flag surface these codes come out of.
- [Debug a divergence](/docs/guides/debug-a-divergence) is the workflow for the correctness failures listed here.
- [Build a toolchain](/docs/guides/build-a-toolchain) is where most of the configure failures happen.
- [Release a port](/docs/guides/release-a-port) covers the packaging refusals in full.
