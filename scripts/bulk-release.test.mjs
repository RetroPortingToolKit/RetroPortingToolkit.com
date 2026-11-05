import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { repoUpdateWatcher, applyRepoUpdates, releasesAnnouncement } from './repo-updates.mjs';

// The scenario CobaltCryptid raised on 2026-09-21: "it's going to have a
// really bad time when one day I decide to bulk update all of my psxrecomp
// titles in one shot." They own nine pages; mstan owns forty-two. This runs
// the watcher exactly as the bridge configures it and counts what the
// community would actually see.
const dirs = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map(removeTemp)); });

/** A test that timed out may still have an async write in flight, so removing
 * its directory races and throws ENOTEMPTY — which then fails the NEXT test's
 * hook and turns one slow test into several red ones. Retry, then give up
 * quietly: a leftover temp directory is the operating system's problem. */
async function removeTemp(dir) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await fs.rm(dir, { recursive: true, force: true }); } catch { /* retried below */ }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}


const PASS_TICKS = 4; // scripts/discord-agent.mjs passes this to the watcher

async function catalogue({ titles, owner = 'TechnicallyComputers', bystanders = 40, otherOwner = 'someoneelse' }) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpt-bulk-')); dirs.push(dir);
  const pages = [];
  const write = async (n, title, repoOwner, release) => {
    const folder = `${String(n).padStart(2, '0')}_${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await fs.mkdir(path.join(dir, 'data/games', folder), { recursive: true });
    const fm = release ? `release: "${release}"\ndownload: "https://github.com/${repoOwner}/${title}/releases/tag/${release}"\n` : '';
    await fs.writeFile(path.join(dir, 'data/games', folder, 'index.md'),
      `---\ntitle: "${title}"\nrepo: "https://github.com/${repoOwner}/${title}"\n${fm}---\n\nBody.\n`);
    pages.push({ folder, title, repoOwner });
  };
  let n = 1;
  for (const t of titles) await write(n++, t, owner, 'v1.0.0');       // already shipped once
  for (let i = 0; i < bystanders; i++) await write(n++, `Other${i}`, otherOwner, 'v9.9.9'); // unchanged
  return { dir, pages };
}

/** Every owned title jumps to v2.0.0 at once; everyone else stands still. */
function feeds(owner) {
  return vi.fn(async (url) => {
    const m = url.match(/github\.com\/([^/]+)\/([^/]+)\/releases\.atom/);
    if (!m) return new Response('', { status: 404 });
    const [, repoOwner, repo] = m;
    const tag = repoOwner === owner ? 'v2.0.0' : 'v9.9.9';
    return new Response(`<feed><entry><id>tag:github.com,2008:Repository/1/${tag}</id><updated>2026-09-22T00:00:00Z</updated><link rel="alternate" type="text/html" href="https://github.com/${repoOwner}/${repo}/releases/tag/${tag}"/><title>${repo} ${tag}</title></entry></feed>`);
  });
}

describe('a bulk release across one owner', () => {
  it('reaches the site in a handful of commits, and says so without flooding the channel', async () => {
    const TITLES = ['TwistedMetal4', 'StreetFighterAlpha3', 'Klonoa', 'MarvelVsCapcom', 'MetalSlugX', 'TerasKasi', 'RampageThroughTime', 'BombermanWorld', 'BombermanFantasyRace'];
    const { dir } = await catalogue({ titles: TITLES });
    // Steady state: the watcher already knows the version every page carries,
    // so the jump to v2.0.0 is news rather than a first sighting.
    await fs.mkdir(path.join(dir, 'state'), { recursive: true });
    const seen = {};
    // The watcher keys its memory by the lowercased URL.
    for (const t of TITLES) seen[`https://github.com/technicallycomputers/${t}`.toLowerCase()] = { tag: 'v1.0.0', at: '2026-01-01' };
    for (let i = 0; i < 40; i++) seen[`https://github.com/someoneelse/other${i}`] = { tag: 'v9.9.9', at: '2026-01-01' };
    await fs.writeFile(path.join(dir, 'state/repo-updates.json'), JSON.stringify({ cursor: 0, seen }));

    const batches = [];
    const watcher = repoUpdateWatcher({ root: dir, stateDir: path.join(dir, 'state'), passTicks: PASS_TICKS, fetcher: feeds('TechnicallyComputers'), enqueueBatch: async (u) => { batches.push(u); } });

    // One hour of the bridge: a tick, then the job it queued actually runs.
    let commits = 0, pushes = 0, checkRuns = 0;
    const runBatch = async (batch) => {
      const exec = vi.fn(async (_cmd, args) => {
        if (args[0] === 'run') checkRuns++;
        if (args.includes('commit')) commits++;
        if (args[0] === 'push') pushes++;
      });
      await applyRepoUpdates({ root: dir, updates: batch, exec, siteUrl: 'https://site' });
    };
    await watcher.start();
    if (batches.length) await runBatch(batches.at(-1));
    for (let i = 0; i < PASS_TICKS - 1; i++) {
      const before = batches.length;
      await watcher.tick();
      if (batches.length > before) await runBatch(batches.at(-1));
    }

    const found = batches.flat();
    expect(found).toHaveLength(TITLES.length);          // every title, exactly once
    expect(new Set(found.map(u => u.title))).toEqual(new Set(TITLES));
    expect(new Set(found.map(u => u.tag))).toEqual(new Set(['v2.0.0']));
    expect(batches.length).toBeLessThanOrEqual(PASS_TICKS);

    // One set of checks, one commit and one push per batch, whatever it carries.
    expect(commits).toBe(batches.length);
    expect(pushes).toBe(batches.length);
    expect(checkRuns).toBe(batches.length * 3);

    // Every page really did get the new release written into it.
    const applied = await Promise.all(TITLES.map(async (t) => {
      const folder = (await fs.readdir(path.join(dir, 'data/games'))).find(f => f.endsWith(t.toLowerCase().replace(/[^a-z0-9]+/g, '-')));
      return (await fs.readFile(path.join(dir, 'data/games', folder, 'index.md'), 'utf8')).includes('release: "v2.0.0"');
    }));
    expect(applied.every(Boolean)).toBe(true);

    // What the channel sees: one message per job, not one per title.
    const messages = batches
      .map((batch) => batch.filter(u => u.announce))
      .filter(list => list.length)
      .map(list => releasesAnnouncement(list, 'https://site'));
    console.log(`BULK: ${TITLES.length} titles -> ${batches.length} job(s), ${commits} commit(s), ${messages.length} channel message(s)`);
    expect(messages).toHaveLength(batches.length);
    expect(messages[0]).toContain(`${TITLES.length} new releases`);
    for (const title of TITLES) expect(messages.join('\n')).toContain(title);
    for (const m of messages) expect(m.length).toBeLessThan(2000); // Discord's limit
  });
});

