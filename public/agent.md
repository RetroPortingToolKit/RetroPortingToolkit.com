# Publishing to retroportingtoolkit.com

You are reading this because someone asked you to post to this site. This page
is everything you need. Follow it exactly.

## First, check you are on the right path

This page is the HTTP API, which needs a bearer token. **Tokens are not
currently issued for this site**, so unless the person you are working for hands
you one, you want one of these instead:

- **They have the repo checked out.** Work there: read `AGENTS.md` and
  `docs/AUTHORING.md`, write the page, run `npm run build`, and push. Pushing
  publishes. This is the better path anyway, because you can see every existing
  page and the build catches a broken asset before anyone else does.
- **They do not.** They can sign in at
  https://retroportingtoolkit.com/admin with GitHub and write it there.

Both are open to anyone in the RetroPortingToolKit GitHub organisation.

If you *were* given a token, it looks like `rpt_...`. Never print it back to
them, never write it into a file, never put it in a URL. Send it only in an
`Authorization` header. Everything below is for that case.

## If you are running inside a browser

Check for `document.modelContext` (or `navigator.modelContext`). If it is
there, this site has already registered seven tools on the page through WebMCP.
Call those instead of parsing HTML. They run in the session the person is
already signed in with, so there is no token to hold here either.

| Tool | Takes | Returns |
|---|---|---|
| `search_site` | `{query}` | up to 10 ranked results across games, consoles, articles and docs |
| `check_game_ported` | `{title}` | whether the game is already in the catalogue, plus the candidates |
| `list_platforms` | nothing | every console covered, with its status and maturity |
| `get_page_markdown` | `{path}` | one documentation page as markdown. `/docs` paths only |
| `plan_my_port` | `{game_title, console?}` | framework, maturity, the exact commands or the port to copy, and the standing rules |
| `define_term` | `{term}` | one glossary entry and the link to it |
| `draft_page` | `{kind, title, desc, body, section?}` | a DRAFT page. Never publishes |

Six of those only read. `draft_page` is the whole write surface, it takes
`blog` and `docs` only, and it cannot publish: `draft: true` is forced in the
code, so the page has its own URL and appears in no listing until a person
publishes it from `/admin`. It writes nothing when nobody is signed in.

Every result is `{ok: true, ...}` or `{ok: false, error}`, and every claim
carries the absolute URL of the page behind it.

If you are fetching rather than browsing, none of that reaches you. Your read
surfaces are `/llms.txt`, `/llms-full.txt` and `.md` on any documentation URL,
and your write surface is the API below.

`/docs/reference/site-tools` documents all seven in full.

## Post something

One request creates a finished page. Send `POST` to
`https://retroportingtoolkit.com/api/cms/post` with
`Authorization: Bearer <token>` and `Content-Type: application/json`.

```json
{
  "kind": "blog",
  "title": "PSXRecomp now boots Tomba! start to finish",
  "kicker": "Build log",
  "desc": "One line that shows on the card, under the title.",
  "tags": ["Build log", "PlayStation"],
  "body": "## What changed\n\nMarkdown goes here.\n\n![The title screen](./shot.png)",
  "media": [
    { "filename": "shot.png", "contentBase64": "<base64 of the file>", "cover": true }
  ],
  "draft": false
}
```

The reply tells you where it went:

```json
{ "ok": true, "id": "data/blog/30_.../index.md", "slug": "...", "url": "/blog/...", "draft": false }
```

The page is live about a minute later, once the site rebuilds. If `ok` is
`false`, the `error` says what to fix in plain language. Fix it and send again.

## Which kind

Pick by what the thing IS, not where they want it to appear.

| `kind` | For | Lives at |
|---|---|---|
| `blog` | news, build logs, write-ups, videos, press coverage | `/blog/<slug>` |
| `games` | one game that has been recompiled or ported | `/games/<slug>` |
| `hardware` | a console's toolchain and ecosystem | `/hardware/<slug>` |
| `docs` | documentation: a concept, a guide, or reference | `/docs/<section>/<slug>` |

`games` and `hardware` are catalogue entries, not articles. If someone wants to
write *about* a game, that is a `blog` post that links to the game's page.

`docs` is the only kind with two levels. A docs page belongs to a section, and
its address is both: `/docs/start/quickstart` is the "quickstart" page in the
"start" section. Send `"section": "start"` alongside the other fields. Sending
no `section` creates the SECTION itself, at `/docs/start`, which is the page a
reader lands on for that whole group. Create the section before its pages.

Documentation explains the toolkit as a whole. A page about one project's news
is a `blog` post; a page about one console's toolchain is a `hardware` entry.

## Fields

Always: `kind`, `title`, `body`, `desc`.

Useful anywhere: `tags` (array of strings), `kicker` (small label above the
title), `cover` (a path, if you are not attaching one), `featured` (boolean,
promotes it onto the home page), `slug` (defaults to the title).

`blog` also takes: `date` (`YYYY-MM-DD`, defaults to today), `author`,
`authorAvatar`, `venue` (the outlet, for press or video coverage), `videoUrl`.

`games` also takes: `platform` (the hardware slug, e.g. `playstation`),
`status` (e.g. `Playable alpha`), `repo`, `availability`.

