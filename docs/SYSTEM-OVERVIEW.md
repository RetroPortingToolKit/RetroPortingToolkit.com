# System overview: a community-editable static site with a Discord agent

Written 2026-09-17 so the design can be described to another evaluator, human
or AI, and judged for reuse on another project. It describes what exists and
why, names the pieces of the repository that carry each part, and ends with
what is generic and what is specific to this site. Operational detail lives in
the documents it links; this file does not repeat it.

## One paragraph

A static site (React, Vite, prerendered, hosted on Vercel) whose content is
Markdown in a Git repository. Every change to the site is a commit to `main`,
whether it comes from a person in the web editor, an agent with an API key, a
public submission form, a reaction in Discord, or the bot's own watchers.
Because the commit is the unit of publication, one trust model, one audit
trail, and one deployment path cover all of them. A Discord bot running on a
Mac beside the checkout adds intake, moderation, self-service updates, and
announcements; it can also run an AI agent for open-ended editing requests
from trusted people.

## Components

### 1. Content and site

- Content is `data/<kind>/<nn>_<slug>/index.md` with YAML frontmatter; kinds
  are `games`, `hardware`, `blog`, `docs`. A page is a folder: its images sit
  beside `index.md`. Folder names define URL and identity. `draft: true`
  keeps the URL but removes the page from listings, feeds, and the sitemap.
- The build prerenders every route with meta tags, feeds, sitemap, and a
  plain-text mirror for agents (`llms.txt`, per-page `.md`). No runtime
  content fetching. See [AUTHORING.md](AUTHORING.md).
- Frontmatter fields that matter to the community features: `repo`,
  `creator` (`github`/`gitlab` login plus `discord` name), `status`,
  `download`, `release`, `updates` (dated "What's new" notes), `submissionId`.
- Derived pages: `/creators` groups every game by its creator; a "Made by"
  line on each page links the creator's profile and the creators page. Credit
  resolves in order: explicit `creator`, a stated team author's handles in
  `data/team.json`, the owner of `repo` for community projects.

### 2. Web editor and API (the CMS)

- `/admin` is a React editor served by the same site. In development it talks
  to a Vite middleware that writes the working tree
  (`scripts/cms-dev.mjs`); in production it talks to a serverless function
  (`api/cms.ts`) that reads and writes the repository through the GitHub API.
  Every production save is a commit and therefore a deploy.
- Identity: people sign in with GitHub OAuth; agents present a bearer token
  whose hash is in the environment. Access is org membership or an allowlist.
  Full editors see everything. See [CMS-ACCESS.md](CMS-ACCESS.md) and
  [CMS-API.md](CMS-API.md).
- Contributor scope: a GitHub login that owns the repository named on any
  game page, or a submitted repository in the register, may sign in and edit
  only those pages. The list shows only their pages; reads and writes
  elsewhere are refused server-side; creating, renaming, deleting, featuring,
  and changing identity fields are refused; the UI hides those controls. The
  grant is derived from content, not configured, so it needs no admin action
  and ends when the page is removed.
- Concurrency: saves carry the version they were based on and are refused
  when stale, on both backends.

### 3. Public submissions

- `POST /api/submissions` takes a public GitHub or GitLab repository URL and
  optional name, description, cover link, Discord username. The website has
  a modal form; the bot accepts the same through a mention. The handler
  verifies the repository is public, derives the page from repository
  metadata, summarises the README's introduction and status sections,
  imports README or attached images as cover and gallery, links toolkit names
  to platform pages, and commits a new page plus a register entry
  (`data/submissions.json`). Duplicates and removed repositories are refused.
  Code: `src/lib/submissionServer.ts`, `scripts/submissions.mjs`,
  `scripts/submission-media.mjs`.
- The page publishes immediately and is credited to the repository owner.
  The reply tells the submitter how to edit it.

### 4. Discord bot (`scripts/discord-agent.mjs` and siblings)

A single long-running Node process under launchd on a Mac that holds a clone
of the repository. Everything it does on the checkout goes through one
serialized queue with a busy-tree check, the project's own checks
(typecheck, build, test), and a commit and push.

- Addressing: it acts only on messages that open with its mention or reply
  to it. Mentions mid-sentence and a reply's automatic ping are ignored.
- Intake: `@Bot submit <repo url>` from anyone, any channel. Attachments
  become artwork. The submitter is @-mentioned with the page and edit link.
  Submissions from a configured team list are confirmed on publication.
