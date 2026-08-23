// Prod CMS backend. A Vercel serverless function (Web API
// signature, Node runtime) that mirrors the dev middleware (scripts/cms-dev.mjs)
// but for the static live site: content is read/written via the GitHub Contents
// API (a save = a commit -> Vercel rebuild, ~1-2 min live), and all state is
// stateless (one signed cookie for the session). There is no password: people
// sign in through GitHub and agents present a bearer token, so every write
// carries an identity. Env: CMS_SESSION_SECRET (cookie HMAC), GITHUB_TOKEN
// (Contents read/write). On a preview deployment it commits to the branch it was
// built from; in production it commits to main.
import crypto from "node:crypto";
import yaml from "js-yaml";

// Repo identity comes from Vercel's build env so this function is not pinned
// to one GitHub repo. Override with CMS_REPO_OWNER / CMS_REPO_NAME if you host
// the content repo somewhere other than the repo this deploys from.
const OWNER = process.env.CMS_REPO_OWNER || process.env.VERCEL_GIT_REPO_OWNER || "";
const REPO = process.env.CMS_REPO_NAME || process.env.VERCEL_GIT_REPO_SLUG || "";
const BRANCH = process.env.VERCEL_GIT_COMMIT_REF || "main";
const GH = `https://api.github.com/repos/${OWNER}/${REPO}`;
const SECRET = process.env.CMS_SESSION_SECRET || "";
const TOKEN = process.env.GITHUB_TOKEN || "";

// ------------------------------------------------------------------- identity
// Who is allowed in, and as whom. Both lists live in environment variables so
// nothing about the membership of this site is committed to a public repo.
//
//   CMS_ALLOWED_ORG     a GitHub org: every member of it may edit
//   CMS_ALLOWED_LOGINS  comma-separated GitHub logins, e.g. "alice,bob"
//   CMS_AGENT_KEYS      comma-separated <login>:<label>:<sha256-of-token>
//   CMS_GITHUB_CLIENT_ID / CMS_GITHUB_CLIENT_SECRET  the OAuth app
//
// The org and the list are additive: either one lets a person in. The org is
// the usual way, so access is granted and revoked on GitHub's members page
// rather than here, and the list stays available for someone who should edit
// without joining.
//
// Agent keys are stored only as SHA-256 hashes: the token itself is shown once,
// when it is minted by scripts/cms-token.mjs, and cannot be recovered from here.
const GH_CLIENT_ID = process.env.CMS_GITHUB_CLIENT_ID || "";
const GH_CLIENT_SECRET = process.env.CMS_GITHUB_CLIENT_SECRET || "";

export interface Actor {
  /** GitHub login */
  login: string;
  /** display name, when GitHub has one */
  name?: string;
  /** avatar URL */
  avatar?: string;
  /** how they authenticated */
  via: "github" | "agent";
  /** the agent key's label, when via === "agent" */
  agent?: string;
}

