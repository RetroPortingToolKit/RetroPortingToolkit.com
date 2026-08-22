// DEV-ONLY content editor backend. Mounted as Vite dev middleware in
// vite.config.ts (apply:"serve"), so it exists ONLY on the local dev server and
// never ships to the prerendered prod build. It lists the editable content,
// reads a file, and writes it back to disk in the working tree. Publishing IS
// here (POST /api/cms/publish commits the working tree and pushes the branch),
// but only when a person clicks Publish in the editor: nothing on this server
// commits or pushes on a timer or on save.
//
// All writes go through an allow-list of known content paths (no arbitrary
// filesystem access, no path traversal). Markdown is edited as raw frontmatter
// (YAML, validated on save) + body; home.json as validated JSON; the few
// copy-bearing TSX/TS files as raw text.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");

// copy that lives in code (no structured form possible -> raw text editing)
const COPY_FILES = [
  ["src/lib/topics.ts", "Topic definitions"],
  ["src/lib/topicPreviews.ts", "Topic blurbs"],
];
const COPY_LABEL = new Map(COPY_FILES);

const KIND_GROUP = [
  ["blog", "Articles"],
  ["hardware", "Hardware"],
  ["games", "Games"],
];

const FOLDER_RE = /^(\d+)_(.+)$/;

// ---- safety: only known content paths may be read/written ----
function isAllowed(id) {
  if (typeof id !== "string" || id.includes("..") || id.includes("\0")) return false;
  if (COPY_LABEL.has(id)) return true;
  if (id === "data/about.md") return true;
  if (/^data\/sources\/[^/]+\.md$/.test(id)) return true;
  if (/^data\/(blog|hardware|games)\/[^/]+\/index\.md$/.test(id)) return true;
  return false;
}
function resolveSafe(id) {
  if (!isAllowed(id)) return null;
  const abs = path.resolve(ROOT, id);
  if (abs !== path.join(ROOT, id)) return null; // defense in depth
  if (!abs.startsWith(ROOT + path.sep)) return null;
  return abs;
}

function typeOf(id) {
  if (id.endsWith(".md")) return "md";
  if (id.endsWith(".json")) return "json";
  return "raw";
}

// raw frontmatter TEXT (not parsed) + body, so saves are lossless
function splitRaw(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fmText: "", body: raw };
  return { fmText: m[1], body: m[2] ?? "" };
}

function mdTitle(file, fmText) {
  try {
    const fm = yaml.load(fmText) || {};
    if (typeof fm.title === "string" && fm.title.trim()) return fm.title;
  } catch {}
  const folder = path.basename(path.dirname(file));
  return (folder.match(FOLDER_RE) || [, , folder])[2];
}

// ---- inventory ----
export function listEditable() {
  const groups = [];

  // Pages: the composite Home (hero + proof/recognition/philosophy, spanning
  // about.md + home.json).
  const pages = [
    { id: "page:home", title: "Home", sub: "hero, proof, recognition, philosophy", type: "home" },
  ];
  groups.push({ group: "Pages", items: pages });

  for (const [dir, label] of KIND_GROUP) {
    const base = path.join(DATA_DIR, dir);
    if (!fs.existsSync(base)) continue;
    const items = fs
      .readdirSync(base)
      .map((folder) => ({ folder, file: path.join(base, folder, "index.md") }))
      .filter((x) => fs.existsSync(x.file))
      .sort((a, b) => a.folder.localeCompare(b.folder))
      .map(({ folder, file }) => {
        const { fmText } = splitRaw(fs.readFileSync(file, "utf8"));
        const slug = (folder.match(FOLDER_RE) || [, , folder])[2];
        return { id: `data/${dir}/${folder}/index.md`, title: mdTitle(file, fmText), sub: slug, type: "md" };
      });
    if (items.length) groups.push({ group: label, items });
  }

  const sourcesDir = path.join(DATA_DIR, "sources");
  if (fs.existsSync(sourcesDir)) {
    const items = fs
      .readdirSync(sourcesDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map((f) => {
        const { fmText } = splitRaw(fs.readFileSync(path.join(sourcesDir, f), "utf8"));
        let title = f.replace(/\.md$/, "");
        try {
          const fm = yaml.load(fmText) || {};
          if (typeof fm.title === "string" && fm.title.trim()) title = fm.title;
        } catch {}
        return { id: `data/sources/${f}`, title, sub: f.replace(/\.md$/, ""), type: "md" };
      });
    if (items.length) groups.push({ group: "Sources", items });
  }

  // The copy-bearing code files (COPY_FILES) are intentionally NOT listed here:
  // they're code, not pages. They stay allow-listed so they CAN be edited if a
  // future UI exposes them, but the sidebar shows pages only.

  return groups;
}

// ---- composite "Home" page: about.md (hero) + home.json (proof/recognition/philosophy) ----
const ABOUT_FILE = path.join(DATA_DIR, "about.md");
const HOME_FILE = path.join(DATA_DIR, "home.json");

function str(v) {
  return typeof v === "string" ? v : "";
}

function readHome() {
  const aboutRaw = fs.existsSync(ABOUT_FILE) ? fs.readFileSync(ABOUT_FILE, "utf8") : "";
  const { fmText, body } = splitRaw(aboutRaw);
  let fields = { headerName: "", heroTitle: "", role: "", eyebrow: "", tagline: "", email: "", locations: [] };
  try {
    const fm = yaml.load(fmText) || {};
    fields = {
      headerName: str(fm.headerName),
      heroTitle: str(fm.heroTitle),
      role: str(fm.role),
      eyebrow: str(fm.eyebrow),
      tagline: str(fm.tagline),
      email: str(fm.email),
      locations: Array.isArray(fm.locations) ? fm.locations.filter((x) => typeof x === "string") : [],
    };
  } catch {}
  let home = { proof: [], recognition: [], philosophy: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(HOME_FILE, "utf8"));
    home = {
      proof: Array.isArray(parsed.proof) ? parsed.proof : [],
      recognition: Array.isArray(parsed.recognition) ? parsed.recognition : [],
      philosophy: Array.isArray(parsed.philosophy) ? parsed.philosophy : [],
    };
  } catch {}
  return {
    id: "page:home",
    type: "home",
    about: { frontmatter: fmText, body: body.replace(/^\n+/, ""), fields },
    home,
  };
}

