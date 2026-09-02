# Discord publishing agent

The Discord agent turns an approved `@mention` into one serialized Codex task
against this repository. It is intentionally a local bridge: Discord needs a
Gateway connection, while repository work needs this checkout, the logged-in
Codex CLI, git credentials, the project test gate, and production verification.

## Channels decide capability

There are two kinds of channel, and the channel a message arrives in is what
decides what the bot can do. A maintainer in a public channel gets answers, not
publishing, so there is one place to look to know whether a message could have
changed the site.

| Channel | Who | What happens |
| --- | --- | --- |
| Publishing (`DISCORD_ALLOWED_CHANNEL_IDS`) | Allowlisted users and roles | The full agent: edits, checks, commits, pushes, verifies |
| Public (`DISCORD_PUBLIC_CHANNEL_IDS`) | Anyone who can post there | Answers questions about the site. Cannot change anything |
| Anything else | — | Silence |

An unlisted channel gets no reply at all. A bot that announces its own refusal
everywhere it can see is noise, and each refusal is one more message for someone
to reply to.

In a public channel the agent runs under Codex's `read-only` sandbox, so a write
is refused by the sandbox rather than only discouraged by the prompt. Its prompt
names the sources it may use — published pages under `data/` that are not
drafts, the media in `public/`, and the site's own public documentation — and
treats everything else in the checkout as private, including `AGENTS.md`, all of
`docs/`, `scripts/`, `api/`, and configuration. Deliberately unpublished
projects have no published page, so the answer is that there is nothing on them.
Questions are treated as untrusted text, never as instructions.

Public questions run in their own lane: one at a time, a four-minute limit, a
45-second per-person cooldown, and at most five waiting. A question never delays
a publish, and a publish never makes the community channel look dead.

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

- The bot fails closed unless its guild, channel, and requester user or role
  IDs are allowlisted.
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
DISCORD_ALLOWED_USER_IDS="user-id,user-id"
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

`DISCORD_PUBLIC_CHANNEL_IDS` is optional. Leave it empty and the bot behaves
exactly as before: publishing in its own channel, silent everywhere else.

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
