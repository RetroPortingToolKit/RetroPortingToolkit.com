# Agent contract

## Scope

This repo is a site template. Content lives in `data/`; brand strings live in
`src/lib/site.ts`. Prefer changing those over hardcoding values in components.

## Conventions

- Styles are ordered partials under `src/styles/`. The cascade depends on the
  import order in `src/main.tsx`: add a partial there, don't reorder existing
  ones.
- Every brand-facing string goes through `src/lib/site.ts`. Do not reintroduce
  a hardcoded site name, domain, or byline in a component.
- Content is read at build time by `src/lib/content.ts`. There is no CMS, no
  server, and no runtime content fetch.
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
