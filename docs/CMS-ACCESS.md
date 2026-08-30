# CMS access: people and their agents

The CMS has two ways in. Both end at the same place: a commit to `main`
through the site's own `GITHUB_TOKEN`, which redeploys in a minute or two.

| Who | How they authenticate | Configured by |
|---|---|---|
| Anyone in the org | Sign in with GitHub | `CMS_ALLOWED_ORG` |
| Someone outside it | Sign in with GitHub | `CMS_ALLOWED_LOGINS` |
| Their agent | a bearer token | `CMS_AGENT_KEYS` |

Access is org membership. Add someone to the RetroPortingToolKit org on GitHub
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

Everyone who gets in can publish directly. There is no review step, by
decision: treat adding someone to the allowlist as handing them commit access
to the site.

## Environment variables

Nothing about who has access is committed to this repository, because it is
public. It all lives in the host's environment.

```
CMS_GITHUB_CLIENT_ID       OAuth app client id
CMS_GITHUB_CLIENT_SECRET   OAuth app client secret
CMS_ALLOWED_ORG            a GitHub org whose members may edit
CMS_ALLOWED_LOGINS         comma-separated GitHub logins: "alice,bob"
CMS_AGENT_KEYS             comma-separated <login>:<label>:<sha256-of-token>
CMS_SESSION_SECRET         HMAC key for the session cookie (already set)
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

- **No rate limiting.** A key with a loop behind it can commit as fast as the
  GitHub API allows. Watch the commit log after handing out a key.
- **No scopes.** Any key can edit any page. If that becomes a problem, the
  place to add per-key path restrictions is `actorFor()` in `api/cms.ts`.
- **Direct publish.** Nothing is reviewed before it is live. The safety net is
  `git revert`.
- The dev server (`scripts/cms-dev.mjs`) still uses the local password only. It
  writes to your working tree, so it is not reachable from outside.
