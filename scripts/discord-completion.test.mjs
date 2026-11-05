import { describe, expect, it } from 'vitest';
import { verifyCompletion, summaryOutcome, outcomeReaction, receiptInstructions } from './discord-completion.mjs';
const head = 'a'.repeat(40);
const requirement = { requirement: 'Submission CTA', status: 'present', evidence: [{ path: 'src/form.tsx', line: 2, text: '<button>Submit a recomp</button>' }] };
const base = { request: 'Did you implement the submission flow?', summary: '[answer]\nYes, it is done.', head, remoteContainsHead: true,
  readCommittedFile: async () => '// form\n<button>Submit a recomp</button>\n' };
describe('completion verification', () => {
  it('withholds the exact false claim from the screenshot without evidence', async () => {
    const result = await verifyCompletion({ ...base, request: 'did you do the work on the footer, CTA on games page, modal etc?', summary: '[answer]\nYes. The footer links, homepage Explore games CTA, and modal behavior are already in main and pushed to origin/main.' });
    expect(result.outcome).toBe('unverified'); expect(result.body).not.toContain('Yes.'); expect(result.published).toBe(false);
  });
  it('does not infer completion from an empty result or successful prose', async () => {
    for (const summary of ['', 'Done.', 'Implemented and pushed successfully.']) expect((await verifyCompletion({ ...base, summary })).outcome).toBe('unverified');
  });
  it('checks cited source lines exactly at the committed revision', async () => {
    const result = await verifyCompletion({ ...base, receipt: { outcome: 'complete', requirements: [requirement] } });
    expect(result.outcome).toBe('complete'); expect(result.body).toContain('src/form.tsx:2');
    expect(result.body).toContain('No new commits'); expect(result.published).toBe(false);
    expect((await verifyCompletion({ ...base, readCommittedFile: async () => 'old navigation', receipt: { outcome: 'complete', requirements: [requirement] } })).outcome).toBe('unverified');
  });
  it('shows missing requirements even when the agent labels the whole task complete', async () => {
    const result = await verifyCompletion({ ...base, receipt: { outcome: 'complete', requirements: [requirement, { requirement: 'Admin removal controls', status: 'missing' }] } });
    expect(result.outcome).toBe('partial'); expect(result.body).toContain('Missing: Admin removal controls'); expect(outcomeReaction(result.outcome)).toBe('⚠️');
  });
  it('does not say work is published based only on a changed local HEAD', async () => {
    const result = await verifyCompletion({ ...base, remoteContainsHead: false, newCommits: [head], receipt: { outcome: 'complete', requirements: [requirement] } });
    expect(result.outcome).toBe('unverified'); expect(result.published).toBe(false);
  });
  it('reports a pushed commit only with remote ancestry evidence', async () => {
    const result = await verifyCompletion({ ...base, newCommits: [head], receipt: { outcome: 'complete', requirements: [requirement] } });
    expect(result.published).toBe(true); expect(result.body).toContain('New commits are pushed.');
  });
  it.each(['../secret', '/etc/passwd', '.git/config'])('rejects evidence path %s', async path => {
    expect((await verifyCompletion({ ...base, receipt: { outcome: 'complete', requirements: [{ ...requirement, evidence: [{ path, line: 1, text: 'secret' }] }] } })).outcome).toBe('unverified');
  });
  it('preserves honest blocked, clarification, partial, and ordinary answers', async () => {
    for (const [summary, outcome] of [['Blocked: conflict', 'blocked'], ['[clarification]\nWhich page?', 'clarification'], ['Partial: modal missing', 'partial'], ['[answer]\nThe project uses TypeScript.', 'answer']]) {
      const result = await verifyCompletion({ ...base, request: 'What language does this use?', summary });
      expect(result.outcome).toBe(outcome); expect(outcomeReaction(outcome)).not.toBe('✅');
    }
    expect(summaryOutcome('Some unspecified result')).toBe('unverified');
  });
  it('asks for all requirements and distinguishes similar older UI', () => {
    const prompt = receiptInstructions('/tmp/receipt.json');
    expect(prompt).toContain('EVERY requested deliverable');
    expect(prompt).toContain('Explore games'); expect(prompt).toContain('Submit a recomp');
    expect(prompt).toContain('a clarification answers a question');
  });
});
