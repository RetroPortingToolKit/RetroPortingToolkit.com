---
title: "What is the game file contract?"
summary: "Recomp projects provide the port, tools, and runtime. You provide legally obtained game files, and sometimes BIOS or system files, when the project asks for them."
pageType: "concept"
tags: ["Game files", "Verification", "Licensing"]
updated: "2026-08-30"
---

A recomp port usually needs a file from the original game.

That might be a cartridge dump, a disc image, or another format the project expects. Some systems may also need a BIOS or system file.

This site and these projects provide the port, the tools, and the runtime. They do not provide copyrighted game files or copyrighted retail BIOS files.

Use legally obtained files.

## Why does the exact file matter?

A port is built around exact bytes.

Region, revision, patches, bad dumps, trimmed files, and converted disc images can all change those bytes. A file that looks close to you may be a different input to the port.

That is why many ports check the file before they run. If the hash or layout does not match, the port should stop instead of guessing.

Strict checks are not there to annoy you. They keep the port tied to the game version it was built and tested against.

## What about BIOS files?

Some systems need BIOS or firmware behavior.

There are two common cases:

- The project can use a legal open-source BIOS alternative.
- The project needs a legally obtained retail BIOS or system file.

This site does not provide copyrighted retail BIOS files. If a project needs one, follow the project's instructions and use a legally obtained copy.

If a project includes an open-source BIOS alternative, it should say so clearly.

## What should never be committed?

Do not commit:

- game dumps
- disc images
- copyrighted retail BIOS files
- generated code derived from those files
- caches that contain captured game code

Keep those files local. Follow the project's ignore rules.

## Why not just support every dump?

Supporting many revisions is possible, but it is work.

Each revision may move code, change data, patch bugs, or alter timing. A port that supports one version does not automatically support another.

The honest path is to support known inputs, verify them, and add more versions deliberately.

## What should users do when verification fails?

Stop and check the basics:

- Is this the right region?
- Is this the right revision?
- Is the dump clean?
- Is the disc image still in the expected format?
- Does the project also need a BIOS or system file?

Do not look for random downloads. The intended path is to use legally obtained files and follow the project instructions.

## Next

- [What do I need to get started?](/docs/start/what-you-need)
- [How do I recomp my own game?](/docs/start/recomp-your-own-game)
- [Licenses](/docs/fleet/licenses)
- [What do these terms mean?](/docs/concepts/glossary)
