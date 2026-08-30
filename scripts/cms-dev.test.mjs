import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import yaml from "js-yaml";
import { EventEmitter } from "node:events";
import { fileURLToPath, pathToFileURL } from "node:url";
import { serializeMd, serializeJson, fileBaseSha, readEditable } from "./cms-dev.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("serializeMd", () => {
  it("produces the canonical frontmatter + body format", () => {
    expect(serializeMd('title: "X"', "body")).toBe(`---\ntitle: "X"\n---\n\nbody\n`);
  });
  it("trims surrounding whitespace in frontmatter and trailing whitespace in body", () => {
    expect(serializeMd('  title: "X"  ', "body\n\n\n")).toBe(`---\ntitle: "X"\n---\n\nbody\n`);
  });
  it("is idempotent under re-parse (round-trip stable)", () => {
    const once = serializeMd('a: "1"\nb: "2"', "line one\nline two");
    const m = once.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)\n$/);
    expect(m).not.toBeNull();
    const twice = serializeMd(m[1], m[2]);
    expect(twice).toBe(once);
  });
});

describe("serializeJson", () => {
  it("ensures exactly one trailing newline (idempotent)", () => {
    expect(serializeJson('{"a":1}')).toBe('{"a":1}\n');
    expect(serializeJson('{"a":1}\n')).toBe('{"a":1}\n');
  });
});

describe("fileBaseSha (optimistic-concurrency guard)", () => {
  it("is deterministic for the same id", () => {
    const a = fileBaseSha("page:home");
    const b = fileBaseSha("page:home");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it("differs across different docs", () => {
    expect(fileBaseSha("page:home")).not.toBe(fileBaseSha("data/about.md"));
  });
  it("returns empty string for an unknown id", () => {
    expect(fileBaseSha("data/nope/missing.md")).toBe("");
  });
});

describe("read -> save is idempotent for every real content file (no drift)", () => {
  // The safety property that matters: editing a real doc and saving it produces
  // bytes that, read + saved again, are unchanged. So the editor can never
  // slowly corrupt content across successive saves. (A FIRST save may normalize
  // pre-existing frontmatter spacing; what must never happen is continued drift.)
  const dirs = ["blog", "hardware", "games", "docs"];
  const ids = [];
  for (const kind of dirs) {
    const base = path.join(ROOT, "data", kind);
    if (!fs.existsSync(base)) continue;
    for (const folder of fs.readdirSync(base)) {
      const rel = `data/${kind}/${folder}/index.md`;
      if (fs.existsSync(path.join(ROOT, rel))) ids.push(rel);
      // Docs nest: a section folder holds its own index.md and one folder per
      // page, and every one of those is an editable doc.
      const section = path.join(ROOT, "data", kind, folder);
      if (kind !== "docs" || !fs.statSync(section).isDirectory()) continue;
      for (const page of fs.readdirSync(section)) {
        const nested = `data/${kind}/${folder}/${page}/index.md`;
        if (fs.existsSync(path.join(ROOT, nested))) ids.push(nested);
      }
    }
  }
  it(`found content files to check (${ids.length})`, () => {
    expect(ids.length).toBeGreaterThan(0);
  });
  // mirror readOne's md parse (splitFrontmatter + strip leading body newlines)
  const reparse = (raw) => {
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    return { frontmatter: m[1], body: m[2].replace(/^\n+/, "") };
  };
  for (const id of ids) {
    it(`${id} saves stably (serialize is a fixed point)`, () => {
      const doc = readEditable(id);
      expect(doc).not.toBeNull();
      const s1 = serializeMd(doc.frontmatter, doc.body);
      const re = reparse(s1);
      const s2 = serializeMd(re.frontmatter, re.body);
      expect(s2).toBe(s1); // saving the saved output changes nothing
    });
  }
});

// ---------------------------------------------------------------------------
// What the dev backend actually DOES to the working tree. The vocabulary tests
// in src/lib/cmsKinds.test.ts call none of these, which is why a rename that
// destroyed binaries, a section delete that under-reported by two pages, and an
// upload route that deleted every SVG it accepted all went unnoticed.
//
// The backend resolves ROOT from its own file location, so a copy of it in a
// temp directory works on a temp content tree: every test below drives the real
// code and nothing can reach the repo's own data/.
const temps = [];

async function devBackend() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cms-dev-"));
  temps.push(root);
  fs.mkdirSync(path.join(root, "scripts"));
  fs.copyFileSync(path.join(ROOT, "scripts", "cms-dev.mjs"), path.join(root, "scripts", "cms-dev.mjs"));
  // js-yaml is resolved by walking up from the copy, so lend it the repo's.
  fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(root, "node_modules"), "junction");
  const mod = await import(pathToFileURL(path.join(root, "scripts", "cms-dev.mjs")).href);
  return { root, mod, read: (rel) => fs.readFileSync(path.join(root, ...rel.split("/"))), fm: (rel) =>
    yaml.load(fs.readFileSync(path.join(root, ...rel.split("/")), "utf8").split("---")[1]) };
}

