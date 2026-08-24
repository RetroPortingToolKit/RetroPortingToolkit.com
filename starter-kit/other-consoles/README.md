# Starting a port on a console with no scaffolding

`psxrecomp` is the only toolchain in the fleet that ships a scaffold script. On
the other eight you start a new port by copying the shape of a working one and
changing what is game specific.

This page tells you which port to copy, what the per game input is called on that
console, and what you have to change. It is derived from reading the real
repositories, and each row names the one it was read from so you can go and look.

## The trap: `build` is not a port

Read this before you run anything, because it is the mistake that costs the most
time and it looks exactly like success.

Most of these toolchains ship a `build` subcommand. `nesrecomp build --output`
and `gbarecomp build --output` both run cleanly, print no errors, and leave you a
folder with generated C and a `CMakeLists.txt`. It is easy to conclude you have
made a port. You have not. Both build a **static library**.

The frameworks say so themselves, in the output they generate. nesrecomp's
generated README:

> This confirms that the generated source compiles; it is not a complete playable
> port by itself.

And gbarecomp's README:

> The CLI generates a recompilation project; it does not turn an arbitrary ROM
> into a finished playable port by itself.

What that subcommand does not write is the glue: the pinned submodules, a
`CMakeLists.txt` that pulls in the framework's runner, the source implementing
the runner's hook interface, and the per game recompiler input. That glue is what
you are copying from a working port, and it is the whole job.

If you are an agent, this matters twice over: a clean exit from `build` is not
evidence of a working port, and reporting one on that basis would be wrong.

## What every port has in common

Whichever console you are on, a port repository is thin glue around a pinned
framework. The invariant core is:

```
your-port/
  <toolchain>/        the framework, as a git submodule, pinned
  recomp-ui/          the launcher interface, as a git submodule
  CMakeLists.txt      your build, which includes the framework's
  README.md           what the game is, and that the user supplies the file
  ISSUES.md           what is known to be broken, kept honest
```

Then one console specific thing: the file that tells the recompiler about *your*
game. That file is spelled differently on every console, which is the single
biggest source of confusion, so it has its own table below.

Almost everything else is generated, gitignored, or optional.

## Which port to copy, per console

| Console | Framework | Copy this port | Per game input |
|---|---|---|---|
| NES | [`nesrecomp`](https://github.com/mstan/nesrecomp) | [FaxanaduRecomp](https://github.com/mstan/FaxanaduRecomp) | `game.toml`, plus `baserom_annotations.csv` |
| SNES | [`snesrecomp`](https://github.com/mstan/snesrecomp) | [DKC2Recomp](https://github.com/mstan/DKC2Recomp) | a `recomp/` directory of bank configuration |
| Game Boy Advance | [`gbarecomp`](https://github.com/mstan/gbarecomp) | [MinishCapRecomp](https://github.com/mstan/MinishCapRecomp) | `game.toml`, plus `symbols/` and `config/` |
| Game Boy | [`gbrecompiled`](https://github.com/mstan/gbrecompiled) | [PokemonYellowRecomp](https://github.com/mstan/PokemonYellowRecomp) | see that repository, it documents its own build dependencies |
| Genesis | [`segagenesisrecomp`](https://github.com/mstan/segagenesisrecomp) | [SonicTheHedgehogRecomp](https://github.com/mstan/SonicTheHedgehogRecomp) | `blacklist.txt` and `debug.ini`, with scripts under `scripts/` |
| Master System, Game Gear | [`smsggrecomp`](https://github.com/mstan/smsggrecomp) | [SonicTheHedgehogSMSRecomp](https://github.com/mstan/SonicTheHedgehogSMSRecomp) | see that repository |
| Virtual Boy | [`vbrecomp`](https://github.com/mstan/vbrecomp) | [MarioTennisVirtualBoyRecomp](https://github.com/mstan/MarioTennisVirtualBoyRecomp) | see that repository |
| Nintendo DS | [`ndsrecomp`](https://github.com/mstan/ndsrecomp) | [MetroidPrimeHuntersRecomp](https://github.com/mstan/MetroidPrimeHuntersRecomp) | see that repository |

CD-i, GameCube and Xbox are deliberately absent. Those projects describe
themselves as early development or as research instruments, not as a route to a
playable port, and you should not start a game project on them.

## The shape of the work

Copying a port is not literally `cp -r`. What you are reproducing is the
structure; what you are replacing is everything that names the old game.

1. **Start from the port's tree, not the framework's.** Create your repository,
   add the framework and `recomp-ui` as submodules at the same paths the model
   port uses, and pin them to a known good revision rather than tracking a branch.

2. **Take the build file and change the names.** The model port's
   `CMakeLists.txt` shows exactly how a title wires itself to its framework.

3. **Write the per game input from scratch.** This is the real work, and it does
   not copy across: it describes *your* game's memory layout, entry points, and
   the addresses the analysis needs help with. Read the model port's version to
   learn the format and the vocabulary, then write your own.

4. **Declare the file your user supplies.** Every port verifies the game file it
   is given, and the behaviour on a mismatch is not uniform across the fleet:
   Game Boy Advance and SNES ports refuse to launch, NES re-prompts, and
   PlayStation warns and tries to run anyway. Follow the model port's convention
   for your console.

5. **Build, boot, and start the long part.** Code the analysis did not discover
   surfaces as a crash or a hang well into the game rather than at startup.
   Finding and fixing those is the bulk of the work on any console.

## Be realistic about the timeline

On PlayStation, a scaffold command can hand you a booting tree in one session.
On these eight consoles you are hand assembling that same tree first, and the
per game input in step 3 is authored rather than probed. Budget an afternoon to
reach a first build, and expect the same weeks of soak afterwards that every port
needs.

If that sounds like a lot: it is, and the PlayStation tooling exists precisely
because someone got tired of doing it by hand. Bringing similar scaffolding to
the other toolchains is the single highest value contribution anyone could make
to this ecosystem right now.

## Read next

- [Port a game](https://retroportingtoolkit.com/docs/guides/port-a-game), the
  full guide with the canonical layout and the per game fix mechanisms
- [The game file you supply](https://retroportingtoolkit.com/docs/concepts/the-game-file-you-supply)
- The platform page for your console, for example
  [NES](https://retroportingtoolkit.com/docs/platforms/nes), which carries that
  toolchain's status in its own words, its commands, and its known limits
