import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "node:crypto";
import yaml from "js-yaml";
import { GET, POST } from "../../api/cms";

// What the PROD backend actually writes. Nothing exercised it before: the
// vocabulary tests next door compare lists of field names and call none of
// rename, upload, post, save or delete, so a rename that decoded every asset as
// text and re-encoded it (destroying binaries), an upload that answered with a
// path no cover could resolve, and a save with no stale-write guard at all were
// invisible here while being live on the site.
//
// The backend talks to the GitHub Contents and Git Data APIs, so the fake below
// IS a repository: blobs addressed by content, a tree layered over it, and the
// files that result. No filesystem and no network.

type Body = Record<string, unknown>;

type FakeGitHubHooks = {
  afterContentsGet?: (path: string, count: number, store: Map<string, Buffer>) => void;
  afterRecursiveTree?: (store: Map<string, Buffer>) => void;
  beforeContentsPut?: (path: string, store: Map<string, Buffer>) => void;
  beforeRefPatch?: (store: Map<string, Buffer>) => void;
  refPatchStatus?: number;
};

function fakeGitHub(seed: Record<string, Buffer | string>, hooks: FakeGitHubHooks = {}) {
  const store = new Map<string, Buffer>();
  const blobs = new Map<string, Buffer>();
  const trees = new Map<string, Map<string, Buffer>>();
  const commits = new Map<string, { tree: string; parents: string[] }>();
  const calls: { method: string; url: string; body?: Body }[] = [];
  let contentsGetCount = 0;
  let objectCount = 0;
  const sha = (b: Buffer) => crypto.createHash("sha1").update(b).digest("hex");
  const copyTree = (tree: Map<string, Buffer>) => new Map([...tree].map(([p, b]) => [p, Buffer.from(b)]));
  const replaceStore = (tree: Map<string, Buffer>) => {
    store.clear();
    for (const [p, b] of tree) store.set(p, Buffer.from(b));
  };
  const treeFingerprint = (tree: Map<string, Buffer>) =>
    [...tree]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([p, b]) => `${p}:${sha(b)}`)
      .join("\n");
  const keep = (b: Buffer) => {
    blobs.set(sha(b), b);
    return sha(b);
  };
  for (const [p, v] of Object.entries(seed)) {
    const buf = Buffer.isBuffer(v) ? v : Buffer.from(v, "utf8");
    store.set(p, buf);
    keep(buf);
  }
  let head = "commit-parent";
  trees.set("tree-base", copyTree(store));
  commits.set(head, { tree: "tree-base", parents: [] });

  const advanceExternalHead = () => {
    const tree = `tree-external-${++objectCount}`;
    const commit = `commit-external-${objectCount}`;
    trees.set(tree, copyTree(store));
    commits.set(commit, { tree, parents: [head] });
    head = commit;
  };

  const reply = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });

  const handler = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const method = (init?.method || "GET").toUpperCase();
    const body = init?.body ? (JSON.parse(String(init.body)) as Body) : undefined;
    calls.push({ method, url, body });

    const contents = /\/contents\/(.+?)(\?|$)/.exec(url);
    if (contents) {
      const at = decodeURIComponent(contents[1]);
      if (method === "GET") {
        const ref = new URL(url).searchParams.get("ref");
        const commit = ref && ref !== "main" ? commits.get(ref) : undefined;
        const source = commit ? trees.get(commit.tree) ?? new Map<string, Buffer>() : store;
        const file = source.get(at);
        const response = file
          ? reply({ content: file.toString("base64"), encoding: "base64", sha: sha(file) })
          : reply({ message: "Not Found" }, 404);
        const before = treeFingerprint(store);
        hooks.afterContentsGet?.(at, ++contentsGetCount, store);
        if (treeFingerprint(store) !== before) advanceExternalHead();
        return response;
      }
      if (method === "PUT") {
        hooks.beforeContentsPut?.(at, store);
        // GitHub's Contents API uses `sha` as a compare-and-swap token. An
        // update with no sha, or with a sha from an older read, is a conflict.
        const current = store.get(at);
        const expected = typeof body?.sha === "string" ? body.sha : "";
        if ((current && expected !== sha(current)) || (!current && expected)) {
          return reply({ message: "sha does not match the current file" }, 409);
        }
        const buf = Buffer.from(String(body?.content ?? ""), "base64");
        store.set(at, buf);
        advanceExternalHead();
        return reply({ content: { sha: keep(buf) } });
      }
    }
    const recursiveTree = /\/git\/trees\/([^/?]+)\?recursive=1$/.exec(url);
    if (recursiveTree) {
      const ref = decodeURIComponent(recursiveTree[1]);
      const commit = ref === "main" ? commits.get(head) : commits.get(ref);
      const source = trees.get(ref) ?? (commit ? trees.get(commit.tree) : undefined) ?? store;
      const response = reply({ tree: [...source].map(([p, b]) => ({ path: p, type: "blob", sha: sha(b) })) });
      const before = treeFingerprint(store);
      hooks.afterRecursiveTree?.(store);
      if (treeFingerprint(store) !== before) advanceExternalHead();
      return response;
    }
    if (/\/git\/ref\/heads\//.test(url)) return reply({ object: { sha: head } });
    const commitGet = /\/git\/commits\/([^/]+)$/.exec(url);
    if (commitGet && method === "GET") {
      const commit = commits.get(decodeURIComponent(commitGet[1]));
      return commit ? reply({ tree: { sha: commit.tree } }) : reply({ message: "Not Found" }, 404);
    }
    if (/\/git\/blobs$/.test(url) && method === "POST") {
      const raw = String(body?.content ?? "");
      return reply({ sha: keep(body?.encoding === "base64" ? Buffer.from(raw, "base64") : Buffer.from(raw, "utf8")) });
    }
    if (/\/git\/trees$/.test(url) && method === "POST") {
      const base = trees.get(String(body?.base_tree ?? ""));
      if (!base) return reply({ message: "Unknown base tree" }, 422);
      const next = copyTree(base);
      // A tree entry with a null sha removes the path; any other sha points the
      // path at a blob the repo already holds, which is how a file moves.
      for (const entry of (body?.tree as { path: string; sha: string | null }[]) ?? []) {
        if (entry.sha === null) {
          next.delete(entry.path);
          continue;
        }
        const blob = blobs.get(entry.sha);
        if (!blob) throw new Error(`tree references a blob that was never written: ${entry.sha}`);
        next.set(entry.path, Buffer.from(blob));
      }
      const tree = `tree-new-${++objectCount}`;
      trees.set(tree, next);
      return reply({ sha: tree });
    }
    if (/\/git\/commits$/.test(url) && method === "POST") {
      const commit = `commit-new-${++objectCount}`;
      commits.set(commit, {
        tree: String(body?.tree ?? ""),
        parents: ((body?.parents as string[]) ?? []).map(String),
      });
      return reply({ sha: commit });
    }
    if (/\/git\/refs\/heads\//.test(url) && method === "PATCH") {
      const before = treeFingerprint(store);
      hooks.beforeRefPatch?.(store);
      if (treeFingerprint(store) !== before) advanceExternalHead();
      if (hooks.refPatchStatus) return reply({ message: "ref update failed" }, hooks.refPatchStatus);
      const requested = String(body?.sha ?? "");
      const commit = commits.get(requested);
      if (!commit || commit.parents[0] !== head) {
        return reply({ message: "Update is not a fast forward" }, 422);
      }
      const next = trees.get(commit.tree);
      if (!next) return reply({ message: "Unknown commit tree" }, 422);
      replaceStore(next);
      head = requested;
      return reply({ ok: true });
    }
    if (/graphql$/.test(url)) return reply({ data: { repository: {} } });
    throw new Error(`the CMS made a call the fake repo does not serve: ${method} ${url}`);
  };

  return {
    store,
    calls,
    handler,
    text: (p: string) => store.get(p)?.toString("utf8") ?? "",
    frontmatter: (p: string) =>
      (yaml.load((store.get(p)?.toString("utf8") ?? "").split("---")[1] ?? "") || {}) as Record<string, unknown>,
    puts: () => calls.filter((c) => c.method === "PUT").length,
  };
}

