import { describe, it, expect, vi, afterEach } from 'vitest';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { rollbackOnFailure, selfHeal, assertOnlyOwnStaged } from './checkout.mjs';

const execFileAsync = promisify(execFile);
const dirs = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((d) => fsp.rm(d, { recursive: true, force: true }).catch(() => {}))); });

describe('checkout rollback', () => {
  it('restores what the job wrote when it throws, and nothing when it succeeds', async () => {
    const exec = vi.fn(async () => {});
    const written = [];
    await expect(rollbackOnFailure(exec, written, async () => {
      written.push('data/games/01_a/index.md', 'data/submissions.json');
      throw new Error('npm run test failed');
    })).rejects.toThrow('npm run test failed');
    // One path at a time, so a pathspec that fails for one does not abandon
    // the rest — which is how the restore quietly did nothing for a new file.
    expect(exec).toHaveBeenCalledWith('git', ['checkout', 'HEAD', '--', 'data/games/01_a/index.md']);
    expect(exec).toHaveBeenCalledWith('git', ['checkout', 'HEAD', '--', 'data/submissions.json']);

    const clean = vi.fn(async () => {});
    expect(await rollbackOnFailure(clean, [], async () => 'done')).toBe('done');
    expect(clean).not.toHaveBeenCalled();
  });

  it('leaves committed work alone and lets the real error through even if the restore fails', async () => {
    const committed = vi.fn(async () => {});
    const list = [];
    await expect(rollbackOnFailure(committed, list, async () => {
      list.push('data/games/01_a/index.md');
      list.length = 0; // the commit captured it
      throw new Error('push rejected');
    })).rejects.toThrow('push rejected');
    expect(committed).not.toHaveBeenCalled();

    const broken = vi.fn(async () => { throw new Error('git is unavailable'); });
    const paths = [];
    await expect(rollbackOnFailure(broken, paths, async () => {
      paths.push('data/games/01_a/index.md');
      throw new Error('the real failure');
    })).rejects.toThrow('the real failure');
  });
});