function csv(value: string): string[] {
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

export function allowedLogins(env = process.env.CMS_ALLOWED_LOGINS || ""): string[] {
  return csv(env).map((l) => l.toLowerCase());
}

export function isAllowedLogin(login: string, env?: string): boolean {
  const list = allowedLogins(env);
  return list.includes(login.trim().toLowerCase());
}

export function allowedOrg(env = process.env.CMS_ALLOWED_ORG || ""): string {
  return env.trim();
}

/** Auth is configured at all, so the CMS is closed rather than open. */
export function accessConfigured(): boolean {
  return !!allowedOrg() || allowedLogins().length > 0 || parseAgentKeys().length > 0;
}

// Membership is asked of GitHub, not stored here, so removing someone from the
// org removes their access. GET /orgs/{org}/members/{login} answers 204 for a
// member and 404 otherwise, and sees private members because the site token
// belongs to a member. Answers are cached briefly: without it every request
// would cost an API call, and with it a removal takes effect within the TTL.
const ORG_TTL_MS = 120_000;
const orgCache = new Map<string, { member: boolean; at: number }>();

export function clearOrgCache(): void {
  orgCache.clear();
}

async function isOrgMember(login: string, now = Date.now()): Promise<boolean> {
  const org = allowedOrg();
  if (!org || !login || !TOKEN) return false;
  const key = login.toLowerCase();
  const hit = orgCache.get(key);
  if (hit && now - hit.at < ORG_TTL_MS) return hit.member;
  let member = false;
  try {
    const r = await fetch(`https://api.github.com/orgs/${encodeURIComponent(org)}/members/${encodeURIComponent(login)}`, {
      headers: ghHeaders(),
    });
    if (r.status === 204) member = true;
    else if (r.status === 404) member = false;
    // Anything else (rate limit, outage, a token that lost read:org) is not an
    // answer. Leave the cache alone and deny this request rather than caching
    // a false negative for everyone.
    else return hit?.member ?? false;
  } catch {
    return hit?.member ?? false;
  }
  orgCache.set(key, { member, at: now });
  return member;
}

/** Can the site actually ask GitHub about its own org? Reports only that, not
    who is in it: without org read scope on GITHUB_TOKEN, every member other
    than someone on the explicit allowlist is refused at sign-in, and the only
    symptom is "not allowed" for people who plainly are members. */
export async function orgReady(): Promise<boolean> {
  const org = allowedOrg();
  if (!org || !TOKEN) return false;
  try {
    const r = await fetch("https://api.github.com/user", { headers: ghHeaders() });
    if (!r.ok) return false;
    const scopes = r.headers.get("x-oauth-scopes");
    // Classic OAuth tokens advertise their scopes. Fine-grained tokens and App
    // installations do not, so fall back to trying the call we depend on.
    if (scopes !== null) return /(^|,\s*)(read:org|write:org|admin:org)(\s*,|$)/.test(scopes);
    const probe = await fetch(`https://api.github.com/orgs/${encodeURIComponent(org)}/members?per_page=1`, {
      headers: ghHeaders(),
    });
    return probe.status === 200;
  } catch {
    return false;
  }
}

/** May this GitHub login edit? Org membership or the explicit allowlist. */
export async function mayEdit(login: string): Promise<boolean> {
  if (!login) return false;
  if (isAllowedLogin(login)) return true;
  return isOrgMember(login);
}

export interface AgentKey {
  login: string;
  label: string;
  hash: string;
}

export function parseAgentKeys(env = process.env.CMS_AGENT_KEYS || ""): AgentKey[] {
  const out: AgentKey[] = [];
  for (const entry of csv(env)) {
    const [login, label, hash] = entry.split(":");
    if (!login || !label || !hash) continue;
    out.push({ login: login.trim().toLowerCase(), label: label.trim(), hash: hash.trim().toLowerCase() });
  }
  return out;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

/** Match a bearer token against the configured agent keys, in constant time. */
export function agentKeyForToken(token: string, env?: string): AgentKey | null {
  if (!token) return null;
  const digest = hashToken(token);
  let found: AgentKey | null = null;
  // Compare against every key regardless of an early match so the time taken
  // does not reveal how many keys are configured or which one matched.
  for (const key of parseAgentKeys(env)) {
    if (key.hash.length === digest.length && safeEqual(key.hash, digest)) found = key;
  }
  return found;
}

function bearer(req: Request): string {
  const h = req.headers.get("authorization") || "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
}

/** Who this request claims to be. Says nothing about whether they may edit. */
function identityFor(req: Request): Actor | null {
  const token = bearer(req);
  if (token) {
    const key = agentKeyForToken(token);
    return key ? { login: key.login, via: "agent", agent: key.label } : null;
  }
  const payload = verifyPayload(readCookie(req, "cms_session"));
  if (!payload) return null;
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (payload.via !== "github") return null;
  return {
    login: sub,
    via: "github",
    name: typeof payload.name === "string" ? payload.name : undefined,
    avatar: typeof payload.avatar === "string" ? payload.avatar : undefined,
  };
}

/** The identity behind this request, once confirmed to still have access.
    Checked per request, not just at sign-in, so leaving the org or coming off
    the allowlist takes effect without waiting for the cookie to expire. An
    agent is bound to its owner: revoking the person revokes their agents. */
async function actorFor(req: Request): Promise<Actor | null> {
  const who = identityFor(req);
  if (!who) return null;
  return (await mayEdit(who.login)) ? who : null;
}

/** How this actor should be credited in the commit trailer. */
function actorLabel(actor: Actor | null): string {
  if (!actor) return "unknown";
  if (actor.via === "agent") return `${actor.login} via agent ${actor.agent}`;
  if (actor.via === "github") return actor.login;
  return "owner";
}

// ---------------------------------------------------------------- http helpers
function json(body: unknown, status = 200, cookies: string[] = []): Response {
  const h = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  for (const c of cookies) h.append("set-cookie", c);
  return new Response(JSON.stringify(body), { status, headers: h });
}
function sub(req: Request): string {
  // The subpath arrives via the vercel.json rewrite (?__sub=...) which funnels
  // /api/cms/* to this flat function; fall back to the pathname for direct hits.
  const url = new URL(req.url);
  const q = url.searchParams.get("__sub");
  if (q !== null) return q.replace(/\/+$/, "");
  return url.pathname.replace(/^\/api\/cms\/?/, "").replace(/\/+$/, "");
}
async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}
function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.get("cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}
// --------------------------------------------------------- signed cookie (HMAC)
const b64u = (b: Buffer) => b.toString("base64url");
const unb64u = (s: string) => Buffer.from(s, "base64url");
function hmac(data: string): string {
  return b64u(crypto.createHmac("sha256", SECRET).update(data).digest());
}
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
function signPayload(payload: Record<string, unknown>, ttlMs: number): string {
  const p = b64u(Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })));
  return `${p}.${hmac(p)}`;
}
function verifyPayload(token: string | undefined): Record<string, unknown> | null {
  if (!token || !SECRET) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const p = token.slice(0, dot), sig = token.slice(dot + 1);
  if (!safeEqual(sig, hmac(p))) return null;
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(unb64u(p).toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
  return payload;
}
const sessionCookie = (sub: string, profile?: { name?: string; avatar?: string }) =>
  `cms_session=${signPayload({ sub, via: "github", name: profile?.name || "", avatar: profile?.avatar || "" }, 7 * 24 * 3600_000)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`;
const clearSession = () => `cms_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
// non-secret flag so the live site can show the "Edit page" button
// Scope the hint to the registrable domain of whatever host is serving, so a
// subdomain editor and the apex site share it. Naive last-two-labels split: it
// is only a UI hint, never a security boundary.
const hintCookie = (on: boolean, req?: Request) => {
  const host = (req?.headers.get("x-forwarded-host") || req?.headers.get("host") || "")
    .split(",")[0]
    .split(":")[0];
  const parts = host.split(".").filter(Boolean);
  const domain = parts.length >= 2 ? parts.slice(-2).join(".") : host;
  const scope = domain && domain !== "localhost" ? ` Domain=${domain};` : "";
  return `cms_hint=${on ? "1" : ""};${scope} Path=/; SameSite=Lax; Secure; Max-Age=${on ? 604800 : 0}`;
};

async function authed(req: Request): Promise<boolean> {
  if (await actorFor(req)) return true;
  // With no org, no allowlist and no agent keys configured the CMS is open,
  // which is the template's unconfigured state; once any is set, it is closed.
  return !accessConfigured();
}

// -------------------------------------------------------------- github contents
function ghHeaders(): Record<string, string> {
  return {
    authorization: `Bearer ${TOKEN}`,
    accept: "application/vnd.github+json",
    "user-agent": "cms",
    "x-github-api-version": "2022-11-28",
  };
}
async function ghReadFile(path: string): Promise<{ content: string; sha: string } | null> {
  const r = await fetch(`${GH}/contents/${path}?ref=${BRANCH}`, { headers: ghHeaders() });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`gh_read_${r.status} ${path}`);
  const j = (await r.json()) as { content: string; encoding: string; sha: string };
  const content = j.encoding === "base64" ? Buffer.from(j.content, "base64").toString("utf8") : j.content;
  return { content, sha: j.sha };
}
async function ghWriteFile(path: string, text: string, message: string, actor?: Actor | null): Promise<void> {
  const existing = await ghReadFile(path);
  if (existing && existing.content === text) return; // no-op, avoid an empty commit
  const body: Record<string, unknown> = {
    // The trailer records who asked for the change; the commit author records
    // it in git itself, so `git log` alone answers "who edited this".
    message: actor ? `${message}\n\nEdited-by: ${actorLabel(actor)}` : message,
    content: Buffer.from(text, "utf8").toString("base64"),
    branch: BRANCH,
  };
  if (actor) {
    body.author = {
      name: actor.agent ? `${actor.login} (agent: ${actor.agent})` : actor.login,
      email: `${actor.login}@users.noreply.github.com`,
    };
  }
  if (existing) body.sha = existing.sha;
  const r = await fetch(`${GH}/contents/${path}`, {
    method: "PUT",
    headers: { ...ghHeaders(), "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`gh_write_${r.status} ${path}: ${await r.text()}`);
}
/** One commit that may write and delete several files at once.
    The Contents API is one file per commit, which would mean a commit and a
    rebuild per asset, and cannot express a deletion alongside the edit that
    stops referencing it. The Git Data API can: blobs, then a tree layered on
    the current one (a null sha removes a path), then a commit, then the ref. */
type Change = { path: string; text: string } | { path: string; base64: string } | { path: string; remove: true };

async function ghJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const r = await fetch(url, {
    ...init,
    headers: { ...ghHeaders(), "content-type": "application/json", ...(init?.headers as object) },
  });
  if (!r.ok) throw new Error(`gh_${r.status} ${url.replace(GH, "")}: ${await r.text()}`);
  return (await r.json()) as Record<string, unknown>;
}

async function ghCommit(changes: Change[], message: string, actor?: Actor | null): Promise<string | null> {
  if (!changes.length) return null;
  const ref = await ghJson(`${GH}/git/ref/heads/${BRANCH}`);
  const parent = (ref.object as { sha: string }).sha;
  const base = await ghJson(`${GH}/git/commits/${parent}`);
  const baseTree = (base.tree as { sha: string }).sha;

  const tree: Record<string, unknown>[] = [];
  for (const c of changes) {
    if ("remove" in c) {
      tree.push({ path: c.path, mode: "100644", type: "blob", sha: null });
      continue;
    }
    const blob = await ghJson(`${GH}/git/blobs`, {
      method: "POST",
      body: "text" in c
        ? JSON.stringify({ content: c.text, encoding: "utf-8" })
        : JSON.stringify({ content: c.base64, encoding: "base64" }),
    });
    tree.push({ path: c.path, mode: "100644", type: "blob", sha: blob.sha });
  }

  const newTree = await ghJson(`${GH}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTree, tree }),
  });
  const commitBody: Record<string, unknown> = {
    message: actor ? `${message}\n\nEdited-by: ${actorLabel(actor)}` : message,
    tree: newTree.sha,
    parents: [parent],
  };
  if (actor) {
    commitBody.author = {
      name: actor.agent ? `${actor.login} (agent: ${actor.agent})` : actor.login,
      email: `${actor.login}@users.noreply.github.com`,
    };
  }
  const commit = await ghJson(`${GH}/git/commits`, { method: "POST", body: JSON.stringify(commitBody) });
  await ghJson(`${GH}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  });
  return commit.sha as string;
}

/** Read many files in ONE request. The editor's list needs each page's real
    title and whether it is a draft, which lives inside the file; over the REST
    contents API that is a call per page, so the list either cost a hundred
    requests or, as it did, showed a slug prettified into a fake title. GraphQL
    aliases fetch them all at once. */
async function ghReadMany(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!paths.length) return out;
  const fields = paths
    .map((p, i) => `f${i}: object(expression: ${JSON.stringify(`${BRANCH}:${p}`)}) { ... on Blob { text } }`)
    .join("\n");
  const query = `query { repository(owner: ${JSON.stringify(OWNER)}, name: ${JSON.stringify(REPO)}) { ${fields} } }`;
  const r = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { ...ghHeaders(), "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) return out; // the caller falls back to what it can derive
  const j = (await r.json()) as { data?: { repository?: Record<string, { text?: string } | null> } };
  const repo = j.data?.repository || {};
  paths.forEach((p, i) => {
    const text = repo[`f${i}`]?.text;
    if (typeof text === "string") out.set(p, text);
  });
  return out;
}

async function ghListTree(): Promise<{ path: string }[]> {
  const r = await fetch(`${GH}/git/trees/${BRANCH}?recursive=1`, { headers: ghHeaders() });
  if (!r.ok) throw new Error(`gh_tree_${r.status}`);
  const j = (await r.json()) as { tree: { path: string; type: string }[] };
  return j.tree.filter((e) => e.type === "blob");
}

// ---------------------------------------------------------------- content model
export const KINDS = ["blog", "hardware", "games", "docs"] as const;

// An item is a folder holding index.md. Docs are the one kind that nests:
// data/docs/<NN>_<section>/index.md is a section's own page and
// data/docs/<NN>_<section>/<NN>_<page>/index.md is a page inside it, so a docs
// id carries one or two folder segments where every other kind carries exactly
// one. Everything that takes an id apart goes through itemParts(), so the rule
// lives in one place here and in one place in scripts/cms-dev.mjs.
const ITEM_RE = /^data\/(blog|hardware|games|docs)\/([^/]+(?:\/[^/]+)?)\/index\.md$/;
const MAX_FOLDER_DEPTH: Record<string, number> = { blog: 1, hardware: 1, games: 1, docs: 2 };
const folderSlugOf = (folder: string) => /^(\d+)_(.+)$/.exec(folder)?.[2] ?? folder;

interface ItemParts {
  /** the data/ directory: "blog" | "hardware" | "games" | "docs" */
  kind: string;
  /** every folder segment under data/<kind>/, e.g. "01_start/01_quickstart" */
  folder: string;
  /** the folder segments above the item's own, "" at the top of a kind */
  parent: string;
  /** the item's own folder segment, e.g. "01_quickstart" */
  leaf: string;
  /** the public path under the kind's segment, e.g. "start/quickstart" */
  slug: string;
}

function itemParts(id: string): ItemParts | null {
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

function isAllowed(id: string): boolean {
  if (typeof id !== "string" || id.includes("..") || id.includes("\0")) return false;
  if (id === "page:home") return true;
  if (id === "data/about.md" || id === "data/home.json") return true;
  if (/^data\/sources\/[^/]+\.md$/.test(id)) return true;
  if (itemParts(id)) return true;
  return false;
}
function typeOf(id: string): "md" | "json" | "home" {
  if (id === "page:home") return "home";
  return id.endsWith(".json") ? "json" : "md";
}
function splitRaw(raw: string): { fmText: string; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fmText: "", body: raw };
  return { fmText: m[1], body: m[2] ?? "" };
}
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function prettify(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function mdFields(fmText: string) {
  try {
    const fm = (yaml.load(fmText) || {}) as Record<string, unknown>;
    return {
      title: str(fm.title),
      desc: str(fm.desc),
      kicker: str(fm.kicker),
      date: str(fm.date),
      cover: str(fm.cover),
      platform: str(fm.platform),
      status: str(fm.status),
      repo: str(fm.repo),
      author: str(fm.author),
      authorAvatar: str(fm.authorAvatar),
      summary: str(fm.summary),
      pageType: str(fm.pageType),
      sectionTitle: str(fm.sectionTitle),
      draft: fm.draft === true,
      featured: fm.featured === true,
      tags: Array.isArray(fm.tags) ? (fm.tags as unknown[]).filter((t) => typeof t === "string") : [],
    };
  } catch {
    return { title: "", desc: "", kicker: "", date: "", cover: "", platform: "", status: "", repo: "", author: "", authorAvatar: "", summary: "", pageType: "", sectionTitle: "", draft: false, featured: false, tags: [] as string[] };
  }
}

async function readHome() {
  const aboutRaw = (await ghReadFile("data/about.md"))?.content || "";
  const { fmText, body } = splitRaw(aboutRaw);
  let fields = { headerName: "", heroTitle: "", role: "", eyebrow: "", tagline: "", email: "", locations: [] as string[] };
  try {
    const fm = (yaml.load(fmText) || {}) as Record<string, unknown>;
    fields = {
      headerName: str(fm.headerName),
      heroTitle: str(fm.heroTitle),
      role: str(fm.role),
      eyebrow: str(fm.eyebrow),
      tagline: str(fm.tagline),
      email: str(fm.email),
      locations: Array.isArray(fm.locations) ? (fm.locations as unknown[]).filter((x) => typeof x === "string") as string[] : [],
    };
  } catch {}
  let home = { proof: [] as unknown[], recognition: [] as unknown[], philosophy: [] as unknown[] };
  try {
    const parsed = JSON.parse((await ghReadFile("data/home.json"))?.content || "{}");
    home = {
      proof: Array.isArray(parsed.proof) ? parsed.proof : [],
      recognition: Array.isArray(parsed.recognition) ? parsed.recognition : [],
      philosophy: Array.isArray(parsed.philosophy) ? parsed.philosophy : [],
    };
  } catch {}
  return { id: "page:home", type: "home", about: { frontmatter: fmText, body: body.replace(/^\n+/, ""), fields }, home };
}

async function readEditable(id: string) {
  if (!isAllowed(id)) return null;
  if (id === "page:home") return readHome();
  const file = await ghReadFile(id);
  if (!file) return null;
  const type = typeOf(id);
  if (type === "md") {
    const { fmText, body } = splitRaw(file.content);
    return { id, type, frontmatter: fmText, body: body.replace(/^\n+/, ""), fields: mdFields(fmText) };
  }
  return { id, type, raw: file.content };
}

async function writeHome(payload: Record<string, unknown>, actor?: Actor | null) {
  const about = (payload.about || {}) as Record<string, unknown>;
  const fm = String(about.frontmatter ?? "");
  try {
    yaml.load(fm);
  } catch (e) {
    return { ok: false, error: `about.md frontmatter: ${(e as Error).message}` };
  }
  const aboutOut = `---\n${fm.trim()}\n---\n\n${String(about.body ?? "").replace(/\s+$/, "")}\n`;
  const home = (payload.home || {}) as Record<string, unknown>;
  // Merge over the stored file: the editor only knows about proof/recognition/
  // philosophy, and a save must not drop the other authored sections
  // (videos, capabilities, pillars, transforms, thesis, ...).
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse((await ghReadFile("data/home.json"))?.content || "{}");
  } catch {}
  const homeOut =
    JSON.stringify(
      {
        ...existing,
        proof: Array.isArray(home.proof) ? (home.proof as unknown[]).map((p) => String(p)) : [],
        recognition: Array.isArray(home.recognition) ? home.recognition : [],
        philosophy: Array.isArray(home.philosophy) ? (home.philosophy as unknown[]).map((p) => String(p)) : [],
      },
      null,
      2,
    ) + "\n";
  await ghWriteFile("data/about.md", aboutOut, "CMS: update Home hero (about.md)", actor);
  await ghWriteFile("data/home.json", homeOut, "CMS: update Home content (home.json)", actor);
  return { ok: true };
}

async function writeEditable(id: string, payload: Record<string, unknown>, actor?: Actor | null) {
  if (!isAllowed(id)) return { ok: false, error: "not_editable" };
  if (id === "page:home") return writeHome(payload, actor);
  const type = typeOf(id);
  if (type === "md") {
    const fm = String(payload.frontmatter ?? "");
    try {
      yaml.load(fm);
    } catch (e) {
      return { ok: false, error: `invalid YAML frontmatter: ${(e as Error).message}` };
    }
    const body = String(payload.body ?? "").replace(/\s+$/, "");
    await ghWriteFile(id, `---\n${fm.trim()}\n---\n\n${body}\n`, `CMS: update ${id}`, actor);
    return { ok: true };
  }
  // json
  const raw = String(payload.raw ?? "");
  try {
    JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `invalid JSON: ${(e as Error).message}` };
  }
  await ghWriteFile(id, raw.endsWith("\n") ? raw : raw + "\n", `CMS: update ${id}`, actor);
  return { ok: true };
}

// ---- create a new item ----
// Mirrors createEditable() in scripts/cms-dev.mjs, but allocates the folder
// against the repo tree instead of the local filesystem. Keep the two in step:
// the same editor UI calls whichever backend is serving.
// Reads naturally in the stub description: "this post", not "this blog".
// Mirrored in scripts/cms-dev.mjs; cmsKinds.test.ts holds the two to each other.
export const KIND_NOUN: Record<string, string> = {
  blog: "article",
  hardware: "platform",
  games: "game",
  docs: "docs page",
};

function slugify(title: string): string {
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
// in scripts/cms-dev.mjs: the two used to disagree (prod wrote author and
// platform, dev wrote neither), which meant a page created on dev and a page
// created on prod were not the same page.
function stubFrontmatter(
  kind: string,
  title: string,
  actor?: Actor | null,
  section?: string,
): string {
  const today = new Date().toISOString().slice(0, 10);
  const esc = (s: string) => String(s).replace(/"/g, '\\"');
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

async function createEditable(payload: Record<string, unknown>, actor?: Actor | null) {
  const kind = String(payload.kind || "");
  const title = String(payload.title || "").trim();
  if (!(KINDS as readonly string[]).includes(kind)) return { ok: false, error: "unknown_kind" };
  if (!title) return { ok: false, error: "A title is required." };

  const slug = slugify(title);
  if (!slug) return { ok: false, error: "That title has no usable characters for a URL." };

  const paths = (await ghListTree()).map((e) => e.path);
  // Docs pages live inside a section, so a new one has to say which. No section
  // means the new page IS a section: it lands at data/docs/<NN>_<slug>/index.md
  // and is what /docs/<slug> serves.
  const section = kind === "docs" ? slugify(String(payload.section || "")) : "";
  const parent = section ? sectionFolder(section, paths) : "";
  if (section && !parent) return { ok: false, error: `There is no "${section}" section in docs.` };
  const where = section ? `${kind}/${section}` : kind;

  const folders = foldersOf(kind, parent, paths);

  // A duplicate slug would collide on the public URL even though the folder
  // names differ by their order prefix, so check the slug, not the folder.
  for (const folder of folders) {
    if (folderSlugOf(folder) === slug) return { ok: false, error: `"${slug}" already exists in ${where}.` };
  }

  const id = `data/${kind}/${parent ? `${parent}/` : ""}${nextOrder(folders)}_${slug}/index.md`;
  if (!isAllowed(id)) return { ok: false, error: "refused" };

  const body = "Write the post here. This body renders as markdown on the item page.\n";
  await ghWriteFile(id, `---\n${stubFrontmatter(kind, title, actor, section)}\n---\n\n${body}`, `cms: add ${where}/${slug}`, actor);
  return { ok: true, id, slug, kind, section };
}

async function listEditable() {
  const paths = (await ghListTree()).map((e) => e.path);
  const groups: { group: string; items: { id: string; title: string; sub?: string; type: string; draft?: boolean }[] }[] = [];

  const pages = [{ id: "page:home", title: "Home", sub: "hero, proof, recognition, philosophy", type: "home" }];
  groups.push({ group: "Pages", items: pages });

  // One request for every page's frontmatter, so the list can show real titles
  // and mark drafts. If it fails the list still renders, from the slug.
  const itemPaths = paths.filter((p) => !!itemParts(p)).sort();
  const texts = await ghReadMany(itemPaths);
  const metaOf = (p: string): { title?: string; draft?: boolean } => {
    const raw = texts.get(p);
    if (!raw) return {};
    try {
      const fm = (yaml.load(splitRaw(raw).fmText) || {}) as Record<string, unknown>;
      return { title: typeof fm.title === "string" ? fm.title : undefined, draft: fm.draft === true };
    } catch {
      return {};
    }
  };

  for (const kind of KINDS) {
    const items = itemPaths
      .filter((p) => itemParts(p)?.kind === kind)
      .map((p) => {
        // For docs this is the full path under /docs ("start/quickstart"), so
        // the list shows which section a page is in and stays sorted by it.
        const slug = itemParts(p)!.slug;
        const meta = metaOf(p);
        return { id: p, title: meta.title || prettify(slug), sub: slug, type: "md", draft: !!meta.draft };
      });
    if (items.length) groups.push({ group: kind[0].toUpperCase() + kind.slice(1), items });
  }

  const sources = paths
    .filter((p) => /^data\/sources\/[^/]+\.md$/.test(p))
    .sort()
    .map((p) => {
      const name = p.split("/")[2].replace(/\.md$/, "");
      return { id: p, title: prettify(name), sub: name, type: "md" };
    });
  if (sources.length) groups.push({ group: "Sources", items: sources });

  return groups;
}

// -------------------------------------------------------------- github oauth
// Sign-in is delegated to GitHub: we never see a password, and the person's
// login is what the commit is attributed to. The token we receive is used once
// to read the profile and is never stored; writes still go through the site's
// own GITHUB_TOKEN, so signing in grants no access to anyone's repositories.
function originOf(req: Request): string {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0].trim();
  const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();
  return `${proto}://${host}`;
}

