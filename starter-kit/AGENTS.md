# You are an agent asked to start a recompilation project

Read this file completely before running anything. It is written for you, not
for a person. A human version is in `README.md`.

Your user has a game file and wants a native port of it. Your job is to get from
that file to something that builds and boots, then hand back a repository they
can keep working in.

## Before anything else: three questions

Answer these from what the user gave you. Do not guess. If you cannot answer one,
ask.

**1. What console is the game from?** This decides everything that follows. A
disc image (`.cue` plus `.bin`) is almost certainly PlayStation. A `.nes`, `.sfc`,
`.gba`, `.gb`, `.md` or `.vb` file names its own console.

**2. Has it already been ported?** Check
<https://retroportingtoolkit.com/all/games> before you build anything. If a port
exists, the user almost certainly wants to build that, not start a new one. Say
so and stop.

**3. Does the user actually have the file?** You never obtain it, download it,
or tell them where to get one. They supply it. If they have not, stop and say
that is the blocker.

## The honest state of the ground you are standing on

Read this before promising anything.

**PlayStation is the only console with scaffolding.** `psxrecomp` ships
`tools/new_project_layout/`, which creates the repository, pins the framework,
probes the disc for its identity and a first pass at seeds, writes the CI and
packaging stubs, and can run the first generate and build for you. That is the
path that gets a new title booting quickly.

**The other eight toolchains have no scaffolding at all.** NES, SNES, Game Boy
Advance, Game Boy, Genesis, Master System, Virtual Boy and DS all require you to
copy the shape of an existing port by hand. `other-consoles/` in this repository
tells you which port to copy and what to change. It is slower and it is more
manual, and you should tell your user that up front rather than after an hour.

**On those eight, do not mistake `build` for a port.** Several of them ship a
`build` subcommand that exits cleanly and leaves generated C and a
`CMakeLists.txt`, and it builds a static library rather than a playable port. The
frameworks say so in the output they generate: nesrecomp's says "it is not a
complete playable port by itself", gbarecomp's says "it does not turn an
arbitrary ROM into a finished playable port by itself". A clean exit there is not
evidence of anything, and reporting success on it would be wrong.

Do not tell a user that a Genesis port will be running in five minutes. It will
not.

## PlayStation: the path that works

### What must already be on the machine

Check each one and report what is missing rather than proceeding half configured.

- `git`, `cmake` (3.20 or newer), `ninja`, a C++20 compiler, `python3`
- On Windows, MSYS2 MinGW rather than MSVC
- The user's own disc image, as a `.cue` with its `.bin` files beside it

You do not need a BIOS dump. The framework builds against a bundled open source
OpenBIOS by default. A retail `SCPH1001.BIN` can be supplied with `--bios` and
some titles need one, which you will only discover when the game misbehaves.

### Step 1: get the framework

```sh
git clone https://github.com/mstan/psxrecomp.git
cd psxrecomp
git submodule update --init --recursive
```

### Step 2: scaffold the project

This is the step that does the work. Run it non interactively so you are not
waiting on prompts you cannot answer:

```sh
sh tools/new_project_layout/setup_project.sh \
  --yes \
  --name "Game Name" \
  --disc /absolute/path/to/game.cue \
  --dir "$HOME/src" \
  --players 1 \
  --generate \
  --enable-build \
  --no-github
```

`--yes` requires `--name` and `--disc`. In this mode the yes or no options
default to off, so anything you want must be passed explicitly. That is why
`--generate` and `--enable-build` are listed above: without them the scaffold
stops after writing the tree, and reports success having produced nothing
runnable.

Two caveats on that, because "everything defaults off" is not literally true.
The setup wizard defaults ON when the launcher interface is enabled, so
`--yes --enable-recomp-ui` quietly turns the wizard on as well. And the command
above produces a build with no launcher interface, no wizard and no netplay,
which is the right shape for a first build but not the shape a shipping port
has. Add those back deliberately once the game boots.

The flags you will actually reach for:

