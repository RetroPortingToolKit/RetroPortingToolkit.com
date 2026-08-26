---
title: "Site tools"
summary: "The seven tools this site registers for a browser that has an AI agent in it: what each one takes, what it returns, what the one tool that writes can and cannot do, and why a browser without the feature is unaffected."
pageType: "reference"
tags: ["Agents", "WebMCP", "Reference", "Browser"]
updated: "2026-08-26"
---

Some browsers now have an agent in them. When you open a page in one, the page can hand the agent a short list of things it is able to do, and the agent uses those instead of guessing from the HTML. The standard for that is WebMCP, and this site registers seven tools through it.

Six of them only read. One writes a draft page, and it can never publish.

You do not have to do anything to turn this on. If your browser supports it, the tools appear when you open any page here.

## What is a site tool?

A tool is a named function the page registers, with a description, a schema saying what it takes, and a handler that runs inside the page.

Three things follow from that, and they are the reason this is worth doing at all.

The agent stops guessing. It does not read the rendered page and infer that a table of games is a catalogue. It calls `check_game_ported` and gets an answer with a URL attached.

The tool runs in your browser session. There is no API key for the agent to hold and no token anyone had to issue. A request goes out from the page you already have open, with the sign-in you already have. If you are not signed in, the tool gets refused by this site, not by a rule invented for agents.

The browser stays in charge. It shows you the tool list, it reviews each call, and it can ask you before running one.

## The seven tools

| Tool | What it does | Changes anything? |
|---|---|---|
| `search_site` | Ranked search across games, consoles, articles and documentation | No |
| `check_game_ported` | Is this game already ported? | No |
| `list_platforms` | Every console covered, with status and maturity | No |
| `get_page_markdown` | One documentation page as raw markdown | No |
| `plan_my_port` | What porting one game would actually take | No |
| `define_term` | A word from the glossary, defined | No |
| `draft_page` | Writes a draft page, never a published one | Yes, a draft |

Every result carries the full URL of the page that backs it, so you and the agent can both check the claim.

### search_site

Ranked search over everything published here. It uses the same engine as the search box in the top bar, minus the keyboard commands.

```json
{ "query": "widescreen" }
```

Up to ten results come back. A documentation hit links to the heading that matched, not just the page.

```json
{
  "ok": true,
  "query": "tomba",
  "count": 4,
  "results": [
    {
      "title": "Tomba!",
      "kind": "Game",
      "url": "https://retroportingtoolkit.com/games/tomba",
      "description": "PSXRecomp's first game and its most lived-in: reasonably playable, with save states, rewind, and experimental widescreen."
    }
  ]
}
```

### check_game_ported

The check to run before planning anything. Somebody may already have done the work.

```json
{ "title": "street fighter alpha" }
```

The match is loose. Punctuation, an accent and a missing subtitle all still find the page, so you can type a game's name the way you would say it.

```json
{
  "ok": true,
  "query": "street fighter alpha",
  "ported": true,
  "matches": [
    {
      "title": "Street Fighter Alpha 3",
      "url": "https://retroportingtoolkit.com/games/street-fighter-alpha-3",
      "status": "Released",
      "desc": "One of PlayStation's great fighters running as a native app, with about five minutes of game-specific work behind it."
    }
  ]
}
```

`ported: false` means this catalogue has no entry. It does not mean nobody anywhere has tried.

### list_platforms

Takes no input. Returns every console with the two labels its page carries: `status` is how far the toolchain has got, `maturity` is how far the ecosystem around it has got.

```json
{
  "ok": true,
  "count": 13,
  "platforms": [
    {
      "title": "PlayStation",
      "url": "https://retroportingtoolkit.com/hardware/playstation",
      "status": "Playable alpha",
      "maturity": "Beta",
      "desc": "Seven core-team games are playable today, and the same framework powers community ports of Spyro, Xenogears, and Pepsiman."
    }
  ]
}
```

### get_page_markdown

Every documentation page here also exists as plain markdown at its own address with `.md` on the end. This tool fetches that, which is easier for a model to work with than the rendered page.

```json
{ "path": "/docs/start/quickstart" }
```

It reads documentation and nothing else. A path outside `/docs`, or a URL on another site, is refused with a sentence saying so. An address with no page behind it is reported as missing rather than returning the site's shell.

