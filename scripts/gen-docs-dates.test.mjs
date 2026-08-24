import { describe, expect, it } from "vitest";
import {
  buildDocsUpdated,
  docsUpdated,
  gitDatesAreTrustworthy,
  gitDocsDates,
  resolveUpdated,
  slugFromDocsPath,
  staleUpdated,
} from "./gen-docs-dates.mjs";

const SEP = "\u0001";

/** A fake `git` whose log is written the way the real one is: newest commit
    first, each date on its own record-separated line, then the paths it
    touched. `shallow` and `throws` drive the two failure paths. */
function fakeGit({ log = "", shallow = false, throws = null } = {}) {
  return (args) => {
    if (throws) throw new Error(throws);
    if (args[0] === "rev-parse") return shallow ? "true\n" : "false\n";
    if (args[0] === "log") return log;
    return "";
  };
}

const LOG = [
  `${SEP}2026-08-20`,
  "",
  "data/docs/01_start/index.md",
  "data/docs/06_reference/03_tcp-port-registry/index.md",
  "",
  `${SEP}2026-07-04`,
  "",
  "data/docs/06_reference/03_tcp-port-registry/index.md",
  "data/docs/02_concepts/10_glossary/index.md",
  "README.md",
  "",
].join("\n");

describe("slugFromDocsPath", () => {
  it("strips the folder numbers a page's URL never carries", () => {
    expect(slugFromDocsPath("data/docs/01_start/05_quickstart/index.md")).toBe(
      "start/quickstart",
    );
    expect(slugFromDocsPath("data/docs/06_reference/index.md")).toBe("reference");
  });

  it("reads a windows separator, since git can be run from anywhere", () => {
    expect(slugFromDocsPath("data\\docs\\01_start\\index.md")).toBe("start");
  });

  it("ignores anything that is not a published documentation page", () => {
    expect(slugFromDocsPath("README.md")).toBeNull();
    expect(slugFromDocsPath("data/blog/30_a-post/index.md")).toBeNull();
    expect(slugFromDocsPath("data/docs/01_start/05_quickstart/diagram.png")).toBeNull();
    // deeper than a section, which content.ts refuses to publish
    expect(slugFromDocsPath("data/docs/a/b/c/index.md")).toBeNull();
  });
});

describe("gitDocsDates", () => {
  it("takes the newest commit that named each page, from one log", () => {
    const git = gitDocsDates({ cwd: "/x", run: fakeGit({ log: LOG }) });
    expect(git.available).toBe(true);
    expect(git.commits).toBe(2);
    expect(git.dates.get("start")).toBe("2026-08-20");
    // named by both commits: the newer one wins
    expect(git.dates.get("reference/tcp-port-registry")).toBe("2026-08-20");
    expect(git.dates.get("concepts/glossary")).toBe("2026-07-04");
    expect(git.dates.size).toBe(3);
  });

  it("reports unavailable rather than throwing when git is not there", () => {
    const git = gitDocsDates({ cwd: "/x", run: fakeGit({ throws: "ENOENT git" }) });
    expect(git.available).toBe(false);
    expect(git.dates.size).toBe(0);
    expect(git.reason).toContain("git is unavailable");
  });

  it("reports unavailable when the log names no documentation page", () => {
    const git = gitDocsDates({ cwd: "/x", run: fakeGit({ log: "" }) });
    expect(git.available).toBe(false);
    expect(git.reason).toContain("named no documentation page");
  });

  it("notices a shallow clone", () => {
    const git = gitDocsDates({ cwd: "/x", run: fakeGit({ log: LOG, shallow: true }) });
    expect(git.shallow).toBe(true);
    expect(gitDatesAreTrustworthy(git)).toBe(true);
  });

  it("distrusts a depth-1 clone, where one commit appears to add everything", () => {
    const oneCommit = [`${SEP}2026-08-23`, "", "data/docs/01_start/index.md", ""].join("\n");
    const git = gitDocsDates({ cwd: "/x", run: fakeGit({ log: oneCommit, shallow: true }) });
    expect(git.commits).toBe(1);
    expect(gitDatesAreTrustworthy(git)).toBe(false);
  });
});

