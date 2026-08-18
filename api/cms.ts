// Prod CMS backend. A Vercel serverless function (Web API
// signature, Node runtime) that mirrors the dev middleware (scripts/cms-dev.mjs)
// but for the static live site: content is read/written via the GitHub Contents
// API (a save = a commit -> Vercel rebuild, ~1-2 min live), and all state is
// stateless (signed cookies for the session + WebAuthn challenge; passkey
// credentials committed to cms-passkeys.prod.json). Env: CMS_SESSION_SECRET
// (cookie HMAC), CMS_PASSWORD (register bootstrap + fallback login), GITHUB_TOKEN
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
const CRED_PATH = "cms-passkeys.prod.json";
const SECRET = process.env.CMS_SESSION_SECRET || "";
const PASSWORD = process.env.CMS_PASSWORD || "";
const TOKEN = process.env.GITHUB_TOKEN || "";
const RP_NAME = process.env.CMS_RP_NAME || "Content editor";

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
function rpInfo(req: Request) {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "")
    .split(",")[0]
    .trim();
  const hostname = host.split(":")[0];
  const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();
  return { rpID: hostname, origin: `${proto}://${host}` };
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
function signChallenge(challenge: string, purpose: "reg" | "auth"): string {
  return `cms_ch=${signPayload({ ch: challenge, purpose }, 5 * 60_000)}; HttpOnly; Secure; SameSite=Lax; Path=/api/cms; Max-Age=300`;
}
function readChallenge(req: Request, purpose: "reg" | "auth"): string | null {
  const p = verifyPayload(readCookie(req, "cms_ch"));
  if (!p || p.purpose !== purpose || typeof p.ch !== "string") return null;
  return p.ch;
}
const clearChallenge = () => `cms_ch=; HttpOnly; Secure; SameSite=Lax; Path=/api/cms; Max-Age=0`;
const sessionCookie = () => `cms_session=${signPayload({ sub: "cms-admin" }, 7 * 24 * 3600_000)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`;
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

