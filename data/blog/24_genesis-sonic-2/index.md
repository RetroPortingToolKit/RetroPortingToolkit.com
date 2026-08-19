---
title: "SegaGenesisRecomp Gets Game #2: Sonic the Hedgehog 2"
kicker: "1379.tech"
tags: []
featured: false
desc: "Sonic the Hedgehog 2 goes native, and the real work was teaching the Genesis framework to stop assuming every game is Sonic 1."
date: "2026-05-21"
venue: "1379.tech"
layout: "article"
cover: "./cover.png"
links:
  - { label: "Read on 1379.tech", href: "https://1379.tech/segagenesisrecomp-gets-game-2-sonic-the-hedgehog-2/" }
---

![](./genesisrecomp.mp4)

[SegaGenesisRecomp](https://github.com/mstan/segagenesisrecomp)

[Sonic the Hedgehog 2 Recomp](https://github.com/mstan/SonicTheHedgehog2Recomp)

Sonic the Hedgehog 2 now has a playable PC port build, marking SegaGenesisRecomp's important second-title milestone.

Playable does not mean exhaustive. It means a player can boot the game and navigate through stages. Less commonly travelled code paths, like boss fights, are likely to still incur issues at the time writing on this project.

Even with the above caveats, the game builds and exercise several code paths, and has been a forcing function in making segagenesisrecomp more abstract for the Sega Genesis ecosystem, instead of being a proxy for its first title, Sonic the Hedgehog.

## Moving Away From Sonic 1-Specific Behavior

A major focus of the Sonic 2 work was removing hardcoded Sonic 1 behavior from the runner and shared framework.

Instead of baking in assumptions that only apply to the first game, more behavior has been parameterized, abstracted, or moved into game-specific configuration. That makes the project healthier.

This is the kind of work that is not always flashy in a video clip, but it matters a lot for the long-term ecosystem.

Sonic 2 helped push the framework toward cleaner boundaries:

- game-specific behavior belongs in the game project
- shared Genesis behavior belongs in the common runtime
- assumptions should become parameters where possible
- one-off fixes should become reusable architecture when they apply to more than one title

That is the difference between a successful port and a growing recompilation framework.

## Next Steps

Sonic the Hedgehog 2 is now playable through SegaGenesisRecomp, with more testing still needed before calling it fully validated.

Given my backlog of projects, I may aim to let the community assist in heavier validation of Sonic 2, and instead do a breadth focused approach for now to support more titles. Sonic 3, Sonic & Knuckles (or realistically, Sonic 3 & Knuckles) is a good next target as a natural successor that exercise many *similar* code paths, allowing it to be a faster win, especially given that the Sonic games have all been well documented.

---

Related: [Sonic the Hedgehog 2](/games/sonic-the-hedgehog-2) on [Sega Genesis](/hardware/sega-genesis).