/** Only same-site paths are accepted as a post-login destination. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function githubStart(req: Request): Response {
  if (!GH_CLIENT_ID || !SECRET) return json({ error: "github_not_configured" }, 500);
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  // The state is a signed, short-lived value, so a callback cannot be forged
  // or replayed from another site.
  const state = signPayload({ next, purpose: "oauth" }, 10 * 60_000);
  const params = new URLSearchParams({
    client_id: GH_CLIENT_ID,
    redirect_uri: `${originOf(req)}/api/cms/auth/github/callback`,
    scope: "read:user",
    state,
    allow_signup: "false",
  });
  return new Response(null, {
    status: 302,
    headers: {
      location: `https://github.com/login/oauth/authorize?${params}`,
      "set-cookie": `cms_oauth=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api/cms; Max-Age=600`,
      "cache-control": "no-store",
    },
  });
}

function loginFailed(reason: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      location: `/?cms_login=${encodeURIComponent(reason)}`,
      "set-cookie": `cms_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/api/cms; Max-Age=0`,
      "cache-control": "no-store",
    },
  });
}

async function githubCallback(req: Request): Promise<Response> {
  if (!GH_CLIENT_ID || !GH_CLIENT_SECRET) return json({ error: "github_not_configured" }, 500);
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const cookie = readCookie(req, "cms_oauth");
  const payload = verifyPayload(state);
  if (!code || !payload || payload.purpose !== "oauth" || !cookie || !safeEqual(cookie, state)) {
    return loginFailed("state");
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: GH_CLIENT_ID,
      client_secret: GH_CLIENT_SECRET,
      code,
      redirect_uri: `${originOf(req)}/api/cms/auth/github/callback`,
    }),
  });
  const tokenJson = (await tokenRes.json().catch(() => ({}))) as { access_token?: string };
  if (!tokenRes.ok || !tokenJson.access_token) return loginFailed("exchange");

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      authorization: `Bearer ${tokenJson.access_token}`,
      accept: "application/vnd.github+json",
      "user-agent": "cms",
    },
  });
  const user = (await userRes.json().catch(() => ({}))) as { login?: string; name?: string; avatar_url?: string };
  if (!userRes.ok || !user.login) return loginFailed("profile");
  if (!(await mayEdit(user.login))) return loginFailed("not_allowed");

  return new Response(null, {
    status: 302,
    headers: [
      ["location", safeNext(typeof payload.next === "string" ? payload.next : "/")],
      ["set-cookie", `cms_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/api/cms; Max-Age=0`],
      ["set-cookie", sessionCookie(user.login.toLowerCase(), { name: user.name || user.login, avatar: user.avatar_url })],
      ["set-cookie", hintCookie(true, req)],
      ["cache-control", "no-store"],
    ],
  });
}

// ------------------------------------------------------------------- assets
// An item is a folder: index.md plus whatever images and videos it embeds.
// Everything here works on that folder, and nothing outside it.

// ITEM_RE and itemParts() are up with the content model, next to isAllowed().
const ASSET_EXT = /\.(png|jpe?g|webp|gif|avif|svg|mp4|webm|mov)$/i;
// Vercel caps a serverless request body at 4.5 MB and base64 costs a third on
// top, so the file itself has to stay under that with room to spare.
const MAX_ASSET_BYTES = 3 * 1024 * 1024;

/** The folder an item lives in, or null if the id is not an item. */
function itemFolder(id: string): string | null {
  const parts = itemParts(id);
  return parts ? `data/${parts.kind}/${parts.folder}` : null;
}

