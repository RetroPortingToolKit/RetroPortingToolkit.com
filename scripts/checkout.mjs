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
    // Which paths are the job's own, for whoever has to judge the failure. A
    // check that fails over someone else's uncommitted edits says nothing
    // about the site, and on 2026-09-29 it was announced as "publishing is
    // stopped". After a commit `written` is empty, which is the right answer:
    // the work belongs to git and the failure is the bot's own.
    if (error && typeof error === "object") error.ownPaths = [...written];
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

/** Porcelain lines as { code, path }. The two status columns carry the whole
 * question of whose file this is, and slicing them off threw it away. */
export function statusLines(status) {
  return String(status ?? "").split("\n").filter(Boolean)
    .map((line) => ({ code: line.slice(0, 2), path: line.slice(3).trim() }))
    .filter((l) => l.path);
}

/** Where this project's work lives. Anything untracked outside these is some
 * tool's output, not something a person is in the middle of writing.
 *
 * This list is the inversion that matters. The old rule was a denylist —
 * .gitignore — and every tool that learned a new output path was a fresh
 * outage: .vercel, then .wrangler, which parked every job for an hour on
 * 2026-10-02. The places work lives are few, stable and reviewed; the places
 * tools write are open-ended. Maintain the small list, not the endless one. */
export const WORK_ROOTS = ["data/", "src/", "public/", "api/", "worker/", "scripts/", "docs/", "video/", "starter-kit/"];

/** Splits a porcelain status into what should stop the bot and what should not.
 *
 * `work` — a tracked file changed, or an untracked path somewhere work lives:
 *   a person is mid-edit, or a half-written page folder exists. Wait.
 * `debris` — untracked, outside every work root: a cache, a build artifact, a
 *   leftover. It cannot enter a commit, because every lane stages by name.
 * `unmerged` — a conflicted path. Waiting never clears this one.
 */
export function classifyStatus(status) {
  const work = [], debris = [], unmerged = [];
  for (const { code, path } of statusLines(status)) {
    if (code.includes("U") || code === "AA" || code === "DD") unmerged.push(path);
    // Porcelain collapses an untracked directory to one entry with a trailing
    // slash, so this has to match on prefix, never on a filename.
    else if (code === "??" && !WORK_ROOTS.some((root) => path.startsWith(root))) debris.push(path);
    else work.push(path);
  }
  return { work, debris, unmerged };
}


/** Puts the checkout back into a state that can publish, without anyone.
 *
 * Every one of these used to need a person: the bot would wait, or park, or
 * post, and the queue sat until someone read Discord and typed a git command.
 * None of them is a judgement call, and all three are recoverable — an aborted
 * rebase restores the state it started from, switching back to main changes no
 * file, and pushing a commit the bot already made is what should have happened
 * anyway. Returns what it fixed, for the log.
 *
 * It never touches a file anyone wrote. Someone's uncommitted work is the one
 * blocker left that genuinely needs them, and it is left exactly alone.
 */
const exists = async (p) => { try { await fsp.stat(p); return true; } catch { return false; } };

export async function selfHeal(exec, { ownCommits = [] } = {}) {
  const fixed = [];
  const run = async (args) => String((await exec("git", args))?.stdout ?? "").trim();
  const quiet = async (args) => { try { return await run(args); } catch { return ""; } };

  // An interrupted rebase parks every job forever — waiting cannot clear it.
  // --git-path answers relative to the repository, so it has to be resolved
  // against the repository and not against whatever this process's cwd is.
  const gitDir = await quiet(["rev-parse", "--absolute-git-dir"]);
  for (const marker of ["rebase-merge", "rebase-apply"]) {
    const dir = gitDir ? join(gitDir, marker) : "";
    if (!dir || !(await exists(dir))) continue;
    await quiet(["rebase", "--abort"]);
    // Believe it only if the marker is gone.
    if (!(await exists(dir))) fixed.push("aborted an interrupted rebase");
    break;
  }
  if (await quiet(["rev-parse", "--verify", "-q", "MERGE_HEAD"])) {
    await quiet(["merge", "--abort"]);
    if (!(await quiet(["rev-parse", "--verify", "-q", "MERGE_HEAD"]))) fixed.push("aborted an interrupted merge");
  }

  // A detached HEAD takes commits that advance nothing and pushes that report
  // success while the site never changes. Safe to leave only when it is clean.
  const branch = await quiet(["symbolic-ref", "--short", "-q", "HEAD"]);
  if (!branch) {
    const status = await quiet(["--no-optional-locks", "status", "--porcelain"]);
    if (!classifyStatus(status).work.length) {
      await quiet(["switch", "main"]);
      if (await quiet(["symbolic-ref", "--short", "-q", "HEAD"]) === "main") fixed.push("returned to main from a detached HEAD");
    }
  }

  // A commit the bot made that never reached origin means the site silently
  // never rebuilt. Only the bot's own commits, by recorded id.
  if (ownCommits.length) {
    const ahead = (await quiet(["rev-list", "origin/main..HEAD"])).split("\n").filter(Boolean);
    if (ahead.length && ahead.every((sha) => ownCommits.includes(sha))) {
      await quiet(["push", "origin", "HEAD:main"]);
      if (!(await quiet(["rev-list", "origin/main..HEAD"]))) fixed.push(`pushed ${ahead.length} commit(s) that never reached origin`);
    }
  }
  return fixed;
}

/** Refuses to publish from anywhere but main/** Refuses to publish from anywhere but main, and clears the one wedged state
 * that waiting never fixes.
 *
 * None of the three publishing lanes checked either. A detached HEAD — the
 * usual leftover of an interrupted rebase — takes a commit that advances
 * nothing, and the push then reports success while the site never changes.
 * `cms-dev.mjs` has guarded against this for a long time; the lanes that
 * actually publish did not.
 */
export async function assertPublishable(exec) {
  await selfHeal(exec);
  const branch = await exec("git", ["symbolic-ref", "--short", "-q", "HEAD"]).then((r) => String(r?.stdout ?? "").trim()).catch(() => "");
  if (branch !== "main") throw new Error(`The checkout is on ${branch || "a detached HEAD"}, not main, so publishing would not reach the site.`);
}

/** Nothing but this job's own paths may be staged when it commits.
 *
 * The pathspec on the commit already bounds what lands, so this is the belt to
 * that braces: if someone staged something while the checks ran, the job stops
 * rather than committing beside them. */
export async function assertOnlyOwnStaged(exec, ownPaths) {
  const status = String((await exec("git", ["--no-optional-locks", "status", "--porcelain"]))?.stdout ?? "");
  const mine = new Set(ownPaths);
  const staged = statusLines(status).filter((l) => l.code[0] !== " " && l.code[0] !== "?" && !mine.has(l.path));
  if (staged.length) throw new Error(`Someone has staged ${staged.map((l) => l.path).slice(0, 3).join(", ")} in the shared checkout, so this did not commit.`);
}
