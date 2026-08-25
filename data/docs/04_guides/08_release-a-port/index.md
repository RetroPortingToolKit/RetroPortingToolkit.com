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
updated: "2026-08-25"
---

A release here is one archive per platform, built by a script. It holds the executable and the files it cannot run without, and no game data of any kind. That last rule decides what several projects ship at all. A recompiled binary contains translated game code, so some projects release only the tools and let each player build their own copy from their own dump.

## What a release must not contain

Every packaging document here is built around the same rule. gbarecomp states it most directly, in [`packaging/README.md`](https://github.com/mstan/gbarecomp/blob/main/packaging/README.md):

```text title="packaging/README.md"
## What is never packaged?

The ROM and the BIOS. A recompiled binary already embeds translated ROM code, so
these scripts are for building **your own** copy from **your own** dump — not for
redistribution. The launcher prompts for both on first run.

Recompiled sources (`generated/`) are not committed anywhere in this ecosystem;
regenerate them locally before packaging.
```

Because the compiled program contains translated game code, the packaging scripts are for making your own copy. Several projects therefore publish no game binary at all. [BoktaiRecomp](https://github.com/Shy/BoktaiRecomp) publishes only the ROM-free builder, and players supply their own ROM and BIOS. [syphon-filter-2-recompiled](https://github.com/Alexbeav/syphon-filter-2-recompiled) packages a setup kit and states that it never acquires a disc or EXE, never generates that game's C, and never builds a game binary. The shared psxrecomp game template says the same: CI never ships game C, and players generate once on their own machine.

Where a game binary is published, more things stay out. FaxanaduRecomp: the zip never contains `debug.ini`, `config.ini`, a ROM, or the player's save and logs. psxrecomp's standalone package includes `bios/openbios.bin` and its MIT notice, but no retail PS1 BIOS, disc image, generated game code, or save data.

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

The tool that replaced hand-zipping is an allowlist packager, and its design is worth copying: include only named files, then check that nothing forbidden got in anyway. It verifies the license is PolyForm Noncommercial and not AGPL, warns if a ROM is sitting next to the exe, refuses to write a zip if anything forbidden slips through, and exits non-zero on any failure.

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

segagenesisrecomp's is the only complete checklist here, and it is the one to copy. Six items, in its own order:

1. **Right target.** The zip contains the native exe only, never the recompiler and never a co-simulation build.
2. **License.** The project license is inside the zip as `LICENSE`.
3. **Attribution.** `THIRD-PARTY-LICENSES.md` is in the zip, and the `assets/` folder ships next to the exe so the launcher can load.
4. **No ROM, no dumps, no junk.** No ROM extensions, no `ramdump*`, no saves or savestates, no `.log`, no `.map`.
5. **No dev diagnostics.** The exe was built in the production configuration, with the dev trace and reverse debugger off.
6. **README** states bring-your-own-ROM, the project license, and where the source lives.

Then an audit against git history, not just the working tree, because a file removed today may still be in the repository's past:

```text
- `git -C <repo> ls-files | grep -iE '\.(bin|gen|smd)$'` → must be empty (no ROM tracked).
- `git -C <repo> log --all --diff-filter=A --name-only --pretty=format: | grep -iE '\.(bin|gen|smd)$'` → empty (no ROM ever committed).
```

Other repositories enforce the same thing by script. syphon-filter-2-recompiled runs `python tools/public_repo_audit.py --root .` as a CI job and then checks that no retail code leaked into the workspace.

## One asset per platform, never a bare executable

FaxanaduRecomp states the convention:

```text
## Asset convention: one zip, only a zip

Every release ships exactly one asset — never a bare exe (it is broken without
`SDL2.dll` and the `launcher/` assets):
```

SuperMarioWorldRecomp publishes two assets, one per platform, and says the same about a bare exe: it is broken without `SDL3.dll` and the launcher's `assets/` tree.

| Asset | Built by |
|---|---|
| `SuperMarioWorldRecomp-windows-x64-v<Version>.zip` | `tools/make_release.ps1` |
| `SuperMarioWorldRecomp-linux-<Version>-x86_64.AppImage` | `tools/build-linux.sh` |

## The documented procedures

### FaxanaduRecomp, the short one

Make sure the tree is the release commit: the game repository on `master`, with the recompiler at the SHA in `nesrecomp.pin`. Then build and stage:

```powershell
powershell -File tools\make_release.ps1            # builds + zips
powershell -File tools\make_release.ps1 -SkipBuild # zip an existing build_release
```

Smoke-test the zip from a scratch directory: extract, run, point at a ROM, and confirm the game boots and a save round-trips. Then tag and publish:

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

The version is passed quoted at configure time as `"-DSNESRECOMP_BUILD_VERSION:STRING=0.10.0"`, because PowerShell rewrites the unquoted form into `"0"` and then crash reports cannot be tied to a release. `make_release.ps1` now refuses to package an exe that is not stamped. The script also writes forward-slash ZIP entry names and re-reads the archive to reject Windows-only names, because `Compress-Archive` writes backslashes and a Proton user's extractor then produces files literally called `assets\fonts\...`, leaving the launcher with no fonts.

Linux is one command:

```bash
bash tools/build-linux.sh --version 0.10.0 --jobs 4
```

That script fetches `linuxdeploy` and `appimagetool` and verifies them against pinned SHA-256 values, stages the launcher assets into the AppDir, and writes an AppRun that keeps `$APPIMAGE` exported, so state lands next to the AppImage rather than inside the read-only squashfs. A layout test then fails the build if state leaks into the payload, if a config edit does not survive a relaunch, or if a moved AppImage does not re-anchor its state.

Publish only after the artifacts have been signed off:

```powershell
gh release create vX.Y.Z `
    release-stage\SuperMarioWorldRecomp-windows-x64-vX.Y.Z.zip `
    release-linux\SuperMarioWorldRecomp-linux-X.Y.Z-x86_64.AppImage `
    --title "vX.Y.Z — <headline>" --notes-file <notes.md>
```

### psxrecomp game repositories, the setup-host zip

This is the most elaborate path and it is fully scripted. A game repository calls `scripts/package_setup_release.sh`, which delegates to the shared `psxrecomp/tools/package_setup_host.sh`. That script stages the host exe, the title's sources, and filtered copies of `psxrecomp/` and `recomp-ui/`, then hands off to `stage_setup_sdk.sh` for the emitters, OpenBIOS and the MinGW DLLs. Filtering excludes `.git`, build directories, `__pycache__` and `generated`, and then removes the generated and disc working trees again, because a package never ships game generated C. It also refuses to ship a `VERSION` that disagrees with the version stamped into the exe.

Portable cmake and clang are not embedded by default. The setup wizard downloads the toolchain, or accepts a local offline zip, and a system cmake and ninja already on PATH also work.

### segagenesisrecomp

There is no tag-and-publish step in its `RELEASING.md` at all. The document is entirely a compliance gate around the packager.

## Platform packaging notes

macOS builds ship as a flat directory plus a `.tar.gz`, with every non-system dylib beside the executable, install names rewritten, and an ad-hoc signature. A `.app` bundle was tried and gets killed before it prints a byte: the launcher resolves assets relative to the executable, so they must sit in `Contents/MacOS`, where `codesign` treats them as code. The macOS script also copies libraries that `otool -L` cannot see, because Homebrew's SDL2 is often a shim that dlopens SDL3.

Linux packaging is the same shape with an `$ORIGIN` rpath, and deliberately does not bundle everything `ldd` reports. glibc, libstdc++, the loader and the graphics stack stay on the host, and bundling libGL kills hardware acceleration. For Steam Deck the answer is Flatpak, because SteamOS has an immutable root filesystem. `--generate-only` writes the manifest without building, which is all CI can do.

The only signing documented anywhere here is that macOS ad-hoc signature. There is no Windows Authenticode signing, no notarisation, and no GPG signing of release assets, so do not tell a user a download is signed.

## What CI can do without a game file

No CI here has a ROM, a disc image, or a BIOS dump. Every workflow either builds artefacts that need none, or runs on a self-hosted runner that keeps the copyrighted inputs off the service, which is what xenogears-recomp does. What ROM-free CI can still prove is that the tree configures, compiles and passes its suites on every platform, which is where portability regressions appear. BoktaiRecomp adds a trick worth stealing: syntax-only compilation of the repository's own non-generated sources against the engine headers, which catches the breaks that appear when the framework submodule moves.

The shared psxrecomp release template also checks a build feature rather than trusting it. It greps the configure log and the compiler flags for the Vulkan define and fails the job if either check misses.

Once published, releases are found through a separate catalogue repository, [retcomm-catalog](https://github.com/TechnicallyComputers/retcomm-catalog), which holds JSON manifests of supported titles, ROM and BIOS identity, and the release asset patterns a launcher matches on. Submission is label-gated: a maintainer adds the `approved` label, and that publishes a new `catalog.zip`.

## Release notes

Fifteen `RELEASE_NOTES.md` files exist across the fleet. They are per-release prose rather than process, and two things recur. First, a statement of what is not in the package: psxrecomp's says the package does not include a retail PS1 BIOS, game disc image, generated game code, save data, or copyrighted assets. Second, a first-launch walkthrough with hash verification: gbarecomp's v0.1.0 notes walk the player through picking their own BIOS dump, the runtime verifying its hash, and the validated path being saved next to the executable.

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

- [The game file you supply](/docs/concepts/the-game-file-you-supply) is the contract this page enforces.
- [Port a game](/docs/guides/port-a-game) produced the build you are packaging.
- [Errors and exit codes](/docs/reference/errors-and-exit-codes) is what the packagers return when they refuse.
- [Command line reference](/docs/reference/cli) has the flags for every tool named here.
