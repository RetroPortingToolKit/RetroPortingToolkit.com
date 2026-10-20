import { describe, it, expect } from 'vitest';
import { failedCheck, failureSummary, onlySlowness, evidenceOfBreakage } from './health.mjs';

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

/** Twice overnight on 2026-10-01 a suite whose only failures were timeouts
 * stopped publishing, with nothing wrong with the site. The retry ran on the
 * same loaded Mac, so asking again proved nothing. */
describe("load is not a breakage", () => {
  it("recognises a run that only timed out", () => {
    expect(onlySlowness([
      "× does not fetch a stranger's attachment in a public channel 21241ms",
      "→ timed out waiting for the answer",
      "× does not publish because someone reacted to an announcement 18370ms",
      "→ The claude agent went silent for 0 minutes and was stopped.",
      "Tests  2 failed | 1079 passed (1081)",
    ].join("\n"))).toBe(true);
    expect(onlySlowness("× a slow one 9000ms\n→ Test timed out in 5000ms.")).toBe(true);
  });

  it("never explains away a real failure", () => {
    // One genuine assertion among the timeouts is still a breakage.
    expect(onlySlowness([
      "× flaky one 21241ms",
      "→ timed out waiting for the answer",
      "× a real one 12ms",
      "AssertionError: expected 'v1.7.0-rc.1' to be 'v1.6.6'",
    ].join("\n"))).toBe(false);
    expect(onlySlowness("error TS2345: Argument of type 'string' is not assignable")).toBe(false);
    expect(onlySlowness("× broke 3ms\n→ expected true to be false")).toBe(false);
    // Nothing recognisable is not an excuse either.
    expect(onlySlowness("Command failed: npm run test")).toBe(false);
    expect(onlySlowness("")).toBe(false);
  });
});

/** 2026-10-20: one requester's missing Discord link — a 403 from the identity
 * check — was announced to everyone as "Publishing is stopped". The alarm took
 * anything it did not recognise as proof the site was broken. */
describe("an alarm needs evidence", () => {
  it("counts a failed check and a git command that could not publish", () => {
    expect(evidenceOfBreakage("Command failed: npm run test\n× something")).toBe(true);
    expect(evidenceOfBreakage("Command failed: git push origin main\n! [rejected]")).toBe(true);
    expect(evidenceOfBreakage("Command failed: git pull --ff-only\nfatal: Not possible to fast-forward")).toBe(true);
  });

  it("does not count anything else a job can throw", () => {
    expect(evidenceOfBreakage("Sign in with Discord at /admin, or sign in with GitHub and link Discord, before contributing through the bot.")).toBe(false);
    expect(evidenceOfBreakage("Discord publishing access revoked.")).toBe(false);
    expect(evidenceOfBreakage("The operation was aborted due to timeout")).toBe(false);
    expect(evidenceOfBreakage("TypeError: Cannot read properties of undefined")).toBe(false);
    expect(evidenceOfBreakage("")).toBe(false);
  });
});
