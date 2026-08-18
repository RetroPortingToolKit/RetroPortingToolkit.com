import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The dev CMS sync/publish/auto-pull (scripts/cms-dev.mjs) leans on specific git
// behaviors for its data-safety guarantees:
//   - an interrupted rebase leaves .git/rebase-merge and is recovered by --abort
//   - a detached HEAD is detectable via `symbolic-ref -q HEAD` (so publish refuses it)
//   - `rebase` refuses a dirty tree (so a pull can't clobber unsaved edits)
//   - `rev-list --count origin/main..HEAD` detects an un-pushed commit (so a
//     publish that failed after committing re-pushes instead of saying "nothing")
// If a future git changes any of these, these tests fail before prod does.

let dir;
const git = (args, cwd = dir) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const readFile = (name) =>
  fs.readFileSync(path.join(dir, name), "utf8").replace(/\r\n/g, "\n");

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "cms-git-"));
  git(["init", "-q"]);
  git(["symbolic-ref", "HEAD", "refs/heads/main"]);
  git(["config", "user.email", "t@t"]);
  git(["config", "user.name", "t"]);
  git(["config", "commit.gpgsign", "false"]);
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function commit(content, msg) {
  fs.writeFileSync(path.join(dir, "f"), content);
  git(["add", "f"]);
  git(["commit", "-qm", msg]);
}

describe("interrupted-rebase recovery", () => {
  it("a conflicting rebase leaves .git/rebase-merge, and --abort restores a clean branch", () => {
    commit("base\n", "base");
    git(["branch", "up"]);
    commit("local\n", "local");
    git(["checkout", "-q", "up"]);
    commit("upstream\n", "upstream");
    git(["checkout", "-q", "main"]);
    let failed = false;
    try {
      git(["rebase", "up"]);
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    expect(fs.existsSync(path.join(dir, ".git", "rebase-merge"))).toBe(true);
    // recovery
    git(["rebase", "--abort"]);
    expect(fs.existsSync(path.join(dir, ".git", "rebase-merge"))).toBe(false);
    expect(git(["symbolic-ref", "-q", "HEAD"])).toBe("refs/heads/main");
    expect(git(["status", "--porcelain"])).toBe("");
    expect(readFile("f")).toBe("local\n"); // local work preserved
  });
});

describe("detached-HEAD detection (assertOnBranch)", () => {
  it("symbolic-ref -q HEAD fails while detached and succeeds on a branch", () => {
    commit("a\n", "a");
    commit("b\n", "b");
    const head = git(["rev-parse", "HEAD"]);
    git(["checkout", "-q", head]); // detach
    let detached = false;
    try {
      git(["symbolic-ref", "-q", "HEAD"]);
    } catch {
      detached = true;
    }
    expect(detached).toBe(true);
    git(["checkout", "-q", "main"]);
    expect(git(["symbolic-ref", "-q", "HEAD"])).toBe("refs/heads/main");
  });
});

describe("rebase refuses a dirty tree (dirty-skip guard)", () => {
  it("refuses to rebase when there are unstaged changes, leaving them intact", () => {
    commit("base\n", "base");
    git(["branch", "up"]);
    git(["checkout", "-q", "up"]);
    commit("upstream\n", "upstream");
    git(["checkout", "-q", "main"]);
    fs.writeFileSync(path.join(dir, "f"), "my unsaved edit\n"); // dirty, uncommitted
    let refused = false;
    try {
      git(["rebase", "up"]);
    } catch {
      refused = true;
    }
    expect(refused).toBe(true);
    expect(readFile("f")).toBe("my unsaved edit\n"); // not clobbered
  });
});

describe("ahead-of-origin detection (re-push after a failed push)", () => {
  it("rev-list --count origin/main..HEAD counts un-pushed commits", () => {
    // simulate an 'origin' as a sibling bare repo
    const originDir = fs.mkdtempSync(path.join(os.tmpdir(), "cms-git-origin-"));
    try {
      execFileSync("git", ["init", "-q", "--bare", originDir]);
      commit("v1\n", "v1");
      git(["remote", "add", "origin", originDir]);
      git(["push", "-q", "origin", "main"]);
      git(["fetch", "-q", "origin", "main"]);
      expect(Number(git(["rev-list", "--count", "origin/main..HEAD"]))).toBe(0);
      commit("v2\n", "v2"); // committed but NOT pushed (simulates push-failed-after-commit)
      expect(Number(git(["rev-list", "--count", "origin/main..HEAD"]))).toBe(1);
    } finally {
      fs.rmSync(originDir, { recursive: true, force: true });
    }
  });
});
