---
title: "Recompile the original game, then let mods do the rest"
summary: "Recompile a clean, verified game file. Treat ROM hacks and other patches as references for optional mods, not as new base games."
pageType: "concept"
tags: ["Game files", "Modding", "ROM hacks", "Verification"]
order: 9.5
updated: "2026-09-01"
---

A recomp project should begin with an unmodified file from the original release.

Do not apply a bug fix, quality-of-life patch, translation, or other ROM hack and then recompile the result. Recompile the original game. Build the changes as mods that the port applies separately.

This keeps one verified game at the center of the project. It also gives players a faithful port when every mod is off.

## Why does the original file matter?

A recompiler works from exact bytes. Applying a patch changes those bytes.

If a project recompiles the patched file, the patch becomes part of its generated code. The project now targets a different binary, even when the patch changes only one bug or one line of text.

That creates avoidable problems:

- the port no longer has the original release as its clear baseline;
- players may need to prepare a special patched file;
- fixes and enhancements are harder to turn off or test separately;
- comparing the port with the original game becomes less direct;
- two useful patches can become two separate recomp projects instead of two compatible mods.

Start with a clean, legally obtained dump. Record its region, revision, format, and hashes. Keep it unchanged throughout the build. The [game file contract](/docs/concepts/the-game-file-you-supply) explains why the exact file matters.

## Use patches as references

A ROM hack can still be valuable engineering work. Use it to learn what a mod needs to change.

Study the patch, its documentation, and the difference it produces. Find the affected code, data, text, or assets. Then express that change through the port's [mod system](/docs/guides/write-a-mod).

Depending on the change, that might become:

- a guarded memory patch;
- a translation table;
- an asset overlay;
- a runtime option;
- a reviewed plugin compiled into the port.

Keep any temporary patched comparison outside the port's build and distribution flow. Do not replace the verified base file with it, and do not ask players to modify their game file.

The patch is a reference for the implementation. It is not the input to the recompiler.

## What belongs in the mod layer?

Bug fixes, quality-of-life changes, and translations belong in the mod ecosystem.

Keep each change separate when practical. Give it a clear name, target the exact supported game revision, and check the original bytes before applying it. The stock setting should make no change.

This structure makes testing easier. A developer can compare the faithful port with the original game, enable one mod, and see exactly what changed. Players can also combine compatible features without preparing a different ROM or disc image for each combination.

## What about a full custom game?

A full custom game is the narrow exception.

A project such as *The Legend of Zelda: The Sealed Palace* changes enough of the original game to become its own deliberate target. Recompiling that target can make sense when the project is truly a port of the custom game, not a shortcut for adding a few fixes or enhancements.

Treat that choice explicitly. Identify the exact custom-game file, explain its provenance and patching requirements, and keep it separate from the faithful port of the original release.

If the change could reasonably be a mod, make it a mod. Recompile the original game and let the mod layer carry the rest.
