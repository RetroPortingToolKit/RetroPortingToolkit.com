---
title: "Errors and exit codes"
summary: "How to read failed tool runs, build errors, debug protocol errors, and test exits across recomp projects."
pageType: "reference"
draft: true
tags: ["Reference", "Errors", "Exit codes"]
updated: "2026-08-30"
---

A failed command should tell you what failed.

In practice, recomp projects are still uneven here. Some tools have clean exit codes. Some only return non-zero. Some errors are from CMake, the compiler, the launcher, or the debug server instead of the recompiler itself.

Use this page as a reading guide, not as a promise that every tool follows one perfect standard.

## The basic rule

For scripts and automation, start here:

| Exit code | Meaning |
|---|---|
| `0` | Success. |
| `1` | The tool failed while doing the requested work. |
| `2` | The command was used incorrectly, or required input was missing. |
| other non-zero | Failure. Read the output. |

Specific tools may use more detail. Do not assume another project uses the same meaning unless it says so.

## CTest skips

`77` means skipped in CTest.

That matters because many tests need files the repository cannot ship: game files, BIOS files, oracle data, or large generated artifacts. A skipped test is not a pass. It means the test did not run in that environment.

When adding tests, register them with CTest if they can run without private inputs. A test that never runs does not protect the project.

## Common setup failures

| Symptom | Likely cause | What to do |
|---|---|---|
| CMake cannot find generated sources. | The generated recomp output has not been produced yet. | Run the project's regeneration step, then configure again. |
| A BIOS step fails immediately. | The BIOS file is missing, the wrong size, or not the expected file. | Use a legally obtained BIOS when the project requires one. This site does not provide it. |
| The build fails after generated files changed. | CMake was configured before the generated file list changed. | Reconfigure the build directory. |
| A compiler exits with little or no output. | The build may have run out of memory. | Lower the parallel job count and retry. |
| Windows paths behave strangely under MSYS or devkitPro tools. | A shell or shim rewrote the path. | Use the intended native executable and pass paths consistently. |
| A submodule path is missing. | The repository was cloned without submodules. | Update or clone with submodules. |

Do not keep rebuilding after the first real error scrolls past. Re-run the configure or build command with readable output and fix the first failure.

## Runtime failures

| Symptom | Likely cause | What to check |
|---|---|---|
| The game skips logic or jumps past a routine. | A dispatch miss or missing generated function. | Look for a dispatch miss log and add the missing code region to the config. |
| A scene runs far slower than expected. | The project is still interpreting some code, or the runtime needs optimization. | Check whether more code discovery, static coverage, or targeted optimization is needed. |
| The game softlocks after a timing change. | Cycle timing was made too loose or too fast for that game. | Restore faithful defaults, then retest changes one at a time. |
| A visual check passes but the player sees a problem. | The screenshot path may not capture the final rendered output. | Use the project's high-resolution or final-frame capture path if available. |
| A debug trace does not contain the event you wanted. | The ring buffer rolled over, or the query was too broad. | Narrow the address range or increase the trace window. |

For later systems, performance work can be large. It may take many passes over hot paths, generated code shape, renderer behavior, memory access, and debug overhead. Treat "the game is slow" as an optimization project, not as one missing flag.

## Debug protocol errors

Most debug servers use newline-delimited JSON: one request or response per line.

Expect both success and failure shapes.

| Shape | Meaning |
|---|---|
| `{"id": 1, "ok": true, ...}` | The command succeeded. |
| `{"id": 1, "ok": false, "error": "message"}` | The command failed. |
| `{"ok": false, "err": "message"}` | Same idea, different spelling used by some older servers. |

Clients should handle both `error` and `err`.

TCP debug servers are often preferred over MCP-style harnesses for recomp work because the game process restarts constantly. A simple TCP client can disconnect, reconnect, and continue. More structured harnesses often handle repeated restarts worse.

## Packaging failures

Packaging should be allowlisted.

That means the release script names what is allowed into the archive, instead of zipping whatever happened to be in the build folder.

Good packaging checks for:

- no game files
- no retail BIOS files
- no local debug junk
- no absolute paths
- portable archive paths
- the expected executable and assets
- version strings that match the release

Do not ship a bare executable unless the project is built to work that way. Most ports need assets, libraries, launcher metadata, or config files beside the executable.

## What to report

When asking for help, include:

- the command you ran
- the first real error
- the exit code
- your OS and compiler
- whether submodules are present
- whether required generated files exist
- whether the failure happens at configure, build, launch, or gameplay

Screenshots are useful for visual bugs. Text logs are better for build failures.