/** The URL segment for an item id: data/games/... is served at /games/... */
function kindSegment(id: string): string {
  return itemParts(id)?.kind ?? "";
}

/** The public path under the kind's segment. Nested for docs. */
function itemSlug(id: string): string | null {
  return itemParts(id)?.slug ?? null;
}

/** A safe leaf filename: no separators, no traversal, known media extension. */
function safeAssetName(name: string): string | null {
  const base = String(name).split(/[\\/]/).pop() || "";
  const clean = base.trim().replace(/\s+/g, "-").replace(/[^A-Za-z0-9._-]/g, "");
  if (!clean || clean.startsWith(".") || clean.includes("..")) return null;
  if (!ASSET_EXT.test(clean)) return null;
  return clean;
}

async function listAssets(id: string): Promise<{ ok: boolean; assets?: string[]; error?: string }> {
  const folder = itemFolder(id);
  if (!folder) return { ok: false, error: "not_an_item" };
  const paths = (await ghListTree()).map((e) => e.path);
  const assets = paths
    .filter((p) => p.startsWith(`${folder}/`) && p !== `${folder}/index.md`)
    .map((p) => p.slice(folder.length + 1));
  return { ok: true, assets };
}

async function uploadAsset(body: Record<string, unknown>, actor?: Actor | null) {
  const id = String(body.id || "");
  const folder = itemFolder(id);
  if (!folder) return { ok: false, error: "not_an_item" };
  const name = safeAssetName(String(body.filename || ""));
  if (!name) return { ok: false, error: "That file type is not supported here." };
  const base64 = String(body.contentBase64 || body.data || "").replace(/^data:[^,]*,/, "");
  if (!base64) return { ok: false, error: "empty_file" };
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_ASSET_BYTES) {
    return { ok: false, error: `That file is ${(bytes / 1024 / 1024).toFixed(1)} MB. The limit here is 3 MB.` };
  }
  const path = `${folder}/${name}`;
  await ghCommit([{ path, base64 }], `cms: add ${path}`, actor);
  return { ok: true, path, name, markdown: `![](./${name})` };
}

