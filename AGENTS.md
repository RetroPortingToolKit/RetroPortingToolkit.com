# Agent contract

## Scope

This repo is a site template. Content lives in `data/`; brand strings live in
`src/lib/site.ts`. Prefer changing those over hardcoding values in components.

**Adding or editing a page? Read `docs/AUTHORING.md` first.** It is the one
description of what a page is: the three kinds, the frontmatter each takes,
how media is embedded, and the house style. Everything below is about changing
the site itself, which is a different job.

## Conventions

- Styles are ordered partials under `src/styles/`. The cascade depends on the
  import order in `src/main.tsx`: add a partial there, don't reorder existing
  ones.
- Every brand-facing string goes through `src/lib/site.ts`. Do not reintroduce
  a hardcoded site name, domain, or byline in a component.
- Content is read at build time by `src/lib/content.ts`. The site itself
  fetches nothing at runtime: every page is prerendered from `data/`.
- There is a CMS, and it does not change that. `/admin` (`src/pages/Admin.tsx`)
  and `api/cms.ts` write to `data/` by committing to `main`; a commit is still
  the only way content changes. `scripts/cms-dev.mjs` is the same API against
  the working tree for local development, and the two must agree: naming one
  thing differently in each has caused three separate bugs, so any route,
  field or kind added to one goes into the other in the same change.
- `public/agent.md` is the instructions someone's AI fetches to post over the
  API. If you change what a page needs, change that too.
- Item identity comes from the folder name (`<order>_<slug>`). Renaming a
  folder changes its URL.

## Verification

Run before proposing a change as done:

```sh
npm run typecheck
npm run build
npm run test
```

## Releasing

Deploys happen when the owner asks. Do not add a scheduled job, hook, or CI
workflow that builds, deploys, or publishes on its own.

Content is the exception, and it is the point of the CMS: a page written
through `/admin` or the API is committed by the site's own token, and goes
live on the next deploy. Prefer `draft: true` for anything not ready, rather
than holding the commit back.
