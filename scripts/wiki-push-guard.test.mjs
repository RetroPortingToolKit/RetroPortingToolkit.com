import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('node:child_process', () => ({ execFileSync: () => 'bridge-test-token' }));
afterEach(() => { process.exitCode = 0; vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('trusted bot pre-push guard', () => {
  it('refuses to push when a role or website access was revoked', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ ok:true, publish:false }));
    vi.spyOn(console,'error').mockImplementation(() => {});
    await import('./wiki-push-guard.mjs?denied');
    expect(process.exitCode).toBe(1);
  });
  it('refuses to push when access cannot be verified', async () => {
    vi.stubGlobal('fetch', async () => { throw new Error('offline'); });
    vi.spyOn(console,'error').mockImplementation(() => {});
    await import('./wiki-push-guard.mjs?offline');
    expect(process.exitCode).toBe(1);
  });
});