async function deleteAsset(body: Record<string, unknown>, actor?: Actor | null) {
  const id = String(body.id || "");
  const folder = itemFolder(id);
  if (!folder) return { ok: false, error: "not_an_item" };
  const name = safeAssetName(String(body.name || ""));
  if (!name) return { ok: false, error: "bad_name" };
  const path = `${folder}/${name}`;
  const exists = (await ghListTree()).some((e) => e.path === path);
  if (!exists) return { ok: false, error: "not_found" };
  await ghCommit([{ path, remove: true }], `cms: remove ${path}`, actor);
  return { ok: true, path };
}

/** Remove an item: its whole folder, and the generated preview keyed to its
    slug, which nothing else references once the item is gone. */
async function deleteEditable(body: Record<string, unknown>, actor?: Actor | null) {
  const id = String(body.id || "");
  const folder = itemFolder(id);
  const slug = itemSlug(id);
  if (!folder || !slug) return { ok: false, error: "Only content items can be deleted." };
  // The homepage names the pages it features, and the build refuses to
  // produce a homepage that links a page which does not exist. Deleting one
  // out from under it therefore breaks every later build, not just this one,
  // and the failure surfaces nowhere near the person who caused it.
  const home = await ghReadFile("data/home.json");
  if (home && home.content.includes(`/${kindSegment(id)}/${slug}`)) {
    return {
      ok: false,
      error: `The home page features this page, so deleting it would break the site build. Remove it from the home page first: open Pages > Home and take out the card that points at /${kindSegment(id)}/${slug}.`,
    };
  }

  const paths = (await ghListTree()).map((e) => e.path);
  const own = paths.filter((p) => p === `${folder}/index.md` || p.startsWith(`${folder}/`));
  if (!own.length) return { ok: false, error: "not_found" };
  const previews = paths.filter((p) => new RegExp(`^public/previews/${slug}\\.(mp4|webp|webm|png|jpg)$`).test(p));
  const changes: Change[] = [...own, ...previews].map((path) => ({ path, remove: true }));
  await ghCommit(changes, `cms: delete ${folder}`, actor);
  return { ok: true, removed: changes.length, files: [...own, ...previews] };
}

