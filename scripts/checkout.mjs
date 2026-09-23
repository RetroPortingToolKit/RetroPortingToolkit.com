import fsp from "node:fs/promises";
import { join } from "node:path";

/** Files a publishing job wrote are its own to clean up.
 *
 * Every job that publishes writes its pages into the shared checkout and only
 * then runs typecheck, build and test. A failing check therefore throws with
 * the edit already on disk, and a dirty tree parks every later job until a
 * person clears it by hand. On 2026-09-19 a single timezone-dependent test
 * did exactly that and deadlocked the bridge for two days.
 *
 * `written` is a live array the caller pushes repository-relative paths into
 * as it writes them, and empties once a commit has captured them: after that
 * point the work belongs to git, and a failed push must not undo it.
 */
export async function rollbackOnFailure(exec, written, run) {
  try {
    return await run();
  } catch (error) {
    if (written.length) {
      // Cleanup must never replace the error the caller has to see, so a
      // failed restore is swallowed; the tree is reported dirty either way.
      try {
        await exec("git", ["checkout", "HEAD", "--", ...written]);
      } catch {
        /* reported through the original error and the dirty-tree check */
      }
    }
    throw error;
  }
}

/** A push rejected after a successful commit leaves work the dirty-tree check
 * cannot see: the tree is clean, but the site never rebuilds. Carried along by
 * the next job that touches the checkout. Failure here is not fatal — the job
 * about to run will push again. */
export async function pushPending(exec) {
  try {
    const ahead = await exec("git", ["rev-list", "--count", "@{u}..HEAD"]);
    const count = Number(String(ahead?.stdout ?? "").trim());
    if (Number.isFinite(count) && count > 0) await exec("git", ["push", "origin", "main"]);
  } catch {
    /* no upstream configured, or the push is retried by the job that follows */
  }
}

/** A marker saying "someone is running the checks in this checkout".
 *
 * typecheck, build and test all write into the same directories, so two runs
 * at once fail each other for no reason. The bridge read one such collision as
 * a broken site on 2026-09-22 and stopped publishing. `npm run doctor` holds
 * this while it runs the checks, and the bridge treats a fresh one as a busy
 * checkout and waits, the same as it does for uncommitted work.
 */
const CHECKS_LOCK = "checks-running.lock";
/** Stale after this long: a killed run must not park the bridge forever. */
export const CHECKS_LOCK_STALE_MS = 20 * 60 * 1_000;

export function checksLockPath(stateDir) {
  return join(stateDir, CHECKS_LOCK);
}

/** Who holds the lock, or null when nobody fresh does. */
export async function checksLockHolder(stateDir, now = Date.now(), staleMs = CHECKS_LOCK_STALE_MS) {
  try {
    const raw = await fsp.readFile(checksLockPath(stateDir), "utf8");
    const held = JSON.parse(raw);
    if (!Number.isFinite(held.at) || now - held.at > staleMs) return null;
    return held.who || "another run";
  } catch {
    return null;
  }
}

/** Holds the lock for the duration of `run`, and always releases it. */
export async function withChecksLock(stateDir, who, run) {
  await fsp.mkdir(stateDir, { recursive: true, mode: 0o700 }).catch(() => {});
  await fsp.writeFile(checksLockPath(stateDir), JSON.stringify({ who, at: Date.now() })).catch(() => {});
  try {
    return await run();
  } finally {
    await fsp.rm(checksLockPath(stateDir), { force: true }).catch(() => {});
  }
}
