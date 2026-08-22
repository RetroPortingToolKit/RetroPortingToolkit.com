# Publishing with an agent

An agent publishes over the same HTTP API the editor uses, with a bearer token
instead of a sign-in cookie. There is nothing to install: any tool that can make
an HTTPS request can post to this site.

Every write is a commit to `main` through the site's own `GITHUB_TOKEN`, and the
commit is attributed to the token's owner, so `git log` answers who published
what even when an agent did the typing.

## Getting a token

The owner mints one per agent:

```sh
node scripts/cms-token.mjs <github-login> <label>
```

It prints the token once, plus a `<login>:<label>:<sha256>` line to append to
`CMS_AGENT_KEYS` in the host's environment. Only the hash is ever stored, so a
lost token is replaced, never recovered.

A token is bound to its owner: the owner has to be a member of the org in
`CMS_ALLOWED_ORG` (or listed in `CMS_ALLOWED_LOGINS`). Removing the person
revokes their agents on the next request.

## Calling it

Base URL: `https://retroportingtoolkit.com/api/cms`

```sh
curl -sS https://retroportingtoolkit.com/api/cms/list \
  -H "Authorization: Bearer $RPT_TOKEN"
```

| Method | Route | Body | Does |
|---|---|---|---|
| GET | `/list` | | every editable page, grouped |
| GET | `/read?id=<id>` | | one page: `frontmatter`, `body`, `fields` |
| GET | `/assets?id=<id>` | | the media filenames in a page's folder |
| POST | `/new` | `{kind, title}` | creates a page, returns its `id` |
| POST | `/save` | `{id, frontmatter, body}` | writes a page |
| POST | `/upload` | `{id, filename, contentBase64}` | adds media to a page's folder |
| POST | `/asset/delete` | `{id, name}` | removes one media file |
| POST | `/rename` | `{id, slug}` | changes a page's address |
| POST | `/duplicate` | `{id}` | copies a page as a draft |
| POST | `/delete` | `{id}` | removes a page and its media |

`kind` is a `data/` directory name: `blog`, `hardware` or `games`. An `id` is the
repo path of a page's `index.md`, as `/list` reports it.

## Publishing a post, end to end

```sh
BASE=https://retroportingtoolkit.com/api/cms
AUTH="Authorization: Bearer $RPT_TOKEN"

# 1. create it (it starts as a normal published page; add draft: true to hold it)
ID=$(curl -sS -X POST "$BASE/new" -H "$AUTH" -H 'content-type: application/json' \
  -d '{"kind":"blog","title":"What we shipped this week"}' | jq -r .id)

# 2. read it back, so you edit the real frontmatter rather than guessing
curl -sS "$BASE/read?id=$ID" -H "$AUTH" > post.json

# 3. write it
curl -sS -X POST "$BASE/save" -H "$AUTH" -H 'content-type: application/json' -d "$(jq -n \
  --arg id "$ID" \
  --arg fm 'title: "What we shipped this week"
kicker: "Build log"
date: "2026-08-21"
desc: "A one-line summary that shows on the card."
tags: ["Build log"]
draft: false' \
  --arg body '## The week

Body text, as markdown.' \
  '{id:$id, frontmatter:$fm, body:$body}')"
```

The page is live a minute or two later, once the commit rebuilds the site.

## Rules worth knowing

- **`draft: true` holds a page back.** It leaves every listing, the feeds and the
  sitemap, but keeps its own address so it can be previewed. Flip it to `false`
  to publish.
- **Uploads cap at 3 MB.** The host caps a function request body at 4.5 MB and
  base64 costs a third on top. Larger video belongs in `public/previews/`, which
  is produced locally by `scripts/gen-previews.mjs`.
- **A save replaces the whole file.** Read first, change what you mean to
  change, and send it back; there is no partial update.
- **Media lives beside the page.** Upload puts a file in that page's folder;
  embed it from the body as `![Caption](./filename)`.
- Failures answer with `{"ok": false, "error": "..."}` and a 4xx. A `401` means
  the token is wrong, or its owner is no longer allowed in.

## Why not MCP

MCP would give tool discovery inside Claude and ChatGPT desktop clients, which is
nicer than reading this page. It also means running and maintaining a server with
its own auth, wrapping endpoints that already work from any language and any
agent, including ones with no MCP support. The API is the substrate either way,
so it went first. An MCP server over these same routes is a small addition if the
people using it want one.
