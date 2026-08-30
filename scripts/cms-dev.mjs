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
  ["docs", "Docs"],
];

const FOLDER_RE = /^(\d+)_(.+)$/;
const folderSlugOf = (folder) => (folder.match(FOLDER_RE) || [, , folder])[2];

// An item is a folder holding index.md. Docs are the one kind that nests:
// data/docs/<NN>_<section>/index.md is a section's own page and
// data/docs/<NN>_<section>/<NN>_<page>/index.md is a page inside it, so a docs
// id carries one or two folder segments where every other kind carries exactly
// one. Everything that takes an id apart goes through itemParts(), so the rule
// lives in one place here and in one place in api/cms.ts. The two backends
// serve the same editor and must agree.
const ITEM_RE = /^data\/(blog|hardware|games|docs)\/([^/]+(?:\/[^/]+)?)\/index\.md$/;
const MAX_FOLDER_DEPTH = { blog: 1, hardware: 1, games: 1, docs: 2 };

export function itemParts(id) {
  const m = typeof id === "string" ? id.match(ITEM_RE) : null;
  if (!m) return null;
  const [, kind, folder] = m;
  const segments = folder.split("/");
  if (segments.length > (MAX_FOLDER_DEPTH[kind] ?? 1)) return null;
  return {
    kind,
    folder,
    parent: segments.slice(0, -1).join("/"),
    leaf: segments[segments.length - 1],
    slug: segments.map(folderSlugOf).join("/"),
  };
}

// ---- safety: only known content paths may be read/written ----
function isAllowed(id) {
  if (typeof id !== "string" || id.includes("..") || id.includes("\0")) return false;
  if (COPY_LABEL.has(id)) return true;
  if (id === "data/about.md") return true;
  if (/^data\/sources\/[^/]+\.md$/.test(id)) return true;
  if (itemParts(id)) return true;
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

// ---- item folders on disk ----
// Every item folder in a kind, relative to data/<kind>/: one level for the flat
// kinds, two for docs (the section folder, then each page folder inside it).
function itemFoldersOf(kind) {
  const base = path.join(DATA_DIR, kind);
  if (!fs.existsSync(base)) return [];
  const maxDepth = MAX_FOLDER_DEPTH[kind] ?? 1;
  const out = [];
  const scan = (rel, depth) => {
    const abs = rel ? path.join(base, ...rel.split("/")) : base;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (fs.existsSync(path.join(base, ...child.split("/"), "index.md"))) out.push(child);
      if (depth + 1 < maxDepth) scan(child, depth + 1);
    }
  };
  scan("", 0);
  return out.sort();
}

/** The folder names an item at data/<kind>/<parent>/ sits beside, so slugs and
    order prefixes can be checked against its real siblings. A docs section
    counts as a folder at the top of the kind as soon as it holds a page, even
    before it has an index.md of its own. */
function foldersOf(kind, parent = "") {
  const base = parent
    ? path.join(DATA_DIR, kind, ...parent.split("/"))
    : path.join(DATA_DIR, kind);
  if (!fs.existsSync(base)) return [];
  const nests = (MAX_FOLDER_DEPTH[kind] ?? 1) > 1;
  const out = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(base, entry.name);
    if (fs.existsSync(path.join(dir, "index.md"))) out.push(entry.name);
    else if (!parent && nests && holdsAnItem(dir)) out.push(entry.name);
  }
  return out;
}

function holdsAnItem(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .some((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, "index.md")));
}

