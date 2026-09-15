# retroportingtoolkit.com handoff

2026-09-13: Instruction-only cleanup; application behavior unchanged. Earlier notes are preserved verbatim in [HANDOFF-history-2026-09-13.md](HANDOFF-history-2026-09-13.md). Read the relevant section when resuming its topic; historical release/status claims need revalidation.

## Recent recorded checkpoints

- [The Discord bot, made fast, and what the public lane could reach (2026-09-08)](HANDOFF-history-2026-09-13.md#the-discord-bot-made-fast-and-what-the-public-lane-could-reach-2026-09-08)
- [Revision after Matthew's review (2026-09-08, still on `meet-the-team`)](HANDOFF-history-2026-09-13.md#revision-after-matthews-review-2026-09-08-still-on-meet-the-team)
- [Meet the Team, first draft (2026-09-08, branch `meet-the-team`)](HANDOFF-history-2026-09-13.md#meet-the-team-first-draft-2026-09-08-branch-meet-the-team)

For other topics, search `HANDOFF-history-2026-09-13.md` by term, then read that section. Implementation and checks are in their source files and git history; this entry point does not duplicate them.

## Current work: public game submissions (2026-09-15)

Website submission form, repository-backed publishing, and Discord intake/moderation
are implemented. See [submission operations](DISCORD_AGENT.md#submission-operations)
and the [public guide](../data/docs/01_start/07_submit-a-recomp/index.md).
The existing Discord process still needs an owner-authorized restart to load
this change; its persistent job configuration is unchanged.

The Discord reporting follow-up preserves trusted request scope across turns
and verifies completion receipts against committed source and the remote ref.
See [context and completion reports](DISCORD_AGENT.md#context-and-completion-reports).
It shares the pending bot restart above.