function writeHome(payload) {
  const about = payload.about || {};
  const fm = String(about.frontmatter ?? "");
  try {
    yaml.load(fm);
  } catch (e) {
    return { ok: false, error: `about.md frontmatter: ${e.message}` };
  }
  const aboutOut = `---\n${fm.trim()}\n---\n\n${String(about.body ?? "").replace(/\s+$/, "")}\n`;
  const home = payload.home || {};
  const homeOut =
    JSON.stringify(
      {
        // merge over the stored file so a save never drops sections the
        // editor does not know about (videos, capabilities, pillars, ...)
        ...(() => {
          try {
            return JSON.parse(fs.readFileSync(HOME_FILE, "utf8"));
          } catch {
            return {};
          }
        })(),
        proof: Array.isArray(home.proof) ? home.proof.map((p) => String(p)) : [],
        recognition: Array.isArray(home.recognition) ? home.recognition : [],
        philosophy: Array.isArray(home.philosophy) ? home.philosophy.map((p) => String(p)) : [],
      },
      null,
      2,
    ) + "\n";
  fs.writeFileSync(ABOUT_FILE, aboutOut);
  fs.writeFileSync(HOME_FILE, homeOut);
  return { ok: true };
}

// A content-hash of the on-disk file(s) backing an id, at load time. The editor
// sends this back with each save (expectedBase); a save is rejected if the file
// changed underneath it (e.g. the background auto-pull brought in a live edit),
// so a stale browser buffer can never silently overwrite newer content.
export function fileBaseSha(id) {
  try {
    if (id === "page:home") {
      const a = fs.existsSync(ABOUT_FILE) ? fs.readFileSync(ABOUT_FILE) : Buffer.alloc(0);
      const h = fs.existsSync(HOME_FILE) ? fs.readFileSync(HOME_FILE) : Buffer.alloc(0);
      return crypto.createHash("sha256").update(a).update("\0").update(h).digest("hex");
    }
    const abs = resolveSafe(id);
    if (!abs || !fs.existsSync(abs)) return "";
    return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
  } catch {
    return "";
  }
}

// ---- read one ----
function readOne(id) {
  const abs = resolveSafe(id);
  if (!abs || !fs.existsSync(abs)) return null;
  const raw = fs.readFileSync(abs, "utf8");
  const type = typeOf(id);
  if (type === "md") {
    const { fmText, body } = splitRaw(raw);
    let fields = {};
    try {
      const fm = yaml.load(fmText) || {};
      fields = {
        title: typeof fm.title === "string" ? fm.title : "",
        desc: typeof fm.desc === "string" ? fm.desc : "",
        kicker: typeof fm.kicker === "string" ? fm.kicker : "",
        date: typeof fm.date === "string" ? fm.date : "",
        cover: typeof fm.cover === "string" ? fm.cover : "",
        platform: typeof fm.platform === "string" ? fm.platform : "",
        status: typeof fm.status === "string" ? fm.status : "",
        repo: typeof fm.repo === "string" ? fm.repo : "",
        author: typeof fm.author === "string" ? fm.author : "",
        authorAvatar: typeof fm.authorAvatar === "string" ? fm.authorAvatar : "",
        draft: fm.draft === true,
        featured: fm.featured === true,
        tags: Array.isArray(fm.tags) ? fm.tags.filter((t) => typeof t === "string") : [],
      };
    } catch {}
    return { id, type, frontmatter: fmText, body: body.replace(/^\n+/, ""), fields };
  }
  return { id, type, raw };
}

