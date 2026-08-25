---
title: "Determinism"
summary: "Save states, rewind and netplay all need the game to repeat itself exactly. Emulators have had them for years; the new part is a native port having them, and this is what that costs."
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
updated: "2026-08-25"
---

Save states, rewind and netplay all need one thing: the game must repeat itself exactly. A save state captures the machine and puts it back. Rewind is the same thing on a timer, walked backwards. Rollback netplay adds one demand: after going back, the game has to replay those frames with corrected inputs and land where another player's machine also lands.

Emulators have had all three for years. The new idea is that a native port can have them too. A port has no emulator core to hand to a save system. It has the runtime's device models, the game's memory, and the CPU state the generated code carries through every function. Snapshot, restore, replay identically: everything below follows from those three verbs, and so does most of the cost.

## What a snapshot has to contain

Everything the machine can still be influenced by. On every console here that means serializing the runtime, and the first rule is completeness. The version number and the subsystem list below are PlayStation specifics; the rule is not.

From [`runtime/include/boot_state.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/boot_state.h) in [psxrecomp](https://github.com/mstan/psxrecomp):

```c title="runtime/include/boot_state.h"
 * Completeness is mandatory (v4 no-stub rule): a partial capture that leaves a
 * subsystem at reset while CPU/RAM assume it was configured is a latent stub.
 * Every mutable hardware subsystem gets a section here, and the capture is
 * proven complete by diffing a restored session's frames against a normal-boot
 * session's frames (see the "bootsnap" debug command). Host-side / recompiler-
 * derived state (dirty-RAM bitmap, overlay tables, debug rings) is NOT
 * serialized — it is re-derived from restored guest RAM on load.
```

The last clause is the load-bearing one. Anything the host worked out for itself is rebuilt on load, never stored, so a state file cannot smuggle stale recompiler bookkeeping into a different build. Note how completeness is proved, too: by comparing a restored session's frames against a normal boot, which is [co-simulation](/docs/concepts/co-simulation) pointed at the save system instead of at the recompiler.

Restoring is not a copy, either. psxrecomp shortens long CD-ROM delays, bumps the counters the overlay system uses, re-stages the graphics memory into both renderers, and drops host-only depth data so "a rewind can never resurrect a stale projection". [DKC2Recomp](https://github.com/mstan/DKC2Recomp) does the same on its side: "A successful load resets queued audio, deadline anchors, and rewind history before redrawing the restored PPU boundary".

## Where a port is allowed to stop

An emulator can stop between any two instructions. A recompiled port cannot, because it is running compiled functions, not stepping a loop. That much is true everywhere. Which moment counts as a safe place to stop is a per console answer, so each project picks one and holds requests until it arrives.

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

psxrecomp stops at the start of a block with no exception in flight. [nesrecomp](https://github.com/mstan/nesrecomp) uses interrupt boundaries instead, and its state file carries the exact resume address and whether the tick was already charged. Two consoles, two definitions of a safe stopping point, and neither transfers. This is a place where static recompilation genuinely costs more than emulation, and it is worth saying plainly.

Rewind is then save states in a ring, plus a policy. psxrecomp calls the same serializer, takes snapshots more often during video playback, and switches rewind off while netplay is running. DKC2 states it in player terms: one complete state every three console frames, up to 300 of them, about fifteen seconds, gone when you close the game. The ring itself is shared code from [retcomm-rbengine](https://github.com/TechnicallyComputers/retcomm-rbengine), the same module the netplay path uses, which is what makes rewind and rollback one piece of engineering instead of two.

## The guard is on the build, not on the state

Here is the detail worth carrying away. psxrecomp's state file header includes a key made from the code generator's hash, its version and the build's ABI tag, and every field must match the running build or the file is refused.

That is a guard on the build, not on the state. The runtime does not inspect a state file and decide whether it is close enough. It asks which build wrote it and refuses anything else. The cost is that a rebuild throws away a player's states. The benefit is that no version of "close enough" can quietly produce a subtly wrong machine. nesrecomp made the other choice, versioning its format and migrating older files, with unknown records skipped and a warning printed rather than a failed load.

A build key only means something if a build is a stable thing to key on. [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp)'s recompiler links no emulator core at all, and its cycle numbers come from a clean-room timing model, "so codegen is reproducible from the ROM and config alone". Output that is a pure function of the game file and the configuration is also what a mod system needs, because a mod reasons about differences from a baseline. See [Write a mod](/docs/guides/write-a-mod).

## Replaying identically is the hard half

Rollback is where the third verb bites. [recomp-net](https://github.com/TechnicallyComputers/recomp-net) splits the work: the library owns the network side, and the port owns snapshots, the simulation step, and a state digest. Four of the six functions a port must supply already exist if it has save states: save, load, advance, and read the current inputs. The new one is the digest, and its contract is one sentence: it "Must be identical across peers."

Because the digests must agree, a lot of nice things get fenced off. psxrecomp keeps a plain software renderer running as the authority while the fancy renderer draws the window, so "peers can use different GL settings without desyncing the sim". Mods are off for every netplay session. The BIOS is agreed per match, and a peer that cannot apply it quits rather than carrying on. The disc must match, not merely the region.

## A port is not deterministic for free

Two recorded failures make the point, and neither is a property of a console. Both are choices a port made that a detail of the host machine then punished.

On NES, one game's scheduler runs on host fibers, so its scheduler memory "is not bit-faithful" and the attract sequence drifts away from the emulator oracle over time. The fix in the SNES Mega Man X port was not a detector: it made the faithful path the default and marked the host-fiber scheduler as a deprecated override. On GameCube it was floating point: "Vulkan FDiv is ~2.5 ULP; x86 divss is correctly rounded. A 1-ULP reciprocal difference flipped an s17.7 texel index and moved the XFB chain".

Losing determinism announces itself late and bluntly. In netplay, a mismatched hash latches a desync and the session stops admitting frames, and the documented reading is that the cause is a bug in the port, not in the library. Offline it is quieter: DKC2's input recordings "do not encode host rewind or save-state save/load actions", so a run that rewinds cannot be replayed from its recording, and testers are told not to rewind during a recorded drill.

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp): [`runtime/include/boot_state.h`](https://github.com/mstan/psxrecomp/blob/master/runtime/include/boot_state.h), [`runtime/src/savestate.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/savestate.c), [`runtime/src/netplay_state_digest.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/netplay_state_digest.c), [`docs/NETPLAY.md`](https://github.com/mstan/psxrecomp/blob/master/docs/NETPLAY.md)
- [nesrecomp](https://github.com/mstan/nesrecomp): [`runner/src/savestate.c`](https://github.com/mstan/nesrecomp/blob/master/runner/src/savestate.c), [`MODDING.md`](https://github.com/mstan/nesrecomp/blob/master/MODDING.md)
- [recomp-net](https://github.com/TechnicallyComputers/recomp-net): [`docs/rollback.md`](https://github.com/TechnicallyComputers/recomp-net/blob/main/docs/rollback.md), [`include/recomp_net/rollback.h`](https://github.com/TechnicallyComputers/recomp-net/blob/main/include/recomp_net/rollback.h). [retcomm-rbengine](https://github.com/TechnicallyComputers/retcomm-rbengine): [`include/retcomm_rbengine/snap_ring.h`](https://github.com/TechnicallyComputers/retcomm-rbengine/blob/main/include/retcomm_rbengine/snap_ring.h)
- [DKC2Recomp](https://github.com/mstan/DKC2Recomp): [`docs/DESKTOP_TESTING.md`](https://github.com/mstan/DKC2Recomp/blob/main/docs/DESKTOP_TESTING.md). [MegaManXSNESRecomp](https://github.com/mstan/MegaManXSNESRecomp): [`ENHANCEMENTS.md`](https://github.com/mstan/MegaManXSNESRecomp/blob/main/ENHANCEMENTS.md). [gcnlle](https://github.com/mstan/gcnlle): [`ENHANCEMENTS.md`](https://github.com/mstan/gcnlle/blob/master/ENHANCEMENTS.md)

## Next

- [Co-simulation](/docs/concepts/co-simulation) both depends on this property and is used to prove a snapshot complete.
- [recomp-net API](/docs/reference/recomp-net-api) is the rollback contract in full.
- [PlayStation](/docs/platforms/playstation) and [SNES](/docs/platforms/snes) are where this work actually lives.
- [Glossary](/docs/concepts/glossary) defines digest, snapshot ring and desync.
