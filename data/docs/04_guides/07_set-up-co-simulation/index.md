---
title: "Set up co-simulation"
summary: "Standing up co-simulation on a real project: build the oracle from a known good emulator, wire both sides to answer the same TCP commands, fix the clock and the stride, prove the harness with its gates, then run, read the first divergence, and keep the green run as a baseline."
pageType: "guide"
tags: ["Correctness", "Testing", "Co-simulation"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/gbarecomp"
updated: "2026-08-27"
---

This is the setup work: build the reference, wire it in, fix the clock, prove the harness is honest, then run it and keep the result. [Co-simulation](/docs/concepts/co-simulation) explains the method itself. This page stops where a run halts, which is where [debug a divergence](/docs/guides/debug-a-divergence) begins.

## Choose the reference

The reference is the [oracle](/docs/concepts/glossary#oracle): a known good emulator of the console, one other people already trust. You modify it so nothing inside it stays private: its registers and its memory can be read out while it runs, over a TCP server that answers the same commands as the port's own debug server. Comparing the port against the project's own interpreter is a weaker thing, the self-check, and it comes later. Several repositories number the two comparisons pairing 1 (against their own interpreter) and pairing 2 (against an independent emulator); see [pairing](/docs/concepts/glossary#pairing). This page says the self-check and the oracle.

[psxrecomp](https://github.com/mstan/psxrecomp) is the worked example. Its oracle is the Beetle PSX emulator core: cloned from upstream, pinned to one commit, patched with the hooks the project needs, all recorded in `docs/beetle-linux.md`. The core is built as a static library, and `runtime/CMakeLists.txt` builds a second program around it, `psx-beetle`, whenever that library sits next to the tree:

```bash title="docs/beetle-linux.md"
# Static lib. On unix the artifact is named mednafen_psx_libretro.so but is
# an ar archive (STATIC_LINKING=1); stage it under the name cmake expects.
make platform=unix STATIC_LINKING=1 HAVE_LIGHTREC=0 -j"$(nproc)"
cp mednafen_psx_libretro.so libmednafen_psx.a

cd ../runtime
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DPSX_RECOMP_UI=OFF -DPSX_DEBUG_TOOLS=ON
ninja -C build psx-beetle
```

`psx-beetle` is the emulator core plus the debug server. No recompiled code is linked into it.

What the rest of the fleet uses:

- [nesrecomp](https://github.com/mstan/nesrecomp) uses Mesen. A small libretro host, `nesref`, runs `mesen_libretro.dll` in process and writes per-frame state traces for the coordinator to diff.
- [gbarecomp](https://github.com/mstan/gbarecomp) uses mGBA. An opt-in target, `gbarecomp_oracle` (`-DGBARECOMP_BUILD_ORACLE=ON`), embeds libmgba pinned to tag 0.10.5. The native build never links it.
- [snesrecomp](https://github.com/mstan/snesrecomp) names bsnes as its oracle. `SNES_COSIM.md` is the design, and the harness code (`runner/src/cosim.c`, `runner/src/cosim_state.c`) is in the tree.
- [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) built an oracle and then deleted it. Its `COSIM.md` opens with the ruling:

> **2026-07-27 — pairing #2 is gone.** It compared the own backend against the clownmdemu oracle, and that oracle has been deleted along with the emulator core (see LICENSING.md). What survives is **pairing #1**: recompiled code vs our own clean-room Tier-3 interpreter, selected with `GENESIS_FORCE_INTERP`.

So on Genesis today you can stand up the self-check only.

## Wire both sides to answer the same questions

The wiring rule is short: the oracle answers the same commands, in the same format, as the port, on its own port. On PlayStation the port's debug server listens on 4370 and `psx-beetle` on 4380, both speaking JSON, one object per line; `TCP_COMMANDS.md` is the inventory, `get_registers` and `read_ram` included. One client can then ask both machines the same question and diff the answers, which is what `python tools/debug_client.py compare <cmd>` does. Every tool written for the port works on the oracle for free.

gbarecomp keeps the same shape on ports 19842 (native) and 19843 (oracle), and its `oracle/README.md` states the contract in one line: "Same line-delimited JSON request/response shape as `tcp_debug_server`." The Genesis coordinator drives its two processes on ports 4600 and 4601.

Keep all of it out of the build you ship. snesrecomp puts it plainly: the co-sim code "compiles ONLY in a dedicated dev/diagnostics target. It is NEVER in the shipping Production config — zero bytes in released exes."

> **You provide this.** Every run on this page takes a game file, and you supply your own. See [the game file you supply](/docs/concepts/the-game-file-you-supply).

## Fix the clock and the stride

To compare two machines you must stop them at the same moment, and the only moment both agree on is guest time: cycles or frames counted by the game, never host seconds. The stride is how many guest units pass between checkpoints. Fix it before either side executes an instruction, through the environment: `PSX_COSIM_STRIDE` on PlayStation, `GBA_COSIM_STRIDE` on Game Boy Advance. segagenesisrecomp also picks which clock to count, with `--clock frame|cycle`, because its recompiled code fast-forwards an idle loop that a plain interpreter really spins through, so the two share frame boundaries but not an instruction count. [Timing models](/docs/concepts/timing-models) is the background.

Stopping is as strict as counting: the guest parks at stride boundaries, never on an outside request. psxrecomp's engine says why, and the lesson was paid for:

> The guest parks at EVERY checkpoint boundary (a deterministic guest cycle = multiple of stride) and only advances when the coordinator grants budget via `step N`. It does NOT free-run: the earlier "free-run until you notice an async stop cycle" design was racy — two processes noticed the flag at different wall-times and parked at different cycles (a HARNESS nondeterminism, not a guest one). Parking at fixed checkpoint boundaries makes both processes stop at identical cycles by construction.

Start coarse. When a run halts, shrink the stride toward 1 inside the divergent window and run again. The runs are deterministic, so the same divergence comes back.

Close the determinism holes at the same time. The psxrecomp co-sim build runs headless, single threaded, on the software renderer, with no host-time throttle. gbarecomp pins the real-time clock with `RECOMP_RTC_EPOCH`, because that clock otherwise reads host time. nesrecomp deletes `saves/*.srm` before each run, because a stale battery save changes the second boot.

## Hash the whole machine

At each checkpoint, each side folds everything that can change what the game does next into one hash, keeps a smaller hash per subsystem underneath, and folds every checkpoint into a running [chain hash](/docs/concepts/glossary#chain-hash). The first checkpoint whose chains differ is the first divergence. What belongs in the hash, and what must stay out, is the concept page's subject. The machinery around it is small; psxrecomp's whole lockstep vocabulary, from `runtime/src/cosim.c`, fits in nine lines:

```c title="runtime/src/cosim.c"
 *   seq                       -> "seq <n> chain <hex> parked <0|1>"
 *   runto <n>                 -> set stop=n, resume; blocks until parked at n (or exit)
 *   chain                     -> "chain <hex> seq <n>"
 *   hash                      -> "hash <hex> pc <hex> istat <hex> imask <hex> cyc <n>"
 *   sub                       -> per-subsystem hashes of the current state
 *   window <n>                -> last n ring rows (bounded to RING_N)
 *   inject ram <phys> <xor>   -> gate-4 fault into RAM
 *   inject reg <idx> <xor>    -> gate-4 fault into a CPU reg (idx 0..31, 32=hi,33=lo)
 *   reset                     -> reset incremental hash state
```

The coordinator, `tools/cosim.py`, launches the two processes, advances both to the same checkpoints, compares chains, and halts on the first mismatch, printing the sub-hashes and the last window of blocks from each side.

## Prove the harness before you believe a run

A comparison tool can fail by seeing nothing and reporting agreement forever. It happened here: an early psxrecomp coordinator misparsed the first word of each reply, read no chain from either side, and passed every comparison because nothing equals nothing. The gates exist for this, and psxrecomp keeps them at the top of `tools/cosim.py`:

```sh title="tools/cosim.py"
  # GATE 1 — determinism/hashing: two of the SAME backend must NEVER diverge.
  python cosim.py --a compiled --b compiled --stride 65536 --max 1500000000
  python cosim.py --a interp   --b interp   --stride 65536 --max 1500000000
  # GATE 4 — injected fault must halt at the right field:
  python cosim.py --a compiled --b compiled --inject-at 200000000 --inject ram:100000:1

  # THE RUN (only after gates pass):
  python cosim.py --a compiled --b interp --stride 65536 --max 1500000000
```

Run each side against itself: zero differences, or host state is leaking into the hash. Inject a fault on purpose: the run must halt at the injected checkpoint and name the injected subsystem, or the comparator is blind. Audit the hash against the raw bytes where the harness offers it. nesrecomp packages the same checks as `gate1` (the port against itself), `gate2` (the oracle against itself) and `gate3` (the injected fault), and its gates exit non-zero on FAIL so CI can refuse the change. The gate numbers move between projects; the checks are what count. Do not skip the fault injection: a blind comparator passes the other gates easily.

## Run it and read the first divergence

The last line of the psxrecomp block above is the self-check, not the oracle: the same binary twice, one side forced to the interpreter with `PSX_FORCE_INTERP`. gbarecomp switches with `GBARECOMP_FORCE_INTERP`, segagenesisrecomp with `GENESIS_FORCE_INTERP`. Run it first. It proves your own two halves agree before you involve the oracle. What it can never prove is correctness, because both halves can be wrong in the same way. The oracle run settles that.

On NES the oracle run is one command per axis, after its gate. From nesrecomp's `COSIM.md`:

```sh title="COSIM.md"
NESREF=/f/Projects/nesref/nesref.exe
CORE=/f/Projects/nesref/cores/mesen_libretro.dll
COORD=../nesrecomp/tools/nes_cosim.py
python "$COORD" gate1   <exe> <rom> 900
python "$COORD" abram   <exe> <rom> "$NESREF" "$CORE" 900
python "$COORD" abcycle <exe> <rom> "$NESREF" "$CORE" 900
python "$COORD" abppu   <exe> <rom> "$NESREF" "$CORE" 900   # auto-detects CHR-RAM
# RNG-seeded games (Zelda): prefix both sides with a seed freeze:
#   NESRECOMP_FREEZE="0x18=0x00" NESREF_FREEZE="0x18=0x00" python "$COORD" abram ...
```

The first two paths are the author's; point them at your own `nesref` build and Mesen core. gbarecomp's oracle comparison syncs on a hardware event instead of a frame number: the oracle steps to VBlank until its interrupt count matches the native side's frame count, then both dump OAM, VRAM and palettes, and a diff prints the first difference.

When a run halts, read three things: the checkpoint and guest cycle, the first sub-hash that differs (it names the subsystem that split), and any warning that the two sides parked at different cycles. That warning means the harness itself desynced; fix it before reading anything else. Then go to [debug a divergence](/docs/guides/debug-a-divergence), which is organised by symptom.

## Keep the green run

A green run is a baseline, not a trophy. Write down the fixture, the stride, the frame count and the final chain value together, and re-run after every change to the recompiler or the runtime: the runs are deterministic, so the same inputs must reproduce the same chain until you change guest behaviour on purpose. segagenesisrecomp wraps the whole sequence, gates first, into one command, `tools/divergence_report.py`, and it stops if any gate fails. nesrecomp states the discipline for timing work: "build the certifier, then change the timing, then measure. Never ship a timing change unmeasured."

And know what green buys. nesrecomp again: "**Never ship / flip default-on on headless co-sim numbers alone.** Headless is blind to display/feel; the owner must launch, play, and approve." Turning a clean run into an accuracy claim is [what correct enough means](/docs/concepts/accuracy-and-burndowns).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| A co-sim build seems to hang on launch | It is parked, waiting for a coordinator that is not there | Expected. Launch it through the coordinator |
| Agreement never breaks, even under an injected fault | The comparator is reading nothing | Find what it fails to parse. The psxrecomp coordinator now aborts with "could not parse chain — tool is BLIND, aborting." |
| A warning that the two sides parked at different cycles | Harness nondeterminism, not a guest difference | Fix this first. Every comparison after it is meaningless |
| A determinism gate fails in `sram` | A stale battery save changed the second boot | Delete `saves/*.srm` before each run; the NES coordinator does it for you |
| A determinism gate fails in `mapper` | Uninitialised struct padding folded into the hash | Zero the struct before hashing. Host padding is not guest state |
| A first divergence where only the program counter differs | The compiled side does not keep `pc` current mid-block | Expected. psxrecomp excludes `pc` from the compared hash and reports it separately |
| Genesis region match rates look alarming | One differing byte flags the whole region | Read them as "did ANY byte differ" and use the `memchunks` localiser for an honest number |
| `msys` cmake breaks a co-sim build | Wrong toolchain picked up | Use the VS developer shell and the VS-bundled cmake |

## Source

- psxrecomp: [`docs/beetle-linux.md`](https://github.com/mstan/psxrecomp/blob/master/docs/beetle-linux.md), [`runtime/CMakeLists.txt`](https://github.com/mstan/psxrecomp/blob/master/runtime/CMakeLists.txt), [`TCP_COMMANDS.md`](https://github.com/mstan/psxrecomp/blob/master/TCP_COMMANDS.md), [`tools/debug_client.py`](https://github.com/mstan/psxrecomp/blob/master/tools/debug_client.py)
- psxrecomp, the lockstep harness: [`runtime/src/cosim.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/cosim.c), [`runtime/src/cosim_state.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/cosim_state.c), [`tools/cosim.py`](https://github.com/mstan/psxrecomp/blob/master/tools/cosim.py), [`docs/internal/COSIM_ORACLE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/internal/COSIM_ORACLE.md)
- nesrecomp: [`COSIM.md`](https://github.com/mstan/nesrecomp/blob/master/COSIM.md), [`tools/nes_cosim.py`](https://github.com/mstan/nesrecomp/blob/master/tools/nes_cosim.py)
- segagenesisrecomp: [`COSIM.md`](https://github.com/mstan/segagenesisrecomp/blob/master/COSIM.md), [`tools/genesis_cosim.py`](https://github.com/mstan/segagenesisrecomp/blob/master/tools/genesis_cosim.py), [`tools/divergence_report.py`](https://github.com/mstan/segagenesisrecomp/blob/master/tools/divergence_report.py)
- snesrecomp: [`SNES_COSIM.md`](https://github.com/mstan/snesrecomp/blob/main/SNES_COSIM.md). gbarecomp: [`oracle/README.md`](https://github.com/mstan/gbarecomp/blob/main/oracle/README.md), [`TCP.md`](https://github.com/mstan/gbarecomp/blob/main/TCP.md), [`oracle/gba_cosim.py`](https://github.com/mstan/gbarecomp/blob/main/oracle/gba_cosim.py)

## Next

- [Debug a divergence](/docs/guides/debug-a-divergence) is what to do when the run comes back red.
- [Co-simulation](/docs/concepts/co-simulation) is the theory: what gets hashed, and why the reference is an emulator somebody else wrote.
- [What correct enough means](/docs/concepts/accuracy-and-burndowns) turns a clean run into a claim.
- [TCP debug protocol](/docs/reference/tcp-protocol) is the wire format behind the two-process harnesses.
- [The glossary](/docs/concepts/glossary) defines oracle, pairing and chain hash.
