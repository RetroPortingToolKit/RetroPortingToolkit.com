import { describe, it, expect } from 'vitest';
import { failedCheck, failureSummary } from './health.mjs';

// The real shape of a failing run: cms-git.test.mjs deliberately produces a
// conflicting rebase on every run, and React prints render stacks. Reporting
// the first lines named that expected rebase noise as the cause of an outage.
const OUTPUT = `
> retroportingtoolkit@0.1.0 test
> TZ=UTC vitest run

Rebasing (1/1)
error: could not apply 6ec18b5... local
hint: Resolve all conflicts manually, mark them as resolved with
hint: "git add/rm <conflicted_files>", then run "git rebase --continue".
    at AuthorNames (/repo/src/components/ItemDetail.tsx:320:24)
 FAIL  scripts/repo-updates.test.mjs > repository update watcher > retries until the page has the release
AssertionError: expected 1 to be 2
 Tests  1 failed | 999 passed (1000)
`;

describe('reading a failed check', () => {
  it('names the failing test rather than the incidental noise around it', () => {
    const summary = failureSummary(OUTPUT);
    expect(summary).toContain('FAIL  scripts/repo-updates.test.mjs');
    expect(summary).toContain('Tests  1 failed');
    expect(summary).not.toContain('Rebasing');
    expect(summary).not.toContain('could not apply');
    expect(summary).not.toContain('ItemDetail.tsx');
  });

  it('falls back to the tail when nothing names a failure, and strips colour', () => {
    const red = String.fromCharCode(27) + '[31m';
    const off = String.fromCharCode(27) + '[0m';
    expect(failureSummary(red + 'boom' + off + '\nlast line')).toBe('boom\nlast line');
    expect(failureSummary('')).toBe('');
  });

  it('reads which npm script failed', () => {
    expect(failedCheck('Error: Command failed: npm run test')).toBe('test');
    expect(failedCheck('Command failed: npm run typecheck\n...')).toBe('typecheck');
    expect(failedCheck('git push rejected')).toBeNull();
  });
});
