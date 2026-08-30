---
title: "Checking your own work"
summary: "The build command, test command and extra gates for every repository in the fleet that documents one, and what each gate can actually detect."
pageType: "reference"
tags: ["Agents", "Testing", "Verification"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/SuperMetroidRecomp"
  - "https://github.com/mstan/MegaManZeroRecomp"
  - "https://github.com/mstan/DKC2Recomp"
updated: "2026-08-25"
---

This is what each repository tells an agent to run to check its own work. The commands are copied as the repositories write them, and none has been run here, so treat the table as an index into the repositories, not as a tested script. The second half says what each gate can detect, which is the part that decides whether a pass means anything.

## What to run, by repository

Where a cell says UNKNOWN, the repository does not document one. That is a fact about the repository, not a gap in the table.

| Repository | Build | Test or verify | Other gates |
|---|---|---|---|
| [psxrecomp](https://github.com/mstan/psxrecomp) | `cd runtime/build && cmake --build . --target psx-runtime psx-beetle`; oracle library via `cd beetle-psx && make platform=mingw_x86_64 STATIC_LINKING=1 HAVE_LIGHTREC=0 -j8` | `ctest --test-dir recompiler/build-cli -R '^cli_boot_path_test$' --output-on-failure`, as run by CI | Session checklist including Ghidra MCP reachable; the Phase 5 gate in `docs/internal/STUBS_TO_FIX.md`; milestone is pixels on screen |
| [vbrecomp](https://github.com/mstan/vbrecomp) | build the skeleton | `python -m unittest discover recompiler/tests` | TCP `ping` must return `{"ok":true}`; a non-empty opcode-coverage report; regenerate, rebuild and re-run after any recompiler change |
| [nesrecomp](https://github.com/mstan/nesrecomp) | `cmake -S . -B build -G "Visual Studio 17 2022" -A x64`; `cmake --build build --config Release` | UNKNOWN as a command. The documented verification is a timed run plus a screenshot at `C:/temp/nes_shot_01.png` | RULE 0: no Ghidra MCP, no action. [`AGENTS.md`](https://github.com/mstan/nesrecomp/blob/master/AGENTS.md) requires a self-validated runtime check before any commit claim |
| [nesrecomp](https://github.com/mstan/nesrecomp) co-simulation | not applicable | `tools/nes_cosim.py` with `gate1`, `gate2`, `gate3`, `abram`, `abcycle`, `abppu`, `diff` or `run` | "Gates print PASS/FAIL and exit non-zero on FAIL (CI-gateable)" |
| [gbarecomp](https://github.com/mstan/gbarecomp) | build the core, run `gba_recompile`, build the game binary | run in normal, verify or oracle-compare mode; the `bios_intro_flawless` ctest; `python oracle/diff_frame.py --scan 1 240 1` must report IDENTICAL | coverage report must read FULLY STATIC with zero interpreted or healed code; check `recomp_master_misses.toml.frag` after every run |
| [ndsrecomp](https://github.com/mstan/ndsrecomp) | build the recompiler, regenerate, build the runner | UNKNOWN as a test command | the runtime hash-verifies all three dumps; `dispatch_misses.log` must be empty per CPU; the firmware-menu gate |
| [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) | `_build_recomp.bat` via PowerShell, then `_build_native.bat` per game | co-simulation harness built with `-DGENESIS_BUILD_COSIM=ON`; `tools/audit_runner_purity.py` | `dispatch_misses.toml` must be empty; a boot-smoke baseline commits alongside its code change; one runtime instance at a time, `taskkill` before relaunch |
| [smsggrecomp](https://github.com/mstan/smsggrecomp) | `cd recompiler && cmake -S . -B build -A x64 && cmake --build build --config Release` | decoder, ops and frontend self-tests under `tests/` | `dispatch_misses.log` empty; the user verifies end to end |
| [cdirecomp](https://github.com/mstan/cdirecomp) | build `CdiRecompBios` and `CdiRecomp`, then `CdiRecompBios bios/cdi490a.rom --emit`; oracle via `cmake -S oracle -B build/oracle -G Ninja -DCMAKE_BUILD_TYPE=Release` | `tools/first_divergence.py`, which pages both PC streams from sequence 0 | dispatch misses resolved before any other debugging |
| [gcnlle](https://github.com/mstan/gcnlle) | `./build.sh` | the repository states it "passes the 14-test runtime suite in each configuration when the MinGW CTest runner is used" | take a screenshot before asserting anything about visible state |
| [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp) | `cmake -G Ninja -B build -S . -DCMAKE_BUILD_TYPE=Debug -DCMAKE_C_COMPILER=gcc`; `cmake --build build -j 8` | `ctest --test-dir build`; `ctest --test-dir build -R sm_widescreen`; `python3 snesrecomp/tests/v2/run_tests.py` | `./tools/regen.sh --strict-idempotent` requires a byte-identical double regeneration; always a full regeneration, never `--banks` |
| [SuperMarioWorldRecomp](https://github.com/mstan/SuperMarioWorldRecomp) | UNKNOWN in `CLAUDE.md`; `CODEX_ANALYSIS.md` shows `MSBuild.exe smw.sln /p:Configuration=Oracle /p:Platform=x64 /m /v:minimal` | `python snesrecomp\tests\test_attract_demo_regression.py`; `python snesrecomp\tests\v2\run_tests.py` | RULE 0: never pause the runtime |
| [Megaman3NESRecomp](https://github.com/mstan/Megaman3NESRecomp) | build the nesrecomp recompiler, run `NESRecomp.exe` over the ROM, then `cmake --build build --config Release` | a seven-step debugging protocol with a mandated response format | full-state dump validation; a timeseries requirement |
| [YoshiNESRecomp](https://github.com/mstan/YoshiNESRecomp) | build the nesrecomp recompiler, run `NESRecomp.exe "Yoshi # NES.NES" --game game.cfg`, then `cmake.exe --build build --config Release` | `./build/Release/YoshiRecomp.exe "Yoshi # NES.NES" --verify` for native plus oracle, or `--emulated` | session start checklist; title-screen sync markers |
| [LegendOfZeldaNESRecomp](https://github.com/mstan/LegendOfZeldaNESRecomp) | `_zelda_release.bat` builds stock and HD; `cmake --build build_release --target LegendOfZeldaNESRecomp` | a TCP inspection loop over port 4370 | requires a stock PRG0 file matching the documented SHA-1 |
| [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp) | `tools/regen.ps1` after a metadata or recompiler change | `tools/verify-strict.ps1` | a strict pass is zero dispatch misses, interpreted instructions, healed or cached code, unmapped accesses and unhandled I/O; `tools/make_release.ps1` output must be free of game content |
| [DKC2Recomp](https://github.com/mstan/DKC2Recomp) | `cmake -S . -B build`, `cmake --build build --config Release`, or `make test` | `ctest --test-dir build -C Release --output-on-failure`; `make verify-rom ROM=...`; `make boot-rom ROM=...` | the complete suite before and after a milestone; strict warnings, never silence errors globally |
| [xboxlle-probe](https://github.com/mstan/xboxlle-probe) | `make -j2` under nxdk, as CI runs it | `python -m unittest discover -s tests -v`; `python -m py_compile host/xbox_probe.py` | a human authorisation gate before any hardware action; CI asserts `test -s bin/default.xbe` |
| [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp), [EmeraldRecomp](https://github.com/mstan/EmeraldRecomp), [RubySapphireRecomp](https://github.com/mstan/RubySapphireRecomp), [FireRedLeafGreenRecomp](https://github.com/mstan/FireRedLeafGreenRecomp) | MSYS2 mingw64 plus Ninja, invoked from PowerShell | defers to `gbarecomp`'s own rules and `DEBUG.md` | an ordered validation milestone ladder, "each measured (no eyeballing)" |
| the three [Dragon Ball Z](https://github.com/mstan/DragonBallZBuusFuryRecomp) repositories | `tools/regen.ps1` from a verified USA game file; MSYS2 mingw64 with CMake and Ninja | defers to `gbarecomp/DEBUG.md` | the SHA-1 identity gate must not be weakened |
| [TombaRecomp](https://github.com/mstan/TombaRecomp), [Tomba2Recomp](https://github.com/mstan/Tomba2Recomp), [ApeEscapeRecomp](https://github.com/mstan/ApeEscapeRecomp), [TsumuLightRecomp](https://github.com/mstan/TsumuLightRecomp), [MegaManX4Recomp](https://github.com/mstan/MegaManX4Recomp), [MegaManX5Recomp](https://github.com/mstan/MegaManX5Recomp), [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp) | defers to `psxrecomp-v4/CLAUDE.md` | UNKNOWN. None of the six documents a test command | after every run, resolve all dispatch misses before any other debugging |
| [SonicTheHedgehogRecomp](https://github.com/mstan/SonicTheHedgehogRecomp), [SonicTheHedgehog2Recomp](https://github.com/mstan/SonicTheHedgehog2Recomp) | `_build_native.bat`, `_build_oracle.bat`, `regen.bat` | defers to `segagenesisrecomp` | engine commit order: the submodule first, then the pointer bump |

Be careful with the deferring rows. The six PlayStation game repositories and the two Sonic release repositories have no test command of their own. They point at a framework checkout reached by a Windows directory junction or a workspace sibling, and neither is in a fresh clone. If you are in one of those, the framework row applies to you.

Three commands are worth reading closely. In the first, the flag is the gate.

From [`CLAUDE.md`](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md) in SuperMetroidRecomp, lines 27 to 30:

```sh
# --strict-idempotent regenerates twice and requires byte-identical output.
# --no-tests skips the framework test suite. Native analyzer needs rustup;
# SNESRECOMP_ANALYSIS_BACKEND=python selects the slower reference path.
./tools/regen.sh --strict-idempotent
```

From [`AGENTS.md`](https://github.com/mstan/DKC2Recomp/blob/main/AGENTS.md) in DKC2Recomp, lines 35 to 39, the one conventional build-and-test sequence in the fleet:

```powershell
cmake -S . -B build
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure
```

From [`AGENTS.md`](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md) in xboxlle-probe, lines 55 to 57, the only repository that says what verification remains when the resource it depends on is unavailable:

```sh
python -m unittest discover -s tests -v
python -m py_compile host/xbox_probe.py
```

## What each gate catches

A green build catches a compile error and nothing else. Every gate below exists because something got past the build. The [glossary](/docs/concepts/glossary) defines the terms as the fleet uses them.

### The dispatch-miss artefact

Catches code the recompiler never found. The dispatcher has no generated function for an address, so the game skips that subroutine and carries on, with no crash and no message. The file sits next to the executable and is read after every run: `dispatch_misses.toml` in [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp), `dispatch_misses.log` in [ndsrecomp](https://github.com/mstan/ndsrecomp) per CPU, in [vbrecomp](https://github.com/mstan/vbrecomp) and in [smsggrecomp](https://github.com/mstan/smsggrecomp), and `recomp_master_misses.toml.frag` in [gbarecomp](https://github.com/mstan/gbarecomp). Empty means clean. It does not catch code that was found and translated wrongly.

### The coverage report

Catches code that ran, but not as compiled native code. [gbarecomp](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) requires the report to read FULLY STATIC with zero interpreted and zero healed-from-cache, and prints it in the exit banner. [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md) requires the same zeroes plus zero unmapped accesses and zero unhandled I/O. This is the gate that catches a fallback quietly carrying the game.

### Oracle comparison and first divergence

Catches wrong behaviour, and it is the only gate that does. A reference implementation runs beside the recompiled build and the two states are compared. [gbarecomp](https://github.com/mstan/gbarecomp) requires `python oracle/diff_frame.py --scan 1 240 1` to report IDENTICAL. [cdirecomp](https://github.com/mstan/cdirecomp)'s `tools/first_divergence.py` pages both program-counter streams from sequence 0. [nesrecomp](https://github.com/mstan/nesrecomp)'s co-simulation gates also check the checker: `gate1` proves the recompiled side is deterministic against itself, `gate2` proves the oracle is, and `gate3` injects a one-byte flip and requires the diff to halt at the injected frame in the injected subsystem. That last one proves the hasher is not blind. See [proving it with co-simulation](/docs/concepts/co-simulation) and [debug a divergence](/docs/guides/debug-a-divergence).

### Idempotent regeneration

Catches nondeterminism in the recompiler itself. `./tools/regen.sh --strict-idempotent` in [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp) regenerates twice and requires byte-identical output. A generator that is not deterministic makes every comparison after it unreliable, and the failure stays invisible until two people get different results from the same input.

### Unit tests and ctest

Catches regressions in the framework's own logic, which is narrower than it sounds. [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp) runs game-side tests through `ctest --test-dir build` and the framework suite through `python3 snesrecomp/tests/v2/run_tests.py`. [vbrecomp](https://github.com/mstan/vbrecomp) runs `python -m unittest discover recompiler/tests`. [DKC2Recomp](https://github.com/mstan/DKC2Recomp) requires the complete suite before and after a milestone.

### Runner purity

Catches per-game data leaking into shared code. [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp)'s `tools/audit_runner_purity.py` enforces that per-game values reach the runner through `g_game_spec` and `g_game_layout`, not as literal hex. It catches the change that works perfectly for the game in front of you and breaks the next one.

### Hash verification at launch

Catches the wrong input file. The runtimes check what they were handed and refuse to start otherwise: [ndsrecomp](https://github.com/mstan/ndsrecomp) checks three dumps, [gbarecomp](https://github.com/mstan/gbarecomp) requires both the BIOS path and the game path to hash-verify. Comparing against an oracle running a different revision produces a divergence report that is real and useless.

### The debug server responding

Catches a runtime that started but cannot be observed. [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) makes it a milestone condition that TCP `ping` returns `{"ok":true}`. It is the cheapest check here, and worth running first, because every other observation arrives over that socket. See [the TCP debug protocol](/docs/reference/tcp-protocol).

### Exit codes

Catches failures in a scripted run, where nobody is watching the screen. [nesrecomp](https://github.com/mstan/nesrecomp)'s co-simulation gates print PASS or FAIL and exit non-zero on FAIL. Its input-script language has an `EXIT [code]` command, so a scripted play session is itself a pass or a fail. [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp)'s `sm_widescreen_visual_smoke` skips with code 77, the CTest skip convention, when its artefacts are missing, so a suite can report success while that test never ran. Check for skips. See [errors and exit codes](/docs/reference/errors-and-exit-codes).

### Screenshots and frame dumps

Catches what the other gates were not looking at. [gcnlle](https://github.com/mstan/gcnlle/blob/master/CLAUDE.md) requires a screenshot before you assert anything about visible state. Formats differ per toolchain, and repositories disagree on whether captures should be automatic, so follow the local rule.

## The four repositories that say what done means

Four repositories out of thirty-four state a definition of done precise enough to settle an argument.

From [`CLAUDE.md`](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md) in MegaManZeroRecomp, lines 19 to 23, the most mechanical:

> Run `tools/verify-strict.ps1` for the smoke route and the named campaign being
> changed. A strict pass must report zero dispatch misses, interpreted
> instructions, healed/cache code, unmapped accesses, and unhandled I/O. Visual
> or timing claims should cite the independent oracle and the exact checkpoints.

[gbarecomp](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) states the same shape in one line: repeat the regenerate, rebuild and re-run cycle "until the coverage report reads FULLY STATIC (zero interpreted / healed-from-cache)".

[psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) sets the bar at the end state a user can see:

> Phase completion requires the user-visible end state, not "I think it
> should work now". Phase 3 is "Sony logo displays on screen". Not "the
> recompiler emitted code that probably draws the logo". Not "the GPU
> command stream looks right in the debug server". **The pixels appear
> on screen, or the phase is not done.**

[segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) and [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md) put the decision with a person: the user verifies end to end, and a fix is not fixed without that confirmation.

Everywhere else, done is implicit, which means the agent decides. The one stated constraint is [`nesrecomp/AGENTS.md`](https://github.com/mstan/nesrecomp/blob/master/AGENTS.md), quoted in full on [contributing as an agent](/docs/agents/contributing-as-an-agent): do not declare a patch validated until you have validated it yourself, prefer a runtime check when the change affects rendering, input, timing or visible behaviour, and record the comparison you used.

If your repository is one of the thirty, adopt one of the four above, say which one you adopted, and record the measurement rather than the conclusion.

## Source

- The verification sections of the 36 agent instruction files, principally [`SuperMetroidRecomp/CLAUDE.md`](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md), [`gbarecomp/CLAUDE.md`](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md), [`MegaManZeroRecomp/CLAUDE.md`](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md), [`DKC2Recomp/AGENTS.md`](https://github.com/mstan/DKC2Recomp/blob/main/AGENTS.md) and [`psxrecomp/CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md).
- [`nesrecomp/COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md), the fullest gate suite in the fleet, including the fault-injection gate that checks the checker, and [`nesrecomp/AGENTS.md`](https://github.com/mstan/nesrecomp/blob/master/AGENTS.md) on who may claim a patch is validated.
- [`xboxlle-probe/AGENTS.md`](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md) and [`.github/workflows/ci.yml`](https://github.com/mstan/xboxlle-probe/blob/main/.github/workflows/ci.yml), the only repository that documents verification without its privileged resource.

## Next

- [When you cannot run the game](/docs/agents/when-you-cannot-run-the-game), because this table assumes a launch you may not manage.
- [Rules of the codebase](/docs/agents/house-invariants), the rules these gates enforce.
- [Machine-readable surfaces](/docs/agents/machine-surfaces), the JSON modes, log formats and exit codes behind them.
- [How changes go wrong here](/docs/agents/failure-modes), the failures that pass every gate above.
