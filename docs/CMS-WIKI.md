# Docs wiki operations

The existing CMS and Discord bot share the hosted CMS mutation handlers.
Markdown and media remain in GitHub. Account links, grants, suspensions, page
protections, rate counters, and moderation audit records live in the private
`WIKI_ACCESS` D1 binding. SQL migrations live in `migrations/` and are applied
with Wrangler before the corresponding main deployment.

## Roles and access

Live guild role IDs verified on 2026-10-17:

| Role | Discord ID | Website consequence after account linking |
|---|---|---|
| Founder | 1522645500724121620 | Shared docs access; existing trusted bot publishing remains |
| Community Advocate | 1528990973131231365 | Shared docs access; existing trusted bot publishing remains |
| RPTK contributor | 1550041387217719327 | Recognition only; needs a docs grant unless otherwise authorized |

The verified explicit publishing and destructive user lists are mirrored in
`api/wiki-access.ts`; keep that mapping aligned when changing bot authorization.
The bot still uses its existing configured publishing and destructive-action
allowlists. Website moderation uses active GitHub organization admin membership.
Ordinary org membership and the CMS allowlist continue to grant full CMS editing,
but do not grant the new moderation controls. A docs grant adds editing of shared
pages and creation inside existing sections. It grants no site configuration,
blog editing, navigation management, or access to others' game pages.

## Link and contribute

1. Sign in with GitHub at `/admin` and open Contributions.
2. Generate a Link Discord code and mention the bot in the server with
   `link CODE`.
3. Refresh Contributions, check the displayed Discord account, and confirm it.
   A code expires after ten minutes, can be claimed once, and cannot complete
   a link without confirmation from the GitHub-authenticated browser.
4. An org admin grants docs access in Contributions if needed. Refresh or reload
   the editor after access changes.

Docs pages have Edit this page, History, and Create a page controls. The editor
keeps its Markdown preview, media tools, and stale-save protection. Docs saves
update the maintained date and accept an edit summary. Saving commits to main;
publication follows the existing Workers Builds deployment.

For Discord edits, mention the bot first, followed by:

```text
wiki edit /docs/start/quickstart Clarify the setup step using these facts: ...
```

For a new page, name an existing section, a title, then provide source facts on
the following line:

```text
wiki new start Setup guide
Write a guide using these facts: ...
```

The model prepares Markdown with the read-only answer runner. It never receives
publishing tools for this lane. The bridge preserves existing frontmatter and
sends the result through the same CMS validation, scope, protection, and version
checks as browser edits. Requests, queue execution, and publication each check
current access. Existing trusted agent jobs get a temporary per-task pre-push
check that chains any existing hook; no checkout hook is overwritten.

## Moderation and recovery

Contributions lists signed-in users. Org admins can grant/revoke docs access,
disable/enable website contributions, clear a mistaken identity link, and protect
the selected docs page. Every change requires a reason and creates a private
audit record. A user cannot disable themselves. A suspended identity cannot be
unlinked until re-enabled, so its Discord suspension cannot be accidentally lost.

Disabling preserves content and overrides org access, role-derived access,
explicit grants, existing sessions, and linked bot publishing. It does not change
Discord roles or ban a member. Independent GitHub write access still exists
outside the website and bot. Revoking a docs grant removes that grant; a person
with another valid source of access retains it. Use Disable to stop all website
contributions. Enabling does not recreate a separately revoked grant.

History includes earlier Git commits, browser edits, bot edits, and local media
changes. It shows the selected commit's text changes, a preview, a comparison
with the current page, and the complete commit message. New bot edits include
the requester ID, source message, and executor attribution. Historical identities
are displayed as recorded, not inferred.

An admin compares a selected revision with the current page, chooses Restore,
and supplies a reason. Restoration commits the historical Markdown and local
media together, retains newer unreferenced files, and rejects concurrent changes.
It never resets main or rewrites history. Page renames are refused in the CMS
until a tracked URL/history migration is implemented. An admin can recover a deleted page from Contributions by opening its repository
path under Recover a removed docs page. Use protection or an unlisted draft for
normal wiki moderation.

## Verification

`src/lib/wikiAccess.test.ts` exercises a real SQLite schema with mocked GitHub
and Discord services. It covers role-derived grants, explicit grants, cross-channel
suspension, existing sessions, protected pages, actual org-admin authorization,
request origin, stale edits, identity confirmation, signed bridge calls, historical
reads, atomic media restoration, and revocation before the ref update.
`scripts/wiki-bridge.test.mjs` checks proposal isolation and revocation before and
after generation. The pre-push guard tests also cover lost publishing access and service outages.
The existing bridge harness stubs only the access-service
boundary and keeps testing real queue/request handling.

The local CMS supplies Git history and previews without using production account
state. Test hosted permissions through the Worker or the isolated SQLite tests.
Live bot verification requires loading the new code with an idle restart and
signing in/linking a real account. Do not post test pages to production merely to
exercise the write routes.
