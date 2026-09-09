---
title: "Introducing Retro Porting Toolkit"
kicker: "Site news"
desc: "An open collection of the recompilers, runtimes, tools, game projects and knowledge growing around native ports of classic console games."
date: "2026-09-08"
authors: ["Shokunin", "Matthew Stanley"]
tags: ["Site news", "Recompilation", "Community"]
layout: "article"
---

Over the past couple of years, something interesting has been happening in retro games. Static recompilation projects have started appearing for more consoles, more games, and from more people. Games that were previously locked to one piece of hardware can now become native applications, while keeping the original game code intact. From there, people have been adding modern resolutions, new controls, higher frame rates, multiplayer features, mods, and occasionally much stranger things.

If you follow this stuff, you probably already know some of the projects. The problem is that they tend to exist as islands, so today we're launching **Retro Porting Toolkit** to start connecting them.

## One place for the ecosystem

Retro Porting Toolkit is an open collection of the recompilers, runtimes, tools, game projects and knowledge emerging around native ports of classic console games, and the site is at **retroportingtoolkit.com**. We currently cover work across [PlayStation](/hardware/playstation), [SNES](/hardware/super-nintendo), [Nintendo DS](/hardware/nintendo-ds), [Game Boy Advance](/hardware/game-boy-advance), [Genesis](/hardware/sega-genesis) and [NES](/hardware/nes), with more to come.

Some of these ecosystems are already surprisingly capable. Others are experimental. Some games have polished playable releases, while others are at the fascinating stage where somebody has just managed to make the title screen appear. We want to represent all of that.

If you already know what static recompilation is, the site should make it easier to see what is happening across the different ecosystems, find the underlying tools, understand how projects relate to each other, and hopefully start building something yourself.

If you **don't** know what static recompilation is, we have [an introduction](/docs/start/what-is-static-recompilation) for that too. The short version is that instead of emulating the original console, we translate the original game's machine code into something that can be compiled into a native application. A runtime then provides the hardware behaviour the game expects, and that distinction turns out to be pretty powerful.

## The fun starts after the game runs

Getting an old game running natively is already an impressive technical achievement, but to us that isn't really the end goal — it's the beginning. Once the game is a modern application, we can start asking what else it could be.

[Metroid Prime Hunters](/games/metroid-prime-hunters) can have mouse aiming, keyboard controls and a wider field of view. [Boktai](/games/boktai) originally used a solar sensor built into its Game Boy Advance cartridge to make real sunlight part of the game. In a modern port, that mechanic can instead use local weather data.

[Super Mario Bros.](/games/super-mario-bros) can have entirely new playable characters with their own mechanics. Samus can have beams, missiles and Morph Ball bombs. Sonic can have a spindash.

[Mega Man Zero](/games/mega-man-zero) can open its view past the original screen instead of stretching the picture, and [Faxanadu](/games/faxanadu) can have its dialogue rewritten from a file while the game is running.

Other projects are experimenting with things like high-resolution rendering, modern controller support, networking and modifications that would have been considerably harder to contemplate while working directly against the original hardware.

This is the part we're particularly interested in: not replacing the original games and not remaking them, but taking the original code and giving people a much larger surface to experiment with.

## Stop solving the same problems

There's another reason for putting these projects together, which is that a lot of this work is reusable. A console recompilation project isn't just a way to port one game. It can produce a recompiler, runtime, debugging infrastructure, launcher, libraries and a body of knowledge that makes the *next* game easier.

![Save states and rewind in Tomba!, built once so other ports can pick them up](https://www.youtube.com/watch?v=L36ppNkuJG0)

And some of that work can travel even further. Projects in completely different console ecosystems already share components. Tools created to solve a problem for one port have found their way into others. Lessons learned getting one particularly obnoxious piece of 30-year-old code working can save somebody else from discovering the same obnoxious thing six months later.

We want Retro Porting Toolkit to make those relationships visible and encourage more of them. The goal isn't a monolithic framework that everybody has to use; it's an ecosystem where fewer people have to start from zero.

## R.A.I.D. is becoming a team

Retro Porting Toolkit is also the first public step in formalising something that has been happening organically for a while. R.A.I.D. started as a loose collective of people interested in pushing retro game development forward. We shared work, helped with each other's projects, experimented with different approaches, and gradually found ourselves collaborating more and more.

At some point, a loose collection of people doing things together starts looking suspiciously like a team, so we're making it one.

The core Retro Porting Toolkit team, in no particular order, is:

**Matthew Stanley, Jack Rickey, Shokunin, Alex Vanderveen and Alexandros Mandravillis.**

We're deliberately not pretending every detail of the organisation has already been figured out. The dust is still settling. What matters to us is giving the work a more permanent home, making collaboration easier, and preserving the welcoming environment that allowed these projects to emerge in the first place.

The website is the first piece of that. We've tried to make it useful whether you're looking for something to play, trying to understand how one of these projects works, or staring at an old game and wondering whether you could be the person who ports it next. There are games, tools, docs, tutorials and probably a few bugs, and there is a lot more coming.

Come take a look, and tell us what we're missing.