describe("resolveUpdated: frontmatter wins, git fills the gap", () => {
  const git = gitDocsDates({ cwd: "/x", run: fakeGit({ log: LOG }) });

  it("uses the page's own updated: even when git disagrees", () => {
    expect(resolveUpdated({ slug: "start", updated: "2026-05-01" }, git)).toEqual({
      date: "2026-05-01",
      source: "frontmatter",
    });
  });

  it("falls back to the last commit when the page declares nothing", () => {
    expect(resolveUpdated({ slug: "concepts/glossary" }, git)).toEqual({
      date: "2026-07-04",
      source: "git",
    });
    expect(resolveUpdated({ slug: "concepts/glossary", updated: "" }, git)).toEqual({
      date: "2026-07-04",
      source: "git",
    });
    // a value that is not a calendar date is not a date
    expect(resolveUpdated({ slug: "concepts/glossary", updated: "recently" }, git)).toEqual({
      date: "2026-07-04",
      source: "git",
    });
  });

  it("gives an untracked page nothing rather than a made up date", () => {
    // The state of a page between a CMS write and the commit that publishes it.
    expect(resolveUpdated({ slug: "start/just-written" }, git)).toBeNull();
  });

  it("gives every page nothing when git cannot answer and none declare a date", () => {
    const none = gitDocsDates({ cwd: "/x", run: fakeGit({ throws: "no git" }) });
    expect(resolveUpdated({ slug: "start" }, none)).toBeNull();
    expect(resolveUpdated({ slug: "start" }, undefined)).toBeNull();
    // the declared date still works with no git at all, which is the case a
    // fresh CI clone without history has to survive
    expect(resolveUpdated({ slug: "start", updated: "2026-01-09" }, none)).toEqual({
      date: "2026-01-09",
      source: "frontmatter",
    });
  });

  it("ignores a depth-1 clone's dates entirely", () => {
    const one = gitDocsDates({
      cwd: "/x",
      run: fakeGit({
        log: [`${SEP}2026-08-23`, "", "data/docs/01_start/index.md", ""].join("\n"),
        shallow: true,
      }),
    });
    expect(resolveUpdated({ slug: "start" }, one)).toBeNull();
  });
});

describe("staleUpdated", () => {
  const git = gitDocsDates({ cwd: "/x", run: fakeGit({ log: LOG }) });

  it("names a page whose declared date is older than its last commit", () => {
    expect(staleUpdated([{ slug: "start", updated: "2026-05-01" }], git)).toEqual([
      { slug: "start", declared: "2026-05-01", committed: "2026-08-20" },
    ]);
  });

  it("says nothing when the declared date is current or newer", () => {
    expect(staleUpdated([{ slug: "start", updated: "2026-08-20" }], git)).toEqual([]);
    expect(staleUpdated([{ slug: "start", updated: "2026-09-01" }], git)).toEqual([]);
    expect(staleUpdated([{ slug: "start" }], git)).toEqual([]);
  });

  it("accuses nobody from a clone that cannot see the history", () => {
    const shallow = gitDocsDates({ cwd: "/x", run: fakeGit({ log: LOG, shallow: true }) });
    expect(staleUpdated([{ slug: "start", updated: "2026-05-01" }], shallow)).toEqual([]);
  });
});

describe("buildDocsUpdated", () => {
  it("keys by slug and leaves out every page with no date at all", () => {
    const git = gitDocsDates({ cwd: "/x", run: fakeGit({ log: LOG }) });
    const map = buildDocsUpdated(
      [
        { slug: "start", updated: "2026-05-01" },
        { slug: "concepts/glossary" },
        { slug: "start/just-written" },
      ],
      git,
    );
    expect(map).toEqual({
      start: { date: "2026-05-01", source: "frontmatter" },
      "concepts/glossary": { date: "2026-07-04", source: "git" },
    });
  });
});

describe("against this repository", () => {
  it("dates every published page from git alone, in one git log", () => {
    // The real thing, so a change to the log format or the path walk is caught
    // here rather than in a build that quietly stops dating anything.
    const git = gitDocsDates();
    if (!git.available) return; // a clone with no history: nothing to assert
    expect(git.dates.size).toBeGreaterThan(0);
    for (const [slug, date] of git.dates) {
      expect(slug, slug).not.toContain("index.md");
      expect(date, slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("resolves a date for every page the build will render", () => {
    const pages = [
      { slug: "reference/tcp-port-registry", updated: "2026-08-23" },
      { slug: "platforms/nintendo-ds", updated: "2026-08-23" },
    ];
    const { map, stale } = docsUpdated(pages);
    expect(Object.keys(map).sort()).toEqual(pages.map((p) => p.slug).sort());
    expect(Array.isArray(stale)).toBe(true);
  });
});
