---
title: "Site tools"
summary: "The browser tools this site exposes to AI agents, what each one does, and why they are read-only except for drafts."
pageType: "reference"
tags: ["Agents", "WebMCP", "Reference", "Browser"]
updated: "2026-08-30"
---

This site exposes a small tool list for browsers that support page-provided AI tools.

The tools help an agent ask the site direct questions instead of scraping the page and guessing. They are for convenience and accuracy. They are not a private API for bypassing the site.

Most tools only read. One tool can draft a page, but it cannot publish.

## What a site tool is

A site tool is a named function registered by the page.

It has:

- a name
- a short description
- an input shape
- a result shape
- a handler that runs in the browser's page context

The browser remains in control. If your browser does not support these tools, the site still works normally.

## The tools

| Tool | What it does | Writes? |
|---|---|---|
| `search_site` | Searches games, platforms, articles, and docs. | No |
| `check_game_ported` | Checks whether this catalog already has a port for a game. | No |
| `list_platforms` | Lists supported platform pages and their maturity labels. | No |
| `get_page_markdown` | Returns one docs page as markdown. | No |
| `define_term` | Explains a glossary term. | No |
| `plan_my_port` | Gives a first-pass porting plan for a game and system. | No |
| `draft_page` | Creates a draft page for review. | Yes, draft only |

Every read result should include a URL when a page backs the answer. The user should be able to click through and check it.

## `search_site`

Use this when the user asks a general question about the site.

Example input:

```json
{ "query": "widescreen" }
```

Good results should be ranked and linked. A docs match should point near the matched heading when possible.

## `check_game_ported`

Use this before planning a new port.

Example input:

```json
{ "title": "street fighter alpha" }
```

The match is intentionally forgiving. Users do not always type exact punctuation, subtitles, or regional names.

`ported: false` means this site has no entry. It does not prove nobody has tried anywhere else.

## `list_platforms`

Use this when an agent needs the current platform list.

The result should include each platform page, status, maturity, and a short description. It should not include removed or unsupported systems.

Platform maturity is a guide for expectations. It is not a promise that every game on that system can be ported today.

## `get_page_markdown`

Use this when an agent needs the raw text of a docs page.

Example input:

```json
{ "path": "/docs/start/quickstart" }
```

Only documentation paths should be accepted. A tool like this should not fetch arbitrary websites or local files.

Users can also add `.md` to documentation URLs themselves.

## `define_term`

Use this for glossary terms.

Example input:

```json
{ "term": "co-simulation" }
```

The answer should be short and should link back to the glossary or the best matching concept page.

## `plan_my_port`

Use this for a first-pass plan.

Example input:

```json
{ "game_title": "Some Game I Own", "console": "PlayStation" }
```

The tool should check whether the game is already listed first. If it is already listed, it should point the user at that page instead of inventing a new plan.

For new work, the plan should say:

- which framework is the closest fit
- how mature that framework is
- whether scaffolding exists
- what files the user will need to legally provide
- what the first technical steps are

The result should stay honest. If a system is only a tech demo, the plan should say that plainly.

## `draft_page`

`draft_page` is the only writing tool.

It creates a draft for review. It does not publish, deploy, or silently replace an existing page.

Drafts should follow the same voice as the site:

- short paragraphs
- practical wording
- no giant code excerpts
- no source archaeology
- no claims the project cannot support

The user still decides what lands.