export function readEditable(id) {
  const data = id === "page:home" ? readHome() : readOne(id);
  if (!data) return null;
  data.baseSha = fileBaseSha(id);
  return data;
}

// ---- write one ----
// Canonical on-disk serialization (pure, exported for tests). Must match what
// readOne/splitRaw expect, so read->write is byte-identical (lossless).
export function serializeMd(frontmatter, body) {
  const fm = String(frontmatter ?? "");
  const b = String(body ?? "").replace(/\s+$/, "");
  return `---\n${fm.trim()}\n---\n\n${b}\n`;
}
export function serializeJson(raw) {
  const s = String(raw ?? "");
  return s.endsWith("\n") ? s : s + "\n";
}

function writeOne(id, payload) {
  const abs = resolveSafe(id);
  if (!abs) return { ok: false, error: "not_editable" };
  const type = typeOf(id);
  let out;
  if (type === "md") {
    const fm = String(payload.frontmatter ?? "");
    try {
      yaml.load(fm);
    } catch (e) {
      return { ok: false, error: `invalid YAML frontmatter: ${e.message}` };
    }
    out = serializeMd(fm, payload.body);
  } else if (type === "json") {
    const raw = String(payload.raw ?? "");
    try {
      JSON.parse(raw);
    } catch (e) {
      return { ok: false, error: `invalid JSON: ${e.message}` };
    }
    out = serializeJson(raw);
  } else {
    out = String(payload.raw ?? "");
    if (!out.trim()) return { ok: false, error: "refusing to write empty file" };
  }
  fs.writeFileSync(abs, out);
  return { ok: true, bytes: Buffer.byteLength(out) };
}

// MUST be called inside withGitLock (the save route does this), so the base
// check + write can't interleave a rebase's checkout of the same file.
export function writeEditable(id, payload) {
  // Optimistic concurrency: reject if the file changed since the editor loaded
  // it (a background auto-pull, or another tab). An absent/empty expectedBase
  // skips the check (a freshly-restarted editor with no base yet): the mutex
  // still orders the write against any pull.
  const expected = payload && typeof payload.expectedBase === "string" ? payload.expectedBase : "";
  if (expected && expected !== fileBaseSha(id)) {
    return {
      ok: false,
      staleBase: true,
      baseSha: fileBaseSha(id),
      error: "The live site changed this page since you opened it. Load the live version, then re-apply your edit.",
    };
  }
  const result = id === "page:home" ? writeHome(payload) : writeOne(id, payload);
  if (result.ok) result.baseSha = fileBaseSha(id);
  return result;
}

// ---- create a new item ----
// Item identity comes from the folder name (`<order>_<slug>`), so creating a
// post means allocating a folder, not just writing a file. The slug becomes the
// URL and is permanent in practice (renaming the folder changes the URL), so it
// is derived from the title once, here, and never rewritten on later saves.
export const KIND_DIRS = new Set(["blog", "hardware", "games"]);

// Reads naturally in the stub description: "this post", not "this blog".
const KIND_NOUN = { blog: "article", hardware: "platform", games: "game" };

