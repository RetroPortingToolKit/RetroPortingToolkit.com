import fs from 'node:fs/promises';
import path from 'node:path';

/** Keeps game pages current with their repositories. Each tick checks a
 * slice of the pages for a new release on GitHub or GitLab; a change becomes
 * a queued page update (release, download link, updated date) and, once a
 * release has been seen before, an announcement. Public APIs, no credentials;
 * the slice size keeps the hourly poll well inside GitHub's anonymous limit. */
export function repoUpdateWatcher({ root, stateDir, enqueue, fetcher = fetch, batch = 12 }) {
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
      const slice = [...pages.slice(start), ...pages.slice(0, start)].slice(0, batch);
      state.cursor = (start + slice.length) % pages.length;
      for (const page of slice) {
        const release = await latestRelease(page.repo, fetcher).catch(() => undefined);
        if (release === undefined) continue; // host unavailable: try again next round
        const key = page.repo.toLowerCase();
        const before = state.seen[key];
        if (!release) { state.seen[key] = { tag: '' }; continue; }
        state.seen[key] = { tag: release.tag, at: release.date };
        if (before?.tag === release.tag) continue;
        if (page.release === release.tag && page.download === release.url) continue;
        const update = { path: page.path, url: page.url, title: page.title, tag: release.tag, name: release.name, releaseUrl: release.url, date: release.date, announce: Boolean(before && before.tag !== release.tag) };
        queued.push(update);
        await enqueue(update);
      }
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

/** The newest release: { tag, name, url, date }, null when there is none, undefined when the host did not answer. */
export async function latestRelease(repo, fetcher = fetch) {
  const u = new URL(repo);
  const project = u.pathname.slice(1).replace(/\.git$/, '');
  const headers = { accept: 'application/json' };
  if (u.hostname === 'github.com') {
    const r = await fetcher(`https://api.github.com/repos/${project}/releases/latest`, { headers, signal: AbortSignal.timeout(15_000) });
    if (r.status === 404) return null;
    if (!r.ok) return undefined;
    const d = await r.json();
    return d?.tag_name ? { tag: String(d.tag_name), name: String(d.name || d.tag_name), url: String(d.html_url), date: String(d.published_at || '').slice(0, 10) } : null;
  }
  const r = await fetcher(`https://gitlab.com/api/v4/projects/${encodeURIComponent(project)}/releases?per_page=1`, { headers, signal: AbortSignal.timeout(15_000) });
  if (r.status === 404) return null;
  if (!r.ok) return undefined;
  const list = await r.json();
  const d = Array.isArray(list) ? list[0] : null;
  return d?.tag_name ? { tag: String(d.tag_name), name: String(d.name || d.tag_name), url: String(d._links?.self || `${repo}/-/releases/${encodeURIComponent(d.tag_name)}`), date: String(d.released_at || '').slice(0, 10) } : null;
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
  if (update.date) set('updated', update.date);
  return raw.replace(match[0], `---\n${fm}\n---`);
}

export async function applyRepoUpdate({ root, update, exec, siteUrl = '' }) {
  if (!/^data\/games\/[^/]+\/index\.md$/.test(update.path)) throw new Error('Invalid page path.');
  await exec('git', ['pull', '--ff-only']);
  const target = path.join(root, update.path);
  const raw = await fs.readFile(target, 'utf8');
  const next = releasePage(raw, update);
  if (next === raw) return `${update.title} already lists ${update.tag}.`;
  await fs.writeFile(target, next);
  for (const check of ['typecheck', 'build', 'test']) await exec('npm', ['run', check]);
  await exec('git', ['add', '--', update.path]);
  await exec('git', ['-c', 'user.name=Shokunin', '-c', 'user.email=30949000+tetrisgm@users.noreply.github.com', 'commit', '-m', `Record ${update.tag} for ${update.title}`]);
  await exec('git', ['push', 'origin', 'main']);
  return `${update.title}: release ${update.tag} recorded. ${siteUrl}${update.url}`;
}

/** The website-channel line for a release people have not seen yet. */
export function releaseAnnouncement(update, siteUrl = '') {
  const label = update.name && update.name !== update.tag ? `${update.name} (${update.tag})` : update.tag;
  return `🎉 ${update.title}: new release ${label}\n${update.releaseUrl}\n${siteUrl}${update.url}`;
}
