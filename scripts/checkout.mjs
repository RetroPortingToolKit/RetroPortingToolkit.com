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