export function slugify(title) {
  return String(title)
    .normalize("NFKD")
    .split("")
    // NFKD split accents into base letter + combining mark; drop the marks
    // (and any other non-ascii) so the slug is url-safe
    .filter((c) => (c.codePointAt(0) ?? 0) < 128)
    .join("")
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// The frontmatter a new item needs to render. Mirrors the shape of the existing
// items in data/, per kind: talks carry a venue and duration, dated kinds get a
// date, project/talk get a year.
function stubFrontmatter(kind, title) {
  const today = new Date().toISOString().slice(0, 10);
  const year = today.slice(0, 4);
  const esc = (s) => String(s).replace(/"/g, '\\"');
  const lines = [
    `title: "${esc(title)}"`,
    `kicker: "New"`,
    `tags: ["New"]`,
    `featured: false`,
    `desc: "One line describing this ${KIND_NOUN[kind]}."`,
  ];
  if (kind === "blog") lines.push(`date: "${today}"`);
  else lines.push(`year: "${year}"`);
  return lines.join("\n");
}

function nextOrder(dir) {
  let max = 0;
  if (fs.existsSync(dir)) {
    for (const folder of fs.readdirSync(dir)) {
      const m = folder.match(FOLDER_RE);
      if (m) max = Math.max(max, Number(m[1]) || 0);
    }
  }
  return String(max + 1).padStart(2, "0");
}

export function createEditable(payload) {
  const kind = String(payload?.kind || "");
  const title = String(payload?.title || "").trim();
  if (!KIND_DIRS.has(kind)) return { ok: false, error: "unknown_kind" };
  if (!title) return { ok: false, error: "A title is required." };

  const slug = slugify(title);
  if (!slug) return { ok: false, error: "That title has no usable characters for a URL." };

  const base = path.join(DATA_DIR, kind);
  // A duplicate slug would collide on the public URL even though the folder
  // names differ by their order prefix, so check the slug, not the folder.
  if (fs.existsSync(base)) {
    for (const folder of fs.readdirSync(base)) {
      const existing = (folder.match(FOLDER_RE) || [, , folder])[2];
      if (existing === slug) {
        return { ok: false, error: `"${slug}" already exists in ${kind}.` };
      }
    }
  }

  const folder = `${nextOrder(base)}_${slug}`;
  const id = `data/${kind}/${folder}/index.md`;
  // Route the write through the same allow-list every other write uses, so a
  // crafted kind/title can never escape data/.
  const abs = resolveSafe(id);
  if (!abs) return { ok: false, error: "refused" };

  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const body = "Write the post here. This body renders as markdown on the item page.\n";
  fs.writeFileSync(abs, `---\n${stubFrontmatter(kind, title)}\n---\n\n${body}`);
  return { ok: true, id, slug, kind };
}

// ---- media upload (DEV ONLY): drop a raw image/video into a content item's
// folder, run the media pipeline (cwebp/ffmpeg) on it, and return the path to
// reference in frontmatter. The pipeline binaries only exist on the dev machine,
// so this is a dev-side action (upload + process here, then publish).
const UPLOAD_EXT = /\.(jpe?g|png|webp|gif|avif|mp4|mov|m4v|webm)$/i;

function contentFolder(id) {
  if (!/^data\/(blog|hardware|games)\/[^/]+\/index\.md$/.test(id)) return null;
  const abs = resolveSafe(id);
  return abs ? path.dirname(abs) : null;
}

async function doUpload({ id, filename, contentBase64 }) {
  const folder = contentFolder(id);
  if (!folder) return { ok: false, error: "Uploads are only for article / hardware / game items." };
  const clean = path.basename(String(filename || "")).replace(/[^\w.-]/g, "_");
  if (!clean || clean.startsWith(".") || !UPLOAD_EXT.test(clean)) {
    return { ok: false, error: "Unsupported file type (use jpg/png/webp/gif/mp4/mov)." };
  }
  let buf;
  try {
    buf = Buffer.from(String(contentBase64 || ""), "base64");
  } catch {
    return { ok: false, error: "Could not decode the upload." };
  }
  if (!buf.length) return { ok: false, error: "The file was empty." };
  const rawPath = path.join(folder, clean);
  fs.writeFileSync(rawPath, buf);
  // Run the pipeline in SINGLE-FILE mode on just this upload (converts it, merges
  // its placeholder into lqip.ts). NEVER the full walk, which would re-convert and
  // delete originals across all of data/ + public/.
  const relFile = path.relative(ROOT, rawPath);
  try {
    await new Promise((resolve, reject) => {
      execFile(
        "node",
        ["scripts/optimize-media.mjs", relFile],
        { cwd: ROOT, timeout: 120000, env: { ...process.env } },
        (err, stdout, stderr) => (err ? reject(new Error(String(stderr || err.message).slice(0, 200))) : resolve()),
      );
    });
  } catch (e) {
    // clean up the raw upload so a failed convert doesn't leave a stray original
    try {
      if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath);
    } catch {
      /* ignore */
    }
    return { ok: false, error: "Media processing failed (is ffmpeg/cwebp installed?): " + e.message };
  }
  // The path the frontmatter should reference (jpg/png -> webp; mov/m4v -> mp4;
  // mp4 keeps .mp4 and also gets a .webm; webp/gif/avif/webm stay as-is).
  const ext = path.extname(clean).toLowerCase();
  const base = clean.slice(0, -ext.length);
  const outName = /\.(jpe?g|png)$/i.test(clean) ? `${base}.webp` : /\.(mov|m4v)$/i.test(clean) ? `${base}.mp4` : clean;
  return { ok: true, path: `./${outName}` };
}

// ---- publish + sync: the local repo tracks `main` (== prod). Publishing commits
// the working tree, folds in any edits made on the live site (the prod CMS
// commits straight to main), and pushes main, which redeploys the site.
// Runs on the local dev server, using the machine's git credentials.
function git(args) {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      args,
      { cwd: ROOT, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, timeout: 60000 },
      (err, stdout, stderr) => {
        if (err) reject(new Error((stderr || stdout || err.message).trim()));
        else resolve(String(stdout || "").trim());
      },
    );
  });
}