afterEach(() => {
  while (temps.length) fs.rmSync(temps.pop(), { recursive: true, force: true });
});

function put(root, rel, content) {
  const abs = path.join(root, ...rel.split("/"));
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

const stub = (title, extra = "") => `---\ntitle: "${title}"\n${extra}---\n\nbody\n`;

/** A content tree with a docs section holding two pages, and two games whose
    slugs are prefixes of one another. */
function seed(root) {
  put(root, "data/about.md", `---\nheaderName: "Site"\ntagline: "One line."\n---\n`);
  put(
    root,
    "data/home.json",
    JSON.stringify({ proof: ["a claim"], philosophy: ["a belief"], action: [{ page: "/games/tomba-2" }] }, null, 2) + "\n",
  );
  put(root, "data/docs/01_start/index.md", stub("Start", `sectionTitle: "Start"\n`));
  put(root, "data/docs/01_start/01_page-one/index.md", stub("Page One"));
  put(root, "data/docs/01_start/02_page-two/index.md", stub("Page Two"));
  put(root, "data/games/01_tomba/index.md", stub("Tomba"));
  put(root, "data/games/02_tomba-2/index.md", stub("Tomba 2"));
}

/** Drive one CMS route the way the editor does, without a server. */
function call(mw, method, url, body, remoteAddress = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = {};
    req.socket = { remoteAddress };
    req.destroy = () => reject(new Error("request body limit exceeded"));
    const res = {
      statusCode: 200,
      setHeader() {},
      end(text) {
        resolve({ status: this.statusCode, body: JSON.parse(text || "{}") });
      },
    };
    mw(req, res, () => resolve({ status: 404, body: { error: "no route" } }));
    if (method === "POST") {
      setImmediate(() => {
        req.emit("data", JSON.stringify(body ?? {}));
        req.emit("end");
      });
    }
  });
}

describe("dev middleware network boundary", () => {
  it("serves CMS routes over IPv4 and IPv6 loopback", async () => {
    const { mod } = await devBackend();
    const middleware = mod.createCmsMiddleware();

    const ipv4 = await call(middleware, "GET", "/api/cms/auth");
    const ipv6 = await call(middleware, "GET", "/api/cms/auth", undefined, "::1");

    expect(ipv4).toMatchObject({ status: 200, body: { env: "dev" } });
    expect(ipv6).toMatchObject({ status: 200, body: { env: "dev" } });
  });

  it("rejects a CMS request from another device on the LAN", async () => {
    const { mod } = await devBackend();
    const r = await call(
      mod.createCmsMiddleware(),
      "GET",
      "/api/cms/auth",
      undefined,
      "192.168.1.42",
    );

    expect(r).toEqual({ status: 403, body: { error: "dev_cms_local_only" } });
  });
});