function hasSession(req: Request): boolean {
  return !!verifyPayload(readCookie(req, "cms_session"));
}
function authed(req: Request): boolean {
  return !PASSWORD || hasSession(req);
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
async function ghWriteFile(path: string, text: string, message: string): Promise<void> {
  const existing = await ghReadFile(path);
  if (existing && existing.content === text) return; // no-op, avoid an empty commit
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(text, "utf8").toString("base64"),
    branch: BRANCH,
  };
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
const KINDS = ["blog", "hardware", "games"] as const;
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

async function writeHome(payload: Record<string, unknown>) {
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
  await ghWriteFile("data/about.md", aboutOut, "CMS: update Home hero (about.md)");
  await ghWriteFile("data/home.json", homeOut, "CMS: update Home content (home.json)");
  return { ok: true };
}

async function writeEditable(id: string, payload: Record<string, unknown>) {
  if (!isAllowed(id)) return { ok: false, error: "not_editable" };
  if (id === "page:home") return writeHome(payload);
  const type = typeOf(id);
  if (type === "md") {
    const fm = String(payload.frontmatter ?? "");
    try {
      yaml.load(fm);
    } catch (e) {
      return { ok: false, error: `invalid YAML frontmatter: ${(e as Error).message}` };
    }
    const body = String(payload.body ?? "").replace(/\s+$/, "");
    await ghWriteFile(id, `---\n${fm.trim()}\n---\n\n${body}\n`, `CMS: update ${id}`);
    return { ok: true };
  }
  // json
  const raw = String(payload.raw ?? "");
  try {
    JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `invalid JSON: ${(e as Error).message}` };
  }
  await ghWriteFile(id, raw.endsWith("\n") ? raw : raw + "\n", `CMS: update ${id}`);
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

async function createEditable(payload: Record<string, unknown>) {
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
  await ghWriteFile(id, `---\n${stubFrontmatter(kind, title)}\n---\n\n${body}`, `cms: add ${kind}/${slug}`);
  return { ok: true, id, slug, kind };
}

async function listEditable() {
  const paths = (await ghListTree()).map((e) => e.path);
  const has = (p: string) => paths.includes(p);
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

// ------------------------------------------------------------------ passkey
type Cred = { id: string; publicKey: string; counter: number; transports?: string[] };
async function loadCreds(): Promise<{ creds: Cred[]; sha: string | null }> {
  const f = await ghReadFile(CRED_PATH);
  if (!f) return { creds: [], sha: null };
  try {
    const creds = JSON.parse(f.content || "[]");
    return { creds: Array.isArray(creds) ? creds : [], sha: f.sha };
  } catch {
    return { creds: [], sha: f.sha };
  }
}
async function saveCreds(creds: Cred[], message: string): Promise<void> {
  await ghWriteFile(CRED_PATH, JSON.stringify(creds, null, 2) + "\n", message);
}

async function passkeyRegisterOptions(req: Request, body: Record<string, unknown>): Promise<Response> {
  const pw = String(body.password || "");
  const ok = !PASSWORD || hasSession(req) || safeEqual(pw, PASSWORD);
  if (!ok) return json({ error: "auth" }, 401);
  const { generateRegistrationOptions } = await import("@simplewebauthn/server");
  const { rpID } = rpInfo(req);
  const { creds } = await loadCreds();
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: "admin",
    userID: new TextEncoder().encode("cms-admin"),
    attestationType: "none",
    excludeCredentials: creds.map((c) => ({ id: c.id, transports: c.transports as never })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });
  return json(options, 200, [signChallenge(options.challenge, "reg")]);
}
async function passkeyRegisterVerify(req: Request, body: Record<string, unknown>): Promise<Response> {
  const { verifyRegistrationResponse } = await import("@simplewebauthn/server");
  const { rpID, origin } = rpInfo(req);
  const expectedChallenge = readChallenge(req, "reg");
  if (!expectedChallenge) return json({ ok: false, error: "no_challenge" }, 400, [clearChallenge()]);
  let result;
  try {
    result = await verifyRegistrationResponse({ response: body as never, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 400, [clearChallenge()]);
  }
  if (!result.verified || !result.registrationInfo) return json({ ok: false, error: "not_verified" }, 400, [clearChallenge()]);
  const c = result.registrationInfo.credential;
  const { creds } = await loadCreds();
  creds.push({ id: c.id, publicKey: Buffer.from(c.publicKey).toString("base64url"), counter: c.counter, transports: c.transports as string[] });
  await saveCreds(creds, "CMS: register passkey");
  return json({ ok: true }, 200, [clearChallenge(), sessionCookie(), hintCookie(true)]);
}
async function passkeyAuthOptions(req: Request): Promise<Response> {
  const { generateAuthenticationOptions } = await import("@simplewebauthn/server");
  const { rpID } = rpInfo(req);
  const { creds } = await loadCreds();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: creds.map((c) => ({ id: c.id, transports: c.transports as never })),
  });
  return json(options, 200, [signChallenge(options.challenge, "auth")]);
}
async function passkeyAuthVerify(req: Request, body: Record<string, unknown>): Promise<Response> {
  const { verifyAuthenticationResponse } = await import("@simplewebauthn/server");
  const { rpID, origin } = rpInfo(req);
  const expectedChallenge = readChallenge(req, "auth");
  if (!expectedChallenge) return json({ ok: false, error: "no_challenge" }, 400, [clearChallenge()]);
  const { creds } = await loadCreds();
  const cred = creds.find((c) => c.id === body.id);
  if (!cred) return json({ ok: false, error: "unknown_credential" }, 401, [clearChallenge()]);
  let result;
  try {
    result = await verifyAuthenticationResponse({
      response: body as never,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: { id: cred.id, publicKey: Buffer.from(cred.publicKey, "base64url"), counter: cred.counter, transports: cred.transports as never },
    });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 401, [clearChallenge()]);
  }
  if (!result.verified) return json({ ok: false, error: "not_verified" }, 401, [clearChallenge()]);
  if (result.authenticationInfo.newCounter !== cred.counter) {
    cred.counter = result.authenticationInfo.newCounter;
    await saveCreds(creds, "CMS: passkey counter");
  }
  return json({ ok: true }, 200, [clearChallenge(), sessionCookie(), hintCookie(true)]);
}

// ------------------------------------------------------------------- handlers
export async function GET(req: Request): Promise<Response> {
  const route = sub(req);
  if (route === "auth") {
    return json({ required: !!PASSWORD, authed: authed(req), hasPasskey: (await loadCreds()).creds.length > 0, env: "prod" });
  }
  if (!authed(req)) return json({ error: "auth", required: !!PASSWORD }, 401);
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

  if (route === "login") {
    if (!PASSWORD) return json({ ok: true, open: true });
    if (safeEqual(String(body.password || ""), PASSWORD)) return json({ ok: true }, 200, [sessionCookie(), hintCookie(true)]);
    return json({ ok: false, error: "bad_password" }, 401);
  }
  if (route === "logout") return json({ ok: true }, 200, [clearSession(), hintCookie(false)]);
  if (route === "passkey/auth/options") return passkeyAuthOptions(req);
  if (route === "passkey/auth/verify") return passkeyAuthVerify(req, body);
  if (route === "passkey/register/options") return passkeyRegisterOptions(req, body);
  if (route === "passkey/register/verify") return passkeyRegisterVerify(req, body);

  if (!authed(req)) return json({ error: "auth", required: !!PASSWORD }, 401);
  if (route === "save") {
    try {
      const result = await writeEditable(String(body.id || ""), body);
      return json(result, result.ok ? 200 : 400);
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  if (route === "new") {
    try {
      const result = await createEditable(body);
      return json(result, result.ok ? 200 : 400);
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  // "publish" is a no-op on prod: every save already commits (which redeploys).
  if (route === "publish") return json({ ok: true, nothing: true });
  return json({ error: "unknown_cms_route" }, 404);
}
