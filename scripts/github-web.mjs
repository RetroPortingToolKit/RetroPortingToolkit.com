import { pickRelease } from './release-rank.mjs';

/** GitHub's website endpoints, which are not metered like api.github.com:
 * Atom feeds for commits and releases, and the plain-text compare diff. */
const decode = (s) => String(s ?? '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
const entries = (xml) => [...String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
const tag = (xml, name) => decode(xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1]);
const href = (xml) => xml.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/)?.[1] ?? xml.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? '';

/** Newest commits on a branch: [{ sha, title, date }], newest first. */
export async function branchCommits(repo, branch = 'main', fetcher = fetch) {
  const r = await fetcher(`https://github.com/${repo}/commits/${encodeURIComponent(branch)}.atom`, { signal: AbortSignal.timeout(20_000), headers: { accept: 'application/atom+xml' } });
  if (!r.ok) return null;
  return entries(await r.text()).map((e) => ({
    sha: e.match(/Grit::Commit\/([0-9a-f]{40})/)?.[1] ?? '',
    title: tag(e, 'title').replace(/\s+/g, ' '),
    date: tag(e, 'updated'),
  })).filter((c) => c.sha);
}

/** Files changed between two commits, in the shape the API's compare gives:
 * { filename, status, additions, deletions, patch }. Full ids only. */
export async function compareFiles(repo, from, to, fetcher = fetch) {
  const r = await fetcher(`https://github.com/${repo}/compare/${from}...${to}.diff`, { signal: AbortSignal.timeout(30_000), headers: { accept: 'text/plain' } });
  if (!r.ok) return null;
  return parseDiff(await r.text());
}

export function parseDiff(text) {
  const files = [];
  for (const chunk of String(text).split(/^diff --git /m).slice(1)) {
    const header = chunk.match(/^a\/(.+?) b\/(.+?)\n/);
    if (!header) continue;
    const body = chunk.slice(header[0].length);
    const status = /^new file mode/m.test(body) ? 'added' : /^deleted file mode/m.test(body) ? 'removed' : /^rename from /m.test(body) ? 'renamed' : 'modified';
    const lines = body.split('\n');
    const additions = lines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
    const deletions = lines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length;
    const at = body.indexOf('\n@@');
    files.push({ filename: header[2], status, additions, deletions, patch: at === -1 ? '' : body.slice(at + 1) });
  }
  return files;
}

/** Every release in the feed, in feed order: [{ tag, name, url, date }].
 * null when the feed is empty, undefined when GitHub did not answer. The feed
 * holds the ten most recent entries, in an order GitHub does not document. */
export async function releasesFromFeed(repo, fetcher = fetch) {
  const r = await fetcher(`https://github.com/${repo}/releases.atom`, { signal: AbortSignal.timeout(20_000), headers: { accept: 'application/atom+xml' } });
  if (r.status === 404) return null;
  if (!r.ok) return undefined;
  const found = entries(await r.text()).map((e) => {
    const url = href(e);
    const tagName = decodeURIComponent(url.match(/\/releases\/tag\/([^"/]+)$/)?.[1] ?? tag(e, 'id').split('/').pop() ?? '');
    if (!tagName) return null;
    return { tag: tagName, name: tag(e, 'title') || tagName, url: url || `https://github.com/${repo}/releases/tag/${encodeURIComponent(tagName)}`, date: tag(e, 'updated').slice(0, 10) };
  }).filter(Boolean);
  return found.length ? found : null;
}

/** The release a page should carry: { tag, name, url, date }, null when the
 * feed is empty or holds nothing that can be ranked, undefined when GitHub
 * did not answer. Pre-releases are included, as they are the builds people
 * actually try; staging tags, mods and platform variants are not the release,
 * and picking the feed's first entry made all three of them one. */
export async function latestReleaseFromFeed(repo, fetcher = fetch) {
  const list = await releasesFromFeed(repo, fetcher);
  if (!list) return list; // null (nothing published) or undefined (no answer)
  return pickRelease(list);
}