`hardware` also takes: `status`, `repo`.

`docs` also takes: `section` (see above), `summary` (the one sentence under the
title, which is what a reader and a model use to choose the page), `pageType`
(`concept`, `guide`, `reference` or `project`), and, on a section page,
`sectionTitle` (the section's name in navigation). It takes no `date` and no
`year`: a docs page is maintained, not published on a day.

Two more `docs` keys live in the page's frontmatter, and `/post` takes both. You
can also set them later with `/save`, which writes the frontmatter you send
verbatim. `updated` is a `YYYY-MM-DD` date, the day the page's content last
changed. It is optional, but every docs page has one, so write it: it renders as
the "Last updated" stamp on the page, and in `/docs/<slug>.md` and
`/llms-full.txt`. It outranks the date of the last commit on purpose, because
git cannot answer here: a page written through this API is untracked until the
commit that publishes it, and the deploy is a shallow clone, where the one
fetched commit looks like it added every file. `repos` is optional too, and it
is a list of the repository URLs the page documents, never a string. Send it as
an array, the way you send `tags`, and it lands in the frontmatter as a YAML
list:

```yaml
repos:
  - "https://github.com/mstan/psxrecomp"
  - "https://github.com/mstan/cdirecomp"
```

A page inside a section carries it; a section's own page does not. It is
published as "Source repositories" in `/docs/<slug>.md` and `/llms-full.txt`.

To see the platform slugs available, `GET /api/cms/list` with the same header
and read the `sub` of each item in the `Hardware` group. The same call lists the
docs sections: in the `Docs` group, an item whose `sub` has no `/` is a section,
and its `sub` is the value to send as `section`.

## Images and video

Attach them in `media`. Each entry is `{ "filename", "contentBase64" }`, plus
`"cover": true` on the one that should be the card image. Without a cover, the
first image becomes it.

Embed them in the body with a relative path and a real caption, because the
caption is what renders under the image:

```
![Tomba! running at 1440p](./shot.png)
```

A YouTube link in the body embeds as a player:

```
![Watch the run](https://www.youtube.com/watch?v=VIDEO_ID)
```

Limits: `png jpg jpeg webp gif avif svg mp4 webm mov`, **3 MB per file**. If a
video is bigger, link to it instead of attaching it.

## Code blocks

Give every fenced block a language. When the block quotes a real file, name that
file in the info string too, and the site renders the name as a label on the
block:

````
```toml title="bios/SCPH1001.toml"
name = "SCPH1001"
load_addr = 0x1FC00000
```
````

Use the same path the sentence above the block cites, so the label and the
caption agree. Do not invent one: a block showing an example that exists
nowhere, or commands a reader is meant to run, gets no filename. `file="..."`
and `filename="..."` mean the same thing, and a bare path as the whole info
string works when there is no language.

## Drafts

`"draft": true` (the default) writes the page but keeps it out of every listing,
the feeds and the sitemap. Its own URL still works, so you can hand the person a
link to check. Send `"draft": false` to publish, or flip it later:

```
POST /api/cms/save   { "id": "<id from the reply>", "frontmatter": "...", "body": "..." }
```

Read the page first with `GET /api/cms/read?id=<id>`; a save replaces the whole
file, so send back the frontmatter and body you got, with your change applied.

## House style

Match it or the post will read as foreign to the site.

- Write for a smart 16 year old whose first language is not English. Short
  sentences, one idea each. Common words. Define a technical term in plain
  words the first time, then use it normally.
- Plain language, concrete, short sentences. No hype, no marketing voice. Not
  defensive: state a fact once and move on.
- **No em dashes or en dashes anywhere.** Commas, colons, periods.
- The recompiler reads a game's binary and writes code in an ordinary
  programming language. The projects here emit C, but do not define the
  technique as producing C. The runtime is a library, not an emulator; the
  word emulator belongs only to the fallback interpreter, a temporary safety
  net that goes inert as coverage fills in. A completed project has 100%
  static coverage and does not use it. A missed instruction becomes a slow
  moment, not a crash. Never claim categorically that no emulation is ever
  involved along the way. The game is the program, never "inside" it. A
  heading that is a question carries a question mark.
- Say "core project" or "core team", never "first-party". Never "real code".
- "Pokémon" keeps its accent.
- Do not invent facts about a project. If you cannot source a claim, leave it
  out. Link the source instead.
- Documentation pages do not reference N64Recomp, N64ModernRuntime or RT64.
  That platform's story lives at /hardware/nintendo-64; link there instead.

## Other things you can do

| Method | Route | Body |
|---|---|---|
| GET | `/api/cms/list` | everything that exists |
| GET | `/api/cms/read?id=<id>` | one page |
| POST | `/api/cms/save` | `{id, frontmatter, body}` |
| POST | `/api/cms/upload` | `{id, filename, contentBase64}` |
| POST | `/api/cms/delete` | `{id}` |

A `401` means the token is wrong, or the person it belongs to is no longer in
the GitHub organisation. Tell them that rather than retrying.

Every write is a real commit, attributed to the token's owner. There is no
undo in this API, so prefer a draft when you are unsure.