// ---- git safety primitives (shared by save, publish, sync, and auto-pull) ----
//
// One in-process mutex serializes EVERY repo-mutating operation, so two git
// processes can never run at once (.git/index.lock contention) and a content
// save can never interleave a rebase's checkout of the same file. Every entry
// point wraps its WHOLE multi-step sequence in withGitLock, not individual git
// calls, so steps from two operations can't interleave.
let gitQueue = Promise.resolve();
function withGitLock(fn) {
  const run = gitQueue.then(fn, fn);
  // keep the chain alive regardless of this op's outcome
  gitQueue = run.then(
    () => {},
    () => {},
  );
  return run;
}

const GIT_DIR = path.join(ROOT, ".git");

// Crash recovery: a rebase that died mid-way (git()'s 60s timeout SIGTERM, or
// a supervisor restarting vite) leaves .git/rebase-merge|rebase-apply on disk plus a
// conflicted tree. The in-memory mutex can't survive a process restart, so every
// locked op clears any interrupted rebase FIRST, otherwise the tree looks
// permanently dirty and a later publish could commit conflict markers on a
// detached HEAD and push them to prod.
async function recoverInterruptedRebase() {
  if (fs.existsSync(path.join(GIT_DIR, "rebase-merge")) || fs.existsSync(path.join(GIT_DIR, "rebase-apply"))) {
    try {
      await git(["rebase", "--abort"]);
    } catch {
      /* best effort; if it can't abort, the dirty-tree guards below still hold */
    }
  }
}

// Never commit/push while HEAD is detached (e.g. left over from an interrupted
// rebase), which would push a dangling commit, not advance main.
async function assertOnBranch() {
  try {
    await git(["symbolic-ref", "-q", "HEAD"]);
  } catch {
    throw new Error("Repo HEAD is detached (interrupted rebase?). Recover in git before publishing.");
  }
}

function doPublish(dryRun) {
  return withGitLock(async () => {
    await recoverInterruptedRebase();
    await assertOnBranch();
    const status = await git(["status", "--porcelain"]);
    const changed = status.split("\n").filter(Boolean);
    if (dryRun) {
      // verify the dev server can authenticate + push, without deploying
      await git(["push", "--dry-run", "origin", "HEAD:main"]);
      return { ok: true, dryRun: true, changed: changed.length };
    }
    if (changed.length) {
      await git(["add", "-A"]);
      await git(["commit", "-m", `Publish via editor (${changed.length} file${changed.length === 1 ? "" : "s"})`]);
      // Fold in any edits made on the live site first, so dev and prod never diverge.
      try {
        await git(["fetch", "origin", "main"]);
        await git(["rebase", "origin/main"]);
      } catch {
        // Same content edited on both dev and the live site: abort back to our
        // clean commit and tell the user to Sync + retry.
        try {
          await git(["rebase", "--abort"]);
        } catch {
          /* not mid-rebase */
        }
        return {
          ok: false,
          conflict: true,
          error: "The live site has newer edits to the same content. Click 'Sync from live', then publish again.",
        };
      }
    } else {
      // Clean tree, but a PREVIOUS publish may have committed and then failed on
      // the push (60s timeout, network blip), leaving that commit stranded. Fetch
      // so we can tell whether HEAD is ahead of origin, and re-push if so instead
      // of falsely reporting "nothing to publish".
      await git(["fetch", "origin", "main"]);
    }
    const ahead = Number(await git(["rev-list", "--count", "origin/main..HEAD"])) || 0;
    if (!ahead) return { ok: false, nothing: true, error: "Nothing to publish." };
    await assertOnBranch(); // never push a detached HEAD
    try {
      await git(["push", "origin", "HEAD:main"]); // prod -> Vercel redeploys
    } catch (e) {
      // The commit is safe locally; report a retryable state (a retry re-pushes it).
      return {
        ok: false,
        pushFailed: true,
        error: `Saved locally, but the push failed (${String(e.message).split("\n")[0]}). Click Publish again to retry.`,
      };
    }
    const sha = await git(["rev-parse", "--short", "HEAD"]);
    return { ok: true, sha, changed: changed.length };
  });
}

// ---- pull edits made on the live site into the local working tree, so dev
// reflects prod. Only runs on a clean tree, so it never clobbers unpublished dev
// edits (auto-save keeps the tree dirty while you're editing; publish first).
// MUST be called inside withGitLock. Rebase (not ff-only) so an un-pushed local
// commit ahead of origin still folds the live edits in cleanly.
async function pullFromLive() {
  await recoverInterruptedRebase();
  const status = await git(["status", "--porcelain"]);
  if (status.split("\n").filter(Boolean).length) return { dirty: true };
  const before = await git(["rev-parse", "HEAD"]);
  await git(["fetch", "origin", "main"]);
  try {
    await git(["rebase", "origin/main"]);
  } catch {
    try {
      await git(["rebase", "--abort"]);
    } catch {
      /* not mid-rebase */
    }
    return { conflict: true };
  }
  const after = await git(["rev-parse", "HEAD"]);
  return { updated: before !== after, before, after };
}