describe("dev save requires the version returned by read", () => {
  const id = "data/games/01_tomba/index.md";

  it("answers 428 and writes nothing when expectedBase is missing", async () => {
    const { root, mod, read } = await devBackend();
    seed(root);
    const before = read(id);
    const r = await call(mod.createCmsMiddleware(), "POST", "/api/cms/save", {
      id,
      frontmatter: 'title: "Tomba"',
      body: "unversioned edit",
    });

    expect(r).toMatchObject({ status: 428, body: { ok: false, preconditionRequired: true } });
    expect(read(id).equals(before)).toBe(true);
  });

  it("answers 409 and preserves an edit that landed after the read", async () => {
    const { root, mod, read } = await devBackend();
    seed(root);
    const doc = mod.readEditable(id);
    const external = stub("External edit");
    put(root, id, external);
    const r = await call(mod.createCmsMiddleware(), "POST", "/api/cms/save", {
      id,
      frontmatter: doc.frontmatter,
      body: "stale editor edit",
      expectedBase: doc.baseSha,
    });

    expect(r).toMatchObject({ status: 409, body: { ok: false, staleBase: true } });
    expect(read(id).toString("utf8")).toBe(external);
  });

  it("accepts a read-first save and advances the version", async () => {
    const { root, mod } = await devBackend();
    seed(root);
    const doc = mod.readEditable(id);
    const r = await call(mod.createCmsMiddleware(), "POST", "/api/cms/save", {
      id,
      frontmatter: doc.frontmatter,
      body: "fresh edit",
      expectedBase: doc.baseSha,
    });

    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true });
    expect(r.body.baseSha).toMatch(/^[0-9a-f]{64}$/);
    expect(r.body.baseSha).not.toBe(doc.baseSha);
  });
});

describe("dev delete: a docs section takes its pages with it", () => {
  it("counts every file it removed, and says how many pages were inside", async () => {
    const { root, mod } = await devBackend();
    seed(root);
    const r = mod.deleteEditable({ id: "data/docs/01_start/index.md" });
    // It reported "removed: 1" while deleting three files, so nothing could
    // warn that two pages went with the section.
    expect(r.ok).toBe(true);
    expect(r.removed).toBe(3);
    expect(r.children).toBe(2);
    expect(r.warning).toContain("2 pages");
    expect(r.files).toEqual([
      "data/docs/01_start/01_page-one/index.md",
      "data/docs/01_start/02_page-two/index.md",
      "data/docs/01_start/index.md",
    ]);
    expect(fs.existsSync(path.join(root, "data/docs/01_start"))).toBe(false);
  });

  it("says nothing about children when a page has none", async () => {
    const { root, mod } = await devBackend();
    seed(root);
    const r = mod.deleteEditable({ id: "data/docs/01_start/01_page-one/index.md" });
    expect(r).toMatchObject({ ok: true, removed: 1, children: 0, warning: "" });
  });
});

describe("dev delete: the featured guard matches whole paths", () => {
  it("deletes a page whose slug is only a PREFIX of a featured one", async () => {
    const { root, mod } = await devBackend();
    seed(root); // home.json features /games/tomba-2
    const r = mod.deleteEditable({ id: "data/games/01_tomba/index.md" });
    expect(r.ok).toBe(true);
    expect(fs.existsSync(path.join(root, "data/games/01_tomba"))).toBe(false);
  });

  it("still refuses the page the home page actually features", async () => {
    const { root, mod } = await devBackend();
    seed(root);
    const r = mod.deleteEditable({ id: "data/games/02_tomba-2/index.md" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("/games/tomba-2");
    expect(fs.existsSync(path.join(root, "data/games/02_tomba-2"))).toBe(true);
  });
});

describe("dev rename keeps the bytes of what it moves", () => {
  it("moves a binary asset without corrupting it", async () => {
    const { root, mod } = await devBackend();
    seed(root);
    // Bytes that are not valid utf-8: a text round trip replaces them.
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe, 0x80, 0x00, 0xc3, 0x28]);
    fs.writeFileSync(path.join(root, "data/games/01_tomba/shot.png"), bytes);
    const r = mod.renameEditable({ id: "data/games/01_tomba/index.md", slug: "tomba-classic" });
    expect(r).toMatchObject({ ok: true, id: "data/games/01_tomba-classic/index.md" });
    const moved = fs.readFileSync(path.join(root, "data/games/01_tomba-classic/shot.png"));
    expect(moved.equals(bytes)).toBe(true);
  });
});

