---
title: "What do I need to get started?"
summary: "If you only want to play a finished port, you need the release and your own game file. If you want to build or work on ports, you need a small set of normal programming tools."
pageType: "guide"
tags: ["Prerequisites", "Build", "Game files"]
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/snesrecomp"
updated: "2026-08-30"
---

It depends on what you want to do.

If you only want to play a finished port, you do not need a developer setup. Download the port, run it, and give it the game file it asks for. Some consoles may also ask for a BIOS or another system file.

If you want to build a port, test changes, or start your own game project, you need a small set of normal programming tools.

## What if I only want to play?

Go to the [games](/games) page, pick a port, and download its release.

A finished port should behave like a normal app. On first launch, it may ask for your copy of the game. The port checks that file before it starts, because it was built for one exact game version.

That is all you need from this page if you only want to play.

This site does not provide game files or copyrighted retail BIOS files, and it does not tell you where to download them. The intended path is to legally dump them from hardware or media you own.

Some projects may include an open-source BIOS alternative when one is legal and useful. If so, the project will say that clearly.

## What tools do I need to build?

Most projects use the same five tools.

| Tool | What it is for |
|---|---|
| `git` | Downloading the project |
| C and C++ compiler | Building the recompiler, runtime, and app |
| CMake | Setting up the build |
| Ninja | Running the build |
| Python 3 | Running helper scripts |

Some projects need more, usually SDL for windows, input, and audio. A console's platform page will say when that matters.

## What should I install on Windows?

Most projects expect MSYS2 MinGW64, not PowerShell.

Install MSYS2, open the MinGW64 shell, then install the common tools:

```sh
pacman -S --needed mingw-w64-x86_64-toolchain mingw-w64-x86_64-cmake \
                   mingw-w64-x86_64-ninja mingw-w64-x86_64-ccache
```

Run build commands from that MinGW64 shell unless a project says otherwise.

## What should I install on macOS?

Install Apple's command line tools first. Then install CMake and Ninja:

```sh
brew install cmake ninja
```

Some projects also need SDL. If a build asks for it, install the SDL package named by that project.

## What should I install on Linux?

On Debian or Ubuntu, the common setup is:

```sh
sudo apt install build-essential cmake ninja-build
```

Some projects also need an SDL development package. Package names vary by distribution, so use the platform page or build error as your guide.

## What game files do I need?

For playing or porting a game, you need your own copy of that game in the format the project expects.

The exact file matters. A different region, revision, patch, bad dump, or trimmed file may be rejected. That is intentional. A port is tied to the bytes it was built around.

Some consoles also need a system file, such as a BIOS. That might mean a retail BIOS you dump yourself, or it might mean an open-source BIOS alternative supplied by the project. The platform page for that console will say when that applies.

## What do I not need yet?

You do not need to understand the whole console before you begin.

You do not need to know every command line tool by heart.

You do not need a game file for the [developer quickstart](/docs/start/quickstart). That page uses psxrecomp because it is the gold-standard framework here today. Its example builds an open BIOS image, so you can run the pipeline before pointing any tool at your own game.

Future systems may not use the same exact commands, but they should follow the same shape: build the framework, provide the files the project asks for, verify the input, then run the result.

## How do I check my setup?

Open the shell you plan to build from and run:

```sh
git --version
cmake --version
ninja --version
python3 --version
```

Each command should print a version. If one is missing, install that tool before continuing.

On Windows, run this check inside MSYS2 MinGW64. A tool that works in PowerShell may still be missing from the shell that actually builds the project.
