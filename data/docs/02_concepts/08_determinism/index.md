---
title: "Determinism"
summary: "Save states, rewind and rollback netplay are one property in three costumes, and this is what that property costs a recompiled port: complete snapshots, legal stopping points, a build-keyed guard, and a simulation that re-runs identically on someone else's machine."
section: "concepts"
sectionTitle: "Concepts"
pageType: "concept"
tags: ["Correctness", "Netplay", "Save states"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/DKC2Recomp"
  - "https://github.com/TechnicallyComputers/recomp-net"
  - "https://github.com/TechnicallyComputers/retcomm-rbengine"
  - "https://github.com/mstan/MegaManXSNESRecomp"
  - "https://github.com/mstan/gcnlle"
updated: "2026-08-23"
---

Three of the features players most want from a recompiled port turn out to be the same feature. A save state is the ability to capture exact state and put it back. Rewind is that ability applied at a steady cadence and walked backwards. Rollback netplay is the same ability plus one extra demand: after restoring, the simulation has to re-run the same frames with corrected inputs and land where a different machine, running a different build configuration, also lands. Snapshot, restore, re-run identically. Everything on this page follows from those three verbs, and so does most of the engineering cost.

## What a snapshot has to contain

A recompiled port has no emulator core object to hand to a serializer. What it has is the runtime's device models, guest RAM, and the CPU state struct the generated C threads through every function. A save state therefore serializes the runtime, on every console here, and the first rule is completeness.

The clearest statement of that rule belongs to one project and is written as one project's house rule, so read the version number and the subsystem list as PlayStation specifics. From [`runtime/include/boot_state.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/boot_state.h) in [psxrecomp](https://github.com/mstan/psxrecomp):

```c title="runtime/include/boot_state.h"
 * Completeness is mandatory (v4 no-stub rule): a partial capture that leaves a
 * subsystem at reset while CPU/RAM assume it was configured is a latent stub.
 * Every mutable hardware subsystem gets a section here, and the capture is
 * proven complete by diffing a restored session's frames against a normal-boot
 * session's frames (see the "bootsnap" debug command). Host-side / recompiler-
 * derived state (dirty-RAM bitmap, overlay tables, debug rings) is NOT
 * serialized — it is re-derived from restored guest RAM on load.
```

The last clause is the load-bearing one. Host-derived caches are rebuilt, never stored, so a state file cannot smuggle stale recompiler metadata into a different build. Note also how completeness is proved: by diffing a restored session's frames against a normal boot, which is [co-simulation](/docs/concepts/co-simulation) pointed at the serializer instead of at the recompiler.

Restoring is correspondingly not a memcpy. On load, psxrecomp clamps long CD-ROM response and read-start delays, bumps overlay page generations and a lazy-miss epoch in the dirty-RAM interpreter, re-stages the CPU VRAM mirror into the GPU image on both the GL and Vulkan backends, and drops host-only PGXP provenance so "a rewind can never resurrect a stale projection". [DKC2Recomp](https://github.com/mstan/DKC2Recomp) does the host-side equivalent: "A successful load resets queued audio, deadline anchors, and rewind history before redrawing the restored PPU boundary".

## Where a port is allowed to stop

An interpreter can be stopped between any two instructions. A recompiled port cannot, because it is executing compiled C, not stepping a loop. That much is true everywhere. Which boundary counts as legal is a per console answer, because it depends on what the machine gives a runtime to synchronise on, so the projects each pick their own and stage requests until one arrives.

From [`runtime/src/savestate.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/savestate.c):

```c title="runtime/src/savestate.c"
/* savestate.c — user save states. The runtime UI opens from the save-state menu.
 * See savestate.h.
 *
 * Wraps boot_state.c's full-machine serializer. Requests are staged by the SDL
 * key handler / debug server and executed by savestate_poll at a block-leader
 * boundary (in_exception == 0), where cpu->pc is a valid resume PC. A load
 * restores the full machine then unwinds to the scheduler and re-dispatches. */
```

psxrecomp's boundary is a block leader with no exception in flight, where `cpu->pc` is a valid resume address. [nesrecomp](https://github.com/mstan/nesrecomp) uses NMI boundaries instead, and its version 5 state struct appends `resume_pc`, `resume_pc_valid` and `resume_tick_charged` for "Exact interrupted guest continuation". Two consoles, two different definitions of a safe place to stop, and neither transfers. This is a place where static recompilation genuinely costs more than interpretation, and it is worth saying plainly rather than claiming the technique makes determinism free.

Rewind is then save states in a ring plus a policy. psxrecomp's rewind captures by calling the same serializer, densifies its capture interval during depth24, MDEC or XA activity but "never sparser than the user pick", and is disabled while netplay is active. DKC2 states the same machinery in player terms: one complete in-memory state every three console frames, bounded to 300 snapshots, about fifteen seconds, lost when the application closes. The ring itself is shared code: it is [retcomm-rbengine](https://github.com/TechnicallyComputers/retcomm-rbengine)'s `snap_ring`, the same module the netplay path uses, which is what makes rewind and rollback one piece of engineering rather than two.

## The guard is on the build, not on the state

Here is the detail worth carrying away. psxrecomp's state header carries an integrity key that includes the codegen hash, the ABI tag and the codegen version, and every field must match the running build or the file is rejected outright.

That is a guard on the build, not on the state. The runtime does not inspect a state file at load and work out whether it is close enough to be usable. It asks which build produced it and refuses anything that is not exactly this one. The cost is that a rebuild invalidates a player's states; the benefit is that no version of "close enough" can ever silently produce a subtly wrong machine. nesrecomp made the other choice, versioning the format and migrating: version 4 files stay readable as a best-effort, and a version 6 mod record whose id has no registered hook "is skipped with a stderr warning -- never a load failure".

That build key only means something if a build is a stable thing to key on, and one project states the property directly. [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp)'s recompiler links no emulator core at all: its cycle stamps come from the clean-room MC68000 timing model in [m68k-recomp-core](https://github.com/mstan/m68k-recomp-core)'s genesis profile, "so codegen is reproducible from the ROM and config alone". Generated output that is a pure function of the game file and the configuration is also what a mod system needs, which is why [PokemonStadiumRecomp](https://github.com/mstan/PokemonStadiumRecomp) lists deterministic generated output among its forward-compatibility rules, because "a mod system reasons about diffs against a baseline". See [Write a mod](/docs/guides/write-a-mod).

## Re-running identically is the hard half

Rollback is where the third verb starts to bite. [recomp-net](https://github.com/TechnicallyComputers/recomp-net) splits the work explicitly: the library "owns the episode FSM ... the correction tuple, the sealed input table, and the resolved-through (shared frontier) watermark. The host owns snapshots, the deterministic sim step, state digests, and the wire transport." Four of the six callbacks a port must supply are things a save-state implementation already has: `save_state`, `load_state`, `advance_sim` and `get_input_row`. The new one is `state_digest`, whose contract is one sentence long and absolute: it "Must be identical across peers." psxrecomp implements it by hashing exactly the subsystems the serializer covers. [recomp-net API](/docs/reference/recomp-net-api) has the full surface.

Because the digests must agree, a lot of nice things have to be fenced off. psxrecomp keeps a headless software rasterizer running at 1x as the deterministic authority while OpenGL supersamples for the window, so "peers can use different GL settings without desyncing the sim", at the cost of an extra CPU pass. Mods are disabled for every netplay session. The BIOS is settled per match and a peer that cannot apply it aborts rather than falling back. The disc dump must match, not merely the region. Low-latency input re-sampling is suppressed during self-check record, because "the mid-frame re-sample would fork the resim".

## A recompiled port is not deterministic for free

Two recorded failures make the point better than any argument, and neither is a property of a console: both are choices a port made that a host detail then punished. On NES, Mega Man 3's coroutine scheduler runs on host fibers, so its scheduler zero page "is not bit-faithful" and the attract sequence drifts from the emulator oracle over time. The response in the SNES Mega Man X port was not a runtime detector: it made [LLE](/docs/concepts/hle-and-lle) the default and demoted the host-fiber scheduler to "an explicit, deprecated compatibility/performance override". And on GameCube, floating point: "Vulkan FDiv is ~2.5 ULP; x86 divss is correctly rounded. A 1-ULP reciprocal difference flipped an s17.7 texel index and moved the XFB chain".

Losing determinism announces itself late and bluntly. In recomp-net, a mismatched `INPUT_CONFIRM` hash latches a desync, admission then stalls permanently for that session, and the documented reading is that the cause is a host determinism bug rather than a library one. Offline, the symptom is quieter: DKC2's input recordings "do not encode host rewind or save-state save/load actions", so a route that rewinds cannot be reproduced from its recording, and its testing guide tells testers not to rewind during a recorded drill.

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`runtime/include/boot_state.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/boot_state.h), [`runtime/src/savestate.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/savestate.c), [`runtime/include/psx_rewind.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/psx_rewind.h), [`runtime/src/netplay_state_digest.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/netplay_state_digest.c), [`docs/NETPLAY.md`](https://github.com/mstan/psxrecomp/blob/master/docs/NETPLAY.md), [`ENHANCEMENTS.md`](https://github.com/mstan/psxrecomp/blob/master/ENHANCEMENTS.md).
- [nesrecomp](https://github.com/mstan/nesrecomp): [`runner/src/savestate.c`](https://github.com/mstan/nesrecomp/blob/master/runner/src/savestate.c), [`MODDING.md`](https://github.com/mstan/nesrecomp/blob/master/MODDING.md), [`ENHANCEMENTS.md`](https://github.com/mstan/nesrecomp/blob/master/ENHANCEMENTS.md).
- [recomp-net](https://github.com/TechnicallyComputers/recomp-net): [`docs/rollback.md`](https://github.com/TechnicallyComputers/recomp-net/blob/main/docs/rollback.md), [`include/recomp_net/rollback.h`](https://github.com/TechnicallyComputers/recomp-net/blob/main/include/recomp_net/rollback.h), [`docs/host_integration.md`](https://github.com/TechnicallyComputers/recomp-net/blob/main/docs/host_integration.md). [retcomm-rbengine](https://github.com/TechnicallyComputers/retcomm-rbengine): [`include/retcomm_rbengine/snap_ring.h`](https://github.com/TechnicallyComputers/retcomm-rbengine/blob/main/include/retcomm_rbengine/snap_ring.h).
- [DKC2Recomp](https://github.com/mstan/DKC2Recomp): [`docs/DESKTOP_TESTING.md`](https://github.com/mstan/DKC2Recomp/blob/main/docs/DESKTOP_TESTING.md), [`README.md`](https://github.com/mstan/DKC2Recomp/blob/main/README.md). [MegaManXSNESRecomp](https://github.com/mstan/MegaManXSNESRecomp): [`ENHANCEMENTS.md`](https://github.com/mstan/MegaManXSNESRecomp/blob/main/ENHANCEMENTS.md). [gcnlle](https://github.com/mstan/gcnlle): [`ENHANCEMENTS.md`](https://github.com/mstan/gcnlle/blob/master/ENHANCEMENTS.md). [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp): [`recompiler/CMakeLists.txt`](https://github.com/mstan/segagenesisrecomp/blob/master/recompiler/CMakeLists.txt).

## Next

- [Proving it with co-simulation](/docs/concepts/co-simulation) is the technique that both depends on this property and is used to prove a snapshot complete.
- [recomp-net API](/docs/reference/recomp-net-api) is the rollback contract in full, including the six callbacks and the desync latch.
- [PlayStation](/docs/platforms/playstation) and [SNES](/docs/platforms/snes) are where the save state, rewind and rollback work described here actually lives.
- [Glossary](/docs/concepts/glossary) defines episode, digest, snapshot ring and desync as the fleet uses them.
