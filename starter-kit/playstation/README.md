# PlayStation, in detail

The scaffold hands you a working tree. This explains what is in it, so you know
what to edit when the game misbehaves.

The authority for all of this is the framework's own
[`docs/GAME_PROJECT_SETUP.md`](https://github.com/mstan/psxrecomp/blob/master/docs/GAME_PROJECT_SETUP.md).
Where this page and that one disagree, that one is right.

## The scaffold

```sh
sh tools/new_project_layout/setup_project.sh \
  --disc /path/to/your/game.cue \
  --dir ~/src
```

`--disc` is required and takes a Redump style `.cue`. There is no prompt for it:
leave it out and the script exits telling you so.

Run without `--yes` and it asks you the rest: project name, player count (default
2, maximum 8), a zip prefix for releases, optional marketing fields that end up
in `catalog_identity.json` and the README, whether to include the launcher
interface, whether to enable the setup wizard and netplay, whether to write a
GitHub Actions release workflow, whether to fetch box art, whether to generate
now, and whether to build after generating.

Netplay turns itself off with no prompting when the player count is 1.

For the non interactive form and the full flag table, see the repository's
[`AGENTS.md`](../AGENTS.md).

## What you get

A scaffolded PlayStation port has this shape. Street Fighter Alpha 3 is a real
example you can read.

```
your-port/
  psxrecomp/            the framework, a pinned submodule
  recomp-ui/            the launcher interface, a pinned submodule
  disc/                 your game. GITIGNORED. Never commit this
  generated/            translated C. Usually gitignored, regenerate it
  game.toml             the per game configuration you will actually edit
  symbols.toml          names you have learned for addresses in the binary
  seeds/                addresses the analysis should start from
  catalog_identity.json how the title identifies itself
  disc_probe.json       what the probe read off your disc
  framework_pins.txt    the exact framework revisions this port was built against
  codegen_setup.c/.h    generated glue
  psx_symbols.h         generated symbol header
  launcher_assets/      box art and launcher presentation
  mods/                 optional mod packages
  scripts/              packaging and release helpers
  CMakeLists.txt        your build
  VERSION               pinned before a release
```

## The files you will edit

**`game.toml`** is the one that matters. It carries the per game configuration:
which disc, the runtime quirks, and any per function entries the recompiler needs
to handle this title. Most of your iteration lands here.

A per function entry is a signal, not a victory. If you find yourself adding one,
the recompiler probably failed to recognise a pattern generically, and fixing the
pattern in the framework is the better outcome. The framework's own contributor
rules say so directly.

**`seeds/`** holds addresses the analysis starts from. `probe_disc.py` writes a
first pass from the boot executable during the scaffold. You grow it as the game
reaches code the first pass missed, which is most of the work after the first
boot.

**`symbols.toml`** is names you have attached to addresses. Nothing breaks
without it; everything is easier with it.

## The files you do not edit

Anything under `generated/` is overwritten on the next run. If something in there
is wrong, the fix belongs in `game.toml`, in the seeds, or in the framework.
Editing generated code produces a fix that silently disappears.

## The development loop

```sh
# once per machine, and again after the framework changes
./psxrecomp/tools/ci/build_emitters.sh

# translate the game, and OpenBIOS, to C
python3 psxrecomp/psxrecomp_cli.py generate \
  --config game.toml --project-root . --disc disc/game.cue

# build the playable runtime
cmake -S . -B build-release -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build-release --target psx-runtime -j"$(nproc)"
```

Then boot it, play it, and fix what you find.

## Releasing

A release does not contain the game. Ports ship as source plus a setup host
archive, and the end user runs generate locally, because a recompiled binary
contains translated game code.

The packaging scripts refuse when game data is present in the tree being
archived. Use them rather than zipping a directory by hand: a build folder
zipped carelessly will contain the user's disc image, and that has happened.

## Read next

- [Port a game](https://retroportingtoolkit.com/docs/guides/port-a-game)
- [Configuration reference](https://retroportingtoolkit.com/docs/reference/configuration)
- [PlayStation platform page](https://retroportingtoolkit.com/docs/platforms/playstation),
  for what this toolchain does and its known limits
- [Release a port](https://retroportingtoolkit.com/docs/guides/release-a-port)
