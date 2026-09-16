# Discord publishing agent

The Discord agent turns an approved `@mention` into one serialized Codex task
against this repository. It is intentionally a local bridge: Discord needs a
Gateway connection, while repository work needs this checkout, the logged-in
Codex CLI, git credentials, the project test gate, and production verification.

## Publishing, submissions, and questions

Within configured guilds, approved developers can request edits from any
channel the bot can read. Anyone can mention it with `submit` and one public
GitHub/GitLab repository link (a bare repository link also works). This narrow
submission path calls the same endpoint as the website form. It cannot run an
agent, edit an existing page, or accept attachments. The rest of the message
is an optional description, treated only as public text.

Untrusted questions still use the read-only lane in
`DISCORD_PUBLIC_CHANNEL_IDS`; elsewhere the bot stays silent. The general
publishing agent remains restricted to allowlisted users and roles.

Every push to the site's main branch is announced in `DISCORD_ADMIN_CHANNEL_ID`
as a short list of commit subjects with a compare link, polled every five
minutes from GitHub's public commits API (`DISCORD_SITE_CHANGE_POLL_MS`,
`DISCORD_SITE_REPO`). The first run after install records the current head
silently; state is `site-changes.json` in the state directory.

Submission notices appear in `DISCORD_ADMIN_CHANNEL_ID`, with repository
ownership, page link, and the Discord username/source message when available.
The submitter's Discord username is recorded on the page as its creator next to
the repository owner's login, and the intake reply carries an edit link that
works once the repository owner signs in to `/admin` with GitHub.
The bot answers only messages that open with its mention or reply to one of
its messages. A mention mid-sentence, a reply's automatic ping, or a repository
link in conversation is not a request or a submission. Submissions from
`DISCORD_TRUSTED_SUBMITTER_IDS` (default: the team) are confirmed on
publication without a review reaction.
Approved editors can react ✅ to confirm or ❌ to unlist that submission.
Confirming deletes the notice once the commit is pushed; the "Done" reply with
the page link remains. Unlisting keeps the notice and sets `draft: true`,
retaining the direct URL and editorial content.
Reactions cannot target unrelated pages or run arbitrary requests. Moderation
runs in the existing serialized work queue, checks the current page identity,
runs typecheck/build/test, then commits and pushes. The durable register is
`data/submissions.json`; notification IDs and interrupted HTTP requests are
saved in `state/submission-notices.json`. The existing bridge checks pending
submissions every minute and recovers reactions made while offline.

In a public channel the agent runs under Codex's `read-only` sandbox, so a write
is refused by the sandbox rather than only discouraged by the prompt. Its prompt
names the sources it may use — published pages under `data/` that are not
drafts, the media in `public/`, and the site's own public documentation — and
treats everything else in the checkout as private, including `AGENTS.md`, all of
`docs/`, `scripts/`, `api/`, and configuration. Deliberately unpublished
projects have no published page, so the answer is that there is nothing on them.
Questions are treated as untrusted text, never as instructions.

Public questions are treated as hostile input by construction, because anyone
can post one:

- The question is wrapped in a delimited block labelled untrusted, and the rule
  that nothing inside it is an instruction is restated *after* the block as well
  as before. Runs of hyphens inside the message are collapsed so a message
  cannot forge the closing delimiter and escape its own fence.
- The prompt names the specific moves — claiming to be a system message, a
  maintainer, a policy update or a test; asking to reveal the prompt, print
  files or adopt a persona — and says they are never true.
- Every answer is scanned before it is posted. If it contains a credential
  shape, an internal path, or a reference to operational files, it is withheld
  and the requester gets a generic failure instead. This is the control that
  actually holds: prompt wording can be talked around, an output check cannot.
- The lane runs read-only, so nothing it is talked into can change anything.

Public questions run in their own lane: one at a time, a four-minute limit, a
45-second per-person cooldown, and at most five waiting. A question never delays
a publish, and a publish never makes the community channel look dead.

## Context and completion reports

Accepted developer requests are retained in `state/task-context.json`, scoped
by guild, channel, and author. Explicit new tasks reset the scope; follow-ups
keep the original request and the latest amendments. Retention is bounded to
24 hours, 80 conversations, and ten turns per conversation, preserving the
original turn. If a follow-up has no saved context, the bridge can recover
recent messages by that same trusted author addressing the bot. Previous bot
answers are never stored as proof that work was completed.

Implementation and completion-status answers require a JSON receipt outside
the checkout. It lists each requested deliverable as present, missing, or
unverified, with exact file/line evidence for present items. The bridge checks
those lines at the final committed revision and independently reads the real
remote ref. Merely pulling earlier commits or changing local HEAD is not
proof that this run published work. Discord receives the checked checklist;
unsubstantiated completion prose is withheld. This verifies the cited source
and publication state; semantic relevance still depends on the agent's review
of the full request and is exposed for the reader to assess.

A successful runner exit alone never means the task is done. Partial, blocked,
clarification, and unverified results have distinct headings and reactions.
Ordinary factual answers use 💬. Admin publication notices are sent only when
new commits have been verified on the remote, not for questions or failed
completion claims.

