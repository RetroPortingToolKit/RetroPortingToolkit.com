---
title: "Code you cannot see ahead of time"
summary: "PS1 games stream code off the disc into RAM while they run, so a build-time pass never sees it: psxrecomp captures those bytes at CD DMA, compiles them out of process, caches the result by address and checksum, and re-checks live memory against that checksum on every dispatch."
pageType: "concept"
tags: ["Overlays", "PlayStation", "Code discovery", "Nintendo DS", "Game Boy Advance"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-24"
---

A static recompiler translates a game's machine code before the game runs, which means it can only translate code that exists before the game runs. Whether that is a real limit depends entirely on the console, and this page is mostly about the one where it bites hardest. On the PlayStation a disc holds far more code than 2 MB of RAM can, so games load a chunk, run it, and overwrite it with the next one. Those chunks are called overlays, and no amount of analysis of the executable will find them, because they are not in the executable. [psxrecomp](https://github.com/mstan/psxrecomp) answers this by moving part of the recompiler into the running game: it records an overlay's bytes the moment the disc delivers them, compiles them to native code in a separate process, and keeps the result. The consequence is unusual for a game, and it is the part worth remembering: the more a game has been played, the faster it runs.

Everything from here to "Which consoles actually have this problem" is that one toolchain's mechanism. Read it as the PlayStation's answer, not as the technique: three other consoles in this fleet have a version of the problem and solve it differently, and one has decided the machinery is not worth having.

## The problem, in the project's own words

From [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md):

> "Games stream code off the disc into RAM at runtime and execute it, then
> overwrite it with the next overlay. That code does not exist in the executable
> at build time, so a pure ahead-of-time recompiler cannot see it."

This is a different failure from the one in [telling code from data](/docs/concepts/code-discovery). There, the bytes are present and the recompiler has to work out which of them are instructions. Here the bytes are absent, and no discovery heuristic can help, because there is nothing to be heuristic about.

## Capture, compile, cache

### Capture, at the moment the code arrives

The runtime hooks every CD DMA completion that lands in game-code RAM and stores the bytes as delivered, which [`docs/FEATURES.md`](https://github.com/mstan/psxrecomp/blob/master/docs/FEATURES.md) describes as an unpatched copy, taken before the game can modify them. Timing is the point: capture after the game has relocated or patched itself and you have recorded something the recompiler cannot reason about.

Separately, the interpreter that runs this code before it is native keeps two bitmaps, of which program counters were executed and which were entered through dispatch. Those become the seed list, so a seed is an address execution really reached rather than a guess. The record goes next to the executable as `overlay_captures.json`, a JSON array of `"psxrecomp overlay capture v2"` objects carrying `load_addr`, `size`, `bytes_b64`, `executed_pcs`, `dispatch_entry_pcs`, `function_entry_pcs` and `seeds`.

### Compile, out of process

Compilation is not a just-in-time compiler inside the runtime. [`tools/compile_overlays.py`](https://github.com/mstan/psxrecomp/blob/master/tools/compile_overlays.py) wraps the captured bytes in a synthetic PS-X EXE header, spawns the same `psxrecomp-game` binary that recompiled the main executable, post-processes the emitted C and compiles it to a shared library with either `gcc` or the bundled TinyCC. From [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md):

> "When an overlay needs compiling, the runtime spawns a C compiler on the
> recompiler-emitted C and loads the resulting DLL — it does not JIT in-process."

The same tool runs by hand, which is how a project pre-builds the cache it ships:

```sh
python psxrecomp/tools/compile_overlays.py \
    --captures        <exe-dir>/overlay_captures.json \
    --game-toml       game.toml \
    --recompiler      psxrecomp/recompiler/build/psxrecomp-game.exe \
    --runtime-include psxrecomp/runtime/include \
    --out-dir         <exe-dir>/cache \
    --gcc             C:/msys64/mingw64/bin/gcc.exe \
    --cps
```

`<exe-dir>` is the directory holding the built game. Backends resolve once at startup in the order static, then `gcc`, then TinyCC. An in-process JIT tier did exist and was removed in July 2026.

### Cache, keyed by address and content

Each build lands as two files, `<phys>_<crc>.dll` and `<phys>_<crc>.ranges`, under a deeply namespaced directory:

`<cache-root>/<game-id>/<gcc|tcc>/<os>-<arch>/cg<CODEGEN_VER>_<emitter-hash>_gc<config-hash>_f<flavor>/`

Every component stops two caches mixing that should not: a different game, compiler, host architecture, emitter or configuration. The runtime and the compiler build that path independently and must agree exactly, a deliberate double implementation. It is also where a stale document will mislead you: [`docs/COMPILING_OVERLAYS.md`](https://github.com/mstan/psxrecomp/blob/master/docs/COMPILING_OVERLAYS.md) gives the path one component short, without the config hash and flavour. The two implementations agree with each other; the prose has not caught up.

The `.ranges` file beside each library is the manifest, in two line kinds. From [`tools/compile_overlays.py`](https://github.com/mstan/psxrecomp/blob/master/tools/compile_overlays.py):

> "Manifest v2 line format:
>       F <entry_hex> <code_crc_hex>     one per function
>       R <lo_hex> <len_hex>             one per coalesced code range"

The pair of entry address and code checksum is the identity of a compiled function. The offline CRC32 that writes it is bit-identical to the one the runtime computes, which is what makes the next step possible.

## Validating on every dispatch

Cached native code is safe only while the RAM it was compiled from still holds the same bytes, and that RAM is exactly the RAM the game overwrites with the next overlay. So the loader re-checks, every time. The expensive part is a hash, so a page-generation counter bumped by writes does the work in the common case, and the hash runs only when something in the page has moved.

From [`runtime/src/overlay_loader.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/overlay_loader.c):

```c title="runtime/src/overlay_loader.c"
    /* A reused address can have several range-owning variants. Select the
     * one whose compiled code bytes match live RAM instead of returning the
     * first range hit and letting one stale variant mask every later match. */
    uint32_t gen = cand_gensum(c);
    if (c->state == ENTRY_VALID && gen == c->val_gen) {
        s_gen_fastpath++;
        return 1;
    }
    if (c->state == ENTRY_INVALID && gen == c->val_gen)
        return 0;                    /* known mismatch, no watched write */
    uint32_t live = cand_crc(c);
    s_rehashes++;
    s_last_crc = live;
    c->val_gen = gen;
    if (live == c->crc_code && cand_delay_slots_hashed(c)) {
        if (c->state != ENTRY_VALID) {
            c->state = ENTRY_VALID;
            s_valid_count++;
        }
        return 1;
    }
    s_rehash_miss++;
```

Read the comment at the top as the design rule. One guest address holds several compiled variants at once, chained as candidates, because the same RAM window has held several overlays over a session. Selecting by content rather than by address means walking back into an area you visited an hour ago re-validates the variant that matches and flips back to native automatically.

A mismatch is not an error. It drops that address to the interpreter, which runs the code correctly and more slowly, and the capture path notices the new bytes. That is the bias the whole tier is built on, and [PlayStation](/docs/platforms/playstation) has the full dispatch order: nothing that might be compiled wrong is ever dispatched, so the failure direction is always speed.

![Read the fall-through arrows down and the dashed path back up. Reaching the interpreter is not a failure, it is what feeds capture and compilation, and the same address dispatches to the cache the next time its bytes still match.](./tiers.svg)

## Two persisted artefacts, and why the difference matters

These are easy to collapse into one thing, and doing so will confuse you the first time a cache misbehaves.

| Artefact | What it is | Where it lives |
|---|---|---|
| `overlay_captures.json` | The discovery record: the raw overlay bytes as the disc delivered them, plus the program counters execution actually reached | Beside the game executable, redirectable with `PSX_OVERLAY_CAPTURE_ROOT` |
| `cache/` | The native code: compiled shared libraries and their `.ranges` manifests, namespaced by game, compiler, architecture, emitter, config and flavour | Under the cache root, rebuilt from the capture record when it is missing |

The capture record is the durable one. The compiled cache is derived, and a change to the emitter, the configuration or the compiler correctly invalidates all of it by changing the path, at which point it is rebuilt from captures rather than from another play session.

## Why a game gets faster the more it is played

Every fresh area a player reaches is an area that gets captured, compiled and cached, and nothing sends it back. From [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md):

> "**Your discoveries persist for you.** They are saved in a file written next to
> the game called `overlay_captures.json`, and your local cache is rebuilt from
> it automatically — areas you have visited stay fast on every later session."

The same property works across players, because the artefacts are files. [`docs/EXECUTION_MODEL.md`](https://github.com/mstan/psxrecomp/blob/master/docs/EXECUTION_MODEL.md) describes a release shipping a `cache/` folder of overlays already compiled from everywhere players have collectively visited, so a first-time player starts warm.

> **Note.** The repository asks players not to redistribute their capture files, because a capture contains verbatim game code. That is the same boundary described in [the game file you supply](/docs/concepts/the-game-file-you-supply) and [provenance](/docs/fleet/provenance).

The direction of travel is stated but not reached. The project's goal is that every executed instruction should have been translated ahead of time, leaving the interpreter idle, and no artefact in the repository shows a title in that state. What the tier buys today is that the gap costs frames rather than correctness.

## Which consoles actually have this problem

Everything above is the PlayStation's answer to a PlayStation constraint. Four other consoles here sit at different points, and the differences are not cosmetic: two of them build most of the same machinery for a different reason, one guards against changing bytes without compiling anything at run time, and one has decided it does not need any of it.

### Nintendo DS

The closest equivalent, and the most interesting because the project changed its mind in public. [ndsrecomp](https://github.com/mstan/ndsrecomp)'s [`docs/overlay-strategy.md`](https://github.com/mstan/ndsrecomp/blob/main/docs/overlay-strategy.md) re-derived psxrecomp's mechanisms from its code and recommended against copying them: "**Do not port psxrecomp's runtime-compile machinery**", on the argument that a DS title's overlay set is "fixed, finite ... and known completely at build time". That recommendation was later overtaken. The repository now ships a live overlay provider that does compile at run time, driven by `--live-overlay-enable`, `--live-overlay-command` and `--live-overlay-cache`, with [`tools/compile_live_shards.py`](https://github.com/mstan/ndsrecomp/blob/main/tools/compile_live_shards.py) compiling generation-bound RAM code pages into persistent libraries. Anyone reading that repository should not quote the recommendation as current policy; the decision that overtook it is recorded in [`docs/live-overlay-psx-adversarial-review.md`](https://github.com/mstan/ndsrecomp/blob/main/docs/live-overlay-psx-adversarial-review.md).

The DS also needs the identity half of psxrecomp's design for its own reason. A generated bank's entries carry live-byte validation and an entry is skipped when the guest bytes no longer match, which is how several overlay generations coexist at one address. That is the same content-keyed lookup, arrived at from cartridge RAM rather than from a disc. [Nintendo DS](/docs/platforms/nintendo-ds) has the toolchain.

### Game Boy Advance

There is no streamed code on a GBA cartridge, and [gbarecomp](https://github.com/mstan/gbarecomp) still builds a runtime compile and cache path, because the offline finder cannot see genuinely dynamic RAM code. Its `PRINCIPLES.md` permits the interpreter to bridge a dispatch miss only under three conditions together, and the second is the one that matters here: "On the first miss we interpret to keep running, but we immediately recompile that function on the fly (the on-disk "code cache") so it is served NATIVELY for the rest of the run." The third condition sends the address back to a reviewed proposal file so the next static build finds it properly. So the same three verbs appear, capture, compile, cache, driven by a discovery gap rather than by a disc. [Game Boy Advance](/docs/platforms/game-boy-advance) covers it, and the fleet calls the pattern self-healing.

### Genesis and Master System

The Genesis has code that arrives at run time and answers it without compiling anything then. Its sound Z80 executes a program the 68000 uploads into RAM while the Z80 is held in reset, so the image compiled ahead of time may not be the image in memory. [smsggrecomp](https://github.com/mstan/smsggrecomp)'s flat step output guards every compiled instruction against the live bytes before running it, keeping captured variants as alternate byte sequences at the same address and falling back to a dispatch-miss handler when none match. That is validation without runtime compilation: the cheapest point on this axis that is still correct. [Sega Genesis](/docs/platforms/sega-genesis) and [Master System and Game Gear](/docs/platforms/master-system-game-gear) have both halves.

### SNES

[snesrecomp](https://github.com/mstan/snesrecomp) evaluated psxrecomp's four-layer model and took half of it. From [`docs/MULTI_TIER.md`](https://github.com/mstan/snesrecomp/blob/main/docs/MULTI_TIER.md):

> **The performance tiers (gcc shard + sljit JIT) are NOT worth porting.** They
> exist in psxrecomp to run code at native speed.

What it did adopt is the interpreter fallback and the manifest feedback, "not for speed, but to convert snesrecomp's *resolve-or-fail-the-build* wall into a self-healing loop, and to give games a runtime correctness floor for control flow the static pass hasn't covered yet". So on this console tier 2 is an interpreter, not compiled code, and a reader carrying the PlayStation's tier numbering across will be wrong about what tier 2 means. [SNES](/docs/platforms/snes) has the dispatch it sits in.

### NES

The negative case, and the reason this page is not a general one. nesrecomp explains its own decision not to adopt the multi-tier design in one sentence:

> psxrecomp's multi-tier system exists to solve a problem NES does not have ... On NES there is no hot code that arrives at runtime — the entire ROM is present at build time.

Cartridge alone does not decide it, as the DS and the Genesis Z80 both show. What decides it is whether the bytes a program executes can change after the recompiler has seen them.

## What this is, and what it is not

It is not a technique unique to this fleet. N64Recomp ships a runtime recompilation backend of its own, so the difference here is purpose rather than capability: upstream's serves mod support, and psxrecomp's exists because a PS1 disc streams code into RAM that no build-time pass can see. [Lineage and credit](/docs/fleet/lineage-and-credit) is careful about which relationships in this fleet are code and which are conceptual.

It also does not have a name. The repository describes the mechanism in stages and never gives the whole of it a single term, and neither does anything else in the fleet. This page's title is a description rather than a coinage, deliberately: labelling something the projects have not labelled would put a word in a reader's vocabulary that no repository will confirm.

## Source

From [psxrecomp](https://github.com/mstan/psxrecomp). Documents: [`docs/EXECUTION_MODEL.md`](https://github.com/mstan/psxrecomp/blob/master/docs/EXECUTION_MODEL.md), [`docs/FEATURES.md`](https://github.com/mstan/psxrecomp/blob/master/docs/FEATURES.md), [`docs/COMPILING_OVERLAYS.md`](https://github.com/mstan/psxrecomp/blob/master/docs/COMPILING_OVERLAYS.md), [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md) and [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md). Code: [`runtime/src/overlay_capture.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/overlay_capture.c) for the DMA hook and the JSON schema, [`runtime/src/overlay_loader.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/overlay_loader.c) for validation and the cache path, [`runtime/src/overlay_backend.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/overlay_backend.c) for backend resolution, [`runtime/src/dirty_ram_interp.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/dirty_ram_interp.c) for the fallback and the seed bitmaps, and [`tools/compile_overlays.py`](https://github.com/mstan/psxrecomp/blob/master/tools/compile_overlays.py) for the manifest format and the compiler side of the cache path.

For the per-console section: ndsrecomp's [`docs/overlay-strategy.md`](https://github.com/mstan/ndsrecomp/blob/main/docs/overlay-strategy.md), [`docs/live-overlay-psx-adversarial-review.md`](https://github.com/mstan/ndsrecomp/blob/main/docs/live-overlay-psx-adversarial-review.md), [`tools/compile_live_shards.py`](https://github.com/mstan/ndsrecomp/blob/main/tools/compile_live_shards.py) and [`runner/src/dispatch_lookup.h`](https://github.com/mstan/ndsrecomp/blob/main/runner/src/dispatch_lookup.h); gbarecomp's [`PRINCIPLES.md`](https://github.com/mstan/gbarecomp/blob/main/PRINCIPLES.md); smsggrecomp's [`FLAT_STEP.md`](https://github.com/mstan/smsggrecomp/blob/main/FLAT_STEP.md) and [`recompiler/src/code_generator.c`](https://github.com/mstan/smsggrecomp/blob/main/recompiler/src/code_generator.c); snesrecomp's [`docs/MULTI_TIER.md`](https://github.com/mstan/snesrecomp/blob/main/docs/MULTI_TIER.md); nesrecomp's [`docs/MULTITIER_PORT_PROPOSAL.md`](https://github.com/mstan/nesrecomp/blob/master/docs/MULTITIER_PORT_PROPOSAL.md).

## Next

- [PlayStation](/docs/platforms/playstation), for the full dispatch order this tier sits inside.
- [Nintendo DS](/docs/platforms/nintendo-ds), [Game Boy Advance](/docs/platforms/game-boy-advance) and [SNES](/docs/platforms/snes), the three consoles that took part of this design and the depth on each.
- [Telling code from data](/docs/concepts/code-discovery), the build-time half of the same question.
- [Configuration](/docs/reference/configuration) for the overlay and cache keys, and the [command line reference](/docs/reference/cli) for every flag on the tool above.
- [High level and low level](/docs/concepts/hle-and-lle) for the other tier in this runtime, and the [glossary](/docs/concepts/glossary) for overlay, shard and capture as this fleet uses them.
