/** Reading a failed check's output.
 *
 * `npm run test` prints thousands of lines, most of them incidental: React
 * render stacks, and the deliberate "Rebasing (1/1) error: could not apply"
 * that cms-git.test.mjs produces on every run, pass or fail. Taking the first
 * few lines of the error reported that expected rebase noise as the cause of
 * an outage on 2026-09-21. These pick the lines that actually name a failure.
 */
const STRIP_ANSI = new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g");

/** The npm script a "Command failed: npm run X" error names, or null. */
export function failedCheck(message) {
  return String(message ?? "").match(/Command failed: npm run ([\w:-]+)/)?.[1] ?? null;
}

/** Does this failure say the site is broken, or only that the machine was busy?
 *
 * A test that timed out, or a bridge agent reported as having gone silent, is
 * evidence about load, not about main. The suite runs on the same Mac as the
 * bot, the builds and whoever is working, and on 2026-10-01 a starved fake
 * agent stopped publishing for everyone twice overnight — with the site
 * perfectly fine both times. A run whose every named failure looks like that
 * is retried rather than believed; one real assertion among them, and it
 * counts as a breakage like any other.
 */
const SLOW = /Test timed out in \d+|timed out waiting for|went silent for|ETIMEDOUT|ENOTEMPTY|hook timed out/i;
const REAL = /^AssertionError\b|error TS\d+|\bexpected\b.*\bto (be|equal|contain|match)\b|SyntaxError|ReferenceError|TypeError|Cannot find module/i;

export function onlySlowness(output) {
  const lines = String(output ?? "").replace(STRIP_ANSI, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const failures = lines.filter((line) => /^[✕×]\s/.test(line) || /^→\s/.test(line) || /^AssertionError\b/.test(line) || /error TS\d+/.test(line));
  if (!failures.length) return false; // nothing recognisable: do not explain it away
  if (failures.some((line) => REAL.test(line))) return false;
  return failures.some((line) => SLOW.test(line));
}

/** The handful of lines worth showing a maintainer. */
export function failureSummary(output, limit = 6) {
  const lines = String(output ?? "")
    .replace(STRIP_ANSI, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const named = lines.filter((line) =>
    /^FAIL\b/.test(line) ||
    /^[✕×]\s/.test(line) ||
    /^Tests\s+\d+\s+failed/.test(line) ||
    /^AssertionError\b/.test(line) ||
    /error TS\d+/.test(line) ||
    /^→\s/.test(line));
  const picked = named.length ? named : lines.slice(-limit);
  // The same test named by both its FAIL line and its bullet adds nothing.
  return [...new Set(picked)].slice(0, limit).join("\n");
}
