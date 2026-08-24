---
title: "Add widescreen"
summary: "What it actually takes to widen a game's view on a recompiled port, treated separately for 3D and 2D engines: the two families of technique, the culling, sprite-wrap, spawning and collision failures each produces, which consoles make it hardest, and what the byte-identical 4:3 claim does and does not mean."
section: "guides"
sectionTitle: "Guides"
pageType: "guide"
tags: ["Widescreen", "Enhancements", "PlayStation", "Sega Genesis", "NES", "SNES"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/snesrecomp"
  - "https://github.com/mstan/SuperMarioBrosNESRecomp"
  - "https://github.com/mstan/MegaManX6Recomp"
  - "https://github.com/mstan/gbrecompiled"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/ndsrecomp"
  - "https://github.com/mstan/cdirecomp"
updated: "2026-08-23"
---

Widescreen is the most visible thing a recompiled port can do that the original hardware could not, and it is the hardest to get right. Widening the picture is the easy half. The hard half is everything downstream that assumed a 320-pixel screen: the game's own decision about which objects are worth drawing, the eight or nine bits it stores a sprite's X coordinate in, the moment an enemy is allowed to spawn, and whether a collision box lands on screen. Almost every shipping implementation in this fleet carries an experimental label from its own repository, and this page tells you why before you start.

## The rule every implementation is built to

Enhancements here are opt-in, off by default, and reduce to the faithful build when off. [cdirecomp](https://github.com/mstan/cdirecomp) writes down the shared version and attributes it to the sibling projects:

> Every enhancement is **opt-in**, **off by default**, and **byte-identical to the
> faithful path when off**. A standard build with all toggles off must produce the
> exact frames, audio, and RAM state CeDImu produces. If turning a feature off
> isn't byte-identical, it's a bug, not an enhancement.

Two more rules shape the code. The runner provides a generic, inert-by-default capability and per-game configuration supplies title-specific policy, so the runner never hardcodes a title. And "Generated `*.c` is rebuilt from the recompiler and must never be edited (the project's first law)." Every technique below is therefore a runtime value the generated code reads, or a recompiler feature that emits different code from configuration. Never a hand edit.

## Two families, and which one your game is in

**Squash and stretch**, for a 3D game with a projection to interfere with. From [psxrecomp](https://github.com/mstan/psxrecomp)'s [`WIDESCREEN.md`](https://github.com/mstan/psxrecomp/blob/master/WIDESCREEN.md):

```text title="WIDESCREEN.md"
This is the DuckStation/Beetle "widescreen hack" (squash the GTE projection,
present stretched to the wide aspect → wider field of view), but implemented
in our GTE library + GPU so it covers generated code, the interpreter, and
overlay DLLs uniformly — and extended well past what emulators ship with
(per-prim proportion correction, so sprites/HUD are NOT stretched).
```

**Render wider**, which the same document calls the proper fix: stop squashing and render the wider field of view natively into a wider framebuffer, so "that entire artifact class disappears by construction". The argument for it is specific to native ports and is the most important idea on this page. Because the port runs on native hardware, "over-rendering off-screen geometry is essentially free": you do not need to cull the reveal precisely, only render more and not worry about the waste. An emulator on a budget cannot afford that, which is why the hack is what emulators ship.

**Neither applies to a 2D sprite engine.** [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp) opens its [`WIDESCREEN.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/WIDESCREEN.md) by correcting exactly that premise. One bullet about a debug command is elided, marked in place:

```text title="WIDESCREEN.md"
An earlier handoff claimed MMX6 "over-draws" the world to X=512 and we just had to
**reveal** the GPU-clipped overscan. **That is false.** Proven 2026-06-20 with pixels:
[snip: lines 42-47, the wide_full debug-command bullet]
- In a 320-wide gameplay scene, the 426px surface holds real content only in columns
  **[43,383] (~340px)** with **~43px BLACK margins each side**. Title/full-screen
  images fill fine (not camera-windowed).
- The raw SPRT16 vertex X spans [0,512], but that is a **scrolling tilemap encoded with
  a per-tile screen position**; the actual on-screen extent is **~4:3 + ~10px bleed**.

So MMX6 renders a TRUE 4:3 view. There is **no hidden FOV to reveal**. "Real 16:9 from
the stage perspective" requires making the engine RENDER MORE.
```

## On a 3D game, stage by stage

All of this happens on a port you have already built from [the game file you supply](/docs/concepts/the-game-file-you-supply), following [Port a game](/docs/guides/port-a-game). Nothing below patches that file.

### 1. Choose the family, check the content ceiling, and widen the projection

Squash is cheaper to stand up and comes with a permanent tail of per-vertex artifacts. Native-wide removes that class and costs a wider render target plus a widened cull. Before either, check what the game authored: 21:9 is blocked on the surveyed title not by geometry but by coverage, because the parallax and far-backdrop builders "only generate about 16:9 of tiles, which is what caps clean widescreen at 16:9". The squash itself is one multiply at the projection step, guarded so it never runs at 4:3, never applies to a curved backdrop, and depth gated so far geometry is left unsquashed while near props stay aligned.

**Checkpoint.** The world is wider, and the heads-up display, the backdrop and the object popping are now all wrong. That is expected.

### 2. Widen the cull windows, as a runtime term

This is the top remaining item on the shipping implementation, because the game's decisions about what to draw are pre-projection world-space comparisons the squash never sees. The write-up says objects "pop in/out while still on-screen in 16:9, because the game's per-object draw classifier tests `objX − camX` against a **4:3-screen-derived window** that the GTE squash never sees". The measured consequence is severe: with the 4/3 squash showing world `[-53.3, +373.3]`, the effective margin collapses to about 11 pixels, so anything wider than roughly 22 pixels pops, at draw level rather than at despawn.

Do not hand-patch the immediates. Configure the recompiler with a list of `(addr, kind)` cull-widen sites and have it emit each immediate as a runtime-computed term. The shipped native-wide path auto-detects the reject instead: `[widescreen.cull] auto_screen_x` finds the screen-extent reject, an `sltiu` against `0x140` width paired with `sltiu` against `0xE0` height, and widens every width compare, sign-extended so both margins reveal.

Every widened comparison, in generated code, in the interpreter and in overlay code alike, reads one function. From [`runtime/src/gpu.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/gpu.c):

```c title="runtime/src/gpu.c"
int psx_ws_x_margin(void) {
    if (ws_margin_override >= 0) return ws_margin_override;
    /* Native-wide: widen the world-space draw cull by the per-side reveal
     * (== the centering OFFSET in screen px) so the game SUBMITS the geometry
     * that previously fell outside the 4:3 cull window; the wide compositor then
     * rasterizes it into the revealed margins. Same recompiler emit sites as the
     * squash path ([widescreen.cull]); 0 at 4:3 so the cull stays byte-identical. */
    /* Unlike rendering/presentation, do not wait for game-mode detection here.
     * Tomba 2 builds its terrain-cell and actor spawn lists during scene load;
     * returning zero until the first 3D frame permanently bakes a 4:3 frustum
     * into those lists. */
    if (ws_native_wide_configured())
        return ws_nw_configured_offset() + ws_cull_guard_pixels;
    if (!ws_active()) return 0;
    return (160 * (ws_xden - ws_xnum) + ws_xnum / 2) / ws_xnum
           + ws_cull_guard_pixels;
}
```

The second comment is a real trap. If the margin returns zero until the first 3D frame, a game that builds terrain and spawn lists during scene load bakes a 4:3 frustum into them permanently.

**Checkpoint.** Objects stop popping while visibly on screen. If they still pop, you have missed a site, not mistuned a number.

### 3. Repair the backdrop, the dome and the heads-up display

| Failure | Cause and handling |
|---|---|
| Far-backdrop void | A 2D parallax backdrop computes `screenX` in integer math and never touches the projection, so far pieces clip past the 320 edge. A separate hook squashes that stored `screenX` about screen centre |
| Prop drift | One function draws the far ocean, clouds and mountains and also near props. Suppression is depth gated on projected SZ |
| Sky dome short of the corners | Authored to fill 4:3. Far-depth vertices are scaled outward by the inverse of the squash |
| Split dialogue box | Thirds anchoring tears a box whose end caps land in opposite outer thirds. A documented limitation |

One case has no fix: 16:9 can reveal past the authored edge of an area. "Some areas may simply have to accept a little edge reveal."

**Checkpoint.** The sky fills the frame, props sit where they did at 4:3, and the heads-up display is anchored correctly.

## On a 2D game, stage by stage

There is no projection here. The job is to make the game's own background renderer emit more columns, then repair everything that assumed the old count. [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp) has named the vocabulary: its `WsSiteKind` enum in [`recompiler/src/game_config.h`](https://github.com/mstan/segagenesisrecomp/blob/master/recompiler/src/game_config.h) lists nine distinct instruction rewrites, each with a written argument for why it is a no-op at margin zero.

### 1. Draw more columns, at the right start position

Do not do this by poking the engine's own column-count flag. On the surveyed title the background renderer draws 21 columns rightward from the camera's left edge, and poking its 33-column flag filled the right margin but not the left, because a single `scrollX` drives both the tile index, through a shift by four, and the sub-pixel offset, through a mask of `0xf`. Subtracting from it shifts existing content instead of adding columns. The documented fix is a generation-time hook at three instructions.

**Checkpoint.** Both margins contain tiles, not just the right one.

### 2. Budget for the extra primitives

Widening 21 columns to 29 is 38 percent more tile primitives. On the surveyed title the packet buffer holds exactly 1024 slots behind a hard `if (999 < counter) return` guard, and dense stages measured 925 background tiles per frame against a cap of 1000, so tiles and whole layers were dropped. The buffers are packed against the object ordering table, so raising the cap in place would corrupt RAM; the chosen fix relocates the buffer into a free RAM gap, which the repository still describes as a plan.

**Checkpoint.** A dense stage draws every layer with the margins on.

### 3. Fill the margins before they are displayed

The recurring 2D failure, with more than one cause. On Sonic 2's Chemical Plant Zone the 16:9 margins held the load-time uniform fill at the wrong offset per strip, which reads on screen as diagonal shear. The obvious diagnosis was wrong, and the correction is recorded so nobody repeats it:

> The real gap is **sectional maintenance**. CPZ's BG is horizontal strips with
> independent scroll rates ... maintained per-strip ... Once the strip
> cameras diverge from the load-time uniform fill, each strip is only re-patched
> across the *4:3* window (margin was 0 pre-arm).

The shipped fix arms the margin earlier, during level load, so the initial full-width fill is already margin aware, plus eight new sites widening the background row draws. Re-calling the initial fill on arm was tried and rejected: it repaints the fast strip at the wrong offset. A separate bug is plane wrap: at a level's left boundary the widened view revealed cells whose content comes from world x 512 to 560, producing floating islands and voids, fixed by anchoring the row draw at `camera-16-margin` instead of `camera-16`.

**Checkpoint.** A plane diff between a widened load and a 4:3 load reaches zero differing cells. A live mid-level toggle is the one case where stale margins are still expected.

### 4. Unwrap sprite X

Consoles store sprite X in 8 or 9 bits, so a position pushed into a margin wraps to the opposite edge. Three projects hit the same wall and solved it three ways.

| Console | The wrap | The fix |
|---|---|---|
| NES | 8-bit OAM X | A 16-bit sidecar keyed per relative-position slot, re-armed on every relative-variable read |
| Genesis | Piece writers mask sprite X with `andi #$1FF`, so widened positions at or beyond 512 wrapped to the left edge and a boss ping-ponged between screen edges | Four `mask10` sites widening the mask to `$3FF` |
| SNES | The OAM emitter compare is unsigned, which snesrecomp calls "the most easily missed" defect | A replacement predicate that admits the left margin explicitly |

The NES sidecar shows the discipline: it recomputes the true 16-bit value at the exact instruction that computed the 8-bit one, publishes it, and returns the guest's value unchanged, so the simulation stays vanilla.

**Checkpoint.** Nothing teleports to the opposite edge of the screen when it enters a margin.

### 5. Leave spawning alone, then check collision

Spawning is where widescreen touches simulation, and the NES answer is not to. From [SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp)'s [`WIDESCREEN.md`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/WIDESCREEN.md):

```text title="WIDESCREEN.md"
Enemies spawn on the **vanilla 4:3 timeline and position**, not at the
widened 16:9 edge. The earlier "widen the spawn window too" approach
caused serious spawn-area bugs — frenzy/group spawners derive an enemy's
X straight from the screen edge, so a widened edge dropped enemies *inside*
pipes and blocks with no collision to escape, and authored enemies
activated early enough to drift off their walk/fall pattern. Holding the
spawn PCs at 4:3 removes those bugs entirely.

The trade-off is a **spawn pop-in at the 4:3 edge line** ... This
is the intended, accepted behavior.
```

[snesrecomp](https://github.com/mstan/snesrecomp) reaches a more nuanced position where a spawner must widen: a dual pass, in which the widened pass admits only ordinary enemy records and a second pass at the unmodified 4:3 anchor admits everything else, so camera staging, minibosses and stage controllers do not fire early and change progression or the random number stream.

Then the failure nobody expects. Keeping a margin enemy on screen for rendering also makes the game build a collision box for it, and that box is 8-bit screen relative, so it wraps and becomes a phantom hitbox the player can stomp. The fix reports margin enemies as offscreen at exactly one program counter, so the game's own offscreen-box routine parks the box at `$FF,$FF`. From [`extras.c`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/extras.c):

```c title="extras.c"
    case 0xE268: {
        int slot  = g_cpu.X;
        int world = ((int)g_ram[(0x6E + slot) & 0xFF] << 8) | g_ram[(0x87 + slot) & 0xFF];
        int cam   = ((int)g_ram[0x071A] << 8) | g_ram[0x071C];
        int rel   = world - cam;            /* true 16-bit screen X */
        if (rel < 0 || rel > 255) return 0xFF;   /* margin → offscreen box */
        return val;
    }
```

**Checkpoint.** Nothing in a margin can be interacted with that could not be at 4:3, and progression, staging and the random number stream are unchanged.

## Sixteen invariants worth reading first

[snesrecomp](https://github.com/mstan/snesrecomp) has distilled the exercise into doctrine in [`docs/WIDESCREEN_PATTERNS.md`](https://github.com/mstan/snesrecomp/blob/main/docs/WIDESCREEN_PATTERNS.md), and the sentence to take away is that getting the reference implementation right "took a long tail of small corrections, and **every one of them is a pattern, not an address.** A new port that reimplements widescreen from scratch will rediscover the same bugs in the same order."

The sixteen, in the repository's own order: P1 scroll phase from the PPU, never a WRAM camera mirror; P2 margin columns populated before display; P3 periodic layers fold, world-anchored layers use history; P4 presentation keys to the scroll actually rendered this frame; P5 the HUD gate is a real game-state discriminator; P6 a game-mode byte proves the mode, not liveness; P7 cull windows widen symmetrically, each routine's own base preserved; P8 the OAM emitter is a second gate and its compare is unsigned; P9 spawn anchors need margin plus one column of slack; P10 widened spawning must not widen progression records; P11 the native pass is a balanced synthetic call; P12 large objects need a widened activation distance; P13 stage-trigger lead must not exceed the margin; P14 every widening gets its own kill-switch; P15 renderer-side previews stand down when real objects arrive; P16 simulation is untouched and 4:3 stays bit-identical.

The same document gives an order of work, because "a later step's symptoms mimic an earlier step's bug", and closes with a demand this page repeats: "A port claiming widescreen support should record which of P1-P16 it has verified, and by what measurement."

## Which consoles make it hardest

| Console | What makes it hard |
|---|---|
| PlayStation, 3D | Culling is pre-projection, one function draws several depths, and authored backdrop coverage caps clean widescreen at 16:9 |
| PlayStation, 2D | Nothing to reveal, and the packet buffer is nearly full at 4:3 |
| Genesis | Strip-scrolled backgrounds with independent rates, plane wrap at 512, a 9-bit sprite X mask |
| NES | Sprite X and collision boxes are 8-bit and screen relative, and spawners key off the screen edge |
| SNES | The OAM emitter compare is unsigned, and spawners also drive progression and staging |
| Game Boy and Game Boy Color | Margin pixels "have no hardware dot clock" and use the scanline's final register state; unsupported scenes fail closed to pillarbox |
| Game Boy Advance | Per-game opt-in through `RunOptions::max_view_width`; others clamp to 240, and the renderer override is not a correctness layer |
| Nintendo DS | Generic polygon widening was tried and rejected; the adaptive compute path keeps a CPU fallback for unsupported scenes |

## Is authentic 4:3 output still byte-identical?

Yes on PlayStation, as a claim about **output** rather than about the generated binary. Four guards produce it, all of the same shape: a runtime value that is exactly zero or exactly one at 4:3.

1. **The squash factor reduces to 1/1, and the squash is guarded on inequality rather than on a flag.** `gte_set_display_aspect(4, 3)` computes 12 and 12, divides by the greatest common divisor, and stores 1 and 1. The projection step tests `do_squash = (s_ws_xnum != s_ws_xden) && ...`, so at 4:3 the multiply and divide do not execute at all. From [`runtime/src/gte.cpp`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/gte.cpp):

```cpp title="runtime/src/gte.cpp"
extern "C" void gte_set_display_aspect(int num, int den) {
    if (num <= 0 || den <= 0) { s_ws_xnum = s_ws_xden = 1; return; }
    // squash = (4/3) / (num/den) = (4*den) / (3*num); identity for 4:3.
    int32_t n = 4 * den, d = 3 * num;
    int32_t a = n, b = d;
    while (b) { int32_t t = a % b; a = b; b = t; }   // gcd
    s_ws_xnum = n / a;
    s_ws_xden = d / a;
}
```

2. **The GPU side sets the same identity.** `gpu_ws_configure` sets both terms to 1 for any mode other than squash, and `ws_configured()` is literally `return ws_xnum != ws_xden;`.
3. **The cull margin is exactly zero at 4:3.** `psx_ws_x_margin()`, quoted above, returns 0 unless native-wide is configured or the squash is active, and native-wide requires `ws_mode == 2 && ws_cfg_num * 3 > ws_cfg_den * 4`, which at 4:3 is `12 > 12` and false. Its comment states the intent: "0 at 4:3 so the cull stays byte-identical."
4. **Every emitted transform reduces to the vanilla instruction at margin zero.** The cull-bias emit is `rt = rs + ((int32_t)imm + psx_ws_x_margin())`, which is `rs + imm` at margin 0, and `psx_ws_cull_sltiu` carries the claim in its own comment: "at 4:3 margin==0 so it reduces bit-for-bit to the vanilla `(uint16)sx < imm`".

Three qualifications belong with the claim.

- **Output identity, not binary identity.** Configuring `[widescreen.cull]` sites changes the generated C at those addresses: an `sltiu` becomes a call, an `addiu` immediate gains a runtime term, and a sprite-tag call appears at the entry of every configured sprite-tag function. Those calls evaluate to the vanilla result at margin 0, and psxrecomp says "byte-for-byte the original *presentation*", but a reader expecting an identical executable will be surprised.
- **One helper's identity is narrower.** `psx_ws_cull_vxrange` masks its operand to 16 bits and sign-extends the immediate, replacing an `sltiu` over the full 32-bit register, so at margin 0 it is identical only when the register's upper half is zero. Every sibling helper carries an explicit identity comment; this one does not, and whether the emit site validates that precondition is not documented.
- **The Genesis equivalent rests on a proof, not a runtime zero.** segagenesisrecomp states its sites "are no-ops at `g_ws_margin == 0` ⇒ byte-identical authentic 4:3 (mask10 widens its mask statically, proven equivalent at 4:3 since bit 9 can't be set there)." That transform changes the emitted constant unconditionally, so identity rests on an argument about reachable values, which is weaker than the PlayStation guarantee.

**No automated frame-level identity test was found for psxrecomp**, only a unit-level assertion that the terrain angle helper is exact at 4:3. The gates elsewhere are manual or per-title: segagenesisrecomp reports smoke runs byte-identical against a pre-change build at margin 0, SuperMarioBrosNESRecomp reports that "the 8000-frame `--verify` oracle run is byte-identical to the Nestopia reference in work RAM with widescreen off" (the [glossary](/docs/concepts/glossary) defines oracle as the fleet uses it), and snesrecomp names capture-and-diff as its release gate. [Determinism](/docs/concepts/determinism) covers why that class of gate matters beyond widescreen.

## Troubleshooting

| Symptom | Documented cause |
|---|---|
| Scenery or enemies pop in and out while still on screen | A pre-projection draw classifier still testing a 4:3-derived window. Widen the cull sites, do not tune the margin |
| Black voids at the frame edges behind everything | A backdrop computing screen X in integer math, or a sky dome authored to fill 4:3 |
| Diagonal shear in a scrolling background | Strip-scrolled layers whose per-strip maintenance only re-patches the 4:3 window |
| Floating islands or voids at a level's left boundary | Plane wrap revealing cells from 512 pixels away. Anchor the row draw at `camera-16-margin` |
| Tiles or whole layers disappear in dense stages | The engine's primitive budget overflowing. Count primitives before blaming the renderer |
| A boss or object ping-pongs between the screen edges | A sprite X mask or compare wrapping at 256 or 512 |
| A margin enemy can be stomped from across the screen | A screen-relative collision box wrapping. Report margin objects as offscreen at the box-building program counter |
| Enemies appear inside pipes or blocks | A widened spawn window. Hold spawn program counters at 4:3, or split the pass |
| Frame rate collapses and the GPU timers look bad | Not necessarily the GPU. A native-wide collapse from 60 fps to 12 fps was stack-sampled to an instruction classifier whose 256-slot direct-mapped cache thrashed. The recorded lesson: "treat GL timer numbers on a CPU-bound frame as suspect" |
| Stale margins after toggling widescreen mid-level | Expected on Genesis: they "heal as each strip's seam next advances over them (one scroll)" |

## Known limits, in the projects' own words

Do not read the sections above as descriptions of finished features.

- **SuperMarioBrosNESRecomp**: "**Status: experimental and buggy.** The default build is always the authentic 4:3 game; everything described here is runtime-gated and off unless explicitly enabled." Sprite placement glitches near the margins "are still being found".
- **psxrecomp**: "Widescreen carries an EXPERIMENTAL tag in the launcher." On ultrawide, "The launcher offers 21:9 and the math generalizes, but it has not been playtested." On portability, "Finding the shared per-prim helper + anchor scratch requires a Ghidra pass per title." Its per-title results include a configuration where "widescreen does NOT engage (renders 4:3 pillarboxed in the wide window + slow)".
- **MegaManX6Recomp**: "Status: **validated prototype** on branch `feat/mmx6-widescreen`", with 21:9 reported as "larger invalid left reveal black, HUD at the true ultrawide edge, canonical/right region intact."
- **segagenesisrecomp**: a live mid-level toggle "still reveals stale plane-B margins in strip zones", and "player-vs-camera dynamics near the left boundary differ from 4:3 by construction".
- **gbrecompiled**: "**High potential, experimental** ... Remaining blockers are broader live-play validation of enemies, shots, bosses, and savestates."
- **ndsrecomp**: "Actor culling and the minimap are fixed, but the courtyard sky can still show stretching or black voids at 21:9."
- **snesrecomp** records per-title status including one whose "broad stage playtest remains pending". **gbarecomp** marks its wide-view override as "not a correctness layer".

## Source

- [psxrecomp](https://github.com/mstan/psxrecomp), the 3D case: [`WIDESCREEN.md`](https://github.com/mstan/psxrecomp/blob/master/WIDESCREEN.md), [`runtime/src/gte.cpp`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/gte.cpp), [`runtime/src/gpu.c`](https://github.com/mstan/psxrecomp/blob/master/runtime/src/gpu.c), [`recompiler/src/code_generator.cpp`](https://github.com/mstan/psxrecomp/blob/master/recompiler/src/code_generator.cpp), [`ENHANCEMENTS.md`](https://github.com/mstan/psxrecomp/blob/master/ENHANCEMENTS.md).
- [snesrecomp](https://github.com/mstan/snesrecomp): [`docs/WIDESCREEN_PATTERNS.md`](https://github.com/mstan/snesrecomp/blob/main/docs/WIDESCREEN_PATTERNS.md), P1 to P16, the best starting point for any new 2D port.
- [segagenesisrecomp](https://github.com/mstan/segagenesisrecomp): [`WIDESCREEN_ISSUES.md`](https://github.com/mstan/segagenesisrecomp/blob/master/WIDESCREEN_ISSUES.md), [`recompiler/src/game_config.h`](https://github.com/mstan/segagenesisrecomp/blob/master/recompiler/src/game_config.h), and [SonicTheHedgehog2Recomp](https://github.com/mstan/SonicTheHedgehog2Recomp)'s [`PLAN-widescreen-bg-arm.md`](https://github.com/mstan/SonicTheHedgehog2Recomp/blob/master/PLAN-widescreen-bg-arm.md).
- [SuperMarioBrosNESRecomp](https://github.com/mstan/SuperMarioBrosNESRecomp): [`WIDESCREEN.md`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/WIDESCREEN.md), [`extras.c`](https://github.com/mstan/SuperMarioBrosNESRecomp/blob/master/extras.c). [MegaManX6Recomp](https://github.com/mstan/MegaManX6Recomp): [`WIDESCREEN.md`](https://github.com/mstan/MegaManX6Recomp/blob/master/WIDESCREEN.md).
- Status and caveats: [gbrecompiled](https://github.com/mstan/gbrecompiled)'s [`docs/WIDESCREEN.md`](https://github.com/mstan/gbrecompiled/blob/master/docs/WIDESCREEN.md), [gbarecomp](https://github.com/mstan/gbarecomp)'s and [ndsrecomp](https://github.com/mstan/ndsrecomp)'s `ENHANCEMENTS.md`, and [cdirecomp](https://github.com/mstan/cdirecomp)'s [`ENHANCEMENTS.md`](https://github.com/mstan/cdirecomp/blob/master/ENHANCEMENTS.md) for the shared rules.

## Next

- [Write a mod](/docs/guides/write-a-mod), because on PlayStation the player-facing activation of widescreen is a mod package rather than a settings row.
- [PlayStation](/docs/platforms/playstation), the toolchain with both widescreen families implemented.
- [Determinism](/docs/concepts/determinism), for why simulation must stay untouched and what pins that claim.
- [Configuration reference](/docs/reference/configuration), for the `[widescreen]` and view-width keys named above.