describe("dev upload", () => {
  it("accepts an SVG and leaves it on disk", async () => {
    const { root, mod } = await devBackend();
    seed(root);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8"/></svg>';
    const r = await call(mod.createCmsMiddleware(), "POST", "/api/cms/upload", {
      id: "data/docs/01_start/01_page-one/index.md",
      filename: "diagram.svg",
      contentBase64: Buffer.from(svg, "utf8").toString("base64"),
    });
    expect(r.body.ok).toBe(true);
    // The relative path the editor writes into `cover:`, which is also what the
    // prod backend answers with.
    expect(r.body.path).toBe("./diagram.svg");
    // The pipeline throws on .svg and the catch unlinks the upload, so passing
    // the extension filter alone would DELETE the file that was just accepted.
    const landed = path.join(root, "data/docs/01_start/01_page-one/diagram.svg");
    expect(fs.existsSync(landed)).toBe(true);
    expect(fs.readFileSync(landed, "utf8")).toBe(svg);
    expect(mod.listAssets("data/docs/01_start/01_page-one/index.md").assets).toEqual(["diagram.svg"]);
  });

  it("refuses a file bigger than the 3 MB prod accepts, with the same words", async () => {
    const { root, mod } = await devBackend();
    seed(root);
    const r = await call(mod.createCmsMiddleware(), "POST", "/api/cms/upload", {
      id: "data/docs/01_start/01_page-one/index.md",
      filename: "huge.png",
      contentBase64: Buffer.alloc(4 * 1024 * 1024, 7).toString("base64"),
    });
    expect(r.body).toEqual({ ok: false, error: "That file is 4.0 MB. The limit here is 3 MB." });
    expect(fs.existsSync(path.join(root, "data/docs/01_start/01_page-one/huge.png"))).toBe(false);
  });

  it("still refuses a file type neither backend serves", async () => {
    const { root, mod } = await devBackend();
    seed(root);
    const r = await call(mod.createCmsMiddleware(), "POST", "/api/cms/upload", {
      id: "data/docs/01_start/01_page-one/index.md",
      filename: "notes.pdf",
      contentBase64: Buffer.from("x").toString("base64"),
    });
    expect(r.body.ok).toBe(false);
    expect(r.body.error).toContain("Unsupported file type");
  });
});

