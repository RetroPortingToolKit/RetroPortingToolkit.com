import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubmissionStore, SubmissionError, submitRepository, repositoryMetadata } from './submissionServer';
import { submissionId } from '../../scripts/submissions.mjs';
const repo = 'https://github.com/example/recomp';
function fixture() {
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
    // The site token identifies this caller to GitHub, and goes nowhere else.
    // It used to go unauthenticated, which GitHub rate-limits to 60 an hour per
    // IP — a budget the edge's shared addresses have always spent.
    if (String(_url).startsWith('https://api.github.com/')) expect(options.headers.authorization).toBe('Bearer fake');
    else expect(options.headers.authorization).toBeUndefined();
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
    // An anonymous submission still records how it arrived. Recording nothing
    // is what left "who submitted this?" unanswerable.
    expect(result.record.submittedBy).toEqual({ via: 'form', verified: false });
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
    // This endpoint is public and unauthenticated, so a handle typed into the
    // form is a claim. It is recorded, and recorded as unverified.
    expect(result.record.submittedBy).toEqual({ via: 'form', verified: false, discord: 'maker' });
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

/** Every submission failed from the day the site moved to Cloudflare. The
 * Workers runtime refuses `redirect: "error"` — "won't be implemented since it
 * does not make sense at the edge" — so inspecting the submitted repository
 * threw a TypeError, which the handler turned into "Submissions are
 * temporarily unavailable. Please try again." */
describe('inspecting a submitted repository at the edge', () => {
  const repo = 'https://github.com/vibecodekun/shantaerecomp';

  it('never asks for a redirect mode the Workers runtime refuses', async () => {
    const fetcher = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ html_url: repo, name: 'Shantae', description: 'A port.', private: false, owner: { login: 'vibecodekun' }, default_branch: 'main' }));
    vi.stubGlobal('fetch', fetcher);
    await repositoryMetadata(repo);
    const init = fetcher.mock.calls[0][1];
    // workerd accepts only "follow" and "manual".
    expect(init.redirect).toBe('manual');
    expect(['follow', 'manual']).toContain(init.redirect);
  });

  it('refuses a redirect rather than following it somewhere else', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 301, headers: { location: 'https://api.github.com/repos/someone/else' } })));
    await expect(repositoryMetadata(repo)).rejects.toThrow(/redirects elsewhere/);
    // A refusal, not a fault: the submitter gets told, publishing is not down.
    await expect(repositoryMetadata(repo)).rejects.toBeInstanceOf(SubmissionError);
  });

  it('still reports a missing repository as missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    await expect(repositoryMetadata(repo)).rejects.toThrow(/could not be found publicly/);
  });
});

/** Unauthenticated, GitHub allows 60 requests an hour per IP, and the edge
 * shares its addresses with the whole platform, so every lookup came back 403
 * and no submission could get past it. */
describe('identifying this caller to GitHub', () => {
  const repo = 'https://github.com/vibecodekun/shantaerecomp';
  const ok = () => Response.json({ html_url: repo, name: 'Shantae', description: 'A port.', private: false, owner: { login: 'vibecodekun' }, default_branch: 'main' });

  it('sends the site token to GitHub, and only to GitHub', async () => {
    const fetcher = vi.fn(async (_url: string, _init: RequestInit) => ok());
    vi.stubGlobal('fetch', fetcher);
    await repositoryMetadata(repo, 'site-token');
    expect((fetcher.mock.calls[0][1].headers as Record<string, string>).authorization).toBe('Bearer site-token');
    expect(fetcher.mock.calls[0][0]).toMatch(/^https:\/\/api\.github\.com\//);
  });

  it('sends nothing to GitLab, and nothing when there is no token', async () => {
    const fetcher = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ web_url: 'https://gitlab.com/a/b', name: 'B', visibility: 'public' }));
    vi.stubGlobal('fetch', fetcher);
    await repositoryMetadata('https://gitlab.com/a/b', 'site-token');
    expect((fetcher.mock.calls[0][1].headers as Record<string, string>).authorization).toBeUndefined();

    const bare = vi.fn(async (_url: string, _init: RequestInit) => ok());
    vi.stubGlobal('fetch', bare);
    await repositoryMetadata(repo);
    expect((bare.mock.calls[0][1].headers as Record<string, string>).authorization).toBeUndefined();
  });

  it('still refuses a private repository the token can see', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ html_url: repo, private: true, owner: { login: 'vibecodekun' } })));
    await expect(repositoryMetadata(repo, 'site-token')).rejects.toThrow(/Only public repositories/);
  });

  it('names the status when the host refuses, so the next outage is readable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 403 })));
    await expect(repositoryMetadata(repo, 't')).rejects.toThrow(/answered 403/);
  });
});