If you are reading with a plain fetch instead of a browser agent, you do not need this tool. Add `.md` to any documentation URL yourself, or start from [/llms.txt](https://retroportingtoolkit.com/llms.txt).

### plan_my_port

The one that does real work. You name a game, and optionally the console it is from.

```json
{ "game_title": "Some Game I Own", "console": "PlayStation" }
```

It checks the catalogue first. If the game is already ported, it says so and points at that port instead of handing you a plan.

Otherwise it returns which framework applies, where that console sits on the maturity ladder in the words the [platforms index](/docs/platforms) uses, whether scaffolding exists, and the steps. On PlayStation the steps carry the real commands, including the flags that decide whether a scaffold produces something runnable. On the other consoles they name the working port to copy, because there is no scaffolding there and pretending otherwise wastes an evening.

```json
{
  "ok": true,
  "game": "Some Game I Own",
  "console": { "title": "PlayStation", "url": "https://retroportingtoolkit.com/hardware/playstation" },
  "alreadyPorted": false,
  "verdict": "No port of \"Some Game I Own\" is catalogued here. This console has scaffolding, so starting one is a command rather than an afternoon.",
  "framework": "psxrecomp",
  "maturity": { "tier": "The standard", "note": "The gold standard. ..." },
  "scaffolding": "Yes",
  "steps": [
    {
      "step": "Scaffold the project",
      "detail": "One non interactive command creates the project, probes your disc, generates the code and builds it. ...",
      "command": "sh tools/new_project_layout/setup_project.sh \\\n  --yes \\\n  ...",
      "source": "https://retroportingtoolkit.com/docs/start/recomp-your-own-game"
    }
  ],
  "rules": [
    {
      "rule": "You supply the game file yourself, from a copy you own. ...",
      "source": "https://retroportingtoolkit.com/docs/concepts/the-game-file-you-supply"
    }
  ]
}
```

The commands are not written into the tool by hand. They are pinned to [Recomp your own game](/docs/start/recomp-your-own-game) by a test that compares them character for character. If that page changes and the tool is not updated, the build fails. The maturity tiers and the port to copy are read out of the published pages when the tool runs, so they cannot go stale at all.

Two rules ride along with every plan. You supply your own game file, and this site tells nobody how to obtain one. An agent does not create a GitHub repository on your behalf.

### define_term

This fleet uses about forty-five words as though everyone knows them. This looks one up in the [glossary](/docs/concepts/glossary) and returns the meaning these repositories actually attach to it.

```json
{ "term": "dispatch miss" }
```

Case, hyphens and extra spaces do not matter.

```json
{
  "ok": true,
  "term": "Dispatch miss",
  "definition": "The runtime jumping to a guest address with no generated function behind it. Every toolchain treats it as a failure of code discovery or code generation, not something to patch around. ...",
  "url": "https://retroportingtoolkit.com/docs/concepts/glossary#dispatch-miss"
}
```

A word that is not in the glossary comes back as a plain refusal. The tool does not invent a definition.

### draft_page

The only tool that writes. It creates a draft page through this site's editor API, using your own signed-in session.

```json
{
  "kind": "blog",
  "title": "A title",
  "desc": "The one line under the title.",
  "body": "## A heading\n\nMarkdown goes here."
}
```

What it can do:

- Create a `blog` post or a `docs` page.
- Commit that file to the site's repository, attributed to you.

What it cannot do:

- Publish. The page is always a draft. There is no argument that changes this, and an agent asking to publish is ignored.
- Edit or delete anything that already exists.
- Write a game or console page. Those are catalogue entries and stay curated.
- Do anything at all when nobody is signed in. It checks first, and if you are not signed in it stops and tells the agent to ask you to sign in at [/admin](/admin).

A draft has its own URL and appears in no listing, no feed and no sitemap. Somebody has to open the editor and publish it before anyone else sees it. The result hands back both links, the draft and the editor, so the agent can give you each.

## Try it

Three things to say to an agent browser with this page open. Each one maps to a tool.

> Is Tomba already ported to PC?

It should call `check_game_ported` and come back with the game's page, its status, and the fact that this is a catalogue entry rather than a download.

> Plan a PlayStation port of a game I own.

It should call `plan_my_port`, tell you the game is not in the catalogue, name the framework and its maturity, and give you the scaffold command with the flags spelled out. It should also tell you that you supply the game file.

> What does dispatch miss mean on this site?

It should call `define_term` and quote the glossary entry, with a link to that entry rather than to the whole page.

If your agent answers any of these from the page text instead of a tool, it either does not support site tools or has them turned off.

## What can these tools do to my account?

Less than you might expect, and that is deliberate.

**They run as you, not as a service.** There is no key and no token. Six tools need no sign-in at all because they only read pages that are already public.

**Only one writes, and it can only draft.** `draft_page` is the whole write surface. Draft is forced in the code, not chosen by the agent.

**Nothing here reaches another site.** Every tool talks to this site only.

**Every tool says what it is.** Each one is registered with hints the browser reads: whether it changes anything, whether it can destroy anything, and whether repeating a call repeats the effect. Your browser uses those to decide what to confirm with you first. The description on `draft_page` states its side effects in plain words rather than burying them.

**You can turn them off.** Site tools are a browser feature, so the switch is in the browser, not on this page. In ChatGPT's browser they appear under the page's site tools list and can be disabled there. Turning them off leaves the site working exactly as it does now.

**Nothing is sent anywhere by opening the page.** Registering a tool tells the browser it exists. Nothing runs until an agent calls it, and your browser decides whether to let that happen.

## What if my browser does not have this?

Nothing changes. That is the whole answer.

The site checks for the feature and, when it is absent, does nothing: no error, no console message, no difference in what renders. Every page, link, search box and keyboard shortcut works the way it always has. The tools are an addition for browsers that can use them, never a requirement.

Support today is uneven. ChatGPT's browser reads these tools. Chrome serves the same API behind an origin trial, which needs a token registered for the site. Everything else ignores it.

If you are an agent reading this site with a plain fetch rather than a browser, none of this applies to you and you lose nothing. Use [/llms.txt](https://retroportingtoolkit.com/llms.txt) for the index, [/llms-full.txt](https://retroportingtoolkit.com/llms-full.txt) for the whole documentation section in one file, and `.md` on any documentation URL for one page.

## Next

- [If you are an agent, start here](/docs/agents/start-here), the orientation page written in second person
- [Machine surfaces](/docs/agents/machine-surfaces), every machine-readable address this site publishes
- [Recomp your own game](/docs/start/recomp-your-own-game), the page `plan_my_port` quotes its commands from
- [Glossary](/docs/concepts/glossary), the page `define_term` reads
