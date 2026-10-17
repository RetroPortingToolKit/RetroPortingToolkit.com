# Docs wiki launch

## Plan and verification

- [x] Direct Discord login verified on production into the docs editor.
- [x] Live history loads GitHub revisions and compares one with the current page.
- [x] Isolated contributor lifecycle exercises admin grants, a Discord session,
  page creation, editing, history, admin restoration, disable, enable, and revoke.
  Both browser mutations and signed bot writes are rejected while disabled.
  See `src/lib/wikiAccess.test.ts` and `src/lib/discordLogin.test.ts`.
- [x] New editor docs publish immediately, as requested by the owner.
- [x] Public contribution guide and Start here link prepared.
- [ ] Complete the human pilot with an owner-selected Discord member. The member
  signs in with their own account, gets docs access automatically, makes a useful edit, checks
  history, and agrees to a brief disable/enable check. An org admin performs
  restoration. Do not impersonate the member or disable an unrelated user.
- [x] Posted in #ai-development, tagging Gamemaster and Shokunin:
  https://discord.com/channels/1514467450429640824/1522650211023978516/1561036240755621990

The human pilot needs a named member and their participation. Automated tests
use an isolated SQLite store and mocked provider services; they do not prove
that a second person can follow the production workflow. No test content or
test identities were inserted into production.

## Announcement draft

Docs contributions are open through the website and Discord. Sign in with
Discord at https://retroportingtoolkit.com/admin. All server members can edit
docs immediately; no access request or GitHub account is required.

You can fix a page, create a page in an existing section, or mention
the bot with a `wiki edit` or `wiki new` request and your source facts. Each page
has a change history; admins can restore revisions and manage access across
the editor and bot.

Start here: https://retroportingtoolkit.com/docs/start/contribute-to-docs
