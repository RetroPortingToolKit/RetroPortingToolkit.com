import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { siteChangeWatcher, changeReport, pageChanges } from './site-changes.mjs';

const dirs = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => fs.rm(d, { recursive: true, force: true }))); });
const T0 = Date.parse('2026-09-16T10:00:00Z');
const head = (sha, minutesAgo) => ({ sha, date: new Date(T0 - minutesAgo * 60_000).toISOString() });
const atom = (h) => `<feed><entry><id>tag:github.com,2008:Grit::Commit/${h.sha.padEnd(40, '0')}</id><updated>${h.date}</updated><title>t</title></entry></feed>`;
const diffFor = (files) => files.map((f) => `diff --git a/${f.filename} b/${f.filename}\n${f.status === 'added' ? 'new file mode 100644\n' : f.status === 'removed' ? 'deleted file mode 100644\n' : ''}index 1..2\n--- a/${f.filename}\n+++ b/${f.filename}\n@@ -1 +1 @@\n${f.patch ?? ''}${'+x\n'.repeat(f.additions ?? 0)}${'-x\n'.repeat(f.deletions ?? 0)}`).join('');
async function fixture({ heads, files, titles = {} }) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpt-site-changes-')); dirs.push(dir);
  let call = 0;
  const fetcher = vi.fn(async (url) => {
    if (/\/commits\/main\.atom$/.test(url)) return new Response(atom(heads[Math.min(call++, heads.length - 1)]));
    if (/\/compare\/.*\.diff$/.test(url)) return new Response(diffFor(files));
    const raw = url.match(/raw\.githubusercontent\.com\/org\/site\/[^/]+\/(.+)$/);
    if (raw && titles[raw[1]]) return new Response(`---\ntitle: "${titles[raw[1]]}"\n---\n`);
    return new Response('', { status: 404 });
  });
  const send = vi.fn(async () => {});
  const args = { repo: 'org/site', stateDir: dir, send, channelId: 'web', siteUrl: 'https://site', fetcher, now: () => T0 };
  return { args, send, fetcher, watcher: siteChangeWatcher(args) };
}

describe('site change watcher', () => {
  it('records the head silently, waits for a burst to end, then reports pages by what changed', async () => {
    const f = await fixture({
      heads: [head('a', 60), head('b', 1), head('b', 10), head('b', 10)],
      files: [
        { filename: 'data/games/73_banjo-tooie/index.md', status: 'added', additions: 20 },
        { filename: 'data/games/72_lufia/index.md', status: 'modified', additions: 4, deletions: 3, patch: '-cover: ""\n+cover: "./cover.png"\n' },
        { filename: 'data/games/72_lufia/cover.png', status: 'added' },
        { filename: 'data/games/72_lufia/shot.png', status: 'added' },
        { filename: 'data/games/01_tomba/index.md', status: 'modified', patch: '-updated: "2026-01-01"\n+updated: "2026-02-02"\n' },
        { filename: 'src/pages/Admin.tsx', status: 'modified', additions: 50, deletions: 10 },
      ],
      titles: { 'data/games/73_banjo-tooie/index.md': 'Banjo-Tooie: Recompiled', 'data/games/72_lufia/index.md': 'Lufia II' },
    });
    await f.watcher.start();
    expect(f.send).not.toHaveBeenCalled();
    await f.watcher.tick(); // head b is one minute old: still a burst
    expect(f.send).not.toHaveBeenCalled();
    await f.watcher.tick();
    expect(f.send).toHaveBeenCalledOnce();
    expect(f.send.mock.calls[0][0].content).toBe('🚀 Site updated\n• New game page: Banjo-Tooie: Recompiled https://site/games/banjo-tooie\n• Lufia II: new cover, 2 images added, text updated https://site/games/lufia');
    await f.watcher.tick();
    expect(f.send).toHaveBeenCalledOnce();
    const again = siteChangeWatcher(f.args); await again.start();
    expect(f.send).toHaveBeenCalledOnce();
  });
  it("announces a page's new note in the owner's words", () => {
    const pages = pageChanges([{ filename: 'data/games/72_lufia/index.md', status: 'modified', additions: 3, deletions: 0, patch: '+updates:\n+  - date: "2026-09-16"\n+    text: "Saves now work."\n' }]);
    expect(changeReport(pages, { siteUrl: 'https://site' })).toBe('🚀 Site updated\n• lufia: “Saves now work.” https://site/games/lufia');
  });
  it('says nothing for code-only or trivial pushes but still moves on', async () => {
    const f = await fixture({ heads: [head('a', 60), head('b', 10)], files: [{ filename: 'api/cms.ts', status: 'modified', additions: 3, deletions: 1 }] });
    await f.watcher.start();
    expect(await f.watcher.tick()).toBeNull();
    expect(f.send).not.toHaveBeenCalled();
    expect(JSON.parse(await fs.readFile(path.join(f.args.stateDir, 'site-changes.json'), 'utf8')).lastSha).toBe('b'.padEnd(40, '0'));
  });
  it('describes publishing, unlisting, removal, and nested docs addresses', () => {
    const pages = pageChanges([
      { filename: 'data/docs/01_start/07_submit/index.md', status: 'modified', additions: 1, deletions: 1, patch: '-draft: true\n+draft: false\n' },
      { filename: 'data/blog/03_old/index.md', status: 'removed', additions: 0, deletions: 30 },
      { filename: 'data/hardware/02_nes/index.md', status: 'modified', additions: 1, deletions: 1, patch: '+draft: true\n' },
    ]);
    expect(changeReport(pages)).toBe('🚀 Site updated\n• submit: published /docs/start/submit\n• old: post removed\n• nes: unlisted /hardware/nes');
    expect(changeReport([])).toBeNull();
  });
});
