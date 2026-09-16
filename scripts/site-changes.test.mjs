import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { siteChangeWatcher, changeReport } from './site-changes.mjs';

const dirs = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => fs.rm(d, { recursive: true, force: true }))); });
const commit = (sha, message) => ({ sha, commit: { message } });
async function fixture(pages) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpt-site-changes-')); dirs.push(dir);
  let call = 0;
  const fetcher = vi.fn(async () => Response.json(pages[Math.min(call++, pages.length - 1)]));
  const send = vi.fn(async () => {});
  const args = { repo: 'org/site', stateDir: dir, send, channelId: 'web', siteUrl: 'https://site', fetcher };
  return { args, send, fetcher, watcher: siteChangeWatcher(args) };
}

describe('site change watcher', () => {
  it('records the head silently first, then reports only new commits oldest first', async () => {
    const f = await fixture([
      [commit('b', 'Second'), commit('a', 'First')],
      [commit('d', 'Fourth\n\nbody'), commit('c', 'Third'), commit('b', 'Second'), commit('a', 'First')],
    ]);
    await f.watcher.start();
    expect(f.send).not.toHaveBeenCalled();
    await f.watcher.tick();
    expect(f.send).toHaveBeenCalledOnce();
    const { content } = f.send.mock.calls[0][0];
    expect(content).toContain('2 changes on main');
    expect(content).toContain('• Third\n• Fourth');
    expect(content).toContain('https://github.com/org/site/compare/b...d');
    await f.watcher.tick();
    expect(f.send).toHaveBeenCalledOnce();
    // The last reported commit survives a restart.
    const again = siteChangeWatcher(f.args); await again.start();
    expect(f.send).toHaveBeenCalledOnce();
  });
  it('says when more commits landed than one page shows', () => {
    const text = changeReport([commit('z', 'Latest')], { repo: 'org/site', from: 'old', truncated: true });
    expect(text).toContain('1+ changes');
  });
  it('tolerates API failures without losing its place', async () => {
    const f = await fixture([[commit('a', 'First')]]);
    await f.watcher.start();
    f.fetcher.mockResolvedValueOnce(new Response('', { status: 403 }));
    expect(await f.watcher.tick()).toBeNull();
    expect(f.send).not.toHaveBeenCalled();
  });
});
