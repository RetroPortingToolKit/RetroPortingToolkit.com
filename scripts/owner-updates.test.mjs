import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseOwnerRequest, findGamePage, isPageOwner, ownerUpdatedPage, applyOwnerUpdate } from './owner-updates.mjs';

const dirs = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => fs.rm(d, { recursive: true, force: true }))); });
async function repo() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpt-owner-')); dirs.push(dir);
  await fs.mkdir(path.join(dir, 'data/games/72_lufia-1bdbebef'), { recursive: true });
  await fs.writeFile(path.join(dir, 'data/games/72_lufia-1bdbebef/index.md'), '---\ntitle: "Lufia II"\nstatus: "Community submission"\nrepo: "https://github.com/mstan/Lufia"\ncreator: {"github":"Cellenseres","discord":"Cellen"}\n---\n\nBody.\n');
  await fs.writeFile(path.join(dir, 'data/team.json'), JSON.stringify({ members: [{ slug: 'm', name: 'Matthew', handles: [{ label: 'GitHub', value: 'mstan' }, { label: 'Discord', value: 'gamemaster' }] }] }));
  return dir;
}
describe('owner updates from Discord', () => {
  it('parses the page and fields, and ignores anything else', () => {
    expect(parseOwnerRequest('update https://retroportingtoolkit.com/games/lufia-1bdbebef status: Playable; news: Saves now work.')).toEqual({ slug: 'lufia-1bdbebef', status: 'Playable', note: 'Saves now work.' });
    expect(parseOwnerRequest("update /games/lufia-1bdbebef\nwhat's new: Widescreen\ndescription: A port.")).toEqual({ slug: 'lufia-1bdbebef', note: 'Widescreen', description: 'A port.' });
    expect(parseOwnerRequest('update /games/lufia-1bdbebef')).toBeNull();
    expect(parseOwnerRequest('submit https://github.com/a/b')).toBeNull();
  });
  it('recognises the Discord creator and the team member owning the repository', async () => {
    const dir = await repo();
    const raw = await fs.readFile(path.join(dir, 'data/games/72_lufia-1bdbebef/index.md'), 'utf8');
    expect(await findGamePage(dir, 'lufia-1bdbebef')).toBe('data/games/72_lufia-1bdbebef/index.md');
    expect(await findGamePage(dir, 'nope')).toBeNull();
    expect(await isPageOwner(dir, raw, 'cellen')).toBe(true);
    expect(await isPageOwner(dir, raw, 'GameMaster')).toBe(true);
    expect(await isPageOwner(dir, raw, 'stranger')).toBe(false);
  });
  it('rewrites frontmatter only and commits after checks', async () => {
    const dir = await repo();
    const exec = vi.fn(async () => {});
    const update = { path: 'data/games/72_lufia-1bdbebef/index.md', slug: 'lufia-1bdbebef', title: 'Lufia II', status: 'Playable', note: 'Saves now work.', date: '2026-09-17' };
    const summary = await applyOwnerUpdate({ root: dir, update, exec, siteUrl: 'https://site' });
    const raw = await fs.readFile(path.join(dir, update.path), 'utf8');
    expect(raw).toBe('---\ntitle: "Lufia II"\nstatus: "Playable"\nrepo: "https://github.com/mstan/Lufia"\ncreator: {"github":"Cellenseres","discord":"Cellen"}\nupdates:\n  - date: "2026-09-17"\n    text: "Saves now work."\nupdated: "2026-09-17"\n---\n\nBody.\n');
    expect(summary).toBe('Lufia II updated (status: Playable, note: “Saves now work.”). Live within a couple of minutes: https://site/games/lufia-1bdbebef');
    expect(exec.mock.calls.map(c => c[1][0])).toEqual(['pull', 'run', 'run', 'run', 'add', '-c', 'push']);
    expect(ownerUpdatedPage(raw, { description: 'New desc', date: '2026-09-18' })).toContain('desc: "New desc"');
  });
});