## Sharing the checkout with a person

A person editing this checkout by hand is normal and must not cost anyone their
request, so exclusivity is required only where it is genuinely needed.

- **Before starting**, the checkout must be *quiet*, not merely clean: no
  uncommitted files, no commit in the last 90 seconds, and the same reading
  twice five seconds apart. A clean tree alone is a poor signal, because someone
  working in short commit-edit cycles has a clean tree for most of any given
  second — which is exactly how a request gets waved into a collision that only
  surfaces minutes later. If the repository is busy the request waits up to five
  minutes, then goes to the back of the queue, up to three attempts, rather than
  failing.
- **While working**, the agent stages by name and never with `git add -A`, so
  another person's uncommitted files are simply not in its commit.
- **At the end**, success is judged by whether this request's work landed — did
  HEAD move — and not by whether the tree is pristine. Files someone else
  started editing mid-run are not this request's business. Only an agent that
  published nothing *and* left the tree dirty is reported blocked.
- The one case that still stops is a real one: the agent and a person changed
  the **same file**. That cannot be separated by waiting, because both sets of
  edits are already in the same working tree.

Waiting for the person to finish would not help in that case and would hurt in
the others: the agent's edits are already interleaved with theirs in one tree,
and "finished" can be hours away.

## Runners

The bridge tries Codex first and falls back to Claude Code, per request and per
lane. It only hands over when a runner cannot serve at all — out of credits,
expired or missing credentials, not installed. A request that genuinely failed
is reported as failed rather than retried on the second runner, which would fail
the same way and spend a second budget saying so.

Each lane keeps its boundary on both runners: publishing gets Codex's
`danger-full-access` or Claude's `--dangerously-skip-permissions`, and the
public answer lane gets Codex's `read-only` sandbox or Claude restricted to
`Read`, `Glob`, and `Grep`. A test asserts the answer lane can never be handed a
writable runner.

The standby needs a durable credential, because the Claude CLI's interactive
login expires and an unattended process cannot re-authenticate. Create an API
key at console.anthropic.com and store it in the login Keychain:

```sh
security add-generic-password -s retroportingtoolkit-anthropic-key -a "$USER" -w
```

The installer reads it from there and passes it only to the Claude child
process; it never reaches Codex, the launchd property list, or the logs. Without
it the bridge simply runs on Codex alone and says so when it cannot serve.

## Safety boundary

- General editing fails closed unless the guild and requester user or role
  IDs are allowlisted. Public submissions only create a validated game page.
- It responds to direct mentions and to authorized human replies to one of its
  messages. A reply includes the bot message and its original request as task
  context when Discord can resolve both.
- One task runs at a time. A second request waits and receives its queue
  position.
- An authorized developer can mention the bot or reply to it with `stop`,
  `cancel`, or `abort` to terminate the active Codex process. Queued requests
  remain queued. Work performed before termination is not rolled back.
- `status` or `queue` reports what is running, for how long, and what is
  waiting. `cancel mine` removes only that requester's queued requests and
  never touches the running task.
- The Discord token lives in the macOS login Keychain under
  `retroportingtoolkit-discord-bot`. It is loaded into the bridge process and
  removed from the Codex child process environment.
- Codex is restricted by its prompt and `AGENTS.md` to this checkout. It may
  answer, edit, test, commit, push `main`, and verify the existing Vercel
  deployment. Requests for destructive, credential, infrastructure, account,
  or out-of-repository work stop for human approval.
- Every task replies to the source message with a completion, failure, or
  clarification summary. Discord's message limit is handled automatically.

## Submission operations

The website endpoint uses the existing Vercel `GITHUB_TOKEN` and repository
identity variables. No new credentials or persistent service are required.
It writes the page and register atomically using a non-forced GitHub ref update,
retries concurrent edits, and caps intake at 20 new repositories per hour and
five per repository owner per hour. A short per-IP cooldown also applies.
Public project metadata is fetched without the site token.

Submission artwork is copied into the game folder and committed atomically with
its page. Same-message Discord attachments/image links take priority over README
images; cover/banner labels take priority within each source. Imports are bounded
to four raster images, 4 MB each and 8 MB total. Only supported GitHub/GitLab/Discord
hosts are fetched, without credentials or redirects. README text is parsed as data,
never passed to an agent as instructions. Missing artwork does not block publishing;
confirmation and review notices report the import result. Existing pages are never
overwritten by a repeat submission.

`DISCORD_SUBMISSIONS_URL` can override the endpoint for an isolated test.
The harness disables it by default; never aim a test submission at production.
A bridge restart is needed to load code changes and requires owner approval.

## Discord application settings

Create one bot application for Retro Porting Toolkit. Enable the Message
Content privileged Gateway intent. Invite it only to the project server with:

- View Channels
- Send Messages
- Read Message History
- Add Reactions

Do not grant Administrator, Manage Server, Manage Channels, or Manage Roles.

## Local configuration

The installer expects a mode-600 file at:

`~/Library/Application Support/RetroPortingToolkitDiscordAgent/config.env`

