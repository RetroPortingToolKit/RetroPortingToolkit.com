# retroportingtoolkit.com

Live published site, not a template. Preserve real `data/` content and brand/domain/byline unless asked to change them.

- Publishing: read `docs/AUTHORING.md`. Content lives in `data/<kind>/<nn>_<slug>/index.md`; docs nest by section. `draft: true` removes listings/feeds/sitemap but keeps the direct URL. Folder names define identity/URL.
- **Pushing main deploys production through the existing Vercel connection.** Run `npm run typecheck`, `npm run build`, and `npm run test` first. Publish only ready material; use drafts instead of holding dirty/unpushed work. Other deployments require owner intent; do not add automatic jobs/hooks/CI.
- Brand strings belong in `src/lib/site.ts`. Preserve ordered CSS imports in `src/main.tsx` for `src/styles/` partials.
- `src/lib/content.ts` prerenders `data/` at build time; no runtime content fetching. `/admin` (`src/pages/Admin.tsx`) and `api/cms.ts` commit to main. Keep API routes/fields/kinds aligned with local `scripts/cms-dev.mjs`; update `public/agent.md` when authoring requirements change.
- `vercel.json`: hashed `/assets/` are immutable for one year; stable-URL public media uses stale-while-revalidate, never immutable. No comments/unknown JSON keys.
- The Discord bot shares this checkout. Before editing, check BOTH `~/Library/Application Support/RetroPortingToolkitDiscordAgent/state/jobs.json` and `pgrep -f "claude -p"`; a queued request may have no process. If active, wait or avoid its files. Keep commits small and the tree clean; check git history before redoing blocked work.
- For bot work, see `docs/DISCORD-OPERATIONS.md`. For other org repositories or access failures, read `docs/ORG-ACCESS.md`; do not repeat permission diagnostics or bypass scoped tools.
- Org commits use `Shokunin <30949000+tetrisgm@users.noreply.github.com>`, never personal email.
