# Publishing with an agent

The instructions an agent needs are served at
**https://retroportingtoolkit.com/agent.md** (`public/agent.md` in this repo).
That page is the canonical description of the API: the routes, the fields each
kind takes, how media is attached, what drafts mean, and the house style. It is
written to be fetched and followed by a model with no other context, which is
how a colleague uses it:

> Read https://retroportingtoolkit.com/agent.md and post this. My token is rpt_...

This file used to restate all of that, and had already drifted: it described the
old new/read/save/upload chain and never mentioned `/api/cms/post`, the one call
that publishes a whole page. One description, in the place agents actually read
it, is the fix.

## Tokens are optional, and none are currently issued

Nobody needs one. A collaborator in the org pushes to this repo, or signs in at
/admin with GitHub; both are gated on org membership and neither involves a
secret anyone has to hand over. Tokens exist for the one case those do not
cover: an agent publishing over HTTP from a machine with no checkout and no
browser session.

`CMS_AGENT_KEYS` is unset, so the bearer path is closed until someone sets it.
Minting is the owner's job, not an agent's, so it does not belong on the public
page.

```sh
node scripts/cms-keys.mjs                 # one token per member of the org
node scripts/cms-keys.mjs alice bob       # or just these logins
```

Tokens are written to files under `~/.config/stack/rpt-agent-tokens/`, one per
person, and never printed. Standard output carries only the `CMS_AGENT_KEYS`
line, which is hashes and is not a secret. Set that as `CMS_AGENT_KEYS` in the
host environment, hand each person their file, then delete the directory. A
token cannot be recovered, only replaced by minting a new one.

`scripts/cms-token.mjs` mints a single token interactively if you want one key
rather than a set.

## What a token can do, and for how long

A token is bound to its owner. The owner has to be a member of the org named in
`CMS_ALLOWED_ORG`, or listed in `CMS_ALLOWED_LOGINS`. Membership is checked per
request, so removing someone from the org revokes their agents within about two
minutes. `GET /api/cms/auth` reports `orgReady`, which says whether the site can
ask GitHub about its org at all: if that is ever `false`, everyone except the
explicit allowlist is locked out and the token needs org read scope.

Every write is a commit to `main` attributed to the token's owner, and a push to
`main` deploys, so a post is live a minute or two later. See `docs/AUTHORING.md`
for what a page should contain and `docs/CMS-ACCESS.md` for who can get in.
