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

function fakeGitHub(seed: Record<string, Buffer | string>) {
  const store = new Map<string, Buffer>();
  const blobs = new Map<string, Buffer>();
  const calls: { method: string; url: string; body?: Body }[] = [];
  const sha = (b: Buffer) => crypto.createHash("sha1").update(b).digest("hex");
  const keep = (b: Buffer) => {
    blobs.set(sha(b), b);
    return sha(b);
  };
  for (const [p, v] of Object.entries(seed)) {
    const buf = Buffer.isBuffer(v) ? v : Buffer.from(v, "utf8");
    store.set(p, buf);
    keep(buf);
  }

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
        const file = store.get(at);
        return file
          ? reply({ content: file.toString("base64"), encoding: "base64", sha: sha(file) })
          : reply({ message: "Not Found" }, 404);
      }
      if (method === "PUT") {
        const buf = Buffer.from(String(body?.content ?? ""), "base64");
        store.set(at, buf);
        return reply({ content: { sha: keep(buf) } });
      }
    }
    if (/\/git\/trees\/[^/]+\?recursive=1$/.test(url)) {
      return reply({ tree: [...store].map(([p, b]) => ({ path: p, type: "blob", sha: sha(b) })) });
    }
    if (/\/git\/ref\/heads\//.test(url)) return reply({ object: { sha: "commit-parent" } });
    if (/\/git\/commits\/[^/]+$/.test(url) && method === "GET") return reply({ tree: { sha: "tree-base" } });
    if (/\/git\/blobs$/.test(url) && method === "POST") {
      const raw = String(body?.content ?? "");
      return reply({ sha: keep(body?.encoding === "base64" ? Buffer.from(raw, "base64") : Buffer.from(raw, "utf8")) });
    }
    if (/\/git\/trees$/.test(url) && method === "POST") {
      // A tree entry with a null sha removes the path; any other sha points the
      // path at a blob the repo already holds, which is how a file moves.
      for (const entry of (body?.tree as { path: string; sha: string | null }[]) ?? []) {
        if (entry.sha === null) {
          store.delete(entry.path);
          continue;
        }
        const blob = blobs.get(entry.sha);
        if (!blob) throw new Error(`tree references a blob that was never written: ${entry.sha}`);
        store.set(entry.path, blob);
      }
      return reply({ sha: "tree-new" });
    }
    if (/\/git\/commits$/.test(url) && method === "POST") return reply({ sha: "commit-new" });
    if (/\/git\/refs\/heads\//.test(url) && method === "PATCH") return reply({ ok: true });
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

function open(extra: Record<string, Buffer | string> = {}) {
  gh = fakeGitHub({ ...REPO, ...extra });
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

  it("skips the check when the editor has no version yet", async () => {
    open();
    const r = await send("save", {
      id: "data/games/01_tomba/index.md",
      frontmatter: 'title: "Tomba"',
      body: "edited",
    });
    expect(r.status).toBe(200);
  });
});

describe("prod Home composite round-trips", () => {
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
  });

  it("still writes a section someone actually filled in", async () => {
    open();
    const doc = (await (await fetchOne("read", "page:home")).json()) as {
      about: { frontmatter: string; body: string };
      home: Record<string, unknown>;
    };
    await send("save", {
      id: "page:home",
      about: { frontmatter: doc.about.frontmatter, body: doc.about.body },
      home: { ...doc.home, recognition: ["An award"] },
    });
    expect(JSON.parse(gh.text("data/home.json")).recognition).toEqual(["An award"]);
  });

  it("writes an entry that is an object without flattening it to text", async () => {
    open();
    const doc = (await (await fetchOne("read", "page:home")).json()) as {
      about: { frontmatter: string; body: string };
      home: Record<string, unknown>;
    };
    await send("save", {
      id: "page:home",
      about: { frontmatter: doc.about.frontmatter, body: doc.about.body },
      home: { ...doc.home, proof: [{ label: "A card" }] },
    });
    expect(JSON.parse(gh.text("data/home.json")).proof).toEqual([{ label: "A card" }]);
  });
});