// Manual "Sync from live" button.
function doSync() {
  return withGitLock(async () => {
    const r = await pullFromLive();
    if (r.dirty) {
      return { ok: false, dirty: true, error: "You have unpublished edits on dev. Publish them first, then Sync." };
    }
    if (r.conflict) {
      return {
        ok: false,
        conflict: true,
        error: "The live site edited the same content you have locally. Resolve it in git, then Sync again.",
      };
    }
    return { ok: true, updated: r.updated, sha: r.after.slice(0, 7) };
  });
}

// ---- background auto-pull: keep the dev working tree current with edits made on
// the live site, even when the /admin editor is closed, so dev never silently
// falls behind prod. Runs ONLY on the durable dev instance (see vite.config),
// pull-only (never pushes, so it can never deploy), and skips whenever the tree
// is dirty so it can't touch unpublished dev edits.
let pollerRunning = false;
export function startAutoPull(opts = {}) {
  const enabled = opts.enabled !== false;
  if (!enabled) return () => {};
  // one poller per process, resilient to a module re-instantiation on config HMR
  if (globalThis.__cmsPoller) return () => {};
  globalThis.__cmsPoller = true;
  pollerRunning = true;
  const intervalMs = Math.max(10000, Number(opts.intervalMs) || 45000);
  const notify = typeof opts.notify === "function" ? opts.notify : () => {};
  let inFlight = false; // non-reentrant: never queue a second poll behind a stuck one
  let conflictLogged = false;

  const tick = () => {
    if (!pollerRunning || inFlight) return;
    inFlight = true;
    withGitLock(pullFromLive)
      .then((r) => {
        if (r.conflict) {
          if (!conflictLogged) {
            console.warn("[cms] auto-pull paused: local diverges from the live site (resolve in git, or Publish/Sync).");
            conflictLogged = true;
          }
          return;
        }
        conflictLogged = false;
        if (r.updated) {
          console.log(`[cms] auto-pulled live edits -> ${r.after.slice(0, 7)}`);
          notify({ sha: r.after.slice(0, 7) });
        }
      })
      .catch((e) => console.warn("[cms] auto-pull error:", e.message))
      .finally(() => {
        inFlight = false;
      });
  };

  const timer = setInterval(tick, intervalMs);
  if (timer.unref) timer.unref(); // don't hold the process open
  const stop = () => {
    pollerRunning = false;
    clearInterval(timer);
    globalThis.__cmsPoller = false;
  };
  return stop;
}


// ---- item folders: an item is index.md plus the media it embeds ----
const ITEM_RE = /^data\/(blog|hardware|games)\/([^/]+)\/index\.md$/;
const ASSET_EXT = /\.(png|jpe?g|webp|gif|avif|svg|mp4|webm|mov)$/i;

export function itemFolder(id) {
  const m = typeof id === "string" ? id.match(ITEM_RE) : null;
  return m ? `data/${m[1]}/${m[2]}` : null;
}

export function safeAssetName(name) {
  const base = String(name).split(/[\\/]/).pop() || "";
  const clean = base.trim().replace(/\s+/g, "-").replace(/[^A-Za-z0-9._-]/g, "");
  if (!clean || clean.startsWith(".") || clean.includes("..")) return null;
  if (!ASSET_EXT.test(clean)) return null;
  return clean;
}

export function listAssets(id) {
  const folder = itemFolder(id);
  if (!folder) return { ok: false, error: "not_an_item" };
  const abs = path.join(ROOT, folder);
  if (!fs.existsSync(abs)) return { ok: true, assets: [] };
  const assets = fs
    .readdirSync(abs)
    .filter((f) => f !== "index.md" && ASSET_EXT.test(f))
    .sort();
  return { ok: true, assets };
}

export function deleteAsset(payload) {
  const folder = itemFolder(String(payload?.id || ""));
  if (!folder) return { ok: false, error: "not_an_item" };
  const name = safeAssetName(String(payload?.name || ""));
  if (!name) return { ok: false, error: "bad_name" };
  const abs = path.join(ROOT, folder, name);
  if (!fs.existsSync(abs)) return { ok: false, error: "not_found" };
  fs.rmSync(abs);
  return { ok: true, path: `${folder}/${name}` };
}

export function deleteEditable(payload) {
  const id = String(payload?.id || "");
  const folder = itemFolder(id);
  if (!folder) return { ok: false, error: "Only content items can be deleted." };
  const abs = path.join(ROOT, folder);
  if (!fs.existsSync(abs)) return { ok: false, error: "not_found" };
  const slug = folder.split("/").pop().replace(/^\d+_/, "");
  const removed = [folder];
  fs.rmSync(abs, { recursive: true, force: true });
  // The generated preview is keyed to the slug and nothing else references it.
  for (const ext of ["mp4", "webp", "webm", "png", "jpg"]) {
    const prev = path.join(ROOT, "public", "previews", `${slug}.${ext}`);
    if (fs.existsSync(prev)) {
      fs.rmSync(prev);
      removed.push(`public/previews/${slug}.${ext}`);
    }
  }
  return { ok: true, removed: removed.length, files: removed };
}

