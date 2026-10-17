# CMS access: people and their agents

The CMS has two ways in. Both end at the same place: a commit to `main`
through the site's own `GITHUB_TOKEN`, which redeploys in a minute or two.

| Who | How they authenticate | Configured by |
|---|---|---|
| Anyone in the org | Sign in with GitHub | `CMS_ALLOWED_ORG` |
| Someone outside it | Sign in with GitHub | `CMS_ALLOWED_LOGINS` |
| Their agent | a bearer token | `CMS_AGENT_KEYS` |

Full-editor access is org membership. Add someone to the RetroPortingToolKit org on GitHub
and they can edit; remove them and they cannot. There is no separate list to
keep in step, and an invitation is not membership: it counts once accepted.

Membership is asked of GitHub per request, not recorded in the session, so
removing someone takes effect within two minutes rather than whenever their
cookie expires. `CMS_ALLOWED_LOGINS` still works alongside it, for someone who
should edit without joining the org, and it is checked first without a network
call, which is why the owner stays on it: it is the way back in if the GitHub
API is unreachable.

There is no password and no passkey. Both were shared secrets for a single
identity-less `cms-admin` session, which is exactly what makes a commit
unattributable, so they were removed once GitHub sign-in worked. Every way in
now carries a GitHub login, and `git log` alone answers who edited what.

Everyone with editing permission can publish directly. There is no review step, by
decision: treat adding someone to the allowlist as handing them commit access
to the site.

## Shared documentation

Members of the Discord server can sign in with Discord, without a GitHub account.
GitHub sign-in remains available. Editing still requires permission. Existing
full editors and game-owner scopes are preserved; a docs grant adds shared
editing and page creation inside existing sections. Linked Discord members
with the existing Founder or Community Advocate publishing role also receive
docs access. The RPTK contributor recognition role does not grant it.

Org admins manage docs grants, page protection, identity links, and website
suspensions in the editor's Contributions screen. These controls require an
active GitHub org membership with role `admin`, not the ordinary editor
allowlist. Suspension overrides all website editing permissions and associated
Discord publishing, including queued work and the pre-push check for trusted
agent jobs. Old browser sessions must sign in again to acquire a stable GitHub
user ID. Discord sign-in identifies the same account to the bot automatically. GitHub
users can instead link Discord. Verifying a GitHub identity is required for org
admin and repository-owner privileges.

See [wiki operation and verification](CMS-WIKI.md) for identity linking,
history, restoration, and the Discord request syntax.

## Environment variables

Nothing about who has access is committed to this repository, because it is
public. It all lives in the host's environment.

```
CMS_GITHUB_CLIENT_ID       OAuth app client id
CMS_GITHUB_CLIENT_SECRET   GitHub OAuth app client secret
CMS_DISCORD_CLIENT_ID      existing Discord application client id (public config)
CMS_DISCORD_CLIENT_SECRET  Discord OAuth client secret, stored as a Worker secret
CMS_ALLOWED_ORG            a GitHub org whose members may edit
CMS_ALLOWED_LOGINS         comma-separated GitHub logins: "alice,bob"
CMS_AGENT_KEYS             comma-separated <login>:<label>:<sha256-of-token>
CMS_SESSION_SECRET         HMAC key for the session cookie (already set)
DISCORD_BOT_TOKEN         existing bot token, also installed as a Worker secret
GITHUB_TOKEN               the token every commit is actually made with (already set)
```

## One-time setup: the GitHub OAuth app

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. Homepage URL: `https://retroportingtoolkit.com`
3. Authorization callback URL:
   `https://retroportingtoolkit.com/api/cms/auth/github/callback`
4. Put the client id and secret into `CMS_GITHUB_CLIENT_ID` and
   `CMS_GITHUB_CLIENT_SECRET`, then redeploy.

The app only asks for `read:user`. It reads the person's login to check it
against the allowlist and never touches their repositories. The token GitHub
returns is used once and never stored.

## Adding a person

Append their GitHub login to `CMS_ALLOWED_LOGINS` and redeploy. They then hit
"Sign in with GitHub" on the editor. Removing the login removes their access on
their next request, without waiting for their session to expire.

## Adding an agent

```sh
node scripts/cms-token.mjs <github-login> <label>
```

It prints the token once and the `CMS_AGENT_KEYS` entry to append. Only the
SHA-256 hash is stored, so the environment never contains a working token.

The agent reads the page before every save:

```sh
curl "https://retroportingtoolkit.com/api/cms/read?id=data%2Fblog%2F01_example%2Findex.md" \
  -H "authorization: Bearer rpt_..."
```

That response includes `id`, `frontmatter`, `body` and `baseSha`. The agent
preserves the complete frontmatter and body, applies its edit, then sends that
`baseSha` back as `expectedBase`:

```sh
curl -X POST https://retroportingtoolkit.com/api/cms/save \
  -H "authorization: Bearer rpt_..." \
  -H "content-type: application/json" \
  -d '{"id":"data/blog/01_example/index.md","frontmatter":"title: ...","body":"...","expectedBase":"<baseSha from read>"}'
```

`GET /api/cms/list` and `GET /api/cms/read?id=...` accept the same header, so an
agent can read what exists before writing. Markdown is sent as `frontmatter`
and `body`, never `raw`, because a save replaces the whole file. A missing
`expectedBase` gets HTTP 428. A changed version gets HTTP 409 and must be read
again before the edit is re-applied. `POST /api/cms/new` creates a page.

An agent belongs to a person: removing that person from `CMS_ALLOWED_LOGINS`
revokes every agent they own. Revoke one agent by deleting its entry.

## What lands in git

Every write records who made it. The commit's author is the person (or
`login (agent: label)`), and the message carries an `Edited-by:` trailer, so
`git log` answers "who changed this" without consulting any other system.

## Known limits

- Browser/wiki contribution operations have a per-account limit of 60 per hour.
  The existing public game submission limits remain separate.
- Game owners have page scopes; docs contributors share docs access. Existing
  full-editor agent keys retain their owner permissions and suspension checks.
- **Direct publish.** Saves commit immediately. Docs history offers admin
  restoration as a new commit; Git history remains the source of revisions.
- The local dev CMS is restricted to loopback and writes to the working tree.
  It supports read-only Git history; production account administration uses
  the private Worker binding.

## Discord OAuth configuration

The existing Discord application is `1543907467040129115`. Its OAuth redirect is
`https://retroportingtoolkit.com/api/cms/auth/discord/callback`. The authorization
code flow requests only `identify`, uses a browser-bound random state and PKCE,
and revokes the profile token after use. Tokens are not stored in D1, cookies,
or the browser. The client secret belongs in the login Keychain service
`retroportingtoolkit-discord-oauth` (account `1543907467040129115`) and Worker
secret `CMS_DISCORD_CLIENT_SECRET`. It is distinct from the running bot's token.

The access schema retains the historical `github_id` primary-key name. A
Discord-only account uses `discord:<user-id>` in that key and a namespaced login;
it must never be interpreted as a verified GitHub identity. Proving both accounts
can merge a Discord-first account into its GitHub account, retaining grants and
aliases for existing sessions. A suspended identity cannot be merged away.
