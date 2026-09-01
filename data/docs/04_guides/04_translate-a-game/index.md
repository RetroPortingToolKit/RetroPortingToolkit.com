---
title: "Translate a game"
summary: "Build a translation table for a recompiled port without editing the game file or regenerating code."
pageType: "guide"
tags: ["Translation", "Localization", "PlayStation", "NES"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/TsumuLightRecomp"
  - "https://github.com/mstan/nesrecomp"
  - "https://github.com/mstan/FaxanaduRecomp"
updated: "2026-08-30"
---

A translation changes the text the player sees.

In a recompiled port, that does not have to mean editing the game file. The usual path is a table: match the original bytes, then provide replacement text. The runtime applies the replacement while the game draws text.

No game file is distributed. No generated code needs to be hand-edited.

## Before you start

You need:

- a working port;
- your own copy of the game;
- a debug build if the project reloads translations through a debug server;
- a way to capture screenshots;
- a way to reach the text you want to translate.

Translation is part writing and part testing. Seeing the line on screen is the proof.

## What the table does

A translation table usually records:

| Field | Meaning |
|---|---|
| Source bytes | The original text record, stored as hex. |
| Terminator | How the original string ends. |
| Language column | The replacement text for one language. |
| Optional address | A tie-breaker when the same bytes appear in more than one place. |
| Width limit | How much room the translated line has. |

The runtime matches the original bytes. If it finds a match for the selected language, it gives the game the replacement text. If it does not find a match, the original text stays.

## Three ways games draw text

Games do not all draw text the same way.

| Layer | Use it when |
|---|---|
| String replacement | The game passes a pointer to a normal text record. |
| Fixed label patch | The label lives at a known address and the game draws it one glyph at a time. |
| VRAM patch | The text is already baked into a graphic, so you replace pixels instead of characters. |

Start with string replacement. Use the other layers only for text that cannot be reached as a normal string.

## Step 1. Capture source text

Run the game with capture enabled, if the project supports it.

Then play through the screens you want to translate: menus, tutorials, dialogue, item names, results, endings, and error prompts.

The output should be an inventory of real text records. If you get thousands of binary-looking records, your capture filter is too loose.

## Step 2. Decode and write

Convert the captured bytes into a table you can edit.

A small example looks like this:

```toml
schema = 1
default_lang = "en"

[[entry]]
src_hex = "51835b818083c982c882ea"
term = "ffff"
en = "Start here!"
```

Keep the source bytes exact. Edit the translation, not the match key.

## Step 3. Apply and verify on screen

Run the game with the table loaded.

The checkpoint is visual: the translated line appears in the correct place, with correct spacing, and without breaking the box around it.

Do not count a table hit as success by itself. A counter can say the replacement applied while the line is clipped, too long, missing a glyph, or drawn on the wrong screen.

## Step 4. Reload while testing

Some projects can reload a translation table while the game is running. Others require a restart.

Use the project-supported path. Do not assume file watching exists unless the running project proves it.

The useful loop is:

1. edit one line;
2. reload or restart;
3. return to the screen;
4. take a screenshot;
5. fix width, line breaks, or wording;
6. repeat.

## Step 5. Re-capture to find gaps

After a pass, capture again and compare the live inventory to the table.

The best definition of done is simple: a full playthrough adds no new text records that need translation.

That is strict, but it catches menu paths, error prompts, and late-game text that a normal quick test misses.

## Text that needs special handling

| Problem | What it means |
|---|---|
| The text is drawn one glyph at a time. | A pointer scan may never see it. Use a fixed label entry if the project supports one. |
| The text is part of an image. | Use a VRAM or asset patch, not string replacement. |
| The line is too long. | Add line breaks, shorten it, or use the project's width controls. |
| The game crashes after replacement. | The original bytes may be part of a larger structure, not a standalone string. |
| A glyph is missing. | The font or glyph upload path may need work before the language is viable. |
