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
restart. The same applies to the follow-up: intake
requires the bot named in the message text, and the four team members'
submissions are confirmed on publication without a review reaction, and intake replies @-mention the submitter.
The owner approved the restart on 2026-09-16.

2026-09-16 (later): Community pages carry `creator` (code-host login plus Discord
name) rendered as a "Made by" line; team-authored pages derive the same line from
`data/team.json`. The submission form and API accept an optional cover link and
Discord username. Repository owners can sign in to `/admin` with GitHub and edit
only their own submission pages (`contributorScope` in `api/cms.ts`). Intake
replies include the edit link. The bot change (Discord username on intake)
needs the next owner-approved restart.

2026-09-16 (evening): The bot announces every push to main in #website via
`scripts/site-changes.mjs` (GitHub commits API, 5-minute poll). Bot feature
changes are posted to #rptk-bot (1549838020163797052) by hand after each restart.

2026-09-16 (night): Channels split. #website (`DISCORD_ADMIN_CHANNEL_ID`) gets
only site change announcements; #rptk-bot (`DISCORD_BOT_CHANNEL_ID`, default
1549838020163797052) gets task reports, submission notices, moderation, and
hand-posted bot changelogs.

2026-09-16 (late): Pages credit repository owners automatically, owners can
edit them in the CMS, `/creators` lists everyone, game pages have a Download
button, and the bot records new releases (`scripts/repo-updates.mjs`) and
announces them in #website.

2026-09-17: "What's new" notes on game pages (`scripts/page-updates.mjs`),
editable in the CMS and from Discord via `update /games/<slug> …`
(`scripts/owner-updates.mjs`); notes are announced in #website. Team-owned
repositories carry the member's Discord name in the credit. Discord roles for
contributors are deferred until roles exist on the server.

2026-09-17 (later): The bot's role has Administrator; admin actions are
script-only, never chat-driven (see DISCORD_AGENT.md). The RPTK contributor
role was created and granted to nine repository owners via
`scripts/discord-contributor-roles.mjs`; OpokXeno is not on the server.

2026-09-21: Two-day bridge outage, cause and fix. This Mac moved from CEST to
PDT; a cooldown test pinned the UTC instant a local-time string parses to, so
`npm run test` began failing. Every publishing job runs the checks after
writing its pages, so each job threw with its edit on disk, and one dirty file
parks every job behind it. Fixed in `1b9e257`; the stranded Tomba release is
`afd7577`.

The review of the seven Codex commits since `6360b39` landed in `7dde249` and
`fc5f34f`: jobs roll back what they wrote (`scripts/checkout.mjs`), checkout
patience is held above one wait window, the release watcher decides from the
page rather than its own memory, auto-approved submissions carry a real ref,
pending and submission notices are back in the bot channel, clearing the queue
releases the bridge's in-flight set and is maintainer-only, and a commit left
unpushed is carried by the next job. Deliberate and kept: moderation is
restricted to the destructive allowlist (58e7c1e), and "test" is treated as
chatter (771b5dc).