/** The folder names an item at data/<kind>/<parent>/ sits beside, so slugs and
    order prefixes can be checked against its real siblings. A docs section
    counts as a folder at the top of the kind as soon as it holds a page, even
    before it has an index.md of its own. */
function foldersOf(kind: string, parent: string, paths: string[]): string[] {
  const out = new Set<string>();
  for (const p of paths) {
    const parts = itemParts(p);
    if (!parts || parts.kind !== kind) continue;
    if (parts.parent === parent) out.add(parts.leaf);
    else if (!parent && parts.parent) out.add(parts.parent.split("/")[0]);
  }
  return [...out];
}

/** The docs section folder ("01_start") for a section slug ("start"). */
function sectionFolder(section: string, paths: string[]): string {
  return foldersOf("docs", "", paths).find((f) => folderSlugOf(f) === section) ?? "";
}

const nextOrder = (folders: string[]) =>
  String(Math.max(0, ...folders.map((f) => Number(/^(\d+)_/.exec(f)?.[1] ?? 0))) + 1).padStart(2, "0");

/** Change a page's address. The folder name is the URL, so this moves every
    file in it, which is why it is one commit rather than a write and a delete. */
async function renameEditable(body: Record<string, unknown>, actor?: Actor | null) {
  const id = String(body.id || "");
  const parts = itemParts(id);
  if (!parts) return { ok: false, error: "Only content items can be renamed." };
  const { kind, folder, parent, leaf } = parts;
  const slug = slugify(String(body.slug || ""));
  if (!slug) return { ok: false, error: "That slug has no usable characters for a URL." };
  if (slug === folderSlugOf(leaf)) return { ok: true, id, slug, unchanged: true };

  const paths = (await ghListTree()).map((e) => e.path);
  for (const f of foldersOf(kind, parent, paths)) {
    if (folderSlugOf(f) === slug) return { ok: false, error: `"${slug}" already exists in ${kind}.` };
  }

  // Only this folder's own segment changes; a docs page keeps its section, and
  // renaming a SECTION moves every page under it, because the whole subtree is
  // collected below.
  const prefix = /^(\d+)_/.exec(leaf)?.[1];
  const base = `data/${kind}${parent ? `/${parent}` : ""}`;
  const target = `${base}/${prefix ? `${prefix}_` : ""}${slug}`;
  const source = `data/${kind}/${folder}`;
  const own = paths.filter((p) => p.startsWith(`${source}/`));
  if (!own.length) return { ok: false, error: "not_found" };

  const changes: Change[] = [];
  for (const from of own) {
    const file = await ghReadFile(from);
    if (!file) continue;
    // ghReadFile decodes as utf-8; re-encode so binaries survive the move.
    changes.push({ path: `${target}/${from.slice(source.length + 1)}`, base64: Buffer.from(file.content, "utf8").toString("base64") });
    changes.push({ path: from, remove: true });
  }
  await ghCommit(changes, `cms: rename ${source} -> ${target}`, actor);
  return { ok: true, id: `${target}/index.md`, slug };
}