describe('a bulk release across the largest catalogue', () => {
  it('stays one message per job and inside Discord\'s limit at 42 titles', async () => {
    const TITLES = Array.from({ length: 42 }, (_, i) => `PsxTitle${i}`);
    const { dir } = await catalogue({ titles: TITLES, owner: 'mstan', bystanders: 19 });
    await fs.mkdir(path.join(dir, 'state'), { recursive: true });
    const seen = {};
    for (const t of TITLES) seen[`https://github.com/mstan/${t}`.toLowerCase()] = { tag: 'v1.0.0', at: '2026-01-01' };
    await fs.writeFile(path.join(dir, 'state/repo-updates.json'), JSON.stringify({ cursor: 0, seen }));

    const batches = [];
    const watcher = repoUpdateWatcher({ root: dir, stateDir: path.join(dir, 'state'), passTicks: PASS_TICKS, fetcher: feeds('mstan'), enqueueBatch: async (u) => { batches.push(u); } });
    const runBatch = async (batch) => applyRepoUpdates({ root: dir, updates: batch, exec: vi.fn(async () => {}), siteUrl: 'https://site' });
    await watcher.start();
    if (batches.length) await runBatch(batches.at(-1));
    for (let i = 0; i < PASS_TICKS - 1; i++) {
      const before = batches.length;
      await watcher.tick();
      if (batches.length > before) await runBatch(batches.at(-1));
    }

    const found = batches.flat();
    expect(found).toHaveLength(TITLES.length);
    const messages = batches.map(b => b.filter(u => u.announce)).filter(l => l.length).map(l => releasesAnnouncement(l, 'https://site'));
    console.log(`BULK-42: ${TITLES.length} titles -> ${batches.length} job(s), ${messages.length} channel message(s), longest ${Math.max(...messages.map(m => m.length))} chars`);
    expect(messages.length).toBeLessThanOrEqual(PASS_TICKS);
    for (const m of messages) expect(m.length).toBeLessThan(2000);
    expect(messages.join('\n')).toContain('more <https://site/games>');
  });
});