| Flag | Meaning |
|---|---|
| `--disc PATH` | Required. The user's `.cue`. Stages it, and probes it for identity, seeds and a TOC fingerprint. |
| `--name NAME` | Required with `--yes`. The project name. |
| `--dir PATH` | Parent directory for the new repository. Defaults to the current directory. |
| `--players N` | Default 2, maximum 8. Pass `1` for a single player game: netplay then turns itself off with no prompting. |
| `--bios PATH` | Optional retail BIOS, only used if generate runs. |
| `--generate` / `--no-generate` | Build the emitters and translate the game to C. |
| `--enable-build` / `--no-build` | Configure and build afterwards. This forces generate on: passing it without `--generate` prints `warning: --enable-build requires Generate` and enables it for you. Pass both anyway, so the command says what it does. |
| `--no-github` | Do not create a remote repository. Always pass this unless your user explicitly asked for a remote. |
| `--enable-recomp-ui` / `--no-recomp-ui` | The launcher interface. Off means no wizard and no netplay. |
| `--enable-netplay` / `--no-netplay` | Rollback netplay. Automatically off when `--players 1`. |
| `--enable-ci` / `--no-ci` | Write a GitHub Actions release workflow. |
| `--fetch-boxart` / `--no-fetch-boxart` | Needs network access. |
| `--zip-prefix S` | Release archive prefix. Defaults to an acronym of the name. |
| `--psxrecomp-ref` / `--recomp-ui-ref` / `--recomp-net-ref` | Pin a specific framework revision. |

**Never pass `--create-github` on your own initiative.** Creating a public
repository is your user's decision, not yours.

### Step 3: if you did not let the scaffold build, do it by hand

```sh
./psxrecomp/tools/ci/build_emitters.sh

python3 psxrecomp/psxrecomp_cli.py generate \
  --config game.toml --project-root . --disc disc/game.cue

cmake -S . -B build-release -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build-release --target psx-runtime -j"$(nproc)"
```

`build_emitters.sh` is once per machine, and again after the framework changes.

### Step 4: know what you have, and what you do not

A successful build is not a finished port. The framework's own setup document is
blunt about what remains, and you should be too. After the scaffold you still
have to:

1. Boot and soak the game, fixing missing seeds, overlays and runtime quirks in
   `game.toml`
2. Test netplay, if the title has it
3. Add more symbols to `symbols.toml` as you learn the binary
4. Tag and ship

Steps 1 and 4 are where the real time goes.

## What you cannot do, and must hand back

Be honest with your user at these points rather than looping.

- **You cannot tell whether the game looks right.** Booting to a black screen,
  corrupted graphics, wrong colours and audio problems all need eyes. Build it,
  run it, and ask your user to look.
- **You cannot decide the game is finished.** Only a person playing it can.
- **You cannot supply the game file.** Ever.
- **A missing seed usually shows as a crash or a hang deep into the game**, not
  at boot. If the game boots and dies later, that is the likely cause, and it is
  iterative work rather than one fix.

## When it goes wrong

| Symptom | Cause | What to do |
|---|---|---|
| `Cannot find source file: generated/OpenBIOS_full.c` | The BIOS C was never generated | Run the generate step before configuring CMake |
| `dispatch_miss_total` is above zero | Code the analysis did not find | Treat as a real bug, not noise. Each miss is a game breaking gap. Add the address to the dispatch miss seeds and regenerate. On PlayStation you read this from the debug server's `dispatch_stats` command; the cartridge toolchains write a `dispatch_misses.log` instead |
| Compiler exits with no diagnostic, code -1 | Out of memory | Lower the parallelism: `-j2` rather than `-j"$(nproc)"` |
| `ninja: GetLastError() = 2`, or a cache load failure | You built a directory that never configured | Fix the real configure error rather than retrying the build |
| MinGW says `too many sections` | COFF section limit | Add `-Wa,-mbig-obj` |
| The build zip contains the user's disc image | Packaging without the allowlist | Never hand ship a zip. Use the project's packaging script, which refuses when game data is present |

## Rules you do not break

These come from the framework's own contributor rules, which recur across the
fleet.

1. **Never edit generated code.** Anything under `generated/` is overwritten on
   the next run. Fix the input or the tool.
2. **Never commit a disc image, a ROM, a BIOS dump, or anything derived from
   them.** `disc/` is ignored for this reason. A recompiled binary contains
   translated game code, which is why ports ship as source and each user builds
   their own.
3. **Prefer a fix in the framework over a per game workaround.** A per function
   entry in `game.toml` usually means the recompiler failed to recognise a
   pattern generically, and the pattern is the better fix.
4. **Unknown is an acceptable answer. Guessing is not.** If you cannot establish
   something, say so and leave it.

## Where to go next

- The full documentation: <https://retroportingtoolkit.com/docs>
- Written for you specifically: <https://retroportingtoolkit.com/docs/agents/start-here>
- Everything programmatically drivable, including the debug protocol:
  <https://retroportingtoolkit.com/docs/agents/machine-surfaces>
- Every page of the documentation as raw markdown, one fetch:
  <https://retroportingtoolkit.com/llms-full.txt>

The framework's own setup document, which is the authority and which this file
summarises, is
[`docs/GAME_PROJECT_SETUP.md`](https://github.com/mstan/psxrecomp/blob/master/docs/GAME_PROJECT_SETUP.md).
When this file and that one disagree, that one is right, and this one is stale.