/** Start a new page from this one. The copy is a draft, so duplicating never
    publishes anything by itself. */
async function duplicateEditable(body: Record<string, unknown>, actor?: Actor | null) {
  const id = String(body.id || "");
  const parts = itemParts(id);
  if (!parts) return { ok: false, error: "Only content items can be duplicated." };
  const { kind, parent } = parts;
  const file = await ghReadFile(id);
  if (!file) return { ok: false, error: "not_found" };

  const { fmText, body: mdBody } = splitRaw(file.content);
  let fm: Record<string, unknown> = {};
  try {
    fm = (yaml.load(fmText) || {}) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "That page's frontmatter is not valid YAML." };
  }
  const title = `${String(fm.title || "Untitled")} (copy)`;
  const slug = slugify(title);
  const paths = (await ghListTree()).map((e) => e.path);
  const folders = foldersOf(kind, parent, paths);
  if (folders.some((f) => folderSlugOf(f) === slug)) {
    return { ok: false, error: `"${slug}" already exists in ${kind}.` };
  }
  fm.title = title;
  fm.draft = true;
  fm.featured = false;
  // The copy joins its original's neighbours: a docs page stays in its section.
  const target = `data/${kind}${parent ? `/${parent}` : ""}/${nextOrder(folders)}_${slug}/index.md`;
  await ghCommit(
    [{ path: target, text: `---\n${yaml.dump(fm).trim()}\n---\n\n${mdBody.replace(/^\n+/, "")}` }],
    `cms: duplicate ${kind}/${slug}`,
    actor,
  );
  return { ok: true, id: target, slug, title };
}

// ----------------------------------------------------------------------- post
// One call that produces a finished page. The editor's flow is new -> read ->
// save -> upload, which is three round trips and three commits, and an agent
// gets to fumble at each one. This takes the whole post, media included, and
// writes it as a single commit.

// The frontmatter keys /post copies straight through from its payload. The same
// list is exported from scripts/cms-dev.mjs and cmsKinds.test.ts compares them,
// because two hand-maintained copies of one list is exactly the divergence that
// has bitten this CMS before.
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
] as const;