- Moderation: each submission posts a notice in the bot channel; editors
  react ✅ to confirm (notice deleted) or ❌ to unlist. Reactions are checked
  against the same authorization as publishing.
- Owner self-service: `@Bot update /games/<slug> status: …; news: …` from
  the page's Discord creator, the team member owning its repository, or the
  trusted list. This is a frontmatter rewrite, not an agent run.
  Code: `scripts/owner-updates.mjs`, `scripts/page-updates.mjs`.
- Watchers: the site-change watcher polls GitHub's compare API and posts one
  line per page that was created, removed, published, unlisted, given a cover
  or images, or substantially edited, after a burst goes quiet
  (`scripts/site-changes.mjs`). The release watcher checks each game's
  repository about once a day, records the latest release and download link
  on the page, and announces releases after the first
  (`scripts/repo-updates.mjs`). Anonymous GitHub usage stays under ten calls
  an hour.
- Agent lane: trusted people can ask for open-ended edits in natural
  language. The bot runs a coding agent (Codex, then the Claude CLI on a
  subscription, then the Claude CLI on an API key) with the request, a
  bounded context, and a receipt format; it verifies the agent's completion
  claims against the committed source and remote before reporting. Public
  channels get a read-only question lane with tools fenced to the checkout.
  See [DISCORD_AGENT.md](DISCORD_AGENT.md) and
  [DISCORD-OPERATIONS.md](DISCORD-OPERATIONS.md).
- Channels: one for site changes only, one for everything the bot did.

### 5. Durability and failure handling

- Bot state is small JSON files: queue, undelivered replies, watcher cursors,
  runner cooldowns. A restart replays or apologises for interrupted work.
- A runner that cannot serve (quota, revoked token) hands over to the next
  tier; exhaustion alerts maintainers instead of failing quietly.
- Submissions retry safely because the repository URL is the identity.

## Trust model, in one table

| Actor | Proves identity by | May |
|---|---|---|
| Anyone | nothing | submit a public repository, ask questions in public channels |
| Repository owner | GitHub OAuth login matching `repo` or the register | edit those pages in the editor |
| Page's Discord creator | Discord account name recorded at submission | update status, description, notes via the bot |
| Team member | org membership, allowlist, Discord role or ID | everything above, moderation, agent requests |
| Agent | bearer token bound to a person | what that person may do, attributed to them |

Attribution is never asserted beyond what was verified: the site says who owns
the repository, not who typed the submission.

## What is generic

- Git as the publication and audit path, with the checks in the loop.
- A content-derived permission grant (own the repository, edit the page).
- Serialized checkout queue for anything automated that writes.
- Watchers built on public, cached-friendly APIs with rolling cursors.
- A single "is this message for me" rule for a chat bot.
- Runner chain with cooldowns and completion verification for agent work.

## What is specific to this site

- Content kinds and frontmatter vocabulary (games, platforms, toolkits).
- The README summariser's section heuristics and toolkit name list.
- GitHub as the code host for both content and contributor identity; GitLab
  is supported for submitted repositories but not for editor sign-in.
- Vercel serverless functions and a Mac under launchd as the two runtimes.
- Discord as the community surface and the channel split.

## Evaluation questions for another project

1. Is every publication already a commit, or can it become one? Without that,
   the audit trail and single trust model do not follow.
2. Is there a verifiable, external identity for contributors (a code host
   login, an org membership) that content can reference? That is what makes
   the scoped grant automatic.
3. Is there a machine that can hold a checkout and run the project's checks
   unattended, with the credentials it needs kept out of the process
   environment when it runs untrusted input?
4. Does the community live somewhere with a bot API, reactions, and
   mentions? The intake and moderation flows assume those three.
5. How much of the content can be derived from a public source (README,
   releases, metadata)? The less a submitter must type, the more submissions
   arrive complete.
6. Is an AI agent lane needed at all? Everything above except open-ended
   editing works without one, and the deterministic parts carry most of the
   value.

## Where to read next

- [AUTHORING.md](AUTHORING.md): content rules and frontmatter.
- [CMS-ACCESS.md](CMS-ACCESS.md), [CMS-API.md](CMS-API.md): identity and the write API.
- [DISCORD_AGENT.md](DISCORD_AGENT.md): the bot's behaviour and configuration.
- [DISCORD-OPERATIONS.md](DISCORD-OPERATIONS.md): running and restarting it.
- `public/agent.md`: what an outside agent is told about this site.
