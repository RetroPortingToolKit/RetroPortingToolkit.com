import fs from 'node:fs/promises';
import path from 'node:path';

/** Watches the site repository's main branch and tells the website channel
 * about pages that were created or changed in a way a reader would notice.
 * Code, configuration, and small edits pass silently. A burst of saves is
 * reported once, after it has gone quiet. Uses GitHub's public compare API
 * without credentials; state is the last commit reported. The first run
 * records the current head silently. */
export function siteChangeWatcher({ repo, branch = 'main', stateDir, send, channelId, siteUrl = '', fetcher = fetch, quietMs = 3 * 60_000, now = () => Date.now() }) {
  const stateFile = path.join(stateDir, 'site-changes.json');
  const base = `https://api.github.com/repos/${repo}`;
  const headers = { accept: 'application/vnd.github+json' };
  let state = { lastSha: '' };
  let ticking = false;
  const save = async () => {
    await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
    const temp = `${stateFile}.tmp`;
    await fs.writeFile(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
    await fs.rename(temp, stateFile);
  };
  const get = async (url) => {
    const response = await fetcher(url, { signal: AbortSignal.timeout(20_000), headers });
    return response.ok ? response.json() : null;
  };
  async function tick() {
    if (ticking || !channelId) return null;
    ticking = true;
    try {
      const head = await get(`${base}/commits/${encodeURIComponent(branch)}`);
      if (!head?.sha) return null;
      if (!state.lastSha) { state.lastSha = head.sha; await save(); return null; }
      if (head.sha === state.lastSha) return null;
      // Let a run of editor saves finish before describing it as one change.
      const at = Date.parse(head.commit?.committer?.date ?? head.commit?.author?.date ?? '');
      if (Number.isFinite(at) && now() - at < quietMs) return null;
      const compare = await get(`${base}/compare/${state.lastSha}...${head.sha}`);
      if (!Array.isArray(compare?.files)) return null;
      const pages = pageChanges(compare.files);
      const titled = await Promise.all(pages.map(async (page) => ({ ...page, title: await pageTitle(page, head.sha) })));
      const content = changeReport(titled, { siteUrl });
      if (content) await send({ channelId, content, suppressMentions: true });
      state.lastSha = head.sha;
      await save();
      return content;
    } finally { ticking = false; }
  }
  async function pageTitle(page, sha) {
    try {
      const response = await fetcher(`https://raw.githubusercontent.com/${repo}/${sha}/${page.path}`, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) return null;
      return (await response.text()).match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1] ?? null;
    } catch { return null; }
  }
  return {
    async start() {
      try { state = JSON.parse(await fs.readFile(stateFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await tick();
    },
    tick,
  };
}

const PAGE = /^data\/(games|hardware|blog|docs)\/(.+?)\/index\.md$/;
const MEDIA = /^data\/(games|hardware|blog|docs)\/(.+?)\/[^/]+\.(png|jpe?g|webp|gif|mp4|webm)$/i;

/** One entry per page folder touched, with what a reader would notice. */
export function pageChanges(files) {
  const pages = new Map();
  const entry = (kind, folder) => {
    const key = `${kind}/${folder}`;
    if (!pages.has(key)) pages.set(key, { kind, folder, path: `data/${kind}/${folder}/index.md`, created: false, removed: false, lines: 0, cover: false, draft: null, media: 0 });
    return pages.get(key);
  };
  for (const file of files) {
    const page = file.filename.match(PAGE);
    if (page) {
      const e = entry(page[1], page[2]);
      if (file.status === 'added') e.created = true;
      if (file.status === 'removed') e.removed = true;
      e.lines += (file.additions ?? 0) + (file.deletions ?? 0);
      const patch = file.patch ?? '';
      if (/^[+-]cover:/m.test(patch)) e.cover = true;
      const draft = patch.match(/^\+draft:\s*(true|false)/m);
      if (draft) e.draft = draft[1] === 'true';
      continue;
    }
    const media = file.filename.match(MEDIA);
    if (media && file.status === 'added') entry(media[1], media[2]).media += 1;
  }
  return [...pages.values()];
}

const KIND = { games: 'game page', hardware: 'platform page', blog: 'post', docs: 'doc' };
const MINOR_LINES = 8;

export function pageUrl(page) {
  return `/${page.kind}/${page.folder.split('/').map((s) => s.replace(/^\d+_/, '')).join('/')}`;
}

/** Null when nothing worth a reader's attention changed. */
export function changeReport(pages, { siteUrl = '' } = {}) {
  const lines = [];
  for (const page of pages) {
    const name = page.title || page.folder.split('/').at(-1).replace(/^\d+_/, '');
    const link = `${siteUrl}${pageUrl(page)}`;
    if (page.removed) { lines.push(`• ${name}: ${KIND[page.kind]} removed`); continue; }
    if (page.created) { lines.push(`• New ${KIND[page.kind]}: ${name} ${link}`); continue; }
    const what = [];
    if (page.draft === false) what.push('published');
    if (page.draft === true) what.push('unlisted');
    if (page.cover) what.push('new cover');
    if (page.media) what.push(`${page.media} image${page.media === 1 ? '' : 's'} added`);
    if (page.lines >= MINOR_LINES) what.push('text updated');
    if (!what.length) continue;
    lines.push(`• ${name}: ${what.join(', ')} ${link}`);
  }
  if (!lines.length) return null;
  return `🚀 Site updated\n${lines.join('\n')}`;
}
