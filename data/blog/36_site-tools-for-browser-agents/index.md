---
title: "Site tools: hand your browser agent the toolkit"
kicker: "Site news"
tags: ["Agents", "WebMCP", "Site tools"]
featured: false
desc: "This site now registers WebMCP site tools. A browser agent visiting any page gets seven typed tools, from search to a port planner, instead of a screen to squint at."
date: "2026-08-26"
layout: "article"
draft: true
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
  This post was drafted through that flow.

## What this does not change

Nothing, for everyone else. A browser without WebMCP ignores all of it. The
site still fetches nothing at runtime, still distributes no game files, and
the fetch surfaces that served agents before are all still there. The tools
are the same application logic the site already ran, offered one more way.

If you use an agent browser, try it: ask it whether Tomba is already ported
to PC, and watch it answer from the tool instead of the screen.