describe('the checks lock', () => {
  it('is visible to another process while held, and gone afterwards', async () => {
    const fs = await import('node:fs/promises');
    const os = await import('node:os');
    const path = await import('node:path');
    const { withChecksLock, checksLockHolder } = await import('./checkout.mjs');
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpt-lock-'));
    expect(await checksLockHolder(dir)).toBeNull();
    await withChecksLock(dir, 'npm run doctor', async () => {
      expect(await checksLockHolder(dir)).toBe('npm run doctor');
    });
    expect(await checksLockHolder(dir)).toBeNull();
    // Released even when the work throws, or a crash would park the bridge.
    await expect(withChecksLock(dir, 'x', async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(await checksLockHolder(dir)).toBeNull();
    // A lock left behind by a killed run goes stale rather than parking it forever.
    await fs.writeFile(path.join(dir, 'checks-running.lock'), JSON.stringify({ who: 'ghost', at: Date.now() - 60 * 60 * 1000 }));
    expect(await checksLockHolder(dir)).toBeNull();
    await fs.rm(dir, { recursive: true, force: true });
  });
});

/** The owner's words on 2026-10-02: "i dont wanna keep babysitting this
 * project". Each of these used to sit until somebody read Discord and typed a
 * git command. None of them is a judgement call. */
describe("putting the checkout back by itself", () => {
  const run = async (dir, args) => execFileAsync("git", args, { cwd: dir });
  const exec = (dir) => (cmd, args) => execFileAsync(cmd, args, { cwd: dir });

  async function repo() {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "rpt-selfheal-"));
    dirs.push(dir);
    await run(dir, ["init", "-qb", "main", "."]);
    await run(dir, ["config", "user.email", "t@t"]);
    await run(dir, ["config", "user.name", "T"]);
    await fsp.writeFile(path.join(dir, "f.txt"), "a\n");
    await run(dir, ["add", "-A"]);
    await run(dir, ["commit", "-qm", "one"]);
    return dir;
  }

  it("aborts a rebase that stopped on a conflict, and lands back on main", async () => {
    const dir = await repo();
    await run(dir, ["switch", "-qc", "side"]);
    await fsp.writeFile(path.join(dir, "f.txt"), "side\n");
    await run(dir, ["commit", "-qam", "side"]);
    await run(dir, ["switch", "-qm", "main"]);
    await fsp.writeFile(path.join(dir, "f.txt"), "main\n");
    await run(dir, ["commit", "-qam", "main"]);
    await run(dir, ["rebase", "side"]).catch(() => {}); // conflicts on purpose

    expect(await selfHeal(exec(dir))).toEqual(["aborted an interrupted rebase"]);
    const head = await run(dir, ["symbolic-ref", "--short", "-q", "HEAD"]);
    expect(head.stdout.trim()).toBe("main");
    // The work that was there before the rebase is still there.
    expect(await fsp.readFile(path.join(dir, "f.txt"), "utf8")).toBe("main\n");
  });

  it("comes back to main from a detached HEAD, and refuses to while work is open", async () => {
    const dir = await repo();
    const first = (await run(dir, ["rev-parse", "HEAD"])).stdout.trim();
    await run(dir, ["checkout", "-q", first]);
    expect(await selfHeal(exec(dir))).toEqual(["returned to main from a detached HEAD"]);
    expect((await run(dir, ["symbolic-ref", "--short", "-q", "HEAD"])).stdout.trim()).toBe("main");

    // Someone mid-edit: leave it completely alone.
    await run(dir, ["checkout", "-q", first]);
    await fsp.writeFile(path.join(dir, "f.txt"), "someone is editing\n");
    expect(await selfHeal(exec(dir))).toEqual([]);
    expect(await fsp.readFile(path.join(dir, "f.txt"), "utf8")).toBe("someone is editing\n");
  });

  it("does nothing at all to a checkout that is simply busy with someone's work", async () => {
    const dir = await repo();
    await fsp.writeFile(path.join(dir, "f.txt"), "theirs\n");
    await fsp.writeFile(path.join(dir, "new.txt"), "also theirs\n");
    expect(await selfHeal(exec(dir))).toEqual([]);
    expect(await fsp.readFile(path.join(dir, "f.txt"), "utf8")).toBe("theirs\n");
    expect(await fsp.readFile(path.join(dir, "new.txt"), "utf8")).toBe("also theirs\n");
  });

  it("refuses to commit beside work someone else staged", async () => {
    const dir = await repo();
    await fsp.writeFile(path.join(dir, "theirs.txt"), "staged by a person\n");
    await run(dir, ["add", "--", "theirs.txt"]);
    await expect(assertOnlyOwnStaged(exec(dir), ["data/games/01_x/index.md"])).rejects.toThrow(/theirs\.txt/);
    await expect(assertOnlyOwnStaged(exec(dir), ["theirs.txt"])).resolves.toBeUndefined();
  });
});

/** The rollback was the only line in the system that could destroy work with
 * no way back — not committed, not stashed, no reflog. */
describe("putting back only what this job wrote", () => {
  it("restores a file the job changed, and removes one it created", async () => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "rpt-rollback-"));
    dirs.push(dir);
    const existing = path.join(dir, "existing.md");
    const created = path.join(dir, "created.md");
    await fsp.writeFile(existing, "original\n");
    const written = [];
    await expect(rollbackOnFailure(vi.fn(), written, async () => {
      await fsp.writeFile(existing, "job wrote this\n");
      written.push({ path: existing, before: "original\n", after: "job wrote this\n" });
      await fsp.writeFile(created, "new\n");
      written.push({ path: created, before: null, after: "new\n" });
      throw new Error("npm run test failed");
    })).rejects.toThrow("npm run test failed");
    expect(await fsp.readFile(existing, "utf8")).toBe("original\n");
    await expect(fsp.stat(created)).rejects.toThrow();
  });

  it("leaves a file alone when someone else changed it meanwhile, and says which", async () => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "rpt-rollback-"));
    dirs.push(dir);
    const file = path.join(dir, "contested.md");
    await fsp.writeFile(file, "original\n");
    const written = [];
    const error = await rollbackOnFailure(vi.fn(), written, async () => {
      await fsp.writeFile(file, "job wrote this\n");
      written.push({ path: file, before: "original\n", after: "job wrote this\n" });
      // A person saves over it while the checks are running.
      await fsp.writeFile(file, "a person typed this\n");
      throw new Error("npm run test failed");
    }).catch((e) => e);
    expect(await fsp.readFile(file, "utf8")).toBe("a person typed this\n");
    expect(error.conflictPaths).toEqual([file]);
    expect(error.ownPaths).toEqual([file]);
  });
});
