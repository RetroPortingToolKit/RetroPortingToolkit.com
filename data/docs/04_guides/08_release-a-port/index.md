---
title: "Release a port"
summary: "Packaging a port for other people: what the fleet's release documents require, why several projects ship tools rather than game binaries, and how the allowlist packagers make it impossible to sweep game data into a zip."
pageType: "guide"
tags: ["Releasing", "Packaging", "Compliance"]
repos:
  - "https://github.com/mstan/segagenesisrecomp"
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/gbarecomp"
  - "https://github.com/mstan/FaxanaduRecomp"
  - "https://github.com/mstan/SuperMarioWorldRecomp"
  - "https://github.com/Shy/BoktaiRecomp"
  - "https://github.com/mstan/TombaRecomp"
  - "https://github.com/TechnicallyComputers/retcomm-catalog"
updated: "2026-08-23"
---

A release in this fleet is one archive per platform, built by a script, containing the executable and the files it cannot run without, and containing no game data of any kind. That last constraint is not a footnote: it decides what several projects ship at all. A recompiled binary embeds translated game code, so some projects release only the tools and let each player build their own copy from their own dump. This guide covers what goes in a release, what must never go in, and the documented procedures for producing one.

## What a release must not contain

Every packaging document in the fleet is built around the same negative constraint. gbarecomp states the reasoning most directly, in [`packaging/README.md`](https://github.com/mstan/gbarecomp/blob/main/packaging/README.md):

```text title="packaging/README.md"
## What is never packaged

The ROM and the BIOS. A recompiled binary already embeds translated ROM code, so
these scripts are for building **your own** copy from **your own** dump — not for
redistribution. The launcher prompts for both on first run.

Recompiled sources (`generated/`) are not committed anywhere in this ecosystem;
regenerate them locally before packaging.
```

Read that as the reason, not the rule. Because the compiled artefact carries translated game code, the packaging scripts are for making your own copy, and several projects therefore do not publish a game binary at all. [BoktaiRecomp](https://github.com/Shy/BoktaiRecomp)'s release workflow publishes only the ROM-free builder and says players supply their own ROM and BIOS. [syphon-filter-2-recompiled](https://github.com/Alexbeav/syphon-filter-2-recompiled)'s release workflow packages an owned-input setup kit and states that it never acquires a disc or EXE, never generates that game's C, and never builds a game binary. The shared psxrecomp game template says the same thing about its own artefacts: CI never ships game C, and players generate once on their own machine.

Where a game binary is published, three more things stay out. FaxanaduRecomp: the zip never contains `debug.ini`, `config.ini`, a ROM, or the player's save and logs. psxrecomp's standalone package includes `bios/openbios.bin` and its MIT notice at `bios/OpenBIOS.LICENSE`, but no retail PS1 BIOS, game disc image, generated game code, or save data.

> **You provide this.** The player supplies their own game file, on first run, every time. The projects do not distribute game files and a release is built so that it cannot.

## Package mechanically, never by hand

The rule against zipping a build folder exists because somebody did. From segagenesisrecomp's [`RELEASING.md`](https://github.com/mstan/segagenesisrecomp/blob/master/RELEASING.md):

```text title="RELEASING.md"
## Do it mechanically — never zip a build folder by hand

The CMake copies the ROM (`sonic*.bin`) next to the exe, so zipping a build
folder leaks the ROM (this happened — `release-v0.3.0` shipped `sonic.bin`).
Always package with the allowlist tool, which **refuses** if a ROM/dump/junk
is present:
```

The tool that replaced hand-zipping is an allowlist packager, and its design is worth copying: include only named things, then assert none of the forbidden things got in anyway. It verifies the license is PolyForm Noncommercial and not AGPL, warns if a ROM is sitting next to the exe, refuses to produce a zip if anything forbidden slips through, and exits non-zero on any compliance failure.

From [`tools/package_release.py`](https://github.com/mstan/segagenesisrecomp/blob/master/tools/package_release.py):

```python title="tools/package_release.py"
# Forbidden in a release zip. NOTE: ".md" is intentionally NOT here — README.md
# is markdown. Genesis ROMs in this project are *.bin, covered below.
FORBIDDEN = [
    "*.bin", "*.gen", "*.smd", "*.md5", "*.sha256",          # ROM images / hashes
    "ramdump*", "*_save_*.bin", "savestate*", "*.srm",       # dumps / saves
    "*.log", "*.map", "*.obj", "*.pdb", "*.ilk", "*.exp", "*.lib",  # build junk
]
```

The invocation, from the same `RELEASING.md`:

```sh
python segagenesisrecomp/tools/package_release.py \
    --exe       build/Release/<Game>.exe \
    --extra     build/Release/SDL2.dll \
    --asset-dir build/Release/assets \
    --license   LICENSE \
    --notices   segagenesisrecomp/THIRD-PARTY-LICENSES.md \
    --readme    release/README.txt \
    --out       <Game>-vX.Y.Z-win64.zip
```

| Flag | Required | What it stages |
|---|---|---|
| `--exe` | yes | the game .exe |
| `--out` | yes | output .zip path |
| `--license` | yes | project license file, verified to be PolyForm Noncommercial and not AGPL |
| `--notices` | yes | `THIRD-PARTY-LICENSES.md` |
| `--readme` | yes | README for the zip |
| `--extra` | no, repeatable | additional allowlisted files, for example `SDL2.dll` |
| `--asset-dir` | no, repeatable | stage a directory preserving its top folder, for example `assets/` |

## The compliance checklist

segagenesisrecomp's is the only fully formed checklist in the fleet, and it is the model to copy. Six items, in its own order:

1. **Right target.** The zip contains the native exe only, never the recompiler binary and never a co-simulation build.
2. **License.** The project license is inside the zip as `LICENSE`.
3. **Attribution.** `THIRD-PARTY-LICENSES.md` is in the zip, covering ymfm, the Z80 core, clowncommon, SDL2 and the launcher dependencies. The `assets/` folder ships next to the exe so the launcher can load.
4. **No ROM, no dumps, no junk.** No ROM extensions, no `ramdump*`, no saves or savestates, no `.log`, no `.map`. Users bring their own ROM.
5. **No dev diagnostics.** The exe was built in the production configuration, with the dev trace and reverse debugger off.
6. **README** states bring-your-own-ROM, the project license, and where the source lives.

Then an audit against git history, not just the working tree, because a file removed today may still be in the repository's past:

```text
- `git -C <repo> ls-files | grep -iE '\.(bin|gen|smd)$'` → must be empty (no ROM tracked).
- `git -C <repo> log --all --diff-filter=A --name-only --pretty=format: | grep -iE '\.(bin|gen|smd)$'` → empty (no ROM ever committed).
```

Other repositories enforce the same thing by script instead of by list. syphon-filter-2-recompiled runs `python tools/public_repo_audit.py --root .` plus its unit tests as a CI job, and asserts afterwards that no retail code leaked into the workspace.

## One asset per platform, never a bare executable

FaxanaduRecomp states the convention:

```text
## Asset convention: one zip, only a zip

Every release ships exactly one asset — never a bare exe (it is broken without
`SDL2.dll` and the `launcher/` assets):
```

SuperMarioWorldRecomp publishes two assets, one per platform, and says the same thing about the bare exe: it is broken without `SDL3.dll` and the recomp-ui `assets/` tree, and redundant next to the zip.

| Asset | Built by |
|---|---|
| `SuperMarioWorldRecomp-windows-x64-v<Version>.zip` | `tools/make_release.ps1` |
| `SuperMarioWorldRecomp-linux-<Version>-x86_64.AppImage` | `tools/build-linux.sh` |

## The documented procedures

### FaxanaduRecomp, the short one

Make sure the tree is the release commit: the game repository on `master`, with the vendored recompiler checked out at the SHA in `nesrecomp.pin`. Then build and stage:

```powershell
powershell -File tools\make_release.ps1            # builds + zips
powershell -File tools\make_release.ps1 -SkipBuild # zip an existing build_release
```

Smoke-test the zip from a scratch directory: extract, run, point at a ROM, confirm the launcher and game boot and that a save round-trips. Then tag and publish:

```powershell
git tag vX.Y.Z ; git push origin master --tags
gh release create vX.Y.Z release\FaxanaduRecomp-windows-x64.zip `
    --title "vX.Y.Z — <headline>" --notes-file RELEASE_NOTES.md
```

`make_release.ps1` calls the full build script for a plain release build and strips `debug.ini`. Only Windows is cut by this procedure.

### SuperMarioWorldRecomp, with two traps encoded in the commands

```powershell
powershell -File tools\make_release.ps1 -Version 0.10.0 `
  -BuildDir build-recompui -RuntimeBinDir C:\msys64\mingw64\bin
```

The version is passed quoted at configure time as `"-DSNESRECOMP_BUILD_VERSION:STRING=0.10.0"` because PowerShell rewrites the unquoted form into `"0"`, which would ship crash reports that cannot be tied to a release; `make_release.ps1` now refuses to package an exe that is not stamped. The script also writes portable forward-slash ZIP entry names and then re-reads the archive to reject any Windows-only name, because `Compress-Archive` writes backslashes and a Proton user's extractor then produces files literally called `assets\fonts\...`, leaving the launcher with no fonts at all.

Linux is one command:

```bash
bash tools/build-linux.sh --version 0.10.0 --jobs 4
```

That script fetches `linuxdeploy` and `appimagetool` into the build tree and verifies them against pinned SHA-256 values, stages the launcher assets into the AppDir, writes an AppRun that keeps `$APPIMAGE` exported so state anchors next to the AppImage rather than inside the read-only squashfs, and runs a layout test that fails the build if state leaks into the payload, if a user config edit does not survive a relaunch, or if a moved AppImage does not re-anchor its state.

Publishing happens only after the artifacts have been signed off:

```powershell
gh release create vX.Y.Z `
    release-stage\SuperMarioWorldRecomp-windows-x64-vX.Y.Z.zip `
    release-linux\SuperMarioWorldRecomp-linux-X.Y.Z-x86_64.AppImage `
    --title "vX.Y.Z — <headline>" --notes-file <notes.md>
```

### psxrecomp game repositories, the setup-host zip

This is the most elaborate path and it is fully scripted. A game repository calls `scripts/package_setup_release.sh`, which delegates to the shared `psxrecomp/tools/package_setup_host.sh`. That script stages the host exe, the title's sources, filtered copies of `psxrecomp/` and `recomp-ui/`, then hands off to `stage_setup_sdk.sh` for the emitters, OpenBIOS and the MinGW DLLs. Filtering excludes `.git`, build directories, `__pycache__` and `generated`, and then explicitly removes the generated and disc working trees again, on the stated principle that a package never ships game generated C or common disc working trees. It refuses to ship a `VERSION` that disagrees with the version stamped into the exe at build time, a rule added after a netplay list-filter bug.

Portable cmake and clang are not embedded by default: the setup wizard downloads the toolchain, or accepts a local offline zip, and a system cmake and ninja already on PATH also work.

### segagenesisrecomp

There is no tag-and-publish step in its `RELEASING.md` at all. The document is entirely a compliance gate around the packager.

## Platform packaging notes

macOS builds ship as a flat directory plus a `.tar.gz`, with every non-system dylib beside the executable and install names rewritten, and an ad-hoc signature. A `.app` bundle was tried and is killed before it prints a byte: the launcher resolves assets relative to the executable, so they must sit in `Contents/MacOS`, where `codesign` treats them as code. The macOS script also copies libraries that `otool -L` cannot see, because Homebrew's SDL2 is often a shim that dlopens SDL3, and without that copy the game dies with a failure to load SDL3.

Linux packaging is the same shape with an `$ORIGIN` rpath, and deliberately does not bundle everything `ldd` reports: glibc, libstdc++, the loader and the graphics stack stay on the host, and bundling libGL in particular kills hardware acceleration. For Steam Deck, Flatpak is the answer because SteamOS has an immutable root filesystem; `--generate-only` writes the manifest and metadata without building, which is all CI can do.

The only signing documented anywhere in this fleet is that macOS ad-hoc signature. There is no Windows Authenticode signing, no notarisation, and no GPG signing of release assets in any repository, so do not tell a user a download is signed.

## What CI can do without a game file

No CI in this fleet has a ROM, a disc image, or a BIOS dump. Every workflow either builds artefacts that need none, or runs on a self-hosted runner that keeps the copyrighted inputs off the service entirely, which is what xenogears-recomp does and says so in its workflow. What ROM-free CI can still prove is that the tree configures, compiles and passes its suites on every platform, which is where portability regressions actually appear. BoktaiRecomp adds a trick worth stealing: syntax-only compilation of the repository's own non-generated sources against the engine headers, which catches the class of break that only appears when the framework submodule moves.

The shared psxrecomp release template also gates on a build feature rather than trusting it: it greps the configure log and the compiler flags for the Vulkan define and fails the job outright if either check misses.

Once published, releases are discovered through a separate catalogue repository, [retcomm-catalog](https://github.com/TechnicallyComputers/retcomm-catalog), which holds JSON manifests of supported titles, ROM and BIOS identity, and the release asset patterns a launcher matches on. Its submission flow is label-gated: a maintainer adds the `approved` label, and that publishes a new `catalog.zip`.

## Release notes

Fifteen `RELEASE_NOTES.md` files exist across the fleet, plus four versioned variants. They are per-release prose rather than process, and two things recur that a reader should expect to find. First, an explicit statement of what is not in the package: psxrecomp's says the package does not include a retail PS1 BIOS, game disc image, generated game code, save data, or copyrighted assets. Second, a first-launch walkthrough including hash verification: gbarecomp's v0.1.0 notes walk the player through picking their own BIOS dump, the runtime hash-verifying it, and the validated path being saved next to the executable.

## When packaging fails

| Symptom | Cause | Fix |
|---|---|---|
| A release zip shipped the ROM | The build copies the ROM next to the exe, so zipping the build folder sweeps it in | Package with the allowlist tool, which refuses when a ROM, dump or junk file is present |
| A Linux or Steam Deck user extracts the zip and the launcher finds no fonts | `Compress-Archive` wrote Windows backslashes into the ZIP entry names | Write portable `/` entry names and re-read the archive to reject Windows-only names |
| A macOS build dies at startup reporting it failed to load SDL3 | A dlopen'd library that `otool -L` cannot see | Use `packaging/package_macos.sh`, which finds and copies it |
| A macOS `.app` bundle is killed before printing anything | Assets must live beside the executable, where `codesign` treats them as code | Ship a flat directory, not a bundle |
| A Windows exe fails at launch with `0xc000007b` | A MinGW build dynamically importing SDL and the GCC runtime DLLs finds a different-architecture copy earlier on the search path | Build with the static runtime option, on by default for MinGW Release, which removes every non-system import |
| The setup-host packager rejects a host exe | The exe was not built with the current framework, so its version stamp is missing or disagrees | Rebuild against the current framework, then repackage |
| AppImage state lands inside the read-only payload | The AppRun did not export `$APPIMAGE` | Use `tools/build-linux.sh`, whose layout test fails the build on exactly this |

## Source

- segagenesisrecomp: [`RELEASING.md`](https://github.com/mstan/segagenesisrecomp/blob/master/RELEASING.md), [`tools/package_release.py`](https://github.com/mstan/segagenesisrecomp/blob/master/tools/package_release.py)
- psxrecomp: [`README.md`](https://github.com/mstan/psxrecomp/blob/master/README.md), [`RELEASE_NOTES.md`](https://github.com/mstan/psxrecomp/blob/master/RELEASE_NOTES.md), [`tools/package_setup_host.sh`](https://github.com/mstan/psxrecomp/blob/master/tools/package_setup_host.sh), [`tools/stage_setup_sdk.sh`](https://github.com/mstan/psxrecomp/blob/master/tools/stage_setup_sdk.sh), [`tools/create_release_zip.py`](https://github.com/mstan/psxrecomp/blob/master/tools/create_release_zip.py)
- gbarecomp: [`packaging/README.md`](https://github.com/mstan/gbarecomp/blob/main/packaging/README.md), [`RELEASE_NOTES.md`](https://github.com/mstan/gbarecomp/blob/main/RELEASE_NOTES.md)
- Game repositories: [`FaxanaduRecomp/RELEASE.md`](https://github.com/mstan/FaxanaduRecomp/blob/master/RELEASE.md), [`SuperMarioWorldRecomp/RELEASE.md`](https://github.com/mstan/SuperMarioWorldRecomp/blob/main/RELEASE.md), [`TombaRecomp/.github/workflows/release.yml`](https://github.com/mstan/TombaRecomp/blob/master/.github/workflows/release.yml)
- ROM-free CI: [`BoktaiRecomp/.github/workflows/release.yml`](https://github.com/Shy/BoktaiRecomp/blob/main/.github/workflows/release.yml), [`syphon-filter-2-recompiled/.github/workflows/release-kit.yml`](https://github.com/Alexbeav/syphon-filter-2-recompiled/blob/main/.github/workflows/release-kit.yml), [`xenogears-recomp/.github/workflows/release.yml`](https://github.com/OpokXeno/xenogears-recomp/blob/master/.github/workflows/release.yml)
- Distribution: [`retcomm-catalog/README.md`](https://github.com/TechnicallyComputers/retcomm-catalog/blob/main/README.md)

## Next

- [The game file you supply](/docs/concepts/the-game-file-you-supply) is the contract this page enforces at package time.
- [Port a game](/docs/guides/port-a-game) is what produced the build you are packaging.
- [Errors and exit codes](/docs/reference/errors-and-exit-codes) covers what the packagers return when they refuse.
- [Command line reference](/docs/reference/cli) has the full flag set for every tool named here.
