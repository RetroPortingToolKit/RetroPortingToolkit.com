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
