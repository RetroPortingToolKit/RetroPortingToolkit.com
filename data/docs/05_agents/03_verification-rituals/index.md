---
title: "Checking your own work"
summary: "The build command, test command and extra gates for every repository in the fleet that documents one, and what each gate actually catches, so you are running a check rather than performing a ritual."
pageType: "reference"
tags: ["Agents", "Testing", "Verification"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/SuperMetroidRecomp"
  - "https://github.com/mstan/MegaManZeroRecomp"
  - "https://github.com/mstan/DKC2Recomp"
updated: "2026-08-23"
---

This is what each repository in the fleet tells an agent to run to check its own work. The commands are as the repositories write them, and none of them has been executed here, so treat the table as an index into the repositories rather than as a tested script. The second half of the page matters more than the first: a command you run without knowing what it can detect is a ritual, and a ritual that passes tells you nothing about whether you were right.

## What to run, by repository

Where a cell says UNKNOWN, the repository does not document one. That is a real finding about that repository, not a gap in this table.

| Repository | Build | Test or verify | Other gates |
|---|---|---|---|
| [psxrecomp](https://github.com/mstan/psxrecomp) | `cd runtime/build && cmake --build . --target psx-runtime psx-beetle`; oracle library via `cd beetle-psx && make platform=mingw_x86_64 STATIC_LINKING=1 HAVE_LIGHTREC=0 -j8` | `ctest --test-dir recompiler/build-cli -R '^cli_boot_path_test$' --output-on-failure`, as run by CI | Session checklist including Ghidra MCP reachable; the Phase 5 gate in `docs/internal/STUBS_TO_FIX.md`; milestone is pixels on screen |
| [vbrecomp](https://github.com/mstan/vbrecomp) | build the skeleton | `python -m unittest discover recompiler/tests` | TCP `ping` must return `{"ok":true}`; a non-empty opcode-coverage report; regenerate, rebuild and re-run after any recompiler change |
| [nesrecomp](https://github.com/mstan/nesrecomp) | `cmake -S . -B build -G "Visual Studio 17 2022" -A x64`; `cmake --build build --config Release` | UNKNOWN as a command. The documented verification is a timed run plus a screenshot at `C:/temp/nes_shot_01.png` | RULE 0: no Ghidra MCP, no action. [`AGENTS.md`](https://github.com/mstan/nesrecomp/blob/master/AGENTS.md) requires a self-validated runtime check before any commit claim |
| [nesrecomp](https://github.com/mstan/nesrecomp) co-simulation | not applicable | `tools/nes_cosim.py` with `gate1`, `gate2`, `gate3`, `abram`, `abcycle`, `abppu`, `diff` or `run` | "Gates print PASS/FAIL and exit non-zero on FAIL (CI-gateable)" |
| [gbrecompiled](https://github.com/mstan/gbrecompiled) | `PATH="$CLEAN_PATH" ninja -C build`, then `./build/bin/gbrecomp roms/tetris.gb -o tetris_test`, then `ninja -C tetris_test/build` | Run the game with `--dump-frames 60,300,600 --screenshot-prefix logs/gb_shot` and read the PPMs | RULE 0 Ghidra MCP gate; the canonical sync flow in [`AGENTS.md`](https://github.com/mstan/gbrecompiled/blob/master/AGENTS.md); unit tests explicitly not the primary driver |
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

The deferring rows are the ones to be careful with. The six PlayStation game repositories and the two Sonic release repositories have no test command of their own; they point at a framework checkout reached by a Windows directory junction or a workspace sibling, which is not present in a fresh clone. If you are in one of those, the framework row above is the row that applies to you, and [If you are an agent, start here](/docs/agents/start-here) explains how those deferrals are meant to work.

Three commands are worth reading closely because they encode a gate rather than just an invocation.

From [`CLAUDE.md`](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md) in SuperMetroidRecomp, lines 27 to 30, where the flag is the check:

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

From [`AGENTS.md`](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md) in xboxlle-probe, lines 55 to 57, the only repository that states what verification remains when the privileged resource is unavailable:

```sh
python -m unittest discover -s tests -v
python -m py_compile host/xbox_probe.py
```

## What each gate actually catches

A green build catches nothing except a compile error. Every gate below exists because something got through the build. Where a term is unfamiliar, the [glossary](/docs/concepts/glossary) defines it as the fleet uses it.

### The dispatch-miss artefact

Catches code the recompiler never found. When the dispatcher has no generated function for an address, the game skips that subroutine and continues, so nothing crashes and nothing prints. The file sits next to the executable and is checked after every run: `dispatch_misses.toml` in [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp), `dispatch_misses.log` in [ndsrecomp](https://github.com/mstan/ndsrecomp) per CPU, in [vbrecomp](https://github.com/mstan/vbrecomp) and in [smsggrecomp](https://github.com/mstan/smsggrecomp), and `recomp_master_misses.toml.frag` in [gbarecomp](https://github.com/mstan/gbarecomp). Empty means clean. It does not catch code that was found and translated wrongly.

### The coverage report

Catches code that ran but did not run as compiled native code. [gbarecomp](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) requires the report to read FULLY STATIC with zero interpreted and zero healed-from-cache, and it prints in the exit banner. [MegaManZeroRecomp](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md) requires the same zeroes plus zero unmapped accesses and zero unhandled I/O. This is the gate that catches a fallback quietly carrying the game.

### Oracle comparison and first divergence

Catches wrong behaviour, which is the only gate that does. A reference implementation runs beside the recompiled build and their state is compared. [gbarecomp](https://github.com/mstan/gbarecomp) requires `python oracle/diff_frame.py --scan 1 240 1` to report IDENTICAL. [cdirecomp](https://github.com/mstan/cdirecomp)'s `tools/first_divergence.py` pages both program-counter streams from sequence 0. [nesrecomp](https://github.com/mstan/nesrecomp)'s co-simulation gates go further and check the checker: `gate1` proves the recompiled side is deterministic against itself, `gate2` proves the oracle is, and `gate3` injects a one-byte flip and requires the diff to halt at the injected frame in the injected subsystem, which is what proves the hasher is not blind. See [proving it with co-simulation](/docs/concepts/co-simulation) and [debug a divergence](/docs/guides/debug-a-divergence).

### Idempotent regeneration

Catches nondeterminism in the recompiler itself. `./tools/regen.sh --strict-idempotent` in [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp) regenerates twice and requires byte-identical output. A generator that is not deterministic makes every downstream comparison unreliable, and the failure is invisible until two people get different results from the same input.

### Unit tests and ctest

Catches regressions in the framework's own logic, which is a narrower thing than it sounds. [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp) runs game-side tests through `ctest --test-dir build` and the framework suite through `python3 snesrecomp/tests/v2/run_tests.py`. [vbrecomp](https://github.com/mstan/vbrecomp) runs `python -m unittest discover recompiler/tests`. [DKC2Recomp](https://github.com/mstan/DKC2Recomp) requires the complete suite before and after a milestone. [gbrecompiled](https://github.com/mstan/gbrecompiled/blob/master/CLAUDE.md) takes the opposite line and says not to run unit tests as the primary driver, but to run the game; that disagreement is recorded on [Rules of the codebase](/docs/agents/house-invariants).

### Runner purity

Catches per-game data leaking into shared code. [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp)'s `tools/audit_runner_purity.py` enforces the rule that per-game values reach the runner through `g_game_spec` and `g_game_layout` rather than as literal hex in shared code. It catches a class of change that works perfectly for the game in front of you and breaks the next one.

### Hash verification at launch

Catches the wrong input file. The runtimes verify what they were handed and refuse to start otherwise: [ndsrecomp](https://github.com/mstan/ndsrecomp) checks three dumps, [gbarecomp](https://github.com/mstan/gbarecomp) requires both the BIOS path and the game path to hash-verify. This gate protects every measurement downstream of it, because a comparison against an oracle running a different revision produces a divergence report that is entirely real and entirely useless.

### The debug server responding

Catches a runtime that came up but is not observable. [vbrecomp](https://github.com/mstan/vbrecomp/blob/master/CLAUDE.md) makes it a milestone condition that TCP `ping` returns `{"ok":true}`. It is the cheapest check on this page and it is worth running first, because every other observation in the fleet arrives over that socket. See [the TCP debug protocol](/docs/reference/tcp-protocol).

### Exit codes

Catches failures in a scripted run, where nobody is watching the screen. [nesrecomp](https://github.com/mstan/nesrecomp)'s co-simulation gates print PASS or FAIL and exit non-zero on FAIL, which is what makes them usable as a gate at all. Its input-script language has an `EXIT [code]` command, so a scripted play session is itself a pass or fail. [SuperMetroidRecomp](https://github.com/mstan/SuperMetroidRecomp)'s `sm_widescreen_visual_smoke` skips with code 77, the CTest skip convention, when its artefacts are missing, which means a suite can report success while that test never ran. Check for skips. See [errors and exit codes](/docs/reference/errors-and-exit-codes).

### Screenshots and frame dumps

Catches what the other gates were not looking at. [gcnlle](https://github.com/mstan/gcnlle/blob/master/CLAUDE.md) requires a screenshot before asserting anything about visible state. [gbrecompiled](https://github.com/mstan/gbrecompiled) dumps frames at fixed indices and expects them to be read. The formats differ per toolchain, and the repositories disagree on whether captures should be automatic at all, so follow the local rule.

## The four repositories that say what done means

Four repositories out of thirty-four state a definition of done precise enough to settle an argument. They are the model, and they are quoted here because the other thirty leave the question implicit.

From [`CLAUDE.md`](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md) in MegaManZeroRecomp, lines 19 to 23, the strictest and the most mechanical:

> Run `tools/verify-strict.ps1` for the smoke route and the named campaign being
> changed. A strict pass must report zero dispatch misses, interpreted
> instructions, healed/cache code, unmapped accesses, and unhandled I/O. Visual
> or timing claims should cite the independent oracle and the exact checkpoints.

[gbarecomp](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md) states the same shape as one readable line: repeat the regenerate, rebuild and re-run cycle "until the coverage report reads FULLY STATIC (zero interpreted / healed-from-cache)".

[psxrecomp](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md) sets the bar at the user-visible end state instead of at a counter, and it is worth reading in full because it names the failure it was written against:

> Phase completion requires the user-visible end state, not "I think it
> should work now". Phase 3 is "Sony logo displays on screen". Not "the
> recompiler emitted code that probably draws the logo". Not "the GPU
> command stream looks right in the debug server". **The pixels appear
> on screen, or the phase is not done.**

[segagenesisrecomp](https://github.com/mstan/segagenesisrecomp/blob/master/CLAUDE.md) puts the decision with a person: the user verifies end to end, and a fix is not called fixed without their confirmation. [smsggrecomp](https://github.com/mstan/smsggrecomp/blob/main/CLAUDE.md) says the same.

Everywhere else, done is implicit. In practice that means the agent decides, and the only stated constraint is the one in [`nesrecomp/AGENTS.md`](https://github.com/mstan/nesrecomp/blob/master/AGENTS.md), the shortest file in the corpus, which does not define done but does define who may claim it:

> Do not declare a patch committed, ready to merge, or validated until you have
> validated it yourself. Prefer runtime checks with TCP input/screenshot tooling
> when the change affects rendering, input, timing, or visible game behavior.
> Record both the before/after condition or the regression comparison used.

If your repository is one of the thirty, adopt one of the four above, say in your report which one you adopted, and record the measurement rather than the conclusion. [Contributing as an agent](/docs/agents/contributing-as-an-agent) covers how to write that report.

## Source

- The verification sections of the 36 agent instruction files, principally [`SuperMetroidRecomp/CLAUDE.md`](https://github.com/mstan/SuperMetroidRecomp/blob/main/CLAUDE.md), [`gbarecomp/CLAUDE.md`](https://github.com/mstan/gbarecomp/blob/main/CLAUDE.md), [`MegaManZeroRecomp/CLAUDE.md`](https://github.com/mstan/MegaManZeroRecomp/blob/main/CLAUDE.md), [`DKC2Recomp/AGENTS.md`](https://github.com/mstan/DKC2Recomp/blob/main/AGENTS.md) and [`psxrecomp/CLAUDE.md`](https://github.com/mstan/psxrecomp/blob/master/CLAUDE.md).
- [`nesrecomp/COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md), the fullest description of a gate suite in the fleet, including the fault-injection gate that checks the checker.
- [`xboxlle-probe/AGENTS.md`](https://github.com/mstan/xboxlle-probe/blob/main/AGENTS.md) and [`.github/workflows/ci.yml`](https://github.com/mstan/xboxlle-probe/blob/main/.github/workflows/ci.yml), the only repository that documents verification without its privileged resource.
- [`nesrecomp/AGENTS.md`](https://github.com/mstan/nesrecomp/blob/master/AGENTS.md), on who may claim a patch is validated.

## Next

- [When you cannot run the game](/docs/agents/when-you-cannot-run-the-game), because most of this table assumes a launch you may not be able to perform.
- [Rules of the codebase](/docs/agents/house-invariants), for the rules these gates enforce and the places repositories disagree.
- [Machine-readable surfaces](/docs/agents/machine-surfaces), for the JSON modes, log formats and exit codes behind these gates.
- [How changes go wrong here](/docs/agents/failure-modes), for the failures that pass every gate above.
