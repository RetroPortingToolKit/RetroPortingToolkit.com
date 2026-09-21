import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { repoUpdateWatcher, releasePage, applyRepoUpdate, applyRepoUpdates, releaseAnnouncement, gamePages } from './repo-updates.mjs';

const dirs = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => fs.rm(d, { recursive: true, force: true }))); });
const page = (title, repo, extra = '') => `---\ntitle: "${title}"\nrepo: "${repo}"\n${extra}---\n\nBody.\n`;
async function fixture(releases) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpt-repo-updates-')); dirs.push(dir);
  for (const [folder, content] of Object.entries({ '01_alpha': page('Alpha', 'https://github.com/a/alpha'), '02_beta': page('Beta', 'https://gitlab.com/b/beta'), '03_draft': page('Draft', 'https://github.com/c/draft', 'draft: true\n'), '04_norepo': '---\ntitle: "None"\n---\n' })) {
    await fs.mkdir(path.join(dir, 'data/games', folder), { recursive: true });
    await fs.writeFile(path.join(dir, 'data/games', folder, 'index.md'), content);
  }
  const fetcher = vi.fn(async (url) => {
    const r = releases[url.includes('github') ? 'alpha' : 'beta'];
    if (r === null) return url.includes('github') ? new Response('<feed></feed>') : new Response('', { status: 404 });
    if (r === undefined) return new Response('', { status: 503 });
    return url.includes('github') ? new Response(`<feed><entry><id>tag:github.com,2008:Repository/1/${r}</id><updated>2026-09-16T00:00:00Z</updated><link rel="alternate" type="text/html" href="https://github.com/a/alpha/releases/tag/${r}"/><title>Alpha ${r}</title></entry></feed>`)
      : Response.json([{ tag_name: r, name: r, released_at: '2026-09-15T00:00:00Z', _links: { self: `https://gitlab.com/b/beta/-/releases/${r}` } }]);
  });
  const enqueue = vi.fn(async () => {});
  return { dir, fetcher, enqueue, releases, watcher: repoUpdateWatcher({ root: dir, stateDir: path.join(dir, 'state'), enqueue, fetcher, batch: 10 }) };
}

