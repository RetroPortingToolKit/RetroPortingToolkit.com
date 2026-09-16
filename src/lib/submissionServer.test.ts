import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubmissionStore, SubmissionError, submitRepository } from './submissionServer';
import { submissionId } from '../../scripts/submissions.mjs';
const repo = 'https://github.com/example/recomp';
function fixture() {
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
    expect(options.headers.authorization).toBeUndefined();
    return Response.json({ html_url: repo, name: 'Recomp', description: 'A playable port.', private: false, owner: { login: 'example' } });
  }));
  const store = new SubmissionStore('https://api.github.com/repos/site/site', 'fake');
  const snapshot = { head: 'head', tree: 'tree', entries: [], records: [] };
  vi.spyOn(store, 'snapshot').mockResolvedValue(snapshot);
  vi.spyOn(store, 'create').mockResolvedValue(undefined);
  vi.spyOn(store, 'blob');
  return { store, snapshot };
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('submission publishing', () => {
  it('fills optional fields from public metadata and creates a normal game page', async () => {
    const { store } = fixture();
    const result = await submitRepository(store, { repo });
    expect(result.record).toMatchObject({ title: 'Recomp', description: 'A playable port.', owner: 'example', status: 'pending' });
    expect(result.record.path).toMatch(/^data\/games\/01_recomp-[a-f0-9]+\/index.md$/);
    expect(store.create).toHaveBeenCalledOnce();
  });
  it('records the Discord name and puts a chosen cover ahead of README artwork', async () => {
    const { store } = fixture();
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1cAAAAASUVORK5CYII=', 'base64');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('/readme') ? Response.json({ encoding: 'base64', path: 'README.md', content: Buffer.from('![Shot](docs/shot.png)').toString('base64') })
      : url.endsWith('.png') ? new Response(png) : Response.json({ html_url: repo, name: 'Recomp', description: 'A playable port.', private: false, owner: { login: 'example' } })));
    const result = await submitRepository(store, { repo, discord: ' maker ', cover: 'https://raw.githubusercontent.com/example/recomp/main/banner.png' });
    expect(result.record.discord).toBe('maker');
    expect(result.record.images?.map(i => i.alt)).toEqual(['Project banner', 'Shot']);
  });
  it('rechecks duplicates after a concurrent update instead of overwriting', async () => {
    const { store, snapshot } = fixture();
    vi.mocked(store.create).mockRejectedValueOnce(new SubmissionError('conflict', 409));
    vi.mocked(store.snapshot).mockResolvedValueOnce(snapshot).mockResolvedValueOnce({ ...snapshot, records: [{ id: submissionId(repo), status: 'pending' } as never] });
    const result = await submitRepository(store, { repo });
    expect(result.duplicate).toBe(true); expect(store.create).toHaveBeenCalledOnce();
  });
  it('does not republish a removed repository', async () => {
    const { store, snapshot } = fixture();
    vi.mocked(store.snapshot).mockResolvedValue({ ...snapshot, records: [{ id: submissionId(repo), status: 'removed' } as never] });
    await expect(submitRepository(store, { repo })).rejects.toThrow('removed by a moderator');
    expect(store.create).not.toHaveBeenCalled();
  });
  it('does not replace a pre-existing editorial page', async () => {
    const { store, snapshot } = fixture();
    vi.mocked(store.snapshot).mockResolvedValue({ ...snapshot, entries: [{ path: 'data/games/03_existing/index.md', sha: 'blob', type: 'blob' }] });
    vi.mocked(store.blob).mockResolvedValue(`---\nrepo: "${repo}"\n---\nEdited content`);
    await expect(submitRepository(store, { repo })).rejects.toThrow('/games/existing');
    expect(store.create).not.toHaveBeenCalled();
  });
  it('enforces the durable global intake limit', async () => {
    const { store, snapshot } = fixture();
    vi.mocked(store.snapshot).mockResolvedValue({ ...snapshot, records: Array.from({ length: 20 }, (_, i) => ({ id: String(i), owner: 'other', createdAt: new Date().toISOString() })) as never });
    await expect(submitRepository(store, { repo })).rejects.toMatchObject({ status: 429 });
    expect(store.create).not.toHaveBeenCalled();
  });
  it('rejects private metadata and malformed optional fields', async () => {
    const { store } = fixture();
    await expect(submitRepository(store, { repo, name: {} })).rejects.toMatchObject({ status: 400 });
    await expect(submitRepository(store, { repo, cover: 'https://evil.example/x.png' })).rejects.toThrow('cover image link');
    await expect(submitRepository(store, { repo, discord: 'x'.repeat(81) })).rejects.toThrow('Discord username');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ private: true })));
    await expect(submitRepository(store, { repo })).rejects.toThrow('Only public');
  });
  it('uses an atomic tree and a non-forced ref update', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return Response.json({ sha: 'new' }); }));
    const store = new SubmissionStore('https://api.github.com/repos/site/site', 'fake');
    await store.create({ head: 'original', tree: 'base', entries: [], records: [] }, { id: 'id', repo, title: 'Game', description: 'Port', owner: 'example', path: 'data/games/01_game/index.md', url: '/games/game', createdAt: new Date().toISOString(), status: 'pending' });
    expect(calls[0].body).toMatchObject({ base_tree: 'base', tree: [{ path: 'data/games/01_game/index.md' }, { path: 'data/submissions.json' }] });
    expect(calls[1].body.parents).toEqual(['original']);
    expect(calls[2].body).toEqual({ sha: 'new', force: false });
  });
  it('includes image blobs and their local references in the same publishing tree', async () => {
    const calls: {url: string; body: any}[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url, init) => { calls.push({url, body: JSON.parse(init.body)}); return Response.json({sha: 'image-sha'}); }));
    const store = new SubmissionStore('https://api.github.com/repos/site/site', 'fake');
    await store.create({head:'original',tree:'base',entries:[],records:[]}, {id:'id',repo,title:'Game',description:'Port',owner:'example',path:'data/games/01_game/index.md',url:'/games/game',createdAt:new Date().toISOString(),status:'pending',images:[{path:'./submission-1.png',alt:'Banner'}]}, [{name:'submission-1.png',content:'aW1hZ2U=',alt:'Banner'}]);
    expect(calls[0].body).toEqual({content:'aW1hZ2U=',encoding:'base64'});
    expect(calls[1].body.tree[0]).toMatchObject({path:'data/games/01_game/submission-1.png',sha:'image-sha'});
    expect(calls[1].body.tree[1].content).toContain('cover: "./submission-1.png"');
    expect(calls.at(-1)!.body.force).toBe(false);
  });

});