describe("dev /post writes the fields a kind takes, and only those", () => {
  it("keeps `updated` and the `repos` LIST on a docs page", async () => {
    const { root, mod, fm } = await devBackend();
    seed(root);
    const r = mod.postItem({
      kind: "docs",
      section: "start",
      title: "Fields Probe",
      body: "body",
      summary: "one sentence",
      pageType: "reference",
      updated: "2026-08-25",
      repos: ["https://github.com/a/b", "https://github.com/c/d"],
    });
    expect(r.ok).toBe(true);
    const front = fm(r.id);
    expect(front.updated).toBe("2026-08-25");
    // A list, not a string: the scalar copy loop dropped it silently.
    expect(front.repos).toEqual(["https://github.com/a/b", "https://github.com/c/d"]);
  });

  it("refuses to write `date`, `year` and the catalogue fields onto a docs page", async () => {
    const { root, mod, fm } = await devBackend();
    seed(root);
    const r = mod.postItem({
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
    expect(r.ok).toBe(true);
    const front = fm(r.id);
    for (const key of ["date", "year", "status", "availability", "platform", "repo", "videoUrl", "venue", "authorBio"]) {
      expect(front, key).not.toHaveProperty(key);
    }
  });

  it("still writes every field the other kinds do take", async () => {
    const { root, mod, fm } = await devBackend();
    seed(root);
    const game = mod.postItem({
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
    expect(fm(game.id)).toMatchObject({
      year: "2026",
      status: "Playable alpha",
      availability: "Public build",
      platform: "playstation",
      repo: "https://github.com/x/y",
      videoUrl: "https://youtu.be/x",
      updated: "2026-08-25",
      tags: ["A"],
    });
    expect(fm(game.id)).not.toHaveProperty("summary");

    const post = mod.postItem({
      kind: "blog",
      title: "Gate Probe Post",
      body: "body",
      date: "2026-08-01",
      author: "A Person",
      authorAvatar: "https://example.test/a.png",
      authorBio: "bio",
      venue: "Some Outlet",
      videoUrl: "https://youtu.be/x",
    });
    expect(fm(post.id)).toMatchObject({
      date: "2026-08-01",
      author: "A Person",
      authorAvatar: "https://example.test/a.png",
      authorBio: "bio",
      venue: "Some Outlet",
      videoUrl: "https://youtu.be/x",
    });
  });
});

describe("dev Home composite round-trips", () => {
  it("a save that changes nothing changes no bytes", async () => {
    const { root, mod, read } = await devBackend();
    seed(root);
    const stamp = new Date("2000-01-01T00:00:00.000Z");
    fs.utimesSync(path.join(root, "data/about.md"), stamp, stamp);
    fs.utimesSync(path.join(root, "data/home.json"), stamp, stamp);
    const before = { about: read("data/about.md"), home: read("data/home.json") };
    const beforeTimes = {
      about: fs.statSync(path.join(root, "data/about.md")).mtimeMs,
      home: fs.statSync(path.join(root, "data/home.json")).mtimeMs,
    };
    for (let i = 0; i < 2; i++) {
      const doc = mod.readEditable("page:home");
      const r = mod.writeEditable("page:home", {
        about: { frontmatter: doc.about.frontmatter, body: doc.about.body },
        home: doc.home,
        expectedBase: doc.baseSha,
      });
      expect(r.ok).toBe(true);
    }
    // about.md is frontmatter alone: the write template used to add a blank
    // line after the fence and a newline at the end, every single save.
    expect(read("data/about.md").equals(before.about)).toBe(true);
    // ...and "recognition": [] was invented in a file that has no such key.
    expect(read("data/home.json").equals(before.home)).toBe(true);
    expect(JSON.parse(read("data/home.json").toString())).not.toHaveProperty("recognition");
    expect(fs.statSync(path.join(root, "data/about.md")).mtimeMs).toBe(beforeTimes.about);
    expect(fs.statSync(path.join(root, "data/home.json")).mtimeMs).toBe(beforeTimes.home);
  });

  it("restores the first file if replacing the second one fails", async () => {
    const { root, mod, read } = await devBackend();
    seed(root);
    const before = { about: read("data/about.md"), home: read("data/home.json") };
    let calls = 0;
    const io = {
      writeFileSync: fs.writeFileSync.bind(fs),
      existsSync: fs.existsSync.bind(fs),
      unlinkSync: fs.unlinkSync.bind(fs),
      renameSync(from, to) {
        calls += 1;
        if (calls === 2) throw new Error("injected second replace failure");
        return fs.renameSync(from, to);
      },
    };
    expect(() =>
      mod.replaceHomeFiles(
        [
          {
            file: path.join(root, "data/about.md"),
            before: before.about,
            after: Buffer.from("changed about", "utf8"),
          },
          {
            file: path.join(root, "data/home.json"),
            before: before.home,
            after: Buffer.from('{"changed":true}\n', "utf8"),
          },
        ],
        io,
      ),
    ).toThrow("injected second replace failure");
    expect(read("data/about.md").equals(before.about)).toBe(true);
    expect(read("data/home.json").equals(before.home)).toBe(true);
    expect(fs.readdirSync(path.join(root, "data")).some((name) => name.includes(".cms-") && name.endsWith(".tmp"))).toBe(false);
  });

  it("still writes a section someone actually filled in", async () => {
    const { root, mod, read } = await devBackend();
    seed(root);
    const doc = mod.readEditable("page:home");
    mod.writeEditable("page:home", {
      about: { frontmatter: doc.about.frontmatter, body: doc.about.body },
      home: { ...doc.home, recognition: ["An award"] },
      expectedBase: doc.baseSha,
    });
    expect(JSON.parse(read("data/home.json").toString()).recognition).toEqual(["An award"]);
  });

  it("keeps a body when about.md has one, and does not grow it", async () => {
    const { root, mod, read } = await devBackend();
    seed(root);
    put(root, "data/about.md", `---\nheaderName: "Site"\n---\n\nA paragraph.\n`);
    const before = read("data/about.md");
    const doc = mod.readEditable("page:home");
    mod.writeEditable("page:home", {
      about: { frontmatter: doc.about.frontmatter, body: doc.about.body },
      home: doc.home,
      expectedBase: doc.baseSha,
    });
    expect(read("data/about.md").equals(before)).toBe(true);
  });

  it("writes an entry that is an object without flattening it to text", async () => {
    const { root, mod, read } = await devBackend();
    seed(root);
    const doc = mod.readEditable("page:home");
    mod.writeEditable("page:home", {
      about: { frontmatter: doc.about.frontmatter, body: doc.about.body },
      home: { ...doc.home, proof: [{ label: "A card" }] },
      expectedBase: doc.baseSha,
    });
    expect(JSON.parse(read("data/home.json").toString()).proof).toEqual([{ label: "A card" }]);
  });
});