describe('repository update watcher', () => {
  it('lists live game pages with repositories only', async () => {
    const f = await fixture({ alpha: 'v1', beta: '2.0' });
    expect((await gamePages(f.dir)).map(p => p.url)).toEqual(['/games/alpha', '/games/beta']);
  });
  it('spreads a full pass over the configured number of ticks', async () => {
    const f = await fixture({ alpha: null, beta: null });
    const w = repoUpdateWatcher({ root: f.dir, stateDir: path.join(f.dir, 'state'), enqueue: f.enqueue, fetcher: f.fetcher, passTicks: 2 });
    await w.start();
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    await w.tick();
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    expect(new Set(f.fetcher.mock.calls.map(c => c[0].includes('github') ? 'alpha' : 'beta')).size).toBe(2);
  });
  it('retries until the page actually has the release, then remembers it', async () => {
    const f = await fixture({ alpha: 'v1', beta: null });
    const applyToPage = (tag) => fs.writeFile(
      path.join(f.dir, 'data/games/01_alpha/index.md'),
      page('Alpha', 'https://github.com/a/alpha', `release: "${tag}"\ndownload: "https://github.com/a/alpha/releases/tag/${tag}"\n`));

    await f.watcher.start();
    expect(f.enqueue).toHaveBeenCalledOnce();
    expect(f.enqueue.mock.calls[0][0]).toMatchObject({ path: 'data/games/01_alpha/index.md', tag: 'v1', announce: false, releaseUrl: 'https://github.com/a/alpha/releases/tag/v1' });

    // The job failed, so the page still lacks the release. The watcher used to
    // record it as seen the moment it noticed it and never look again, which
    // left Starfox Enhanced without its download link for good.
    await f.watcher.tick();
    expect(f.enqueue).toHaveBeenCalledTimes(2);
    let state = JSON.parse(await fs.readFile(path.join(f.dir, 'state/repo-updates.json'), 'utf8'));
    expect(state.seen['https://github.com/a/alpha']).toBeUndefined();

    await applyToPage('v1');
    await f.watcher.tick();
    expect(f.enqueue).toHaveBeenCalledTimes(2); // nothing left to do
    state = JSON.parse(await fs.readFile(path.join(f.dir, 'state/repo-updates.json'), 'utf8'));
    expect(state.seen['https://github.com/a/alpha'].tag).toBe('v1');

    f.releases.alpha = 'v2';
    await f.watcher.tick();
    expect(f.enqueue).toHaveBeenLastCalledWith(expect.objectContaining({ tag: 'v2', announce: true, date: '2026-09-16' }));

    f.releases.alpha = undefined; // host down: nothing forgotten
    await f.watcher.tick();
    expect(f.enqueue).toHaveBeenCalledTimes(3);
    state = JSON.parse(await fs.readFile(path.join(f.dir, 'state/repo-updates.json'), 'utf8'));
    expect(state.seen['https://github.com/a/alpha'].tag).toBe('v1');
  });

  it('an empty feed never forgets a tag the page already carries', async () => {
    const f = await fixture({ alpha: 'v1', beta: null });
    await fs.writeFile(path.join(f.dir, 'data/games/01_alpha/index.md'),
      page('Alpha', 'https://github.com/a/alpha', 'release: "v1"\ndownload: "https://github.com/a/alpha/releases/tag/v1"\n'));
    await f.watcher.start();
    f.releases.alpha = null; // a blank feed, which is also what a blip looks like
    await f.watcher.tick();
    const state = JSON.parse(await fs.readFile(path.join(f.dir, 'state/repo-updates.json'), 'utf8'));
    expect(state.seen['https://github.com/a/alpha'].tag).toBe('v1');
    expect(f.enqueue).not.toHaveBeenCalled();
  });

  it('restores the pages it wrote when a check fails, and keeps them once committed', async () => {
    const f = await fixture({ alpha: 'v1', beta: null });
    const update = { path: 'data/games/01_alpha/index.md', url: '/games/alpha', title: 'Alpha', tag: 'v1', name: 'Alpha v1', releaseUrl: 'https://github.com/a/alpha/releases/tag/v1', date: '2026-09-16', announce: false };

    const failing = vi.fn(async (_cmd, args) => { if (args[0] === 'run' && args[1] === 'test') throw new Error('Command failed: npm run test'); });
    await expect(applyRepoUpdates({ root: f.dir, updates: [update], exec: failing })).rejects.toThrow('npm run test');
    expect(failing.mock.calls.map(c => c[1].join(' '))).toContain('checkout HEAD -- data/games/01_alpha/index.md');
    expect(failing.mock.calls.some(c => c[1].includes('commit'))).toBe(false);

    // A push that fails after the commit must not undo the commit. A fresh
    // checkout, because the mock exec above could not really restore the page.
    const g = await fixture({ alpha: 'v1', beta: null });
    const pushFails = vi.fn(async (_cmd, args) => { if (args[0] === 'push') throw new Error('rejected'); });
    await expect(applyRepoUpdates({ root: g.dir, updates: [update], exec: pushFails })).rejects.toThrow('rejected');
    expect(pushFails.mock.calls.some(c => c[1][0] === 'checkout')).toBe(false);
    expect(pushFails.mock.calls.some(c => c[1].includes('commit'))).toBe(true);
  });

  it('batches a tick into one job and one commit', async () => {
    const f = await fixture({ alpha: 'v1', beta: '2.0' });
    const enqueueBatch = vi.fn(async () => {});
    const w = repoUpdateWatcher({ root: f.dir, stateDir: path.join(f.dir, 'state'), enqueueBatch, fetcher: f.fetcher, batch: 10 });
    await w.start();
    expect(enqueueBatch).toHaveBeenCalledOnce();
    const updates = enqueueBatch.mock.calls[0][0];
    expect(updates.map(u => u.tag)).toEqual(['v1', '2.0']);
    const exec = vi.fn(async () => {});
    await applyRepoUpdates({ root: f.dir, updates, exec });
    expect(exec.mock.calls.filter(c => c[1][0] === 'run')).toHaveLength(3);
    expect(exec.mock.calls.find(c => c[1].includes('commit'))[1].at(-1)).toContain('Record 2 releases');
    expect(exec.mock.calls.filter(c => c[1][0] === 'push')).toHaveLength(1);
  });
  it('writes release, download, and updated into frontmatter and commits after checks', async () => {
    const f = await fixture({ alpha: 'v1', beta: null });
    const update = { path: 'data/games/01_alpha/index.md', url: '/games/alpha', title: 'Alpha', tag: 'v1', name: 'Alpha v1', releaseUrl: 'https://github.com/a/alpha/releases/tag/v1', date: '2026-09-16', announce: true };
    const exec = vi.fn(async () => {});
    expect(await applyRepoUpdate({ root: f.dir, update, exec, siteUrl: 'https://site' })).toBe('Alpha: release v1 recorded. https://site/games/alpha');
    const raw = await fs.readFile(path.join(f.dir, update.path), 'utf8');
    expect(raw).toContain('release: "v1"\ndownload: "https://github.com/a/alpha/releases/tag/v1"\nupdated: "2026-09-16"\n---\n\nBody.');
    expect(exec.mock.calls.map(c => c[1].join(' '))).toEqual(['pull --ff-only', 'run typecheck', 'run build', 'run test', 'add -- data/games/01_alpha/index.md', expect.stringContaining('commit -m Record v1 for Alpha'), 'push origin main']);
    expect(releasePage(raw, { ...update, tag: 'v2', releaseUrl: 'u2', date: '' })).toContain('release: "v2"\ndownload: "u2"\nupdated: "2026-09-16"');
    expect(await applyRepoUpdate({ root: f.dir, update, exec })).toContain('already lists v1');
    expect(releaseAnnouncement(update, 'https://site')).toBe('🎉 Alpha: new release Alpha v1 (v1)\nhttps://github.com/a/alpha/releases/tag/v1\nhttps://site/games/alpha');
  });
});