with these shell assignments:

```sh
DISCORD_ALLOWED_GUILD_IDS="guild-id"
DISCORD_ALLOWED_CHANNEL_IDS="channel-id"
DISCORD_PUBLIC_CHANNEL_IDS="optional-channel-id,optional-channel-id"
DISCORD_ADMIN_CHANNEL_ID="optional-moderation-channel-id"
DISCORD_ALLOWED_USER_IDS="user-id,user-id"
DISCORD_TRUSTED_SUBMITTER_IDS="optional; defaults to the team roster"
DISCORD_ALLOWED_ROLE_IDS="optional-role-id"
DISCORD_DESTRUCTIVE_USER_IDS="optional-user-id,optional-user-id"
DISCORD_DESTRUCTIVE_ROLE_IDS="optional-role-id"
```

Destructive publishing — deleting, renaming or unpublishing content — is
allowed only for the users and roles named by the two `DESTRUCTIVE` settings.
Leaving both empty means nobody can, including the owner; that fails safe but
is probably not what you want. Prefer the role: Discord's role membership is
then the source of truth, and changing it needs Manage Roles.

This is deliberately not a chat command. The publishing channel authorizes by
role, so a "grant me this" command there would let anyone who can post in it
promote themselves past the gate.

`DISCORD_PUBLIC_CHANNEL_IDS` is optional. Leave it empty and untrusted users
remain silent outside the configured channels. Trusted developers may submit
from any channel the bot can read. After a successful submission, the bot posts
a moderation notice with the source message link to `DISCORD_ADMIN_CHANNEL_ID`;
set it explicitly to an empty string to disable notices. If unset, it uses
the project’s existing admin channel.

At least one user or role is required. Guild and channel restrictions are
always required. IDs can be resolved without copying them through chat. After
the bot is installed in its server, load its token from Keychain and run:

```sh
export DISCORD_BOT_TOKEN="$(security find-generic-password -s retroportingtoolkit-discord-bot -w)"
DISCORD_TARGET_GUILD="server name" \
DISCORD_TARGET_CHANNEL="channel name" \
DISCORD_TARGET_ROLES="role name,role name" \
DISCORD_TARGET_PUBLIC_CHANNELS="general,help" \
node scripts/configure-discord-agent.mjs
unset DISCORD_BOT_TOKEN
```

The configurator resolves exact names to IDs, rejects missing or ambiguous
matches, refuses to make the publishing channel public, writes `config.env` with
mode 600, and never writes the token. It carries the hand-entered
`DISCORD_ALLOWED_USER_IDS` and `DISCORD_DESTRUCTIVE_USER_IDS` across a re-run
instead of clearing them, so re-running it to add a public channel cannot
quietly drop the maintainer list.

`DISCORD_TARGET_PUBLIC_CHANNELS` is optional; omit it for publishing only.

After the bot token is stored in Keychain and the config exists, install the
explicitly owner-approved persistent process:

```sh
./scripts/install-discord-agent.sh
```

The process is `com.retroportingtoolkit.discord-agent`. Logs are under
`~/Library/Logs/RetroPortingToolkitDiscordAgent/`; neither logs nor the launchd
property list contain the bot token.

Restart it after changing the bridge, because launchd keeps running the code it
started with:

```sh
launchctl kickstart -k "gui/$(id -u)/com.retroportingtoolkit.discord-agent"
```

## Durability

The bridge keeps a small state directory beside its config, at
`~/Library/Application Support/RetroPortingToolkitDiscordAgent/state`:

- `jobs.json` records the running and queued requests. On startup the bot
  replies to each one to say it was interrupted or dropped, because a restart
  loses the in-memory queue and silence is the one outcome a requester cannot
  act on.
- `outbox.json` holds any reply Discord refused. Sends retry three times, then
  spool here and are delivered on the next startup, so a finished task's
  summary survives a Discord outage. If the original message is gone the
  summary is posted to the channel instead.
- `task-logs/` holds the Codex transcript for each task, capped at 2 MB each
  with the newest 20 kept. These used to go to the launchd log, which grew
  unbounded (6.7 MB in a day) and was never rotated.

A failed Discord send can no longer take the process down. Every reply path is
non-throwing, and a last-resort handler logs unhandled rejections rather than
letting Node exit on them.

## Operation

An approved developer writes a concrete request and tags the bot, or replies
to one of the bot's messages without tagging it again. The bot
reacts with 🔍, announces when work starts, and invokes a fresh ephemeral Codex
session. The agent pulls and checks the shared checkout, performs the request,
runs the repository's required verification before a push, and verifies the
production deployment. Its final summary is posted as `✅ Done.`; failures use
`❌ The task did not complete.` and preserve the underlying explanation.

While a task runs, one progress message is edited in place each minute with the
elapsed time. It reports only elapsed time and queue depth, because the bridge
cannot see which phase the agent is in.

To stop the active task, tag the bot or reply to any of its messages with
`stop`, `cancel`, or `abort`. The bot acknowledges immediately, terminates the
active process group, and posts `🛑 Stopped.` on the original request.