const send = (route: string, body: Body) =>
  POST(
    new Request(`https://site.test/api/cms?__sub=${route}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

const fetchOne = (route: string, id: string) =>
  GET(new Request(`https://site.test/api/cms?__sub=${route}&id=${encodeURIComponent(id)}`));

const page = (title: string, extra = "") => `---\ntitle: "${title}"\n${extra}---\n\nbody\n`;

/** A repository holding a docs section with two pages, and two games whose
    slugs are prefixes of one another. */
const REPO: Record<string, Buffer | string> = {
  "data/about.md": `---\nheaderName: "Site"\ntagline: "One line."\n---\n`,
  "data/home.json":
    JSON.stringify({ proof: ["a claim"], philosophy: ["a belief"], action: [{ page: "/games/tomba-2" }] }, null, 2) + "\n",
  "data/docs/01_start/index.md": page("Start", `sectionTitle: "Start"\n`),
  "data/docs/01_start/01_page-one/index.md": page("Page One"),
  "data/docs/01_start/02_page-two/index.md": page("Page Two"),
  "data/games/01_tomba/index.md": page("Tomba"),
  "data/games/02_tomba-2/index.md": page("Tomba 2"),
};

// Bytes that are not valid utf-8. Decoding them as text and re-encoding the
// result is what corrupted every image a rename moved.
const BINARY = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe, 0x80, 0x00, 0xc3, 0x28]);

