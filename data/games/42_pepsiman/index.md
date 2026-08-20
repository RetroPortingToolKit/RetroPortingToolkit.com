---
title: "Pepsiman"
kicker: "PlayStation"
tags: ["WebAssembly", "60 FPS"]
featured: false
desc: "The PS1 cult classic that never came West, recompiled to run in a browser tab at 60 FPS."
year: "2026"
status: "Released"
availability: "No public release"
provenance: "community"
platform: "playstation"
group: "Community"
links:
  - { label: "Pepsiman Recompiled lets you play this cult classic in your browser (Retro Handhelds)", href: "https://retrohandhelds.gg/pepsiman-recompiled-lets-you-play-this-cult-classic-in-your-browser/" }
  - { label: "Pepsiman in your browser at 60 FPS (Notebookcheck)", href: "https://www.notebookcheck.net/A-recompiled-version-of-Pepsiman-lets-you-play-the-PS1-cult-classic-natively-in-your-browser-at-60-FPS.1354060.0.html" }
verified: "2026-08-18"
cover: "./pepsiman-browser.jpg"
---

Pepsiman (1999) never released outside Japan, which makes it a fitting pick for a community recompilation with an unusual target: instead of a Windows or Linux binary, this one compiles the game to WebAssembly and runs it in a browser tab.

## Can I play it?

Not at the covered address right now. The project, started by kem0X as RepsiMan and released publicly as Pepsiman Recompiled, was playable in the browser when Notebookcheck covered it in July 2026, built from BIOS, disc, and memory card data you provide.

As of this page's last check, the play URL from that coverage has been taken down ("This content is no longer available"), and no public repository for the project has been identified. There is currently no verified place to play or build it. The press link stays as the record of the release.

## What the recomp added

As covered: 60 FPS instead of the original framerate, widescreen or the original 4:3, texture and geometry corrections, saves kept in the browser, offline play as an installable web app, and a competitive leaderboard. It ran best on Chromium-based browsers, with known bugs on other browsers and on mobile.

## Technical details

The pipeline is [PSXRecomp](/hardware/playstation) with WebAssembly as the output target: the PlayStation code is translated ahead of time, so the browser runs compiled code rather than a general-purpose console emulator interpreting the disc. Browser features do the rest, with local storage holding saves and PWA installation covering offline play.

## Sources

- [Pepsiman in your browser at 60 FPS (Notebookcheck)](https://www.notebookcheck.net/A-recompiled-version-of-Pepsiman-lets-you-play-the-PS1-cult-classic-natively-in-your-browser-at-60-FPS.1354060.0.html)