const folderSlugOf = (folder) => (folder.match(/^(\d+)_(.+)$/) || [, , folder])[2];

function foldersOf(kind) {
  const base = path.join(DATA_DIR, kind);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).filter((f) => fs.existsSync(path.join(base, f, "index.md")));
}

export function renameEditable(payload) {
  const id = String(payload?.id || "");
  const m = id.match(ITEM_RE);
  if (!m) return { ok: false, error: "Only content items can be renamed." };
  const [, kind, folder] = m;
  const slug = slugify(String(payload?.slug || ""));
  if (!slug) return { ok: false, error: "That slug has no usable characters for a URL." };
  if (slug === folderSlugOf(folder)) return { ok: true, id, slug, unchanged: true };
  if (foldersOf(kind).some((f) => folderSlugOf(f) === slug)) {
    return { ok: false, error: `"${slug}" already exists in ${kind}.` };
  }
  const prefix = (folder.match(/^(\d+)_/) || [])[1];
  const source = path.join(DATA_DIR, kind, folder);
  const targetFolder = `${prefix ? `${prefix}_` : ""}${slug}`;
  fs.renameSync(source, path.join(DATA_DIR, kind, targetFolder));
  return { ok: true, id: `data/${kind}/${targetFolder}/index.md`, slug };
}