/** The docs section folder ("01_start") for a section slug ("start"). */
function sectionFolder(section) {
  return foldersOf("docs").find((f) => folderSlugOf(f) === section) ?? "";
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
    const items = itemFoldersOf(dir).map((folder) => {
      const file = path.join(DATA_DIR, dir, ...folder.split("/"), "index.md");
      const { fmText } = splitRaw(fs.readFileSync(file, "utf8"));
      // For docs this is the full path under /docs ("start/quickstart"), so the
      // list shows which section a page is in and stays sorted by it.
      const slug = folder.split("/").map(folderSlugOf).join("/");
      let draft = false;
      try {
        draft = (yaml.load(fmText) || {}).draft === true;
      } catch {}
      return { id: `data/${dir}/${folder}/index.md`, title: mdTitle(file, fmText), sub: slug, type: "md", draft };
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

function homeBaseSha(about, home) {
  return crypto.createHash("sha256").update(about).update("\0").update(home).digest("hex");
}

/** Read both backing files once. Every parse and concurrency decision in one
    operation uses these exact bytes, rather than pairing a view with a hash
    produced by a later second read. */
function homeSnapshot() {
  const about = fs.existsSync(ABOUT_FILE) ? fs.readFileSync(ABOUT_FILE) : Buffer.alloc(0);
  const home = fs.existsSync(HOME_FILE) ? fs.readFileSync(HOME_FILE) : Buffer.alloc(0);
  return { about, home, baseSha: homeBaseSha(about, home) };
}

function readHome(snapshot = homeSnapshot()) {
  const aboutRaw = snapshot.about.toString("utf8");
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
    const parsed = JSON.parse(snapshot.home.toString("utf8"));
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
    baseSha: snapshot.baseSha,
  };
}

/** The three sections the editor knows about in home.json. Mirrored in
    api/cms.ts. */
const HOME_SECTIONS = ["proof", "recognition", "philosophy"];

/** One home.json entry. A section holds strings today, so a stray number is
    coerced, but an object is passed through: String({}) would write the text
    "[object Object]" into the page and lose the entry. */
function homeEntry(value) {
  return value && typeof value === "object" ? value : String(value);
}

/** Best-effort two-file transaction for the dev working tree. Everything is
    staged before the first replacement, and a handled replacement failure
    restores files already replaced. `io` exists so the failure path can be
    exercised without making the real filesystem fail. */
export function replaceHomeFiles(outputs, io = fs) {
  if (!outputs.length) return;
  const nonce = `${process.pid}-${crypto.randomBytes(8).toString("hex")}`;
  const staged = outputs.map((entry) => ({ ...entry, temp: `${entry.file}.cms-${nonce}.tmp` }));
  const replaced = [];
  try {
    for (const entry of staged) io.writeFileSync(entry.temp, entry.after, { flag: "wx" });
    for (const entry of staged) {
      io.renameSync(entry.temp, entry.file);
      replaced.push(entry);
    }
  } catch (error) {
    for (const entry of replaced.reverse()) io.writeFileSync(entry.file, entry.before);
    throw error;
  } finally {
    for (const entry of staged) {
      if (io.existsSync(entry.temp)) io.unlinkSync(entry.temp);
    }
  }
}

function writeHome(payload, snapshot) {
  const about = payload.about || {};
  const fm = String(about.frontmatter ?? "");
  try {
    yaml.load(fm);
  } catch (e) {
    return { ok: false, error: `about.md frontmatter: ${e.message}` };
  }
  // The blank line and the body only exist when there IS a body: about.md is
  // frontmatter alone, and writing the separator unconditionally grew the file
  // by two newlines on every save that changed nothing.
  const aboutBody = String(about.body ?? "").replace(/\s+$/, "");
  const aboutOut = `---\n${fm.trim()}\n---\n` + (aboutBody ? `\n${aboutBody}\n` : "");
  const home = payload.home || {};
  // merge over the stored file so a save never drops sections the editor does
  // not know about (videos, capabilities, pillars, ...)
  let existing = {};
  try {
    existing = JSON.parse(snapshot.home.toString("utf8"));
  } catch {
    existing = {};
  }
  const merged = { ...existing };
  for (const key of HOME_SECTIONS) {
    const value = home[key];
    if (!Array.isArray(value)) continue;
    // An empty section the file never had is the editor reporting what it
    // found, not an edit. Writing it anyway invented "recognition": [] on
    // every save.
    if (!value.length && !(key in existing)) continue;
    merged[key] = value.map(homeEntry);
  }
  const homeOut = JSON.stringify(merged, null, 2) + "\n";
  const outputs = [
    { file: ABOUT_FILE, before: snapshot.about, after: Buffer.from(aboutOut, "utf8") },
    { file: HOME_FILE, before: snapshot.home, after: Buffer.from(homeOut, "utf8") },
  ].filter(({ before, after }) => !before.equals(after));
  if (!outputs.length) return { ok: true, baseSha: snapshot.baseSha };

  replaceHomeFiles(outputs);
  return { ok: true, baseSha: homeBaseSha(Buffer.from(aboutOut, "utf8"), Buffer.from(homeOut, "utf8")) };
}

// A content-hash of the on-disk file(s) backing an id, at load time. The editor
// sends this back with each save (expectedBase); a save is rejected if the file
// changed underneath it (e.g. the background auto-pull brought in a live edit),
// so a stale browser buffer can never silently overwrite newer content.
export function fileBaseSha(id) {
  try {
    if (id === "page:home") return homeSnapshot().baseSha;
    const abs = resolveSafe(id);
    if (!abs || !fs.existsSync(abs)) return "";
    return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
  } catch {
    return "";
  }
}

// ---- read one ----
// The structured fields the editor shows for an item, parsed off its raw
// frontmatter. Mirrors mdFields() in api/cms.ts line for line, including the
// catch: invalid YAML returns the same zeroed shape there, so the editor sees
// one behaviour whichever backend serves it. cmsKinds.test.ts holds the two to
// identical output over every page in data/ plus the awkward cases.
export function mdFields(fmText) {
  try {
    const fm = yaml.load(fmText) || {};
    return {
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
      summary: typeof fm.summary === "string" ? fm.summary : "",
      pageType: typeof fm.pageType === "string" ? fm.pageType : "",
      sectionTitle: typeof fm.sectionTitle === "string" ? fm.sectionTitle : "",
      draft: fm.draft === true,
      featured: fm.featured === true,
      tags: Array.isArray(fm.tags) ? fm.tags.filter((t) => typeof t === "string") : [],
    };
  } catch {
    return { title: "", desc: "", kicker: "", date: "", cover: "", platform: "", status: "", repo: "", author: "", authorAvatar: "", summary: "", pageType: "", sectionTitle: "", draft: false, featured: false, tags: [] };
  }
}

function readOne(id) {
  const abs = resolveSafe(id);
  if (!abs || !fs.existsSync(abs)) return null;
  const raw = fs.readFileSync(abs, "utf8");
  const type = typeOf(id);
  if (type === "md") {
    const { fmText, body } = splitRaw(raw);
    return { id, type, frontmatter: fmText, body: body.replace(/^\n+/, ""), fields: mdFields(fmText) };
  }
  return { id, type, raw };
}

export function readEditable(id) {
  const data = id === "page:home" ? readHome() : readOne(id);
  if (!data) return null;
  if (id !== "page:home") data.baseSha = fileBaseSha(id);
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
  if (fs.existsSync(abs) && fs.readFileSync(abs, "utf8") === out) {
    return { ok: true, bytes: Buffer.byteLength(out) };
  }
  fs.writeFileSync(abs, out);
  return { ok: true, bytes: Buffer.byteLength(out) };
}

// MUST be called inside withGitLock (the save route does this), so the base
// check + write can't interleave a rebase's checkout of the same file.
export function writeEditable(id, payload) {
  if (id !== "page:home" && !isAllowed(id)) return { ok: false, error: "not_editable" };
  // A whole-file save without a version can erase a concurrent edit. Every
  // caller must read first and send the returned baseSha as expectedBase.
  if (!payload || typeof payload.expectedBase !== "string" || !payload.expectedBase) {
    return {
      ok: false,
      preconditionRequired: true,
      error: "expectedBase is required. Read the page first, then save with the baseSha that read returned.",
    };
  }
  // Home needs the same byte snapshot for its comparison, merge and write.
  // Ordinary files only need the one current hash.
  const snapshot = id === "page:home" ? homeSnapshot() : null;
  const current = snapshot?.baseSha || fileBaseSha(id);
  if (payload.expectedBase !== current) {
    return {
      ok: false,
      staleBase: true,
      baseSha: current,
      error: "The live site changed this page since you opened it. Load the live version, then re-apply your edit.",
    };
  }
  const result = id === "page:home" ? writeHome(payload, snapshot) : writeOne(id, payload);
  if (result.ok && !result.baseSha) result.baseSha = fileBaseSha(id);
  return result;
}

// ---- create a new item ----
// Item identity comes from the folder name (`<order>_<slug>`), so creating a
// post means allocating a folder, not just writing a file. The slug becomes the
// URL and is permanent in practice (renaming the folder changes the URL), so it
// is derived from the title once, here, and never rewritten on later saves.
export const KIND_DIRS = new Set(["blog", "hardware", "games", "docs"]);

// Reads naturally in the stub description: "this post", not "this blog".
// Mirrored in api/cms.ts; cmsKinds.test.ts holds the two to each other.
export const KIND_NOUN = {
  blog: "article",
  hardware: "platform",
  games: "game",
  docs: "docs page",
};

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

// The frontmatter a new item needs to render, per kind. Mirrored line for line
// in api/cms.ts: the two used to disagree (prod wrote author and platform, dev
// wrote neither), which meant a page created on dev and a page created on prod
// were not the same page. `actor` is always absent here, because the dev
// backend has no sign-in; the branch stays so the two files read alike.
function stubFrontmatter(kind, title, actor, section) {
  const today = new Date().toISOString().slice(0, 10);
  const esc = (s) => String(s).replace(/"/g, '\\"');
  const lines = [
    `title: "${esc(title)}"`,
    `kicker: "New"`,
    `tags: ["New"]`,
    `featured: false`,
    `desc: "One line describing this ${KIND_NOUN[kind]}."`,
  ];
  if (kind === "docs") {
    // A docs page has no date, no year and no repository of its own. It leads
    // with the sentence under its H1 and says which quadrant it is in.
    lines.push(`summary: "One sentence telling a reader what this page answers."`);
    lines.push(`pageType: "concept"`);
    // A section's own page names the section in navigation.
    if (!section) lines.push(`sectionTitle: "${esc(title)}"`);
  } else if (kind === "blog") {
    lines.push(`date: "${today}"`);
    // A post is bylined to whoever created it, not to the site's default
    // author, which is how someone else's name ends up on your writing.
    if (actor?.name || actor?.login) lines.push(`author: "${esc(actor.name || actor.login)}"`);
    if (actor?.avatar) lines.push(`authorAvatar: "${esc(actor.avatar)}"`);
  } else {
    lines.push(`year: "${today.slice(0, 4)}"`);
    lines.push(`status: ""`);
    lines.push(`repo: ""`);
    // A game has to say which platform it runs on; the editor offers the
    // Hardware folder as the choices.
    if (kind === "games") lines.push(`platform: ""`);
  }
  return lines.join("\n");
}

const nextOrder = (folders) =>
  String(Math.max(0, ...folders.map((f) => Number((f.match(/^(\d+)_/) || [])[1] || 0))) + 1).padStart(2, "0");

export function createEditable(payload) {
  const kind = String(payload?.kind || "");
  const title = String(payload?.title || "").trim();
  if (!KIND_DIRS.has(kind)) return { ok: false, error: "unknown_kind" };
  if (!title) return { ok: false, error: "A title is required." };

  const slug = slugify(title);
  if (!slug) return { ok: false, error: "That title has no usable characters for a URL." };

  // Docs pages live inside a section, so a new one has to say which. No section
  // means the new page IS a section: it lands at data/docs/<NN>_<slug>/index.md
  // and is what /docs/<slug> serves.
  const section = kind === "docs" ? slugify(String(payload?.section || "")) : "";
  const parent = section ? sectionFolder(section) : "";
  if (section && !parent) return { ok: false, error: `There is no "${section}" section in docs.` };
  const where = section ? `${kind}/${section}` : kind;

  const folders = foldersOf(kind, parent);
  // A duplicate slug would collide on the public URL even though the folder
  // names differ by their order prefix, so check the slug, not the folder.
  for (const folder of folders) {
    if (folderSlugOf(folder) === slug) {
      return { ok: false, error: `"${slug}" already exists in ${where}.` };
    }
  }

  const id = `data/${kind}/${parent ? `${parent}/` : ""}${nextOrder(folders)}_${slug}/index.md`;
  // Route the write through the same allow-list every other write uses, so a
  // crafted kind/title can never escape data/.
  const abs = resolveSafe(id);
  if (!abs) return { ok: false, error: "refused" };

  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const body = "Write the post here. This body renders as markdown on the item page.\n";
  fs.writeFileSync(abs, `---\n${stubFrontmatter(kind, title, null, section)}\n---\n\n${body}`);
  return { ok: true, id, slug, kind, section };
}

// ---- media upload (DEV ONLY): drop a raw image/video into a content item's
// folder, run the media pipeline (cwebp/ffmpeg) on it, and return the path to
// reference in frontmatter. The pipeline binaries only exist on the dev machine,
// so this is a dev-side action (upload + process here, then publish).
const UPLOAD_EXT = /\.(jpe?g|png|webp|gif|avif|svg|mp4|mov|m4v|webm)$/i;
// The same ceiling api/cms.ts holds uploads to, so a file that lands on dev is
// a file prod would have accepted. Without it dev took a file of any size and
// the person only found out when they tried the same upload on the live site.
const MAX_ASSET_BYTES = 3 * 1024 * 1024;

function contentFolder(id) {
  if (!itemParts(id)) return null;
  const abs = resolveSafe(id);
  return abs ? path.dirname(abs) : null;
}

async function doUpload({ id, filename, contentBase64 }) {
  const folder = contentFolder(id);
  if (!folder) return { ok: false, error: "Uploads are only for article / hardware / game / docs items." };
  const clean = path.basename(String(filename || "")).replace(/[^\w.-]/g, "_");
  if (!clean || clean.startsWith(".") || !UPLOAD_EXT.test(clean)) {
    return { ok: false, error: "Unsupported file type (use jpg/png/webp/gif/svg/mp4/mov)." };
  }
  let buf;
  try {
    buf = Buffer.from(String(contentBase64 || ""), "base64");
  } catch {
    return { ok: false, error: "Could not decode the upload." };
  }
  if (!buf.length) return { ok: false, error: "The file was empty." };
  if (buf.length > MAX_ASSET_BYTES) {
    return { ok: false, error: `That file is ${(buf.length / 1024 / 1024).toFixed(1)} MB. The limit here is 3 MB.` };
  }
  const rawPath = path.join(folder, clean);
  fs.writeFileSync(rawPath, buf);
  // An SVG is already a delivery format, is the only media the documentation
  // uses, and has no encoder in the pipeline: optimize-media.mjs throws on it,
  // and the cleanup below would then DELETE the upload. So it lands and stops
  // here, which is also what prod does, since prod runs no pipeline at all.
  if (/\.svg$/i.test(clean)) return { ok: true, path: `./${clean}` };
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
// ITEM_RE and itemParts() are up with isAllowed(), at the top of the file.
const ASSET_EXT = /\.(png|jpe?g|webp|gif|avif|svg|mp4|webm|mov)$/i;

export function itemFolder(id) {
  const parts = itemParts(id);
  return parts ? `data/${parts.kind}/${parts.folder}` : null;
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

/** Does this text reference that exact page path? A plain substring test was
    wrong: "/games/tomba" is inside "/games/tomba-2", so deleting one page was
    refused because a DIFFERENT page was featured. The lookahead ends the match
    at the end of the path, while still matching a page INSIDE the path being
    deleted (where the next character is "/"), so featuring a docs page still
    protects the section holding it. Mirrored in api/cms.ts. */
function referencesPath(text, pagePath) {
  const escaped = pagePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escaped}(?![A-Za-z0-9._-])`).test(text);
}

/** What the editor should tell someone who just deleted a section. Empty when
    the item had nothing inside it. Mirrored in api/cms.ts. */
function childWarning(children) {
  if (!children) return "";
  return `This also deleted ${children} page${children === 1 ? "" : "s"} inside it.`;
}

/** Every file under a directory, as paths relative to it. */
function filesUnder(dir) {
  const out = [];
  const walk = (rel) => {
    const abs = rel ? path.join(dir, ...rel.split("/")) : dir;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(child);
      else out.push(child);
    }
  };
  walk("");
  return out;
}

/** Remove an item: its whole folder, and the generated preview keyed to its
    slug, which nothing else references once the item is gone. Deleting a docs
    section takes every page inside it, so the reply counts them. */
export function deleteEditable(payload) {
  const id = String(payload?.id || "");
  const parts = itemParts(id);
  const folder = itemFolder(id);
  if (!folder || !parts) return { ok: false, error: "Only content items can be deleted." };
  const abs = path.join(ROOT, folder);
  if (!fs.existsSync(abs)) return { ok: false, error: "not_found" };
  const slug = parts.slug;

  // The build refuses a homepage that links a page which does not exist, so
  // deleting a featured page breaks every later build, far from whoever did it.
  const segment = parts.kind;
  const homeFile = path.join(DATA_DIR, "home.json");
  if (fs.existsSync(homeFile) && referencesPath(fs.readFileSync(homeFile, "utf8"), `/${segment}/${slug}`)) {
    return {
      ok: false,
      error: `The home page features this page, so deleting it would break the site build. Remove it from the home page first: open Pages > Home and take out the card that points at /${segment}/${slug}.`,
    };
  }

  // Name every file that is about to go, rather than the one folder holding
  // them: a section reported "removed: 1" while taking its pages with it, and
  // the count is what the editor shows. Mirrors the enumeration api/cms.ts
  // does against the repo tree.
  const files = filesUnder(abs)
    .map((f) => `${folder}/${f}`)
    .sort();
  // A docs section holds a page per folder, so deleting one deletes them all.
  // Nothing else nests, so this is 0 everywhere else.
  const children = files.filter((f) => f.endsWith("/index.md") && f !== `${folder}/index.md`).length;
  fs.rmSync(abs, { recursive: true, force: true });
  // The generated preview is keyed to the slug and nothing else references it.
  for (const ext of ["mp4", "webp", "webm", "png", "jpg"]) {
    const prev = path.join(ROOT, "public", "previews", `${slug}.${ext}`);
    if (fs.existsSync(prev)) {
      fs.rmSync(prev);
      files.push(`public/previews/${slug}.${ext}`);
    }
  }
  return { ok: true, removed: files.length, children, warning: childWarning(children), files };
}

export function renameEditable(payload) {
  const id = String(payload?.id || "");
  const parts = itemParts(id);
  if (!parts) return { ok: false, error: "Only content items can be renamed." };
  const { kind, folder, parent, leaf } = parts;
  const slug = slugify(String(payload?.slug || ""));
  if (!slug) return { ok: false, error: "That slug has no usable characters for a URL." };
  if (slug === folderSlugOf(leaf)) return { ok: true, id, slug, unchanged: true };
  if (foldersOf(kind, parent).some((f) => folderSlugOf(f) === slug)) {
    return { ok: false, error: `"${slug}" already exists in ${kind}.` };
  }
  // Only this folder's own segment changes; a docs page keeps its section, and
  // renaming a SECTION moves every page under it, because the rename moves the
  // whole directory.
  const prefix = (leaf.match(/^(\d+)_/) || [])[1];
  const source = path.join(DATA_DIR, kind, ...folder.split("/"));
  const targetFolder = `${parent ? `${parent}/` : ""}${prefix ? `${prefix}_` : ""}${slug}`;
  fs.renameSync(source, path.join(DATA_DIR, kind, ...targetFolder.split("/")));
  return { ok: true, id: `data/${kind}/${targetFolder}/index.md`, slug };
}

export function duplicateEditable(payload) {
  const id = String(payload?.id || "");
  const parts = itemParts(id);
  if (!parts) return { ok: false, error: "Only content items can be duplicated." };
  const { kind, parent } = parts;
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
  const folders = foldersOf(kind, parent);
  if (folders.some((f) => folderSlugOf(f) === slug)) {
    return { ok: false, error: `"${slug}" already exists in ${kind}.` };
  }
  fm.title = title;
  fm.draft = true;
  fm.featured = false;
  // The copy joins its original's neighbours: a docs page stays in its section.
  const folder = `${parent ? `${parent}/` : ""}${nextOrder(folders)}_${slug}`;
  const dir = path.join(DATA_DIR, kind, ...folder.split("/"));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.md"), `---\n${yaml.dump(fm).trim()}\n---\n\n${body.replace(/^\n+/, "")}`);
  return { ok: true, id: `data/${kind}/${folder}/index.md`, slug, title };
}

// The frontmatter keys /post copies straight through from its payload. The same
// list is exported from api/cms.ts and cmsKinds.test.ts compares them, because
// two hand-maintained copies of one list is exactly the divergence that has
// bitten this CMS before.
export const PUBLISH_FIELDS = [
  "kicker",
  "desc",
  "date",
  "year",
  "status",
  "availability",
  "platform",
  "repo",
  "videoUrl",
  "author",
  "authorAvatar",
  "authorBio",
  "venue",
  "summary",
  "pageType",
  "sectionTitle",
  "updated",
];

// The publishable keys that are LISTS. They need their own loop: the scalar
// one above tests `typeof v === "string"`, which drops an array on the floor,
// so `repos` looked accepted and was silently never written.
export const PUBLISH_LIST_FIELDS = ["tags", "repos"];

// Which of those keys each kind may actually receive. The copy loop used to
// apply every field to every kind, so an agent posting a docs page could write
// date, year, status, platform and a byline into it, which docs/AUTHORING.md
// and public/agent.md both say a docs page does not take. Each list is what
// that kind's own pages carry plus what those two documents promise it.
export const PUBLISH_KIND_FIELDS = {
  blog: ["kicker", "desc", "tags", "date", "year", "repo", "updated", "videoUrl", "author", "authorAvatar", "authorBio", "venue"],
  hardware: ["kicker", "desc", "tags", "year", "status", "availability", "repo", "updated"],
  games: ["kicker", "desc", "tags", "year", "status", "availability", "platform", "repo", "videoUrl", "updated"],
  docs: ["kicker", "desc", "tags", "summary", "pageType", "sectionTitle", "updated", "repos"],
};

export function postItem(payload) {
  const kind = String(payload?.kind || "");
  if (!KIND_DIRS.has(kind)) return { ok: false, error: `kind must be one of: ${[...KIND_DIRS].join(", ")}` };
  const title = String(payload?.title || "").trim();
  if (!title) return { ok: false, error: "A title is required." };
  const slug = slugify(String(payload?.slug || title));
  if (!slug) return { ok: false, error: "That title has no usable characters for a URL." };
  // Docs pages live inside a section; no section means the post IS a section.
  const section = kind === "docs" ? slugify(String(payload?.section || "")) : "";
  const parent = section ? sectionFolder(section) : "";
  if (section && !parent) return { ok: false, error: `There is no "${section}" section in docs.` };
  const folders = foldersOf(kind, parent);
  if (folders.some((f) => folderSlugOf(f) === slug)) {
    return { ok: false, error: `"${slug}" already exists in ${kind}.` };
  }

  const folder = `${parent ? `${parent}/` : ""}${nextOrder(folders)}_${slug}`;
  const dir = path.join(DATA_DIR, kind, ...folder.split("/"));
  const media = Array.isArray(payload?.media) ? payload.media : [];
  const attached = [];
  let cover = typeof payload?.cover === "string" ? payload.cover : "";

  fs.mkdirSync(dir, { recursive: true });
  for (const m of media) {
    const name = safeAssetName(String(m?.filename || ""));
    if (!name) return { ok: false, error: `"${String(m?.filename)}" is not a supported media filename.` };
    const b64 = String(m?.contentBase64 || m?.data || "").replace(/^data:[^,]*,/, "");
    if (!b64) return { ok: false, error: `"${name}" has no contentBase64.` };
    fs.writeFileSync(path.join(dir, name), Buffer.from(b64, "base64"));
    attached.push(name);
    if (m?.cover === true && !cover) cover = `./${name}`;
  }
  if (!cover) {
    const firstImage = attached.find((n) => /\.(png|jpe?g|webp|gif|avif)$/i.test(n));
    if (firstImage) cover = `./${firstImage}`;
  }

  const today = new Date().toISOString().slice(0, 10);
  const fm = { title };
  const takes = new Set(PUBLISH_KIND_FIELDS[kind] ?? []);
  for (const key of PUBLISH_FIELDS) {
    if (!takes.has(key)) continue;
    const v = payload?.[key];
    if (typeof v === "string" && v.trim()) fm[key] = v.trim();
  }
  for (const key of PUBLISH_LIST_FIELDS) {
    if (!takes.has(key)) continue;
    const v = payload?.[key];
    if (Array.isArray(v)) fm[key] = v.filter((t) => typeof t === "string");
  }
  if (!fm.desc) fm.desc = `One line describing this ${KIND_NOUN[kind]}.`;
  if (kind === "docs") {
    // No date and no year: a docs page is maintained, not published on a day.
    if (!fm.summary) fm.summary = String(fm.desc);
    if (!fm.pageType) fm.pageType = "concept";
  } else if (kind === "blog") {
    if (!fm.date) fm.date = today;
  } else if (!fm.year) {
    fm.year = today.slice(0, 4);
  }
  if (cover) fm.cover = cover;
  fm.featured = payload?.featured === true;
  fm.draft = payload?.draft !== false;

  const body = String(payload?.body || "").trim();
  if (!body) return { ok: false, error: "A body is required." };
  fs.writeFileSync(path.join(dir, "index.md"), `---\n${yaml.dump(fm).trim()}\n---\n\n${body}\n`);
  return {
    ok: true,
    id: `data/${kind}/${folder}/index.md`,
    slug,
    kind,
    section,
    draft: fm.draft === true,
    // The kind IS the URL segment for all four kinds, and a docs page's address
    // carries its section: /docs/<section>/<slug>.
    url: `/${kind}/${section ? `${section}/` : ""}${slug}`,
    media: attached,
  };
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

function isLoopbackRequest(req) {
  const address = String(req.socket?.remoteAddress || "").toLowerCase();
  return address === "::1" || /^127(?:\.|$)/.test(address) || /^::ffff:127(?:\.|$)/.test(address);
}

// Returns the dev middleware. Vite serves the public site on the LAN for
// cross-device testing, but this API writes directly to the working tree and
// has no password. Keep every CMS route on the loopback interface; production
// auth (GitHub sign-in, agent bearer tokens) lives in api/cms.ts.
export function createCmsMiddleware() {

  return function cmsMiddleware(req, res, next) {
    const url = (req.originalUrl || req.url || "").split("?")[0];
    if (!url.startsWith("/api/cms/")) return next();
    if (!isLoopbackRequest(req)) {
      return send(res, 403, { error: "dev_cms_local_only" });
    }
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
        // Generous next to MAX_ASSET_BYTES (base64 inflates by a third), so an
        // oversized upload reaches doUpload and is answered with the reason
        // rather than having its connection dropped here.
        4 * MAX_ASSET_BYTES,
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
    if (url === "/api/cms/post" && req.method === "POST") {
      return readBody(req, (raw) => {
        let body = {};
        try {
          body = JSON.parse(raw || "{}");
        } catch {
          return send(res, 400, { ok: false, error: "bad_request" });
        }
        const r = postItem(body);
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
          .then((result) =>
            send(res, result.ok ? 200 : result.preconditionRequired ? 428 : result.staleBase ? 409 : 400, result),
          )
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
