# Publishing to retroportingtoolkit.com

You are reading this because someone asked you to post to this site. This page
is everything you need. Follow it exactly.

## What you need

A token, which the person you are working for has. It looks like `rpt_...`.
Never print it back to them, never write it into a file, never put it in a URL.
Send it only in an `Authorization` header.

If they have not given you one, stop and ask for it. Do not try to sign in.

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

`games` and `hardware` are catalogue entries, not articles. If someone wants to
write *about* a game, that is a `blog` post that links to the game's page.

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

To see the platform slugs available, `GET /api/cms/list` with the same header
and read the `sub` of each item in the `Hardware` group.

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

- Plain language, concrete, short sentences. No hype, no marketing voice.
- **No em dashes or en dashes anywhere.** Commas, colons, periods.
- Say "core project" or "core team", never "first-party". Never "real code".
  Never claim categorically that no emulation is involved.
- "Pokémon" keeps its accent.
- Do not invent facts about a project. If you cannot source a claim, leave it
  out. Link the source instead.

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
