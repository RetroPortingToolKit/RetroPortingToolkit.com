# Discord bot operations

`scripts/discord-agent.mjs` runs under launchd in the shared checkout. It waits while dirty or a commit is under 20 seconds old. Check both state/jobs.json and agent processes before editing; queued requests can be active without a process. Conflicting edits are reported Blocked and remain unstaged; inspect git history before redoing work.

Restart only with owner authorization and while idle. Send TERM to the verified bot process; launchd respawns it. `~/Library/Logs/RetroPortingToolkitDiscordAgent/stdout.log` reports `ready as`. Waiting requests resume automatically after restart; interrupted mid-edit requests need inspection.

After bridge changes, run `scripts/discord-agent.harness.test.mjs`, which exercises the real bridge with stub Discord, a fake agent, a temporary repo, and short `DISCORD_AGENT_*` timing overrides.