async function postItem(payload: Record<string, unknown>, actor?: Actor | null) {
  const kind = String(payload.kind || "");
  if (!(KINDS as readonly string[]).includes(kind)) {
    return { ok: false, error: `kind must be one of: ${KINDS.join(", ")}` };
  }
  const title = String(payload.title || "").trim();
  if (!title) return { ok: false, error: "A title is required." };
  const slug = slugify(String(payload.slug || title));
  if (!slug) return { ok: false, error: "That title has no usable characters for a URL." };

  const paths = (await ghListTree()).map((e) => e.path);
  // Docs pages live inside a section; no section means the post IS a section.
  const section = kind === "docs" ? slugify(String(payload.section || "")) : "";
  const parent = section ? sectionFolder(section, paths) : "";
  if (section && !parent) return { ok: false, error: `There is no "${section}" section in docs.` };
  const folders = foldersOf(kind, parent, paths);
  if (folders.some((f) => folderSlugOf(f) === slug)) {
    return { ok: false, error: `"${slug}" already exists in ${kind}. Use /save to change it, or pass a different slug.` };
  }

  const folder = `data/${kind}${parent ? `/${parent}` : ""}/${nextOrder(folders)}_${slug}`;
  const changes: Change[] = [];
  const media = Array.isArray(payload.media) ? (payload.media as Record<string, unknown>[]) : [];
  let cover = typeof payload.cover === "string" ? payload.cover : "";
  const attached: string[] = [];

  for (const m of media) {
    const name = safeAssetName(String(m.filename || ""));
    if (!name) return { ok: false, error: `"${String(m.filename)}" is not a supported media filename.` };
    const base64 = String(m.contentBase64 || m.data || "").replace(/^data:[^,]*,/, "");
    if (!base64) return { ok: false, error: `"${name}" has no contentBase64.` };
    const bytes = Math.floor((base64.length * 3) / 4);
    if (bytes > MAX_ASSET_BYTES) {
      return { ok: false, error: `"${name}" is ${(bytes / 1024 / 1024).toFixed(1)} MB. The limit is 3 MB.` };
    }
    changes.push({ path: `${folder}/${name}`, base64 });
    attached.push(name);
    if (m.cover === true && !cover) cover = `./${name}`;
  }
  // No cover named and nothing flagged: the first image is the obvious one.
  if (!cover) {
    const firstImage = attached.find((n) => /\.(png|jpe?g|webp|gif|avif)$/i.test(n));
    if (firstImage) cover = `./${firstImage}`;
  }

  const today = new Date().toISOString().slice(0, 10);
  const fm: Record<string, unknown> = { title };
  for (const key of PUBLISH_FIELDS) {
    const v = payload[key];
    if (typeof v === "string" && v.trim()) fm[key] = v.trim();
  }
  if (Array.isArray(payload.tags)) {
    fm.tags = (payload.tags as unknown[]).filter((t): t is string => typeof t === "string");
  }
  if (!fm.desc) fm.desc = `One line describing this ${KIND_NOUN[kind]}.`;
  if (kind === "docs") {
    // No date and no year: a docs page is maintained, not published on a day.
    if (!fm.summary) fm.summary = String(fm.desc);
    if (!fm.pageType) fm.pageType = "concept";
  } else if (kind === "blog") {
    if (!fm.date) fm.date = today;
    if (!fm.author && (actor?.name || actor?.login)) fm.author = actor.name || actor.login;
    if (!fm.authorAvatar && actor?.avatar) fm.authorAvatar = actor.avatar;
  } else if (!fm.year) {
    fm.year = today.slice(0, 4);
  }
  if (cover) fm.cover = cover;
  fm.featured = payload.featured === true;
  // Default to a draft: an agent publishing straight to the front page on its
  // first try is the failure mode worth defaulting away from. Pass
  // draft: false to go live.
  fm.draft = payload.draft !== false;

  const body = String(payload.body || "").trim();
  if (!body) return { ok: false, error: "A body is required." };
  changes.push({ path: `${folder}/index.md`, text: `---\n${yaml.dump(fm).trim()}\n---\n\n${body}\n` });

  await ghCommit(changes, `cms: post ${kind}/${slug}`, actor);
  return {
    ok: true,
    id: `${folder}/index.md`,
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

// ------------------------------------------------------------------- handlers
export async function GET(req: Request): Promise<Response> {
  const route = sub(req);
  if (route === "auth/github/start") return githubStart(req);
  if (route === "auth/github/callback") return githubCallback(req);
  if (route === "auth") {
    const actor = await actorFor(req);
    return json({
      required: accessConfigured(),
      authed: !!actor || !accessConfigured(),
      github: !!GH_CLIENT_ID,
      org: allowedOrg() || null,
      orgReady: await orgReady(),
      user: actor
        ? { login: actor.login, via: actor.via, agent: actor.agent ?? null, name: actor.name ?? null, avatar: actor.avatar ?? null }
        : null,
      env: "prod",
    });
  }
  if (!(await authed(req))) return json({ error: "auth", required: true }, 401);
  if (route === "list") {
    try {
      return json({ groups: await listEditable() });
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }
  }
  if (route === "read") {
    const id = new URL(req.url).searchParams.get("id") || "";
    const data = await readEditable(id);
    return data ? json(data) : json({ error: "not_found" }, 404);
  }
  if (route === "assets") {
    const id = new URL(req.url).searchParams.get("id") || "";
    return json(await listAssets(id));
  }
  return json({ error: "unknown_cms_route" }, 404);
}

export async function POST(req: Request): Promise<Response> {
  const route = sub(req);
  const body = await readJson(req);

  if (route === "logout") return json({ ok: true }, 200, [clearSession(), hintCookie(false)]);

  if (!(await authed(req))) return json({ error: "auth", required: true }, 401);
  if (route === "upload") {
    try {
      const r = await uploadAsset(body, await actorFor(req));
      return json(r, r.ok ? 200 : 400);
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  if (route === "asset/delete") {
    try {
      const r = await deleteAsset(body, await actorFor(req));
      return json(r, r.ok ? 200 : 400);
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  if (route === "post") {
    try {
      const r = await postItem(body, await actorFor(req));
      return json(r, r.ok ? 200 : 400);
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  if (route === "rename") {
    try {
      const r = await renameEditable(body, await actorFor(req));
      return json(r, r.ok ? 200 : 400);
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  if (route === "duplicate") {
    try {
      const r = await duplicateEditable(body, await actorFor(req));
      return json(r, r.ok ? 200 : 400);
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  if (route === "delete") {
    try {
      const r = await deleteEditable(body, await actorFor(req));
      return json(r, r.ok ? 200 : 400);
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  if (route === "save") {
    try {
      const result = await writeEditable(String(body.id || ""), body, await actorFor(req));
      return json(result, result.ok ? 200 : 400);
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  if (route === "new") {
    try {
      const result = await createEditable(body, await actorFor(req));
      return json(result, result.ok ? 200 : 400);
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  // "publish" is a no-op on prod: every save already commits (which redeploys).
  if (route === "publish") return json({ ok: true, nothing: true });
  return json({ error: "unknown_cms_route" }, 404);
}
