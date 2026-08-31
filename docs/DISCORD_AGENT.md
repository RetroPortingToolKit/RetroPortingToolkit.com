# Discord publishing agent

The Discord agent turns an approved `@mention` into one serialized Codex task
against this repository. It is intentionally a local bridge: Discord needs a
Gateway connection, while repository work needs this checkout, the logged-in
Codex CLI, git credentials, the project test gate, and production verification.

## Safety boundary

- The bot fails closed unless its guild, channel, and requester user or role
  IDs are allowlisted.
- It responds only to direct mentions and ignores other bots.
- One task runs at a time. A second request waits in memory and receives its
  queue position.
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
DISCORD_ALLOWED_USER_IDS="user-id,user-id"
DISCORD_ALLOWED_ROLE_IDS="optional-role-id"
```

At least one user or role is required. Guild and channel restrictions are
always required. IDs are Discord's numeric IDs copied with Developer Mode.

After the bot token is stored in Keychain and the config exists, install the
explicitly owner-approved persistent process:

```sh
./scripts/install-discord-agent.sh
```

The process is `com.retroportingtoolkit.discord-agent`. Logs are under
`~/Library/Logs/RetroPortingToolkitDiscordAgent/`; neither logs nor the launchd
property list contain the bot token.

## Operation

An approved developer writes a concrete request and tags the bot. The bot
reacts with 🔍, announces when work starts, and invokes a fresh ephemeral Codex
session. The agent pulls and checks the shared checkout, performs the request,
runs the repository's required verification before a push, and verifies the
production deployment. Its final summary is posted as `✅ Done.`; failures use
`❌ The task did not complete.` and preserve the underlying explanation.
