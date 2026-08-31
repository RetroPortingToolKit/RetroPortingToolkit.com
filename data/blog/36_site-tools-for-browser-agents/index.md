---
title: "Site tools for browser agents"
kicker: "Site news"
tags: ["Agents", "WebMCP", "Site tools"]
featured: false
desc: "Retro Porting Toolkit can expose its own search, catalogue, glossary, port-planning, and draft tools to a browser agent."
date: "2026-08-27"
layout: "article"
cover: "./reference-page.png"
draft: false
---

An AI agent should not have to guess what this website means.

It should not have to click through pages, scrape text, and rebuild the site catalogue from whatever happens to be visible.

The site already knows those answers. It knows which games are listed. It knows which platforms exist. It knows what the glossary says. It knows how to create a draft when a signed-in user asks for one.

So the browser agent can ask the site directly.

## What changed?

Retro Porting Toolkit now exposes a small set of site tools through WebMCP.

WebMCP lets a website offer named tools to an agent running in the browser. The agent still works inside your browser session. The site still decides what each tool is allowed to do.

For this site, that means the agent can use the same data the website already uses.

It is not a second API. It is not a separate agent account. It is the site exposing a cleaner path for work the site already supports.

## What can an agent ask?

The current tools cover common site tasks:

- search the site
- check whether a game is already listed
- list the supported platforms
- read a docs page as Markdown
- explain a glossary term
- plan which recomp framework fits a game
- create a draft page, if you are signed in

The full reference is here: [Site tools](/docs/reference/site-tools).

![The site tools reference page lists the available tools and what each one is allowed to do.](./reference-page.png)

## Why this matters

This makes agent work less fragile.

If you ask whether Tomba! already has a port, the agent can call the catalogue tool instead of searching the page by eye.

If you ask what "dispatch miss" means, it can call the glossary tool instead of guessing from scattered text.

If you ask how to start a PlayStation port, it can call the port-planning tool and return the relevant framework, warnings, and source pages.

That is better for users too. The agent can show where the answer came from, and the site can keep the answer tied to the current docs.

## What can write?

Only one tool writes anything: `draft_page`.

It can create a new draft blog post or docs page. It cannot publish. It cannot edit an existing page. It cannot delete anything. It cannot create game or platform entries.

It also requires your signed-in editor session. If you are not signed in, the site refuses the call.

Drafts stay drafts. They have a direct preview URL, but they do not appear in listings, feeds, search, or the sitemap until a human publishes them.

![A drafted page in the editor, still marked as a draft.](./editor-draft.png)

## What stays human?

Publishing stays human.

Game files stay human.

Judgment stays human.

An agent can help draft text, search the site, and prepare a plan. It should not decide that a page is ready, that a port is faithful, or that a project should be published.

The useful model is simple: the site exposes narrow tools, the browser mediates access, and the user remains in charge.

## How to try it

Open the site in a browser that supports WebMCP and use an agent that can see browser site tools.

Ask simple questions first:

- "Is Tomba! already ported?"
- "What does dispatch miss mean?"
- "I own Mega Man Legends. What recomp path applies?"

The answer should come back with a source, not a long visible crawl through the interface.

For write testing, sign in through [/admin](/admin), then ask the agent to create a small draft. The browser should ask you to confirm the write, and the result should include links to the draft and the editor.

Delete the test draft when you are done.
