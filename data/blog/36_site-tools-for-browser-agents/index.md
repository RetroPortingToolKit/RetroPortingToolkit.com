---
title: "Site tools: hand your browser agent the toolkit"
kicker: "Site news"
tags: ["Agents", "WebMCP", "Site tools"]
featured: false
desc: "This site now registers WebMCP site tools. A browser agent visiting any page gets seven typed tools, from search to a port planner, and you can watch it use them. Here is what shipped and how to test it yourself."
date: "2026-08-27"
layout: "article"
draft: false
---

This site was built for agents from the start. Every documentation page has a
Markdown twin. `/llms.txt` lists everything. `/agent.md` documents the
publishing API. All of that serves agents that can fetch a URL.

Now the site serves the other kind too. Agents that live in your browser, like
the agent in ChatGPT's browser, discover typed tools on every page here. This
uses WebMCP, a proposed web standard: the page registers small functions with
names and schemas, and the agent calls them instead of clicking around and
reading the screen.

## What your agent can do here

Seven tools, all documented with their schemas on the
[site tools reference page](/docs/reference/site-tools).

- **Search the site.** The same ranked search as the site's command palette,
  returned as data.
- **Check whether a game is already ported.** The first rule of starting a
  port, as one call. If the answer is yes, your agent gets the game's page and
  its status, and you get an afternoon back.
- **List the platforms**, with each one's maturity stated honestly.
- **Read any documentation page as Markdown.**
- **Plan a port.** Give it a game you own and it returns the honest plan: the
  framework that applies, how mature it is, the exact scaffold commands where
  scaffolding exists, and what you supply yourself. Every claim in the answer
  links to the page that backs it.
- **Define a term** from the glossary.
- **Draft a page.** The one tool that writes. It works only when you are
  signed in to the site's editor, it runs with your own session, and every
  page it creates is a draft that no listing shows until a human publishes it.

## How do I test it?

Three tests, fastest first. The first needs no agent at all.

### The two minute check, in Chrome or Edge

Open this site in Chrome 149 or newer, or Edge 147 or newer. Open the
developer tools console and turn on the Verbose level, because debug lines are
hidden by default. Reload the page. You should see one line:

```text
[webmcp] Retro Porting Toolkit site tools registered: search_site, check_game_ported, list_platforms, get_page_markdown, plan_my_port, define_term, draft_page
```

Then type `document.modelContext` in the console. If it prints an object, the
feature is on and the tools are registered. In Chrome this works because the
site serves an origin trial token; you do not have to change any settings.
Chrome 149's developer tools also ship WebMCP support, so you can inspect the
registered tools there and invoke them by hand.

### The real test, in an agent browser

Open the site in ChatGPT's browser. The address bar shows Site tools, and
under Available site tools you should find all seven. Then ask, in this
order, and watch which tool the agent calls:

1. "Is Tomba already ported to PC?" The agent should answer from
   `check_game_ported`, not from reading the screen.
2. "I own Mega Man Legends. Plan me a PlayStation port." That is
   `plan_my_port`, and the answer should carry the exact scaffold commands
   and a link behind every claim.
3. "What does dispatch miss mean on this site?" That is `define_term`,
   straight from the glossary.

The tell that it is working: answers come back at once, with precise data and
this site's URLs, and the agent never visibly crawls the page.

### The write path

Sign in at [/admin](/admin) in that same browser, then ask the agent to draft
a short test post. It should call `draft_page`, the browser should ask you to
confirm, and the result hands back two links: the draft and the editor. Check
the editor: the draft exists, it is marked as a draft, and it appears on no
listing and in no feed. Delete it from the editor when you are done. That is
the whole lifecycle.

Trying it without signing in is also a test, and the correct result is a
polite refusal that points at the editor, with nothing written.

## What this does not change

Nothing, for everyone else. A browser without WebMCP ignores all of it. The
site still fetches nothing at runtime, still distributes no game files, and
the fetch surfaces that served agents before are all still there. The tools
are the same application logic the site already ran, offered one more way.
