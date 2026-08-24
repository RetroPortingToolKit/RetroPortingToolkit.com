// Build-time generator for a documentation page's "last updated" date.
//
// Two sources, and the rule between them is the point of this file:
//
//   1. the page's own `updated:` frontmatter, which src/lib/content.ts already
//      parses and scripts/gen-llms.mjs already publishes as "Last updated" in
//      llms.txt, llms-full.txt and every /docs/<slug>.md;
//   2. the date of the last commit that touched the page's index.md.
//
// FRONTMATTER WINS, and git fills the gap. The reason is not preference, it is
// that git cannot be trusted to answer in every place this site is built:
//
//   * The deploy is a git clone of unknown depth. `git rev-parse
//     --is-shallow-repository` is `true` in this very working tree. In a
//     shallow clone git cannot see past the graft, so on a depth-1 clone the
//     one fetched commit appears to have added every file and would date the
//     whole tree with the moment it was cloned. A date that changes with clone
//     depth is not a fact about the page.
//   * A page written through the CMS is untracked between the write and the
//     commit that publishes it, and git has no answer at all for it.
//   * A page's `updated:` is a claim about its CONTENT. A commit can be a link
//     sweep or a whitespace fix, which is not what a reader reads a stamp as.
//   * The .md twin of every page already prints the frontmatter date. Letting
//     git outrank it would make /docs/<slug> and /docs/<slug>.md disagree about
//     the same page on the same deploy.
//
// So git is the fallback, and it is also an AUDITOR: where git can speak and
// says a page was touched after the date it claims, staleUpdated() names it and
// the build logs it, which covers the one failure mode a hand-written date has.
//
// Self-contained (node builtins only) so it can run standalone:
//   node scripts/gen-docs-dates.mjs
import { execFileSync } from "node:child_process";
import path from "node:path";
import { ROOT } from "./site-config.mjs";

const DOCS_PREFIX = "data/docs/";
const FOLDER_RE = /^(\d+)_(.+)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// One record separator ahead of each commit's date, so a single `git log`
// answers for every page and the parser can tell a date line from a path.
const SEP = "\u0001";

/** "data/docs/01_start/05_quickstart/index.md" -> "start/quickstart". */
export function slugFromDocsPath(repoPath) {
  const normalized = String(repoPath).replaceAll("\\", "/");
  if (!normalized.startsWith(DOCS_PREFIX)) return null;
  if (path.posix.basename(normalized) !== "index.md") return null;
  const segments = normalized.slice(DOCS_PREFIX.length).split("/").slice(0, -1);
  // Same depth rule as src/lib/content.ts and scripts/gen-llms.mjs: a page
  // nested deeper than a section is not published, so it has no slug here.
  if (segments.length < 1 || segments.length > 2) return null;
  return segments.map((s) => s.match(FOLDER_RE)?.[2] ?? s).join("/");
}

function defaultRun(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

/**
 * The last commit date of every documentation page, from ONE `git log` over
 * the whole folder rather than one invocation per page. Newest first, so the
 * first time a path is named is its last commit.
 *
 * Returns `{ dates, commits, available, shallow, reason }`. `available` is
 * false when git could not answer, and the caller then falls back to
 * frontmatter rather than inventing a date.
 */
export function gitDocsDates({ cwd = ROOT, run = defaultRun } = {}) {
  const empty = (reason) => ({
    dates: new Map(),
    commits: 0,
    available: false,
    shallow: false,
    reason,
  });
  let shallow = false;
  try {
    shallow = run(["rev-parse", "--is-shallow-repository"], cwd).trim() === "true";
  } catch (e) {
    return empty(`git is unavailable: ${e instanceof Error ? e.message : String(e)}`);
  }
  let log;
  try {
    log = run(
      ["log", `--format=${SEP}%cs`, "--name-only", "--no-renames", "--", DOCS_PREFIX],
      cwd,
    );
  } catch (e) {
    return empty(`git log failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const dates = new Map();
  let current = "";
  let commits = 0;
  for (const line of String(log).split("\n")) {
    if (line.startsWith(SEP)) {
      const date = line.slice(SEP.length).trim();
      current = DATE_RE.test(date) ? date : "";
      if (current) commits++;
      continue;
    }
    const file = line.trim();
    if (!file || !current) continue;
    const slug = slugFromDocsPath(file);
    // A page named by an older commit was already recorded by a newer one; the
    // first sighting is the last commit that touched it.
    if (slug && !dates.has(slug)) dates.set(slug, current);
  }
  return {
    dates,
    commits,
    available: dates.size > 0,
    shallow,
    reason: dates.size > 0 ? "" : "git log named no documentation page",
  };
}

/** True when git's answer is an artefact of the clone rather than history: a
    shallow clone with a single fetched commit appears to have added the whole
    tree at once, which is exactly what a `--depth=1` CI checkout looks like. */
export function gitDatesAreTrustworthy(git) {
  if (!git || !git.available) return false;
  return !(git.shallow && git.commits <= 1);
}

/**
 * The published date for one page. Frontmatter first, git second, nothing
 * third: a page with neither shows no stamp rather than a made up one.
 */
export function resolveUpdated(page, git) {
  const declared = typeof page.updated === "string" ? page.updated.trim() : "";
  if (DATE_RE.test(declared)) return { date: declared, source: "frontmatter" };
  if (!gitDatesAreTrustworthy(git)) return null;
  const committed = git.dates.get(page.slug);
  return committed ? { date: committed, source: "git" } : null;
}

/** Pages whose declared `updated:` is older than the last commit that touched
    them. Only meaningful where git can actually speak, so an untrustworthy
    clone reports nothing rather than a false accusation. */
export function staleUpdated(pages, git) {
  if (!gitDatesAreTrustworthy(git) || git.shallow) return [];
  const out = [];
  for (const page of pages) {
    const declared = typeof page.updated === "string" ? page.updated.trim() : "";
    if (!DATE_RE.test(declared)) continue;
    const committed = git.dates.get(page.slug);
    if (committed && committed > declared) {
      out.push({ slug: page.slug, declared, committed });
    }
  }
  return out;
}

/**
 * `{ "<slug>": { date, source } }` for every page that has a date, which is
 * what the virtual module `virtual:docs-updated` exports.
 */
export function buildDocsUpdated(pages, git) {
  const out = {};
  for (const page of pages) {
    const resolved = resolveUpdated(page, git);
    if (resolved) out[page.slug] = resolved;
  }
  return out;
}

/** Everything the vite plugin needs, in one call and one `git log`. */
export function docsUpdated(pages, options = {}) {
  const git = gitDocsDates(options);
  return { map: buildDocsUpdated(pages, git), stale: staleUpdated(pages, git), git };
}

// Standalone: `node scripts/gen-docs-dates.mjs` prints what git alone knows,
// which is the cheapest way to see whether a clone has enough history.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const git = gitDocsDates();
  console.log(
    `git: available=${git.available} shallow=${git.shallow} commits=${git.commits} ` +
      `pages=${git.dates.size}${git.reason ? ` (${git.reason})` : ""}`,
  );
  for (const [slug, date] of [...git.dates].sort()) console.log(`  ${date}  ${slug}`);
}
