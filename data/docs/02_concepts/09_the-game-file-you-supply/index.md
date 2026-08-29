---
title: "The game file you supply"
summary: "Every port needs a game file you already have. Projects ship the tools, not copyrighted game data."
pageType: "concept"
tags: ["Game files", "Verification", "Licensing"]
updated: "2026-08-29"
---

Every port needs input from the original hardware: usually a cartridge dump, disc image, or system ROM. You provide those files from media you are authorized to use. The repositories and release archives provide the recompiler and runtime, not the game data.

## Keep your files private

Do not commit game images, retail BIOS files, or generated code derived from them. Keep them local to the project, follow the toolchain's ignore rules, and check its current documentation for the exact format it expects.

The required files vary by platform:

- PlayStation projects commonly use a `.cue` file with its matching `.bin` tracks, plus a BIOS where required.
- Cartridge projects generally use a clean dump in the exact revision the port supports.
- Some systems also need a separate coprocessor or system ROM.

## Use a clean, matching dump

Generated code is tied to exact bytes and addresses. A trimmed, patched, region-mismatched or otherwise altered image may be rejected—or may compile while behaving incorrectly. The port's own verification file is the authority for the revision it supports.

When verification fails, stop and check the format, region and revision rather than looking for a download. This site does not describe how to obtain copyrighted files.

## Why the wording is deliberate

“Bring a game file you already have” is both a technical requirement and a boundary. It keeps the projects distributable and makes clear that a native port is built from the user's own input. The same rule applies to retail BIOS images and any generated artifacts derived from them.

For platform-specific prerequisites, use the [platform guide](/docs/platforms) and the starter repository linked from [recomp your own game](/docs/start/recomp-your-own-game). [Provenance](/docs/fleet/provenance) explains the project's redistributable components.

## Next

- [Recomp your own game](/docs/start/recomp-your-own-game)
- [What you need](/docs/start/what-you-need)
- [Licenses](/docs/fleet/licenses)
- [Glossary](/docs/concepts/glossary)
