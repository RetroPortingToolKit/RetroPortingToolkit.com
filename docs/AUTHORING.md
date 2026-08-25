# Writing a page for this site

What a page is, whichever way you are creating it: editing this repo, using the
editor at `/admin`, or posting through the API. The mechanics differ, the rules
below do not.

## The four kinds

Pick by what the thing IS, not by where someone wants it to appear.

| Kind | Directory | URL | For |
|---|---|---|---|
| `blog` | `data/blog/` | `/blog/<slug>` | news, build logs, write-ups, videos, press coverage |
| `games` | `data/games/` | `/games/<slug>` | one game that has been recompiled or ported |
| `hardware` | `data/hardware/` | `/hardware/<slug>` | a console's toolchain and the ecosystem around it |
| `docs` | `data/docs/` | `/docs/<section>/<slug>` | documentation: a concept, a guide, or reference |

`games` and `hardware` are catalogue entries, not articles. Writing *about* a
game is a `blog` post that links to the game's page. Documentation explains the
toolkit as a whole, so a page about one project's news is a `blog` post and a
page about one console's toolchain is a `hardware` entry.

Note the plural: the directory is `data/games/`, and the API's `kind` is
`games`. The site's own content layer calls that kind `game`, singular. Use the
directory name anywhere you are choosing a kind. `docs` is plural everywhere:
the directory, the API's `kind`, the content layer's kind, and the URL.

## A page is a folder

```
data/blog/30_tomba-boots-end-to-end/
  index.md          the page
  shot.png          media it embeds
```

The folder name is `<order>_<slug>`. The slug is the URL, so **renaming the
folder changes the address** and breaks links to the old one. The number orders
items within a kind; take the next free one.

### Docs pages nest one level

Documentation is the one kind with sections, and the folder path is the address:

```
data/docs/01_start/
  index.md                    the section's own page, at /docs/start
  01_quickstart/
    index.md                  a page in it, at /docs/start/quickstart
```

Both levels are numbered, and the numbers order the sidebar: the section folder
orders the sections, the page folder orders the pages inside one. Renaming a
section folder moves every page under it and changes every one of their
addresses. Nothing goes deeper than this, and nothing goes directly in
`data/docs/`: the build fails loudly rather than publishing a page at an address
the site cannot serve.

## Frontmatter

Every kind wants `title`, `desc` (the one line under the title on its card) and
`tags`. `kicker` is the small label above the title. `cover` is the card image,
a path like `./shot.png` or `/covers/name.jpg`.

- `blog` also takes `date` (`YYYY-MM-DD`), `author`, `authorAvatar`, `venue`
  (the outlet, for press or video coverage) and `videoUrl`.
- `games` also takes `platform` (a hardware slug, e.g. `playstation`), `status`
  (e.g. `Playable alpha`), `availability` and `repo`.
- `hardware` also takes `status` and `repo`.
- `docs` also takes `summary` (the one sentence under the title, which is what a
  reader choosing between pages actually reads), `pageType` (`concept`, `guide`,
  `reference` or `project`), `sectionTitle` on a section's own page (its name in
  navigation, when that should differ from the page title) and `order` (a
  number, which overrides the folder's prefix so the sidebar can be reordered
  without renaming folders and changing addresses). It takes no `date` and no
  `year`: a docs page is maintained, not published on a day. It takes `updated`
  instead, a `YYYY-MM-DD` date meaning the day the page's content last changed.
  The code treats it as optional, but write it: every docs page carries one. It
  renders as the "Last updated" stamp at the foot of the page, and in the page's
  own `.md` twin and in `llms-full.txt`. `repos` is a YAML list of the
  repository URLs the page documents, one URL per line under the key, never a
  bare string. It is optional, and the pattern is that a page inside a section
  carries it while a section's own page does not. Only `scripts/gen-llms.mjs`
  reads it, printing it as "Source repositories" in those same two places; the
  rendered page never shows it.

  Frontmatter `updated` deliberately outranks the date of the last commit that
  touched the page, and `scripts/gen-docs-dates.mjs` sets out why at the top of
  the file. The short version is that git cannot be trusted to answer: a page
  written through the CMS is untracked between the write and the commit that
  publishes it, and the deploy is a shallow clone, where the one fetched commit
  looks like it added every file. Git is only the fallback for a page with no
  `updated`, and where git can speak it audits instead: a page committed after
  the date it claims is named in the build log. So set `updated` when you change
  what the page says.

`featured: true` promotes an item onto the home page. `draft: true` holds it
back: it leaves every listing, the feeds and the sitemap, but keeps its own URL
so it can be previewed. Read an existing page in the same kind before inventing
a field; the ones above are the ones the site reads.

## Media

Media lives in the page's own folder and is embedded with a relative path. The
alt text renders as a visible caption, so write a caption, not alt-text
boilerplate:

```markdown
![Tomba! running at 1440p](./shot.png)
```

A YouTube URL in the same syntax renders as a click-to-play embed, and video is
embedded, never re-hosted:

```markdown
![Watch the run](https://www.youtube.com/watch?v=VIDEO_ID)
```

`public/previews/<slug>.mp4` plus `<slug>.webp` drive an animated card in place
of a static cover. Those are produced locally by `scripts/gen-previews.mjs`;
`docs/HANDOFF.md` has the encoding requirements, which are exact.

Do not put media in a clump. Each figure sits next to the sentence it supports.

## Code blocks

Every fenced block declares its language. A block that quotes a real file also
names that file in the info string, and the name renders as a label on the block
itself:

````
```toml title="bios/SCPH1001.toml"
name = "SCPH1001"
load_addr = 0x1FC00000
```
````

Use the same path the sentence above the block already cites, so the label and
the caption agree. Do not invent one: a block showing an example that exists
nowhere, or a sequence of commands a reader is meant to run, gets no filename.

`file="..."` and `filename="..."` are accepted spellings of the same thing, and
a bare path as the whole info string works when the block has no language
(```` ```Makefile.local ````). Prefer `title=`.

## House style

- Plain language, concrete, short sentences. No hype, no marketing voice.
- **No em dashes or en dashes anywhere.** Commas, colons, periods.
- "core project" or "core team", never "first-party". Never "real code". Never
  claim categorically that no emulation is involved.
- "Pokémon" keeps its accent.
- Do not invent facts about a project. If a claim cannot be sourced, leave it
  out and link the source instead.
- Never mention these non-public projects: Mario Kart DS, Super Mario 64 DS,
  Pokémon Black, Rocket Knight Adventures, Legend of Legaia.

## Before you call it done

```sh
npm run build
```

The build fails on a referenced asset that does not exist, which is the mistake
worth catching before anyone sees the page. `npm run typecheck` and `npm run
test` cover the rest.
