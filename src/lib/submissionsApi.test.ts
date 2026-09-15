import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import handler from '../../api/submissions';
import { SubmissionStore } from './submissionServer';
beforeEach(() => { vi.stubEnv('CMS_REPO_OWNER', 'site'); vi.stubEnv('CMS_REPO_NAME', 'site'); vi.stubEnv('GITHUB_TOKEN', 'fake'); vi.stubEnv('VERCEL_ENV', 'production'); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it('fails closed without storage configuration', async () => { vi.stubEnv('GITHUB_TOKEN', ''); expect((await handler(new Request('https://site/api/submissions'))).status).toBe(503); });
it('rejects cross-origin writes and non-JSON requests', async () => {
  expect((await handler(new Request('https://site/api/submissions', { method: 'POST', headers: { origin: 'https://evil', 'content-type': 'application/json' }, body: '{}' }))).status).toBe(403);
  expect((await handler(new Request('https://site/api/submissions', { method: 'POST', body: '{}' }))).status).toBe(415);
});
it('prevents preview deployments from writing', async () => { vi.stubEnv('VERCEL_ENV', 'preview'); expect((await handler(new Request('https://site/api/submissions', { method: 'POST' }))).status).toBe(403); });
it('only lists pending moderation records', async () => {
  vi.spyOn(SubmissionStore.prototype, 'snapshot').mockResolvedValue({ head: 'head', tree: 'tree', entries: [], records: [{ id: 'pending', status: 'pending' }, { id: 'gone', status: 'removed' }] as never });
  expect(await (await handler(new Request('https://site/api/submissions'))).json()).toEqual({ submissions: [{ id: 'pending', status: 'pending' }] });
});
