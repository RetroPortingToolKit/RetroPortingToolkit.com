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
The owner-authorized Discord restart completed on 2026-09-15; the new process
reported ready, and the live submission API and guide responded successfully.
Community instructions are [posted in general](https://discord.com/channels/1514467450429640824/1514467451201523846/1549508402080776213).
The owner selected #website for review notices and publication reports. Local
`config.env` sets `DISCORD_ADMIN_CHANNEL_ID="1543379435246592001"`; the bot was
restarted with that override. Sending, reading, and reacting were verified on
the [shipping announcement](https://discord.com/channels/1514467450429640824/1543379435246592001/1549512702571970590).
The general announcement reflects the working destination; no access blocker remains.

The Discord reporting follow-up preserves trusted request scope across turns
and verifies completion receipts against committed source and the remote ref.
See [context and completion reports](DISCORD_AGENT.md#context-and-completion-reports).
It is loaded by the completed restart; implementation is in commit `5e5937e`.

Submission artwork now imports same-message Discord images and repository README
images into the game folder, with a cover and body images. See the public guide's
[artwork section](../data/docs/01_start/07_submit-a-recomp/index.md#banners-and-screenshots).
Validation: typecheck, build, 953 tests, and a read-only public README/image import.

2026-09-16: Submission pages now carry a README-derived project summary,
toolkit links, platform, and a "Made by" profile credit; the Lufia II page was
regenerated. See commit `b68fca6`. The Discord changes in that commit (page URL
in the notice, notice deleted on ✅) load only after an owner-approved bot
restart, which has not yet happened. The same applies to the follow-up: intake
requires the bot named in the message text, and the four team members'
submissions are confirmed on publication without a review reaction.