export function duplicateEditable(payload) {
  const id = String(payload?.id || "");
  const m = id.match(ITEM_RE);
  if (!m) return { ok: false, error: "Only content items can be duplicated." };
  const [, kind] = m;
  const abs = path.join(ROOT, id);
  if (!fs.existsSync(abs)) return { ok: false, error: "not_found" };
  const { fmText, body } = splitRaw(fs.readFileSync(abs, "utf8"));
  let fm = {};
  try {
    fm = yaml.load(fmText) || {};
  } catch {
    return { ok: false, error: "That page's frontmatter is not valid YAML." };
  }
  const title = `${String(fm.title || "Untitled")} (copy)`;
  const slug = slugify(title);
  const folders = foldersOf(kind);
  if (folders.some((f) => folderSlugOf(f) === slug)) {
    return { ok: false, error: `"${slug}" already exists in ${kind}.` };
  }
  fm.title = title;
  fm.draft = true;
  fm.featured = false;
  const order = String(Math.max(0, ...folders.map((f) => Number((f.match(/^(\d+)_/) || [])[1] || 0))) + 1).padStart(2, "0");
  const dir = path.join(DATA_DIR, kind, `${order}_${slug}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.md"), `---\n${yaml.dump(fm).trim()}\n---\n\n${body.replace(/^\n+/, "")}`);
  return { ok: true, id: `data/${kind}/${order}_${slug}/index.md`, slug, title };
}

// ---- middleware ----
function send(res, status, body, headers) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  if (headers) for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

// A NON-secret "signed-in" flag scoped to the registrable domain of whatever
// host is serving, so a subdomain editor and the apex site share it and the live
// site can show its "Edit page" button. Readable by JS (not HttpOnly); it only
// reveals a button linking to the gated editor, so it is a UI hint, not a
// security boundary. Skipped on localhost.
function hintCookie(req, on) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .split(":")[0];
  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2) return null; // localhost / bare hostname
  const domain = parts.slice(-2).join(".");
  return on
    ? `cms_hint=1; Domain=${domain}; Path=/; SameSite=Lax; Secure; Max-Age=604800`
    : `cms_hint=; Domain=${domain}; Path=/; SameSite=Lax; Secure; Max-Age=0`;
}

function readBody(req, cb, limit = 2_000_000) {
  let raw = "";
  req.on("data", (c) => {
    raw += c;
    if (raw.length > limit) req.destroy();
  });
  req.on("end", () => cb(raw));
}

const COOKIE = "cms_session";

// Returns the dev middleware. The dev editor is open: it binds to localhost and
// writes to the working tree, and there is no password to hold. Production auth
// (GitHub sign-in, agent bearer tokens) lives in api/cms.ts.
export function createCmsMiddleware() {

  return function cmsMiddleware(req, res, next) {
    const url = (req.originalUrl || req.url || "").split("?")[0];
    if (!url.startsWith("/api/cms/")) return next();
    const query = new URLSearchParams((req.originalUrl || req.url || "").split("?")[1] || "");

    if (url === "/api/cms/auth" && req.method === "GET") {
      return send(res, 200, { required: false, authed: true, github: false, user: null, env: "dev" });
    }
    if (url === "/api/cms/logout" && req.method === "POST") {
      const cookies = [`${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`];
      const h = hintCookie(req, false);
      if (h) cookies.push(h);
      return send(res, 200, { ok: true }, { "set-cookie": cookies });
    }

    if (url === "/api/cms/list" && req.method === "GET") {
      try {
        return send(res, 200, { groups: listEditable() });
      } catch (e) {
        return send(res, 500, { error: e.message });
      }
    }
    if (url === "/api/cms/read" && req.method === "GET") {
      const data = readEditable(query.get("id") || "");
      return data ? send(res, 200, data) : send(res, 404, { error: "not_found" });
    }
    if (url === "/api/cms/sync" && req.method === "POST") {
      doSync()
        .then((r) => send(res, r.ok ? 200 : 400, r))
        .catch((e) => send(res, 500, { ok: false, error: e.message }));
      return;
    }
    if (url === "/api/cms/publish" && req.method === "POST") {
      return readBody(req, (raw) => {
        let body = {};
        try {
          body = JSON.parse(raw || "{}");
        } catch {
          /* empty body = real publish */
        }
        doPublish(!!body.dryRun)
          .then((r) => send(res, r.ok ? 200 : 400, r))
          .catch((e) => send(res, 500, { ok: false, error: e.message }));
      });
    }
    if (url === "/api/cms/upload" && req.method === "POST") {
      return readBody(
        req,
        (raw) => {
          let data;
          try {
            data = JSON.parse(raw || "{}");
          } catch {
            return send(res, 400, { ok: false, error: "bad_request" });
          }
          doUpload({
            id: String(data.id || ""),
            filename: String(data.filename || ""),
            contentBase64: String(data.contentBase64 || ""),
          })
            .then((r) => send(res, r.ok ? 200 : 400, r))
            .catch((e) => send(res, 500, { ok: false, error: e.message }));
        },
        300_000_000, // allow large media (base64-inflated)
      );
    }
    if (url === "/api/cms/assets" && req.method === "GET") {
      return send(res, 200, listAssets(query.get("id") || ""));
    }
    if (url === "/api/cms/asset/delete" && req.method === "POST") {
      return readBody(req, (raw) => {
        let body = {};
        try {
          body = JSON.parse(raw || "{}");
        } catch {
          return send(res, 400, { ok: false, error: "bad_request" });
        }
        const r = deleteAsset(body);
        return send(res, r.ok ? 200 : 400, r);
      });
    }
    if (url === "/api/cms/rename" && req.method === "POST") {
      return readBody(req, (raw) => {
        let body = {};
        try {
          body = JSON.parse(raw || "{}");
        } catch {
          return send(res, 400, { ok: false, error: "bad_request" });
        }
        const r = renameEditable(body);
        return send(res, r.ok ? 200 : 400, r);
      });
    }
    if (url === "/api/cms/duplicate" && req.method === "POST") {
      return readBody(req, (raw) => {
        let body = {};
        try {
          body = JSON.parse(raw || "{}");
        } catch {
          return send(res, 400, { ok: false, error: "bad_request" });
        }
        const r = duplicateEditable(body);
        return send(res, r.ok ? 200 : 400, r);
      });
    }
    if (url === "/api/cms/delete" && req.method === "POST") {
      return readBody(req, (raw) => {
        let body = {};
        try {
          body = JSON.parse(raw || "{}");
        } catch {
          return send(res, 400, { ok: false, error: "bad_request" });
        }
        const r = deleteEditable(body);
        return send(res, r.ok ? 200 : 400, r);
      });
    }
    if (url === "/api/cms/save" && req.method === "POST") {
      return readBody(req, (raw) => {
        let data;
        try {
          data = JSON.parse(raw || "{}");
        } catch {
          return send(res, 400, { error: "bad_request" });
        }
        // Serialize the write against publish / sync / auto-pull so a save can
        // never interleave a rebase's checkout of the same file.
        withGitLock(() => writeEditable(String(data.id || ""), data))
          .then((result) => send(res, result.ok ? 200 : result.staleBase ? 409 : 400, result))
          .catch((e) => send(res, 500, { ok: false, error: e.message }));
      });
    }
    if (url === "/api/cms/new" && req.method === "POST") {
      return readBody(req, (raw) => {
        let data;
        try {
          data = JSON.parse(raw || "{}");
        } catch {
          return send(res, 400, { error: "bad_request" });
        }
        // Same lock as save: creating a folder mid-rebase would leave an
        // untracked file the rebase then trips over.
        withGitLock(() => createEditable(data))
          .then((result) => send(res, result.ok ? 200 : 400, result))
          .catch((e) => send(res, 500, { ok: false, error: e.message }));
      });
    }
    return send(res, 404, { error: "unknown_cms_route" });
  };
}
