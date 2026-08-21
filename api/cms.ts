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
  return { login: sub, via: "github" };
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
const sessionCookie = (sub: string) =>
  `cms_session=${signPayload({ sub, via: "github" }, 7 * 24 * 3600_000)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`;
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
async function ghListTree(): Promise<{ path: string }[]> {
  const r = await fetch(`${GH}/git/trees/${BRANCH}?recursive=1`, { headers: ghHeaders() });
  if (!r.ok) throw new Error(`gh_tree_${r.status}`);
  const j = (await r.json()) as { tree: { path: string; type: string }[] };
  return j.tree.filter((e) => e.type === "blob");
}

// ---------------------------------------------------------------- content model
export const KINDS = ["blog", "hardware", "games"] as const;
function isAllowed(id: string): boolean {
  if (typeof id !== "string" || id.includes("..") || id.includes("\0")) return false;
  if (id === "page:home") return true;
  if (id === "data/about.md" || id === "data/home.json") return true;
  if (/^data\/sources\/[^/]+\.md$/.test(id)) return true;
  if (/^data\/(blog|hardware|games)\/[^/]+\/index\.md$/.test(id)) return true;
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
      tags: Array.isArray(fm.tags) ? (fm.tags as unknown[]).filter((t) => typeof t === "string") : [],
    };
  } catch {
    return { title: "", desc: "", kicker: "", date: "", tags: [] as string[] };
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
const KIND_NOUN: Record<string, string> = { blog: "article", hardware: "platform", games: "game" };

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

function stubFrontmatter(kind: string, title: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const esc = (s: string) => s.replace(/"/g, '\\"');
  const lines = [
    `title: "${esc(title)}"`,
    `kicker: "New"`,
    `tags: ["New"]`,
    `featured: false`,
    `desc: "One line describing this ${KIND_NOUN[kind]}."`,
  ];
  if (kind === "blog") lines.push(`date: "${today}"`);
  else lines.push(`year: "${today.slice(0, 4)}"`);
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
  const folders = paths
    .map((p) => new RegExp(`^data/${kind}/([^/]+)/index\\.md$`).exec(p)?.[1])
    .filter(Boolean) as string[];

  // A duplicate slug would collide on the public URL even though the folder
  // names differ by their order prefix, so check the slug, not the folder.
  for (const folder of folders) {
    const existing = /^(\d+)_(.+)$/.exec(folder)?.[2] ?? folder;
    if (existing === slug) return { ok: false, error: `"${slug}" already exists in ${kind}.` };
  }

  let max = 0;
  for (const folder of folders) {
    const n = Number(/^(\d+)_/.exec(folder)?.[1] ?? 0);
    if (n > max) max = n;
  }
  const id = `data/${kind}/${String(max + 1).padStart(2, "0")}_${slug}/index.md`;
  if (!isAllowed(id)) return { ok: false, error: "refused" };

  const body = "Write the post here. This body renders as markdown on the item page.\n";
  await ghWriteFile(id, `---\n${stubFrontmatter(kind, title)}\n---\n\n${body}`, `cms: add ${kind}/${slug}`, actor);
  return { ok: true, id, slug, kind };
}

async function listEditable() {
  const paths = (await ghListTree()).map((e) => e.path);
  const groups: { group: string; items: { id: string; title: string; sub?: string; type: string }[] }[] = [];

  const pages = [{ id: "page:home", title: "Home", sub: "hero, proof, recognition, philosophy", type: "home" }];
  groups.push({ group: "Pages", items: pages });

  for (const kind of KINDS) {
    const items = paths
      .filter((p) => new RegExp(`^data/${kind}/[^/]+/index\\.md$`).test(p))
      .sort()
      .map((p) => {
        const folder = p.split("/")[2];
        const slug = folder.replace(/^\d+_/, "");
        return { id: p, title: prettify(slug), sub: slug, type: "md" };
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
  const user = (await userRes.json().catch(() => ({}))) as { login?: string };
  if (!userRes.ok || !user.login) return loginFailed("profile");
  if (!(await mayEdit(user.login))) return loginFailed("not_allowed");

  return new Response(null, {
    status: 302,
    headers: [
      ["location", safeNext(typeof payload.next === "string" ? payload.next : "/")],
      ["set-cookie", `cms_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/api/cms; Max-Age=0`],
      ["set-cookie", sessionCookie(user.login.toLowerCase())],
      ["set-cookie", hintCookie(true, req)],
      ["cache-control", "no-store"],
    ],
  });
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
      user: actor ? { login: actor.login, via: actor.via, agent: actor.agent ?? null } : null,
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
  return json({ error: "unknown_cms_route" }, 404);
}

export async function POST(req: Request): Promise<Response> {
  const route = sub(req);
  const body = await readJson(req);

  if (route === "logout") return json({ ok: true }, 200, [clearSession(), hintCookie(false)]);

  if (!(await authed(req))) return json({ error: "auth", required: true }, 401);
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