let gh: ReturnType<typeof fakeGitHub>;

function open(extra: Record<string, Buffer | string> = {}, hooks: FakeGitHubHooks = {}) {
  gh = fakeGitHub({ ...REPO, ...extra }, hooks);
  vi.stubGlobal("fetch", gh.handler);
  return gh;
}

beforeEach(() => {
  // The CMS is closed once any of these is set, and every route would answer
  // 401 instead of doing the thing under test.
  process.env.CMS_ALLOWED_ORG = "";
  process.env.CMS_ALLOWED_LOGINS = "";
  process.env.CMS_AGENT_KEYS = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("prod rename moves files without re-encoding them", () => {
  it("keeps a binary asset byte-for-byte", async () => {
    open({ "data/games/01_tomba/shot.png": BINARY });
    const r = await send("rename", { id: "data/games/01_tomba/index.md", slug: "tomba-classic" });
    expect(r.status).toBe(200);
    await expect(r.json()).resolves.toMatchObject({ ok: true, id: "data/games/01_tomba-classic/index.md" });
    const moved = gh.store.get("data/games/01_tomba-classic/shot.png");
    expect(moved).toBeDefined();
    expect(moved!.equals(BINARY)).toBe(true);
    expect(gh.store.has("data/games/01_tomba/shot.png")).toBe(false);
  });

  it("moves by pointing at the blob the repo already has, so nothing is uploaded", async () => {
    open({ "data/games/01_tomba/shot.png": BINARY });
    await send("rename", { id: "data/games/01_tomba/index.md", slug: "tomba-classic" });
    expect(gh.calls.filter((c) => c.url.endsWith("/git/blobs")).length).toBe(0);
  });

  it("moves a docs section and every page under it", async () => {
    open();
    const r = await send("rename", { id: "data/docs/01_start/index.md", slug: "getting-started" });
    await expect(r.json()).resolves.toMatchObject({ ok: true });
    expect(gh.store.has("data/docs/01_getting-started/01_page-one/index.md")).toBe(true);
    expect(gh.store.has("data/docs/01_start/01_page-one/index.md")).toBe(false);
  });
});

describe("prod upload answers with the path a cover can resolve", () => {
  it("returns ./name, the way the dev backend does", async () => {
    open();
    const r = await send("upload", {
      id: "data/games/01_tomba/index.md",
      filename: "shot.png",
      contentBase64: BINARY.toString("base64"),
    });
    // The editor writes this straight into `cover:`, and a cover is resolved
    // against the item's own folder. The repo-relative path resolved to
    // nothing, so the card came out blank.
    await expect(r.json()).resolves.toMatchObject({ ok: true, path: "./shot.png", name: "shot.png" });
    expect(gh.store.get("data/games/01_tomba/shot.png")!.equals(BINARY)).toBe(true);
  });

  it("refuses a file over 3 MB", async () => {
    open();
    const r = await send("upload", {
      id: "data/games/01_tomba/index.md",
      filename: "huge.png",
      contentBase64: Buffer.alloc(4 * 1024 * 1024, 7).toString("base64"),
    });
    await expect(r.json()).resolves.toMatchObject({ ok: false, error: "That file is 4.0 MB. The limit here is 3 MB." });
  });
});

describe("prod delete", () => {
  it("says how many pages went with a docs section", async () => {
    open();
    const r = await send("delete", { id: "data/docs/01_start/index.md" });
    const body = (await r.json()) as Body;
    expect(body).toMatchObject({ ok: true, removed: 3, children: 2 });
    expect(String(body.warning)).toContain("2 pages");
    expect(gh.store.has("data/docs/01_start/01_page-one/index.md")).toBe(false);
  });

  it("reports no children for a page that has none", async () => {
    open();
    const r = await send("delete", { id: "data/docs/01_start/01_page-one/index.md" });
    await expect(r.json()).resolves.toMatchObject({ ok: true, removed: 1, children: 0, warning: "" });
  });

  it("deletes a page whose slug is only a PREFIX of a featured one", async () => {
    open(); // home.json features /games/tomba-2
    const r = await send("delete", { id: "data/games/01_tomba/index.md" });
    await expect(r.json()).resolves.toMatchObject({ ok: true });
    expect(gh.store.has("data/games/01_tomba/index.md")).toBe(false);
  });

  it("still refuses the page the home page actually features", async () => {
    open();
    const r = await send("delete", { id: "data/games/02_tomba-2/index.md" });
    const body = (await r.json()) as Body;
    expect(body.ok).toBe(false);
    expect(String(body.error)).toContain("/games/tomba-2");
    expect(gh.store.has("data/games/02_tomba-2/index.md")).toBe(true);
  });
});

describe("prod /post writes the fields a kind takes, and only those", () => {
  it("keeps `updated` and the `repos` LIST on a docs page", async () => {
    open();
    const r = await send("post", {
      kind: "docs",
      section: "start",
      title: "Fields Probe",
      body: "body",
      summary: "one sentence",
      pageType: "reference",
      updated: "2026-08-25",
      repos: ["https://github.com/a/b", "https://github.com/c/d"],
    });
    const body = (await r.json()) as Body;
    expect(body.ok).toBe(true);
    const fm = gh.frontmatter(String(body.id));
    expect(fm.updated).toBe("2026-08-25");
    // A list, not a string. The scalar copy loop tests `typeof v === "string"`,
    // so it accepted `repos` and never wrote it.
    expect(fm.repos).toEqual(["https://github.com/a/b", "https://github.com/c/d"]);
  });

  it("refuses to write `date`, `year` and the catalogue fields onto a docs page", async () => {
    open();
    const r = await send("post", {
      kind: "docs",
      section: "start",
      title: "Gated Probe",
      body: "body",
      date: "2026-01-02",
      year: "1999",
      status: "Playable",
      availability: "Free",
      platform: "playstation",
      repo: "https://github.com/x/y",
      videoUrl: "https://youtu.be/x",
      venue: "Somewhere",
      authorBio: "bio",
    });
    const fm = gh.frontmatter(String(((await r.json()) as Body).id));
    for (const key of ["date", "year", "status", "availability", "platform", "repo", "videoUrl", "venue", "authorBio"]) {
      expect(fm, key).not.toHaveProperty(key);
    }
  });

  it("still writes every field a game takes", async () => {
    open();
    const r = await send("post", {
      kind: "games",
      title: "Gate Probe Game",
      body: "body",
      year: "2026",
      status: "Playable alpha",
      availability: "Public build",
      platform: "playstation",
      repo: "https://github.com/x/y",
      videoUrl: "https://youtu.be/x",
      updated: "2026-08-25",
      tags: ["A"],
      summary: "not a games field",
    });
    const fm = gh.frontmatter(String(((await r.json()) as Body).id));
    expect(fm).toMatchObject({
      year: "2026",
      status: "Playable alpha",
      availability: "Public build",
      platform: "playstation",
      repo: "https://github.com/x/y",
      updated: "2026-08-25",
      tags: ["A"],
    });
    expect(fm).not.toHaveProperty("summary");
  });
});

describe("prod Git Data mutations use the snapshot they validated", () => {
  it("creates /new through one Git Data commit", async () => {
    open();
    const r = await send("new", { kind: "games", title: "New Game" });
    expect(r.status).toBe(200);
    await expect(r.json()).resolves.toMatchObject({ ok: true, id: "data/games/03_new-game/index.md" });
    expect(gh.store.has("data/games/03_new-game/index.md")).toBe(true);
    expect(gh.puts()).toBe(0);
    expect(gh.calls.filter((call) => call.method === "POST" && call.url.endsWith("/git/commits"))).toHaveLength(1);
  });

  it("does not overwrite a page created after /new allocated its path", async () => {
    const target = "data/games/03_new-game/index.md";
    const external = page("Concurrent New Game");
    let moved = false;
    open({}, {
      afterRecursiveTree(store) {
        if (moved) return;
        moved = true;
        store.set(target, Buffer.from(external, "utf8"));
      },
    });

    const r = await send("new", { kind: "games", title: "New Game" });
    expect(r.status).toBe(409);
    await expect(r.json()).resolves.toMatchObject({ ok: false, conflict: true });
    expect(gh.text(target)).toBe(external);
  });

  it("does not publish a rename after a colliding slug appears", async () => {
    const concurrent = "data/games/03_tomba-classic/index.md";
    const external = page("Concurrent Tomba Classic");
    let moved = false;
    open({}, {
      afterRecursiveTree(store) {
        if (moved) return;
        moved = true;
        store.set(concurrent, Buffer.from(external, "utf8"));
      },
    });

    const r = await send("rename", { id: "data/games/01_tomba/index.md", slug: "tomba-classic" });
    expect(r.status).toBe(409);
    await expect(r.json()).resolves.toMatchObject({ ok: false, conflict: true });
    expect(gh.store.has("data/games/01_tomba/index.md")).toBe(true);
    expect(gh.store.has("data/games/01_tomba-classic/index.md")).toBe(false);
    expect(gh.text(concurrent)).toBe(external);
  });

  it("does not delete a page the Home page began featuring after validation", async () => {
    const externalHome = JSON.stringify({ action: [{ page: "/games/tomba" }] }, null, 2) + "\n";
    let moved = false;
    open({}, {
      afterRecursiveTree(store) {
        if (moved) return;
        moved = true;
        store.set("data/home.json", Buffer.from(externalHome, "utf8"));
      },
    });

    const r = await send("delete", { id: "data/games/01_tomba/index.md" });
    expect(r.status).toBe(409);
    await expect(r.json()).resolves.toMatchObject({ ok: false, conflict: true });
    expect(gh.store.has("data/games/01_tomba/index.md")).toBe(true);
    expect(gh.text("data/home.json")).toBe(externalHome);
  });

  it("does not overwrite an asset uploaded during its ref update", async () => {
    const asset = "data/games/01_tomba/shot.png";
    const external = Buffer.from("external asset", "utf8");
    let moved = false;
    open({}, {
      beforeRefPatch(store) {
        if (moved) return;
        moved = true;
        store.set(asset, external);
      },
    });

    const r = await send("upload", {
      id: "data/games/01_tomba/index.md",
      filename: "shot.png",
      contentBase64: Buffer.from("our upload", "utf8").toString("base64"),
    });
    expect(r.status).toBe(409);
    await expect(r.json()).resolves.toMatchObject({ ok: false, conflict: true });
    expect(gh.store.get(asset)?.equals(external)).toBe(true);
  });

  it("does not delete an asset replaced after its existence check", async () => {
    const asset = "data/games/01_tomba/shot.png";
    const external = Buffer.from("newer asset", "utf8");
    let moved = false;
    open({ [asset]: Buffer.from("old asset", "utf8") }, {
      afterRecursiveTree(store) {
        if (moved) return;
        moved = true;
        store.set(asset, external);
      },
    });

    const r = await send("asset/delete", { id: "data/games/01_tomba/index.md", name: "shot.png" });
    expect(r.status).toBe(409);
    await expect(r.json()).resolves.toMatchObject({ ok: false, conflict: true });
    expect(gh.store.get(asset)?.equals(external)).toBe(true);
  });

  it("does not overwrite a duplicate target created after validation", async () => {
    const target = "data/games/03_tomba-copy/index.md";
    const external = page("Concurrent Copy");
    let moved = false;
    open({}, {
      afterRecursiveTree(store) {
        if (moved) return;
        moved = true;
        store.set(target, Buffer.from(external, "utf8"));
      },
    });

    const r = await send("duplicate", { id: "data/games/01_tomba/index.md" });
    expect(r.status).toBe(409);
    await expect(r.json()).resolves.toMatchObject({ ok: false, conflict: true });
    expect(gh.text(target)).toBe(external);
  });

  it("does not overwrite a /post target created after slug validation", async () => {
    const target = "data/blog/01_race-post/index.md";
    const external = page("Concurrent Race Post");
    let moved = false;
    open({}, {
      afterRecursiveTree(store) {
        if (moved) return;
        moved = true;
        store.set(target, Buffer.from(external, "utf8"));
      },
    });

    const r = await send("post", { kind: "blog", title: "Race Post", body: "ours" });
    expect(r.status).toBe(409);
    await expect(r.json()).resolves.toMatchObject({ ok: false, conflict: true });
    expect(gh.text(target)).toBe(external);
  });

  it("preserves an unrelated branch advance and surfaces a retryable conflict", async () => {
    const unrelated = page("Unrelated edit");
    let moved = false;
    open({}, {
      beforeRefPatch(store) {
        if (moved) return;
        moved = true;
        store.set("data/docs/01_start/01_page-one/index.md", Buffer.from(unrelated, "utf8"));
      },
    });

    const r = await send("rename", { id: "data/games/01_tomba/index.md", slug: "tomba-classic" });
    expect(r.status).toBe(409);
    await expect(r.json()).resolves.toMatchObject({ ok: false, conflict: true });
    expect(gh.text("data/docs/01_start/01_page-one/index.md")).toBe(unrelated);
    expect(gh.store.has("data/games/01_tomba/index.md")).toBe(true);
    expect(gh.store.has("data/games/01_tomba-classic/index.md")).toBe(false);
  });
});

describe("prod save refuses to overwrite a newer version", () => {
  it("hands out a baseSha with every read", async () => {
    open();
    const doc = (await (await fetchOne("read", "data/games/01_tomba/index.md")).json()) as Body;
    expect(typeof doc.baseSha).toBe("string");
    expect(doc.baseSha).toBeTruthy();
  });

  it("accepts a save built on the version the repo holds, and moves the version on", async () => {
    open();
    const doc = (await (await fetchOne("read", "data/games/01_tomba/index.md")).json()) as Body;
    const r = await send("save", {
      id: "data/games/01_tomba/index.md",
      frontmatter: 'title: "Tomba"',
      body: "edited",
      expectedBase: doc.baseSha,
    });
    expect(r.status).toBe(200);
    const saved = (await r.json()) as Body;
    expect(saved.ok).toBe(true);
    expect(saved.baseSha).toBeTruthy();
    expect(saved.baseSha).not.toBe(doc.baseSha);
    expect(gh.text("data/games/01_tomba/index.md")).toContain("edited");
  });

  it("keeps an unchanged save as a no-op", async () => {
    open();
    const doc = (await (await fetchOne("read", "data/games/01_tomba/index.md")).json()) as Body;
    const r = await send("save", {
      id: doc.id,
      frontmatter: doc.frontmatter,
      body: doc.body,
      expectedBase: doc.baseSha,
    });
    expect(r.status).toBe(200);
    await expect(r.json()).resolves.toMatchObject({ ok: true, baseSha: doc.baseSha });
    expect(gh.puts()).toBe(0);
  });

  it("answers 409 when the page changed underneath the editor, and writes nothing", async () => {
    open();
    const before = gh.text("data/games/01_tomba/index.md");
    const r = await send("save", {
      id: "data/games/01_tomba/index.md",
      frontmatter: 'title: "Tomba"',
      body: "an edit from a stale buffer",
      expectedBase: "a-version-this-repo-never-had",
    });
    // src/pages/Admin.tsx watches for exactly this status to stop auto-saving.
    expect(r.status).toBe(409);
    await expect(r.json()).resolves.toMatchObject({ ok: false, staleBase: true });
    expect(gh.text("data/games/01_tomba/index.md")).toBe(before);
  });

  it("answers 428 when the caller did not read a version first", async () => {
    open();
    const before = gh.text("data/games/01_tomba/index.md");
    const r = await send("save", {
      id: "data/games/01_tomba/index.md",
      frontmatter: 'title: "Tomba"',
      body: "edited",
    });
    expect(r.status).toBe(428);
    await expect(r.json()).resolves.toMatchObject({ ok: false, preconditionRequired: true });
    expect(gh.text("data/games/01_tomba/index.md")).toBe(before);
    expect(gh.puts()).toBe(0);
  });

  it("does not adopt a newer sha that appears after its comparison read", async () => {
    const id = "data/games/01_tomba/index.md";
    const external = page("External edit");
    open({}, {
      afterContentsGet(path, count, store) {
        // GET 1 is the explicit read. GET 2 is the save's version read. The
        // old implementation did a third GET and silently adopted its sha.
        if (path === id && count === 2) store.set(id, Buffer.from(external, "utf8"));
      },
    });
    const doc = (await (await fetchOne("read", id)).json()) as Body;
    const r = await send("save", {
      id,
      frontmatter: doc.frontmatter,
      body: "stale editor edit",
      expectedBase: doc.baseSha,
    });
    expect(r.status).toBe(409);
    await expect(r.json()).resolves.toMatchObject({ ok: false, staleBase: true });
    expect(gh.text(id)).toBe(external);
    expect(gh.calls.find((call) => call.method === "PUT")?.body?.sha).toBe(doc.baseSha);
  });

  it("maps a Contents conflict after the read to a stale-base 409", async () => {
    const id = "data/games/01_tomba/index.md";
    const external = page("Last-moment external edit");
    let changed = false;
    open({}, {
      beforeContentsPut(path, store) {
        if (path !== id || changed) return;
        changed = true;
        store.set(id, Buffer.from(external, "utf8"));
      },
    });
    const doc = (await (await fetchOne("read", id)).json()) as Body;
    const r = await send("save", {
      id,
      frontmatter: doc.frontmatter,
      body: "stale editor edit",
      expectedBase: doc.baseSha,
    });
    expect(r.status).toBe(409);
    await expect(r.json()).resolves.toMatchObject({ ok: false, staleBase: true });
    expect(gh.text(id)).toBe(external);
  });
});

describe("prod Home composite round-trips", () => {
  it("reads both Home files from one immutable commit", async () => {
    const external = JSON.stringify({ proof: ["external"], philosophy: ["newer"] }, null, 2) + "\n";
    let moved = false;
    open({}, {
      afterContentsGet(path, _count, store) {
        if (path !== "data/about.md" || moved) return;
        moved = true;
        store.set("data/home.json", Buffer.from(external, "utf8"));
      },
    });

    const doc = (await (await fetchOne("read", "page:home")).json()) as {
      home: { proof: unknown[]; philosophy: unknown[] };
    };
    // The branch moved after about.md was read. home.json still comes from the
    // pinned parent, rather than forming a version that never existed.
    expect(doc.home.proof).toEqual(["a claim"]);
    expect(doc.home.philosophy).toEqual(["a belief"]);
    expect(gh.text("data/home.json")).toBe(external);
  });

  it("a save that changes nothing writes nothing at all", async () => {
    open();
    const doc = (await (await fetchOne("read", "page:home")).json()) as {
      about: { frontmatter: string; body: string };
      home: Body;
      baseSha: string;
    };
    const before = { about: gh.text("data/about.md"), home: gh.text("data/home.json") };
    const r = await send("save", {
      id: "page:home",
      about: { frontmatter: doc.about.frontmatter, body: doc.about.body },
      home: doc.home,
      expectedBase: doc.baseSha,
    });
    expect(r.status).toBe(200);
    // about.md is frontmatter alone, and the template added a blank line after
    // the fence plus a trailing newline on every save; home.json gained
    // "recognition": [], a key the file does not have.
    expect(gh.text("data/about.md")).toBe(before.about);
    expect(gh.text("data/home.json")).toBe(before.home);
    expect(gh.puts()).toBe(0);
    expect(gh.calls.filter((call) => call.method !== "GET" && call.url.includes("/git/")).length).toBe(0);
  });

  it("publishes both Home files in one Git Data commit", async () => {
    open();
    const doc = (await (await fetchOne("read", "page:home")).json()) as {
      about: { frontmatter: string; body: string };
      home: Record<string, unknown>;
      baseSha: string;
    };
    const r = await send("save", {
      id: "page:home",
      about: { frontmatter: `${doc.about.frontmatter}\nrole: "Maintainer"`, body: doc.about.body },
      home: { ...doc.home, recognition: ["An award"] },
      expectedBase: doc.baseSha,
    });

    expect(r.status).toBe(200);
    expect(gh.text("data/about.md")).toContain('role: "Maintainer"');
    expect(JSON.parse(gh.text("data/home.json")).recognition).toEqual(["An award"]);
    expect(gh.puts()).toBe(0);
    expect(gh.calls.filter((call) => call.method === "POST" && call.url.endsWith("/git/commits"))).toHaveLength(1);
    expect(gh.calls.filter((call) => call.method === "PATCH" && call.url.includes("/git/refs/heads/"))).toHaveLength(1);
  });

  it("exposes neither Home change when the atomic ref update fails", async () => {
    open({}, { refPatchStatus: 500 });
    const doc = (await (await fetchOne("read", "page:home")).json()) as {
      about: { frontmatter: string; body: string };
      home: Record<string, unknown>;
      baseSha: string;
    };
    const before = { about: gh.text("data/about.md"), home: gh.text("data/home.json") };
    const r = await send("save", {
      id: "page:home",
      about: { frontmatter: `${doc.about.frontmatter}\nrole: "Maintainer"`, body: doc.about.body },
      home: { ...doc.home, recognition: ["An award"] },
      expectedBase: doc.baseSha,
    });

    expect(r.status).toBe(500);
    expect(gh.text("data/about.md")).toBe(before.about);
    expect(gh.text("data/home.json")).toBe(before.home);
  });

  it("answers 409 without a partial write when Home changes before the ref update", async () => {
    const externalHome = JSON.stringify({ proof: ["external"], philosophy: ["newer"] }, null, 2) + "\n";
    let moved = false;
    open({}, {
      beforeRefPatch(store) {
        if (moved) return;
        moved = true;
        store.set("data/home.json", Buffer.from(externalHome, "utf8"));
      },
    });
    const doc = (await (await fetchOne("read", "page:home")).json()) as {
      about: { frontmatter: string; body: string };
      home: Record<string, unknown>;
      baseSha: string;
    };
    const beforeAbout = gh.text("data/about.md");
    const r = await send("save", {
      id: "page:home",
      about: { frontmatter: `${doc.about.frontmatter}\nrole: "Maintainer"`, body: doc.about.body },
      home: { ...doc.home, recognition: ["An award"] },
      expectedBase: doc.baseSha,
    });

    expect(r.status).toBe(409);
    await expect(r.json()).resolves.toMatchObject({ ok: false, staleBase: true });
    expect(gh.text("data/about.md")).toBe(beforeAbout);
    expect(gh.text("data/home.json")).toBe(externalHome);
  });

  it("retries an unrelated branch advance without losing that change", async () => {
    const externalGame = page("Externally edited Tomba");
    let moved = false;
    open({}, {
      beforeRefPatch(store) {
        if (moved) return;
        moved = true;
        store.set("data/games/01_tomba/index.md", Buffer.from(externalGame, "utf8"));
      },
    });
    const doc = (await (await fetchOne("read", "page:home")).json()) as {
      about: { frontmatter: string; body: string };
      home: Record<string, unknown>;
      baseSha: string;
    };
    const r = await send("save", {
      id: "page:home",
      about: { frontmatter: doc.about.frontmatter, body: doc.about.body },
      home: { ...doc.home, recognition: ["An award"] },
      expectedBase: doc.baseSha,
    });

    expect(r.status).toBe(200);
    expect(JSON.parse(gh.text("data/home.json")).recognition).toEqual(["An award"]);
    expect(gh.text("data/games/01_tomba/index.md")).toBe(externalGame);
    expect(gh.calls.filter((call) => call.method === "PATCH" && call.url.includes("/git/refs/heads/"))).toHaveLength(2);
  });

  it("still writes a section someone actually filled in", async () => {
    open();
    const doc = (await (await fetchOne("read", "page:home")).json()) as {
      about: { frontmatter: string; body: string };
      home: Record<string, unknown>;
      baseSha: string;
    };
    await send("save", {
      id: "page:home",
      about: { frontmatter: doc.about.frontmatter, body: doc.about.body },
      home: { ...doc.home, recognition: ["An award"] },
      expectedBase: doc.baseSha,
    });
    expect(JSON.parse(gh.text("data/home.json")).recognition).toEqual(["An award"]);
  });

  it("writes an entry that is an object without flattening it to text", async () => {
    open();
    const doc = (await (await fetchOne("read", "page:home")).json()) as {
      about: { frontmatter: string; body: string };
      home: Record<string, unknown>;
      baseSha: string;
    };
    await send("save", {
      id: "page:home",
      about: { frontmatter: doc.about.frontmatter, body: doc.about.body },
      home: { ...doc.home, proof: [{ label: "A card" }] },
      expectedBase: doc.baseSha,
    });
    expect(JSON.parse(gh.text("data/home.json")).proof).toEqual([{ label: "A card" }]);
  });
});
