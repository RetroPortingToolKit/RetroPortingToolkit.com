# retroportingtoolkit.com

The live site at **https://retroportingtoolkit.com**. A React + TypeScript +
Vite SPA, prerendered to static files at build time, with its content as plain
markdown under `data/`.

> **A push to `main` publishes.** The Vercel project builds on every push and
> the site is live a minute or two later. There is no staging step and no
> review. Use `draft: true` on a page you are not ready to show.

## Two ways to change the site

Both are open to anyone in the **RetroPortingToolKit** GitHub organisation, and
to nobody else.

**1. This repo.** Clone it, work in it however you like, including with an AI
agent, and push. This is the better path for anything substantial: you can see
real examples, run the build to catch a broken asset before anyone else does,
and leave a diff someone can read.

```sh
npm install
npm run dev      # http://localhost:5173
```

Read **`docs/AUTHORING.md`** before adding a page. It is the description of
what a page is: the three kinds, the frontmatter each takes, how media is
embedded, and the house style. `AGENTS.md` covers changing the site itself and
is what Claude Code and Codex pick up automatically.

**2. The editor at [/admin](https://retroportingtoolkit.com/admin).** Sign in
with GitHub. Write, upload images and video, preview live as you type, publish.
Good for a post, a fix, or a quick edit from a machine without a checkout. It
commits to `main` under your name, so it deploys like any other push.

## Content

Content is plain files under `data/`, read at build time by
`src/lib/content.ts` through Vite's `import.meta.glob`.

```
data/
  about.md                       the hero and footer identity
  home.json                      home page prose and section titles
  blog/<nn>_<slug>/index.md      news, build logs, write-ups, videos, press
  games/<nn>_<slug>/index.md     a game that has been recompiled or ported
  hardware/<nn>_<slug>/index.md  a console's toolchain and ecosystem
```

The folder name carries both ordering and identity: `03_ape-escape` sorts third
and is served at `/games/ape-escape`. **Renaming a folder changes the URL** and
breaks links to the old one; the editor's "Change address" does this properly.
Media referenced as `./file` resolves inside that page's own folder, so a page's
images live beside its markdown.

## Launch FAQ

**What is this?** A practical directory of static recompilers, runtimes, and
community ports that turn original console games into modern applications.

**Does it include game files?** No. You must supply a legally obtained dump you
are entitled to use. The site and its repositories do not distribute
copyrighted game data.

**Is this an emulator?** No. A static recompiler translates a game's code ahead
of time; the runtime supplies the platform services the native port expects.

**How can I contribute?** Add a focused project or correction through a reviewable
pull request, include its source repository and status, and keep descriptions
factual and respectful. Draft content stays out of public listings until it is
ready.

`public/previews/<slug>.mp4` plus `<slug>.webp` give a page an animated card in
place of a static cover. They are produced locally by `scripts/gen-previews.mjs`
to an exact encoding spec; see `docs/HANDOFF.md`.

## The CMS

`/admin` is `src/pages/Admin.tsx`. It talks to `api/cms.ts`, a Vercel function
that reads and writes `data/` through the GitHub Contents and Git Data APIs, so
every edit is a commit. `scripts/cms-dev.mjs` serves the same routes against the
working tree for local development, and the two must agree: naming one thing
differently in each has caused three separate bugs.

Access is org membership, checked per request. `docs/CMS-ACCESS.md` covers who
gets in and how it is revoked. `public/agent.md`, served at
[/agent.md](https://retroportingtoolkit.com/agent.md), is what an agent reads to
publish over HTTP without a checkout.

## Architecture

- **`src/App.tsx`**: routing plus the stacked-modal layer. Opening an item
  pushes a route carrying the current location as `background` state, so the
  page underneath stays mounted and closing walks back one layer at a time.
- **`src/pages/Home.tsx`**: the tabbed home (Home / Platforms / Games / News)
  and the live pager, where wheel and touch gestures drag the neighbouring tab
  in proportionally, committing past a threshold or springing back.
- **`src/lab/labContent.ts`**: adapts parsed `Item`s into the `LabMedia` view
  model every card renders from, so grids, tabs, collection overlays and the
  editor's own list all use one card (`src/components/SpatialCard.tsx`).
- **`src/lib/cmsPreview.ts`**: the editor streams its buffer to the preview
  frame, which re-parses it, so a page renders as it is typed without a save.
- **`src/styles/`**: ordered CSS partials; the cascade depends on the import
  order in `src/main.tsx`. Light and dark are both driven by tokens in
  `01-base.css`.

## Before you push

```sh
npm run typecheck
npm run build      # fails on a referenced asset that does not exist
npm run test
```
