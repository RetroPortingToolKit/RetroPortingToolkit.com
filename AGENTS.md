# Agent contract

## Scope

This repo **is** the live site at https://retroportingtoolkit.com. It began as
a generic template and is no longer one: the content under `data/` is real and
published, and `src/lib/site.ts` holds this site's brand. Do not treat anything
here as placeholder, and do not change the site's name, domain or byline unless
that is the actual request.

Most work here is one of two jobs, and they are different:

**Publishing a page** is the common one. Read `docs/AUTHORING.md` first: it is
the one description of what a page is, covering the four kinds, the
frontmatter each takes, how media is embedded, and the house style. The loop:

```sh
git pull                       # others publish through the CMS; start current
                               # write or edit data/<kind>/<nn>_<slug>/index.md
                               # docs nest: data/docs/<nn>_<section>/<nn>_<page>/
npm run build                  # fails on a referenced asset that is missing
git add -A && git commit && git push    # this publishes it, see Releasing
```

Set `draft: true` in the frontmatter for anything not ready. It keeps the page
out of every listing, feed and the sitemap while leaving its own URL working,
which is how you show someone a page before it is announced.

**Changing the site itself** is everything below.

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

**A push to `main` deploys the site.** The Vercel project is connected to this
repo and builds on every push, live a minute or two later. That is deliberate
(owner, 2026-08-21) and is what makes the CMS work: a page written through
`/admin` or the API is committed by the site's own token, and that commit
publishes it. Use `draft: true` to hold something back, not an unpushed commit.

So do not push anything you would not publish, and run the checks above first.

Beyond that, deploys happen when the owner asks. Do not add a scheduled job,
hook, or CI workflow that builds, deploys, or publishes on its own; the git
connection above is the one exception and it already exists.

## Pushing to the RetroPortingToolKit org

Sessions in this repo are authorized for this repo only. Repositories under
the separate `RetroPortingToolKit` org (`recomp-starter` is the one that
exists today) are outside that set: the git proxy refuses to inject a
credential (403 on push), and `add_repo` with push access has failed at the
approval step every time it has been tried (2026-08-24 and 2026-08-25). The
owner has checked the GitHub App settings and "All repositories" is already
selected, so do not diagnose it as a permissions setting the owner forgot.

What works, proven end to end on 2026-08-25:

1. Try `add_repo` (push) once anyway; it may get fixed someday. If it errors,
   stop retrying and use the ferry below.
2. Clone the target repo into the scratchpad (public repos clone fine read
   only), do the work there, and commit it locally.
3. **Author the commit as `Shokunin <30949000+tetrisgm@users.noreply.github.com>`,
   never the owner's personal email.** GitHub's email privacy protection
   (GH007) rejects any push whose commits expose the private address; the
   noreply identity above is the one the owner's own pushes use and it passes.
4. Export with `git format-patch -1 --stdout <sha> > name.patch`, copy the
   patch into this repo's `public/`, commit and push it (that publishes it at
   `https://retroportingtoolkit.com/name.patch` about a minute later).
5. **Wait until the URL serves the real bytes before telling the owner to
   fetch.** vercel.json rewrites every unmatched path to the SPA with a 200,
   so an early `curl` downloads HTML and `git am` fails with "Patch format
   detection failed". Poll until the first bytes are `From <sha>`.
6. Hand the owner this block, with the paths filled in:

   ```sh
   cd ~/Downloads
   git clone https://github.com/RetroPortingToolKit/<repo>.git
   cd <repo>
   curl -fLO https://retroportingtoolkit.com/name.patch
   git am name.patch
   git push
   ```

7. After the owner's push lands, verify the pushed tree matches your local
   commit (`git rev-parse origin/main^{tree}` against your sha's tree), then
   remove the patch from `public/` in a follow-up commit. The ferry file is
   temporary by contract.

Do not send the patch as a chat file attachment and assume it arrived: the
owner's Downloads folder did not have it when that was tried, and the whole
detour above exists because of it.
