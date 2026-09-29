import fs from 'node:fs/promises';
import path from 'node:path';
import { releasesFromFeed } from './github-web.mjs';
import { pickRelease, releaseDecision, isNewsRelease } from './release-rank.mjs';
import { rollbackOnFailure, pushPending } from './checkout.mjs';

/** Keeps game pages current with their repositories. Each tick checks a
 * slice of the pages for a new release on GitHub or GitLab; a change becomes
 * a queued page update (release, download link, updated date) and, once a
 * release has been seen before, an announcement. Public APIs, no credentials;
 * the rolling slice keeps the hourly poll far inside GitHub's anonymous limit. */
/** Each repository is checked about once a day: an hourly tick takes the
 * next slice, sized so a full pass takes twenty-four ticks. */
export function repoUpdateWatcher({ root, stateDir, enqueue, enqueueBatch, fetcher = fetch, batch, passTicks = 24 }) {
  const stateFile = path.join(stateDir, 'repo-updates.json');
  let state = { cursor: 0, seen: {} };
  let ticking = false;
  const save = async () => {
    await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
    const temp = `${stateFile}.tmp`;
    await fs.writeFile(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
    await fs.rename(temp, stateFile);
  };
  async function tick() {
    if (ticking) return [];
    ticking = true;
    const queued = [];
    try {
      const pages = await gamePages(root);
      if (!pages.length) return queued;
      const start = state.cursor % pages.length;
      const size = batch ?? Math.max(1, Math.ceil(pages.length / passTicks));
      const slice = [...pages.slice(start), ...pages.slice(0, start)].slice(0, size);
      state.cursor = (start + slice.length) % pages.length;
      for (const page of slice) {
        const release = await latestRelease(page.repo, fetcher).catch(() => undefined);
        if (release === undefined) continue; // host unavailable: try again next round
        const key = page.repo.toLowerCase();
        const before = state.seen[key];
        // An empty feed is usually a repository that has published nothing
        // yet, but it is also what a transient blank response looks like:
        // forgetting a tag we already recorded would announce it twice.
        if (!release) { state.seen[key] ??= { tag: '' }; continue; }
        // The page, not our memory, decides whether there is work left. The
        // watcher used to mark a release seen the moment it noticed one, so a
        // job that then failed lost that release for good: Starfox Enhanced
        // sat without its v0.0.6.7 download link and was never retried.
        const decision = releaseDecision({ recorded: page.release, recordedUrl: page.download, pick: release, feedTags: release.feedTags ?? [] });
        if (decision === 'seen') {
          state.seen[key] = { tag: release.tag, at: release.date };
          continue;
        }
        // Held for a person: a downgrade, or a tag nothing can rank. Recorded
        // so `npm run doctor` can name it, and so the same tag is not asked
        // about on every tick.
        if (decision === 'review') {
          state.seen[key] = { ...(before ?? { tag: '' }), asked: release.tag };
          continue;
        }
        const update = { path: page.path, url: page.url, title: page.title, tag: release.tag, name: release.name, releaseUrl: release.url, date: release.date, announce: isNewsRelease(before, release) };
        queued.push(update);
        if (enqueue) await enqueue(update);
      }
      if (enqueueBatch && queued.length) await enqueueBatch(queued);
      await save();
      return queued;
    } finally { ticking = false; }
  }
  return {
    async start() {
      try { state = JSON.parse(await fs.readFile(stateFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await tick();
    },
    tick,
  };
}

/** Every non-draft game page with a repository, from the checkout. */
export async function gamePages(root) {
  const dir = path.join(root, 'data/games');
  const out = [];
  for (const folder of (await fs.readdir(dir, { withFileTypes: true }).catch(() => [])).filter(d => d.isDirectory()).map(d => d.name).sort()) {
    const file = path.join(dir, folder, 'index.md');
    const raw = await fs.readFile(file, 'utf8').catch(() => null);
    if (!raw) continue;
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    const field = (name) => fm.match(new RegExp(`^${name}:\\s*["']?(.*?)["']?\\s*$`, 'm'))?.[1] ?? '';
    const repo = field('repo');
    if (!/^https:\/\/(github|gitlab)\.com\/[^/\s]+\/[^/\s]+/.test(repo) || /^draft:\s*true/m.test(fm)) continue;
    out.push({ path: `data/games/${folder}/index.md`, url: `/games/${folder.replace(/^\d+_/, '')}`, repo: repo.replace(/\/$/, ''), title: field('title') || folder, release: field('release'), download: field('download') });
  }
  return out;
}

/** The release a page should carry: { tag, name, url, date, feedTags }, null
 * when there is none, undefined when the host did not answer. `feedTags` is
 * every tag the host listed, which is how the caller tells a tag the watcher
 * wrote itself from one a person typed. */
export async function latestRelease(repo, fetcher = fetch) {
  const u = new URL(repo);
  const project = u.pathname.slice(1).replace(/\.git$/, '');
  const headers = { accept: 'application/json' };
  // GitHub's releases feed is a website page, not the metered API.
  if (u.hostname === 'github.com') {
    const list = await releasesFromFeed(project, fetcher);
    if (!list) return list;
    const pick = pickRelease(list);
    return pick ? { ...pick, feedTags: list.map((e) => e.tag) } : null;
  }
  // per_page=1 asked GitLab for the newest and left nothing to compare.
  const r = await fetcher(`https://gitlab.com/api/v4/projects/${encodeURIComponent(project)}/releases?per_page=20`, { headers, signal: AbortSignal.timeout(15_000) });
  if (r.status === 404) return null;
  if (!r.ok) return undefined;
  const list = await r.json();
  if (!Array.isArray(list) || !list.length) return null;
  const releases = list.filter((d) => d?.tag_name).map((d) => ({
    tag: String(d.tag_name),
    name: String(d.name || d.tag_name),
    url: String(d._links?.self || `${repo}/-/releases/${encodeURIComponent(d.tag_name)}`),
    date: String(d.released_at || '').slice(0, 10),
  }));
  const pick = pickRelease(releases);
  return pick ? { ...pick, feedTags: releases.map((e) => e.tag) } : null;
}

/** Rewrites the page's frontmatter for the release; everything else untouched. */
export function releasePage(raw, update) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('The page has no frontmatter.');
  let fm = match[1];
  const set = (key, value) => {
    const line = `${key}: ${JSON.stringify(value)}`;
    fm = new RegExp(`^${key}:.*$`, 'm').test(fm) ? fm.replace(new RegExp(`^${key}:.*$`, 'm'), line) : `${fm}\n${line}`;
  };
  set('release', update.tag);
  set('download', update.releaseUrl);
  // Correcting a page must not move its date backwards: /games is ordered by
  // `updated`, and repairing Mega Man X from a mod published today back to its
  // real September release would have sent the page down the listing.
  const was = fm.match(/^updated:\s*"?([\d-]+)"?\s*$/m)?.[1] ?? '';
  if (update.date && update.date >= was) set('updated', update.date);
  return raw.replace(match[0], `---\n${fm}\n---`);
}

/** Applies every update in one commit: one set of checks, one push, one
 * deployment, however many releases the tick found. */
export async function applyRepoUpdates({ root, updates, exec, siteUrl = '' }) {
  for (const update of updates) if (!/^data\/games\/[^/]+\/index\.md$/.test(update.path)) throw new Error('Invalid page path.');
  await exec('git', ['pull', '--ff-only']);
  await pushPending(exec);
  const written = [];
  return rollbackOnFailure(exec, written, async () => {
    const changed = [];
    const refused = [];
    for (const update of updates) {
      const target = path.join(root, update.path);
      const raw = await fs.readFile(target, 'utf8');
      // The decision was made when the tick ran; the page is written now. A
      // queue that survived a restart can carry an update the page has since
      // moved past, and a downgrade must not reach a page through a replay.
      const recorded = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1]?.match(/^release:\s*"?([^"\n]*)"?\s*$/m)?.[1] ?? '';
      if (recorded && releaseDecision({ recorded, recordedUrl: '', pick: { tag: update.tag, url: update.releaseUrl }, feedTags: [recorded] }) === 'review') {
        refused.push(`${update.title} still lists ${recorded}, so ${update.tag} was not written`);
        continue;
      }
      const next = releasePage(raw, update);
      if (next === raw) continue;
      await fs.writeFile(target, next);
      written.push(update.path);
      changed.push(update);
    }
    if (!changed.length) {
      const already = updates.filter((u) => !refused.some((r) => r.startsWith(`${u.title} `)));
      return [already.map((u) => `${u.title} already lists ${u.tag}`).join('; '), ...refused].filter(Boolean).join('. ') + '.';
    }
    for (const check of ['typecheck', 'build', 'test']) await exec('npm', ['run', check]);
    await exec('git', ['add', '--', ...changed.map((u) => u.path)]);
    const message = changed.length === 1 ? `Record ${changed[0].tag} for ${changed[0].title}` : `Record ${changed.length} releases\n\n${changed.map((u) => `- ${u.title}: ${u.tag}`).join('\n')}`;
    await exec('git', ['-c', 'user.name=Shokunin', '-c', 'user.email=30949000+tetrisgm@users.noreply.github.com', 'commit', '-m', message]);
    written.length = 0; // committed: a failed push must not undo the work
    await exec('git', ['push', 'origin', 'main']);
    return [...changed.map((u) => `${u.title}: release ${u.tag} recorded. ${siteUrl}${u.url}`), ...refused].join('\n');
  });
}
export const applyRepoUpdate = ({ update, ...rest }) => applyRepoUpdates({ updates: [update], ...rest });

/** The website-channel line for a release people have not seen yet. */
export function releaseAnnouncement(update, siteUrl = '') {
  const label = update.name && update.name !== update.tag ? `${update.name} (${update.tag})` : update.tag;
  return `🎉 ${update.title}: new release ${label}\n${update.releaseUrl}\n${siteUrl}${update.url}`;
}

/** One message for however many releases a single job recorded.
 *
 * An owner who ships their whole catalogue at once is one commit and one
 * deployment, but it used to be one channel message per title: nine for
 * CobaltCryptid's PSX titles, forty-two for mstan's. The list is capped
 * because Discord's limit is 2000 characters and a wall that long is the
 * same problem in one message. */
export function releasesAnnouncement(updates, siteUrl = '', limit = 12) {
  if (updates.length === 1) return releaseAnnouncement(updates[0], siteUrl);
  const shown = updates.slice(0, limit);
  const lines = shown.map((u) => `• ${u.title} ${u.tag} <${siteUrl}${u.url}>`);
  const rest = updates.length - shown.length;
  if (rest > 0) lines.push(`• and ${rest} more <${siteUrl}/games>`);
  return `🎉 ${updates.length} new releases\n${lines.join('\n')}`;
}
