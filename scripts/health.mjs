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
