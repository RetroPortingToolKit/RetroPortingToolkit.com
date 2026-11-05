import { describe, it, expect } from 'vitest';
import { applyWikiRequest, parseWikiRequest } from './wiki-bridge.mjs';
describe('Discord docs contribution lane', () => {
  it('recognizes scoped edit and creation requests', () => {
    expect(parseWikiRequest('wiki edit /docs/start/quickstart Explain the first step')).toMatchObject({ action: 'save', id: '/docs/start/quickstart' });
    expect(parseWikiRequest('wiki new start Setup guide\nDescribe setup')).toMatchObject({ action: 'new', section: 'start', title: 'Setup guide' });
    expect(parseWikiRequest('delete the site')).toBeNull();
  });
  it('uses the CMS version and preserves frontmatter regardless of model output', async () => {
    const calls = [];
    const call = async (action, payload) => { calls.push({ action, payload }); if (action === 'read') return { id: 'data/docs/01_start/01_intro/index.md', frontmatter: 'title: Intro', baseSha: 'version' }; return { ok: true }; };
    await applyWikiRequest({ call, request: { action: 'save', id: '/docs/start/intro', instructions: 'Clarify' }, generate: async () => JSON.stringify({ frontmatter: 'featured: true', body: 'New words', summary: 'Clarify' }) });
    expect(calls.map(c => c.action)).toEqual(['status','read','status','save']);
    expect(calls[3].payload).toMatchObject({ frontmatter: 'title: Intro', expectedBase: 'version' });
  });
  it('does not save a queued request disabled before it starts', async () => {
    let generated = false;
    await expect(applyWikiRequest({ call: async () => { throw new Error('disabled'); }, request: { action: 'save' }, generate: async () => { generated = true; } })).rejects.toThrow('disabled');
    expect(generated).toBe(false);
  });
  it('does not publish if disabled while a proposal is being generated', async () => {
    const calls = []; let revoked = false;
    const call = async action => { calls.push(action); if (revoked) throw new Error('disabled'); return { id: 'page', frontmatter: 'title: Intro', baseSha: 'version' }; };
    await expect(applyWikiRequest({ call, request: { action: 'save', id: 'page' }, generate: async () => { revoked = true; return JSON.stringify({ body: 'Words', summary: 'Edit' }); } })).rejects.toThrow('disabled');
    expect(calls).not.toContain('save');
  });
});

describe("a refusal is a decision, not a fault", () => {
  it("marks a 403 as denied, and an outage as not", async () => {
    const { wikiBridge } = await import("./wiki-bridge.mjs");
    const refuse = async () => new Response(JSON.stringify({ error: "Sign in with Discord at /admin" }), { status: 403 });
    const down = async () => new Response(JSON.stringify({ error: "upstream" }), { status: 502 });
    const denied = await wikiBridge("t", "123456789012345678", "status", {}, {}, refuse).catch((e) => e);
    expect(denied.denied).toBe(true);
    const outage = await wikiBridge("t", "123456789012345678", "status", {}, {}, down).catch((e) => e);
    expect(outage.denied).toBeUndefined();
  });
});
