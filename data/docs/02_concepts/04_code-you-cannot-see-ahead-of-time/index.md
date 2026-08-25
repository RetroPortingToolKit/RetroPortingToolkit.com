---
title: "Code you cannot see ahead of time"
summary: "PS1 games pull code off the disc into memory while they run, so a build-time pass never sees it. psxrecomp records those bytes as they arrive, compiles them in a separate process, keeps the result, and checks it against live memory every time it is used."
pageType: "concept"
tags: ["Overlays", "PlayStation", "Code discovery", "Nintendo DS", "Game Boy Advance"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-25"
---

A static recompiler translates a game's machine code before the game runs, so it can only translate code that exists before the game runs. Some code does not. A game can work out an address while you play, or pull a fresh block of code off the disc, and no study of the file on disk will find it.

That is not a crash. Every port here keeps a small emulator inside it, an interpreter, which reads those instructions and acts them out one at a time. It is slower than compiled code and it is correct, so a missed instruction costs a moment of speed, not the game.

How much this matters depends on the console. It matters most on the PlayStation.

## Why the PlayStation is the hard case

A PS1 disc holds far more code than the console's 2 MB of memory, so games load a chunk, run it, and write the next chunk over the top. Those chunks are called **overlays**, and they are not in the game's executable.

From [psxrecomp](https://github.com/mstan/psxrecomp)'s [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md):

> "Games stream code off the disc into RAM at runtime and execute it, then
> overwrite it with the next overlay. That code does not exist in the executable
> at build time, so a pure ahead-of-time recompiler cannot see it."

This is a different problem from [telling code from data](/docs/concepts/code-discovery). There the bytes are present and the recompiler has to work out which are instructions. Here the bytes are absent, and no guess helps.

psxrecomp answers it by moving part of the recompiler into the running game. It records an overlay the moment the disc delivers it, compiles it in a separate process, and keeps the result. One consequence is unusual for a game: the more it has been played, the faster it runs.

## Capture, compile, cache

**Capture.** The runtime watches every disc transfer that lands in game code memory and stores the bytes as delivered, before the game can change them. Capture later, after the game has patched itself, and you have recorded something the recompiler cannot reason about. Meanwhile the interpreter notes which addresses it really executed, so the list of function starts comes from execution rather than guesswork. Both go into a file called `overlay_captures.json` next to the game.

**Compile.** Not inside the running game. A tool wraps the captured bytes in a header, runs the same `psxrecomp-game` recompiler that handled the main executable, and compiles the C it emits into a shared library. From [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md):

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

`<exe-dir>` is the folder holding the built game.

**Cache.** Each build lands as two files named after the address and a checksum of the code, under a path that includes the game, the compiler, the host machine, the emitter version and the configuration. Change any of those and the old results are correctly ignored.

## Checking before every use

Cached native code is only safe while the memory it came from still holds the same bytes, and that memory is what the game overwrites with its next overlay. So the loader checks every time. The full check is a checksum, so a counter that ticks whenever a page is written does the work in the common case, and the checksum runs only when something moved.

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

Read the comment as the design rule. One address holds several compiled versions at once, because that block of memory has held several overlays over a session. Picking by content rather than by address means walking back into an area you left an hour ago finds the version that matches and goes native again by itself.

A mismatch is not an error. That address drops to the interpreter, and capture notices the new bytes. Nothing that might be compiled wrong is ever run, so the failure direction is always speed. [PlayStation](/docs/platforms/playstation) has the full dispatch order.

![Read the fall-through arrows down and the dashed path back up. Reaching the interpreter is not a failure. It is what feeds capture and compilation, and the same address goes to the cache next time, as long as its bytes still match.](./tiers.svg)

## Why a game gets faster the more it is played

Every new area a player reaches gets captured, compiled and kept. From [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md):

> "**Your discoveries persist for you.** They are saved in a file written next to
> the game called `overlay_captures.json`, and your local cache is rebuilt from
> it automatically — areas you have visited stay fast on every later session."

It works across players too, because these are files. A release can ship a `cache/` folder built from everywhere players have been, so a first-time player starts warm. The capture file is the durable one; the cache is rebuilt from it.

> **Note.** The repository asks players not to share capture files, because a capture holds game code. Same boundary as [the game file you supply](/docs/concepts/the-game-file-you-supply).

The goal is that every instruction a game executes has been translated before it is needed, leaving the interpreter idle. No title is there yet. What this buys today is that the gap costs frames, not correctness.

## Which consoles actually have this problem

Everything above is one console's answer to one console's constraint.

**Nintendo DS.** [ndsrecomp](https://github.com/mstan/ndsrecomp) first recommended against copying psxrecomp's machinery, because a DS game's overlays are known at build time. It later shipped a provider that does compile while the game runs, so do not quote the old recommendation as current policy. It needs the same content check too, because several overlay generations share one address.

**Game Boy Advance.** No streamed code, and [gbarecomp](https://github.com/mstan/gbarecomp) still builds capture, compile and cache, because its offline finder cannot see code the game builds in memory. On the first miss it interprets to keep running, recompiles that function into an on-disk cache "so it is served NATIVELY for the rest of the run", and sends the address back to a reviewed file so the next build finds it properly. The fleet calls that self-healing.

**Genesis and Master System.** The Genesis sound Z80 runs a program the main CPU uploads into memory, so the compiled image may not match what is there. [smsggrecomp](https://github.com/mstan/smsggrecomp)'s flat-step output checks every compiled instruction against the live bytes before running it. That is checking without compiling at run time.

**SNES.** [snesrecomp](https://github.com/mstan/snesrecomp) took half the design: "**The performance tiers (gcc shard + sljit JIT) are NOT worth porting.**" It kept the interpreter fallback and the feedback loop, so here the layer below native code is an interpreter, and the PlayStation tier numbers do not carry across.

**NES.** The negative case: the whole cartridge is present at build time, so none of this is needed. What decides it is not cartridge against disc, as the DS and the Genesis Z80 both show. It is whether the bytes a program executes can change after the recompiler has seen them.

## Source

- psxrecomp: [`docs/EXECUTION_MODEL.md`](https://github.com/mstan/psxrecomp/blob/master/docs/EXECUTION_MODEL.md), [`docs/ARCHITECTURE.md`](https://github.com/mstan/psxrecomp/blob/master/docs/ARCHITECTURE.md), [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md), [`runtime/src/overlay_capture.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/overlay_capture.c), [`runtime/src/overlay_loader.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/overlay_loader.c), [`tools/compile_overlays.py`](https://github.com/mstan/psxrecomp/blob/master/tools/compile_overlays.py)
- ndsrecomp: [`docs/overlay-strategy.md`](https://github.com/mstan/ndsrecomp/blob/main/docs/overlay-strategy.md). gbarecomp: [`PRINCIPLES.md`](https://github.com/mstan/gbarecomp/blob/main/PRINCIPLES.md). smsggrecomp: [`FLAT_STEP.md`](https://github.com/mstan/smsggrecomp/blob/main/FLAT_STEP.md). snesrecomp: [`docs/MULTI_TIER.md`](https://github.com/mstan/snesrecomp/blob/main/docs/MULTI_TIER.md)

## Next

- [PlayStation](/docs/platforms/playstation), for the dispatch order this sits inside.
- [Telling code from data](/docs/concepts/code-discovery), the build-time half of the question.
- [Glossary](/docs/concepts/glossary) for overlay, capture and tier as this fleet uses them.
