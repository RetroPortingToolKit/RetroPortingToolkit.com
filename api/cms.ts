import { wikiEnv, accessUser, docsAccess, protectedPage, audit, limit, verifyBridge, linkHash, memberRoles, docsRole, PUBLISH_USERS, DESTRUCTIVE_USERS, type WikiUser } from "./wiki-access";
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
import { parseUpdates } from "../scripts/page-updates.mjs";
import yaml from "js-yaml";
import { authorsOf, canonicalAuthors, teamMemberByGithub, type Team } from "../scripts/authors.mjs";
import { SUBMISSIONS_PATH } from "../scripts/submissions.mjs";
import { contentProblem } from "../scripts/cms-validate.mjs";

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
  githubId?: string;
  discordId?: string;
  request?: Request;
  docs?: boolean;
  /** display name, when GitHub has one */
  name?: string;
  /** the name data/team.json gives them, when they are on it */
  byline?: string;
  /** avatar URL */
  avatar?: string;
  /** how they authenticated */
  via: "github" | "agent";
  /** the agent key's label, when via === "agent" */
  agent?: string;
  /** Item ids this person may edit, when they are not a full editor: the
      pages of community submissions whose repository they own. */
  scope?: string[];
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
    else return false;
  } catch {
    return false;
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

// ------------------------------------------------------- contributor scope
// Someone who submitted a recomp owns its repository, and GitHub verified that
// ownership when the submission was published. Signing in with that account
// lets them edit their page and nothing else. The register is the source of
// truth, read fresh at most once a minute per function instance.
let scopeCache: { at: number; records: { owner: string; path: string; status: string }[] } | null = null;
export function clearScopeCache(): void { scopeCache = null; ownersCache = null; }
export async function contributorScope(login: string, now = Date.now()): Promise<string[]> {
  const want = login.trim().toLowerCase();
  if (!want) return [];
  if (!scopeCache || now - scopeCache.at > 60_000) {
    try {
      const file = await ghReadFile(SUBMISSIONS_PATH);
      const records = file ? JSON.parse(file.content) : [];
      scopeCache = { at: now, records: Array.isArray(records) ? records : [] };
    } catch {
      return [];
    }
  }
  const fromRegister = scopeCache.records
    .filter((r) => typeof r.owner === "string" && r.owner.toLowerCase() === want && r.status !== "removed" && isAllowed(r.path))
    .map((r) => r.path);
  // Any game page whose repository this login owns is theirs to edit too,
  // whether the team wrote it or it came through a submission.
  const owned = (await repoOwners()).filter((p) => p.owner === want).map((p) => p.path);
  return [...new Set([...fromRegister, ...owned])];
}
let ownersCache: { at: number; pages: { path: string; owner: string }[] } | null = null;
async function repoOwners(now = Date.now()): Promise<{ path: string; owner: string }[]> {
  if (ownersCache && now - ownersCache.at < 60_000) return ownersCache.pages;
  try {
    const paths = (await ghListTree()).map((e) => e.path).filter((p) => /^data\/games\/[^/]+\/index\.md$/.test(p));
    const texts = await ghReadMany(paths);
    const pages: { path: string; owner: string }[] = [];
    for (const [p, raw] of texts) {
      const owner = splitRaw(raw).fmText.match(/^repo:\s*["']?https:\/\/(?:github|gitlab)\.com\/([^/\s"']+)\//m)?.[1];
      if (owner) pages.push({ path: p, owner: owner.toLowerCase() });
    }
    ownersCache = { at: now, pages };
    return pages;
  } catch {
    return ownersCache?.pages ?? [];
  }
}
/** Is this item within what the actor may touch? Full editors have no scope. */
export function withinScope(actor: Actor | null, id: string): boolean {
  return !actor?.scope || actor.scope.includes(id) || !!(actor.docs && isDocsPath(id));
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
  if (payload.via !== "github" || (wikiEnv(req) && !payload.githubId)) return null;
  return {
    login: sub,
    githubId: typeof payload.githubId === "string" ? payload.githubId : undefined,
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
  if (who) who.request = req;
  if (!who) return null;
  const env = wikiEnv(req);
  const record = env ? (who.githubId
    ? await env.WIKI_ACCESS.prepare("SELECT * FROM wiki_users WHERE github_id = ?").bind(who.githubId).first<WikiUser>()
    : await accessUser(req, who.login)) : null;
  if (record?.suspended || (env && !record)) return null;
  if (record) { who.login = record.login; who.githubId = record.github_id; who.discordId = record.discord_id || undefined; }
  const fullEditor = await mayEdit(who.login);
  who.docs = env ? fullEditor || await docsAccess(req, record) : false;
  if (!fullEditor) {
    // Agents act for their owner and inherit nothing narrower than that.
    if (who.via !== "github") return null;
    const scope = await contributorScope(who.login);
    if (!scope.length && !env) return null;
    who.scope = scope;
  }
  // The name the team page uses for them, so a post they create is bylined
  // "Shokunin", not "tetrisgm" and not whatever GitHub has as a display name.
  who.byline = teamMemberByGithub(await teamRoster(), who.login)?.name;
  return who;
}

/** How this actor should be credited in the commit trailer. */
function actorLabel(actor: Actor | null): string {
  if (!actor) return "unknown";
  if (actor.via === "agent") return `${actor.login} via agent ${actor.agent}`;
  if (actor.via === "github") return actor.agent ? `${actor.login} via ${actor.agent}` : actor.login;
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
const sessionCookie = (sub: string, profile?: { name?: string; avatar?: string; githubId?: string }) =>
  `cms_session=${signPayload({ sub, via: "github", githubId: profile?.githubId || "", name: profile?.name || "", avatar: profile?.avatar || "" }, 7 * 24 * 3600_000)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`;
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
  return !wikiEnv(req) && !accessConfigured();
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
async function ghReadFile(path: string, ref = BRANCH): Promise<{ content: string; sha: string } | null> {
  const r = await fetch(`${GH}/contents/${path}?ref=${encodeURIComponent(ref)}`, { headers: ghHeaders() });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`gh_read_${r.status} ${path}`);
  const j = (await r.json()) as { content: string; encoding: string; sha: string };
  const content = j.encoding === "base64" ? Buffer.from(j.content, "base64").toString("utf8") : j.content;
  return { content, sha: j.sha };
}

type GhFile = Awaited<ReturnType<typeof ghReadFile>>;
type GhWriteOutcome = { ok: true; sha: string } | { ok: false; conflict: true };

/** Write against the exact file version the caller read. GitHub treats the
    supplied blob sha as a compare-and-swap precondition: if the path moves
    after the read, the PUT answers 409 instead of overwriting the newer file. */
async function ghWriteFileAtVersion(
  path: string,
  text: string,
  message: string,
  existing: GhFile,
  actor?: Actor | null,
): Promise<GhWriteOutcome> {
  if (existing && existing.content === text) return { ok: true, sha: existing.sha };
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
      email: `${actor.githubId ? actor.githubId + "+" : ""}${actor.login}@users.noreply.github.com`,
    };
  }
  if (existing) body.sha = existing.sha;
  await assertActiveActor(actor, [path]);
  const r = await fetch(`${GH}/contents/${path}`, {
    method: "PUT",
    headers: { ...ghHeaders(), "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (r.status === 409) return { ok: false, conflict: true };
  if (!r.ok) throw new Error(`gh_write_${r.status} ${path}: ${await r.text()}`);
  const written = (await r.json().catch(() => ({}))) as { content?: { sha?: string } };
  return { ok: true, sha: written.content?.sha ?? "" };
}

/** One commit that may write and delete several files at once.
    The Contents API is one file per commit, which would mean a commit and a
    rebuild per asset, and cannot express a deletion alongside the edit that
    stops referencing it. The Git Data API can: blobs, then a tree layered on
    the current one (a null sha removes a path), then a commit, then the ref.
    A blobSha change points a path at a blob that is already in the repo, which
    is how a file MOVES: nothing is downloaded, so no encoding step can touch
    the bytes. */
type Change =
  | { path: string; text: string }
  | { path: string; base64: string }
  | { path: string; blobSha: string }
  | { path: string; remove: true };

interface GhSnapshot {
  head: string;
  tree: string;
}

type GhCommitOutcome =
  | { ok: true; sha: string; blobs: Map<string, string> }
  | { ok: false; conflict: true };

async function ghJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const r = await fetch(url, {
    ...init,
    headers: { ...ghHeaders(), "content-type": "application/json", ...(init?.headers as object) },
  });
  if (!r.ok) throw new Error(`gh_${r.status} ${url.replace(GH, "")}: ${await r.text()}`);
  return (await r.json()) as Record<string, unknown>;
}

async function ghSnapshot(): Promise<GhSnapshot> {
  const ref = await ghJson(`${GH}/git/ref/heads/${BRANCH}`);
  const head = (ref.object as { sha: string }).sha;
  const commit = await ghJson(`${GH}/git/commits/${head}`);
  return { head, tree: (commit.tree as { sha: string }).sha };
}

/** Build one commit on an immutable branch snapshot, then advance the branch
    only if that commit is still a fast-forward. Blobs, trees and commits are
    harmless unreachable objects until the final ref update succeeds. */
async function ghCommitAt(
  changes: Change[],
  message: string,
  snapshot: GhSnapshot,
  actor?: Actor | null,
): Promise<GhCommitOutcome> {
  const blobs = new Map<string, string>();
  const tree: Record<string, unknown>[] = [];
  for (const c of changes) {
    if ("remove" in c) {
      tree.push({ path: c.path, mode: "100644", type: "blob", sha: null });
      continue;
    }
    if ("blobSha" in c) {
      tree.push({ path: c.path, mode: "100644", type: "blob", sha: c.blobSha });
      blobs.set(c.path, c.blobSha);
      continue;
    }
    const blob = await ghJson(`${GH}/git/blobs`, {
      method: "POST",
      body: "text" in c
        ? JSON.stringify({ content: c.text, encoding: "utf-8" })
        : JSON.stringify({ content: c.base64, encoding: "base64" }),
    });
    tree.push({ path: c.path, mode: "100644", type: "blob", sha: blob.sha });
    blobs.set(c.path, blob.sha as string);
  }

  const newTree = await ghJson(`${GH}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: snapshot.tree, tree }),
  });
  const commitBody: Record<string, unknown> = {
    message: actor ? `${message}\n\nEdited-by: ${actorLabel(actor)}` : message,
    tree: newTree.sha,
    parents: [snapshot.head],
  };
  if (actor) {
    commitBody.author = {
      name: actor.agent ? `${actor.login} (agent: ${actor.agent})` : actor.login,
      email: `${actor.githubId ? actor.githubId + "+" : ""}${actor.login}@users.noreply.github.com`,
    };
  }
  const commit = await ghJson(`${GH}/git/commits`, { method: "POST", body: JSON.stringify(commitBody) });
  await assertActiveActor(actor, changes.map(c => c.path));
  const updated = await fetch(`${GH}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    headers: { ...ghHeaders(), "content-type": "application/json" },
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  if (updated.status === 409 || updated.status === 422) return { ok: false, conflict: true };
  if (!updated.ok) throw new Error(`gh_${updated.status} /git/refs/heads/${BRANCH}: ${await updated.text()}`);
  return { ok: true, sha: commit.sha as string, blobs };
}

function mutationConflict() {
  return {
    ok: false,
    conflict: true,
    error: "The repository changed while this operation was being prepared. Reload, then try again.",
  } as const;
}

/** Publish a mutation whose validation used `snapshot`. Any branch movement,
    even on an unrelated path, leaves the newer branch untouched and asks the
    caller to retry instead of applying a decision made against older state. */
async function ghPublishMutation(
  changes: Change[],
  message: string,
  snapshot: GhSnapshot,
  actor?: Actor | null,
): Promise<ReturnType<typeof mutationConflict> | null> {
  if (!changes.length) return null;
  const result = await ghCommitAt(changes, message, snapshot, actor);
  return result.ok ? null : mutationConflict();
}

/** Read many files in ONE request. The editor's list needs each page's real
    title and whether it is a draft, which lives inside the file; over the REST
    contents API that is a call per page, so the list either cost a hundred
    requests or, as it did, showed a slug prettified into a fake title. GraphQL
    aliases fetch them all at once. */
/** data/team.json as the site has it, for bylines; empty when unreadable. */
async function teamRoster(): Promise<Team> {
  try {
    const file = await ghReadFile("data/team.json");
    return file ? (JSON.parse(file.content) as Team) : { members: [] };
  } catch {
    return { members: [] };
  }
}

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

async function ghListTree(snapshot?: GhSnapshot): Promise<{ path: string; sha: string }[]> {
  // A tree sha is immutable. Mutations pass the same snapshot they later use
  // as the commit parent, so validation and publication cannot see two heads.
  const tree = snapshot?.tree || BRANCH;
  const r = await fetch(`${GH}/git/trees/${encodeURIComponent(tree)}?recursive=1`, { headers: ghHeaders() });
  if (!r.ok) throw new Error(`gh_tree_${r.status}`);
  const j = (await r.json()) as { tree: { path: string; type: string; sha: string }[] };
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
// Exported for src/lib/cmsKinds.test.ts, which holds this parser and the one
// in scripts/cms-dev.mjs to identical output over the same frontmatter.
export function mdFields(fmText: string) {
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
      authors: authorsOf(fm),
      authorAvatar: str(fm.authorAvatar),
      summary: str(fm.summary),
      pageType: str(fm.pageType),
      sectionTitle: str(fm.sectionTitle),
      draft: fm.draft === true,
      featured: fm.featured === true,
      updates: parseUpdates(fmText),
      tags: Array.isArray(fm.tags) ? (fm.tags as unknown[]).filter((t) => typeof t === "string") : [],
    };
  } catch {
    return { title: "", desc: "", kicker: "", date: "", cover: "", platform: "", status: "", repo: "", author: "", authors: [] as string[], authorAvatar: "", summary: "", pageType: "", sectionTitle: "", draft: false, featured: false, updates: [] as { date: string; text: string }[], tags: [] as string[] };
  }
}

interface HomeSnapshot extends GhSnapshot {
  aboutFile: GhFile;
  homeFile: GhFile;
}

/** Pin both files to one commit. Reading them separately at `main` can pair
    about.md from one commit with home.json from the next. */
async function ghHomeSnapshot(): Promise<HomeSnapshot> {
  const snapshot = await ghSnapshot();
  const [aboutFile, homeFile] = await Promise.all([
    ghReadFile("data/about.md", snapshot.head),
    ghReadFile("data/home.json", snapshot.head),
  ]);
  return { ...snapshot, aboutFile, homeFile };
}

async function readHome() {
  const snapshot = await ghHomeSnapshot();
  const { aboutFile, homeFile } = snapshot;
  const aboutRaw = aboutFile?.content || "";
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
    const parsed = JSON.parse(homeFile?.content || "{}");
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
    baseSha: homeBaseSha(aboutFile?.sha, homeFile?.sha),
  };
}

// ---- optimistic concurrency ----
// The version a read hands out, sent back with the save as `expectedBase`. On
// prod that version is the GitHub blob sha, which changes with the content and
// costs nothing to obtain, because every read already has it. Mirrors
// fileBaseSha() in scripts/cms-dev.mjs, which hashes the bytes on disk; the two
// values never meet, since each backend only ever compares against its own.
const homeBaseSha = (about?: string, home?: string) => `${about || ""}.${home || ""}`;

async function readEditable(id: string) {
  if (!isAllowed(id)) return null;
  if (id === "page:home") return readHome();
  const file = await ghReadFile(id);
  if (!file) return null;
  const type = typeOf(id);
  if (type === "md") {
    const { fmText, body } = splitRaw(file.content);
    return { id, type, frontmatter: fmText, body: body.replace(/^\n+/, ""), fields: mdFields(fmText), baseSha: file.sha };
  }
  return { id, type, raw: file.content, baseSha: file.sha };
}

export interface WriteResult {
  ok: boolean;
  error?: string;
  /** the caller did not identify the version it edited -> HTTP 428 */
  preconditionRequired?: boolean;
  /** the save was built on a version the repo no longer holds -> 409 */
  staleBase?: boolean;
  /** the version the repo holds now, for the editor to carry forward */
  baseSha?: string;
}

function staleWrite(baseSha: string): WriteResult {
  return {
    ok: false,
    staleBase: true,
    baseSha,
    error: "The live site changed this page since you opened it. Load the live version, then re-apply your edit.",
  };
}

/** The three sections the editor knows about in home.json. Mirrored in
    scripts/cms-dev.mjs. */
const HOME_SECTIONS = ["proof", "recognition", "philosophy"] as const;

/** One home.json entry. A section holds strings today, so a stray number is
    coerced, but an object is passed through: String({}) would write the text
    "[object Object]" into the page and lose the entry. */
function homeEntry(value: unknown): unknown {
  return value && typeof value === "object" ? value : String(value);
}

async function writeHome(
  payload: Record<string, unknown>,
  initial: HomeSnapshot,
  expectedBase: string,
  actor?: Actor | null,
): Promise<WriteResult> {
  const about = (payload.about || {}) as Record<string, unknown>;
  const fm = String(about.frontmatter ?? "");
  try {
    yaml.load(fm);
  } catch (e) {
    return { ok: false, error: `about.md frontmatter: ${(e as Error).message}` };
  }
  // The blank line and the body only exist when there IS a body: about.md is
  // frontmatter alone, and writing the separator unconditionally grew the file
  // by two newlines on every save that changed nothing.
  const aboutBody = String(about.body ?? "").replace(/\s+$/, "");
  const aboutOut = `---\n${fm.trim()}\n---\n` + (aboutBody ? `\n${aboutBody}\n` : "");
  const home = (payload.home || {}) as Record<string, unknown>;
  let snapshot = initial;

  // A branch can advance for an unrelated page between our snapshot and ref
  // update. Retry from the new immutable snapshot while Home itself still has
  // exactly the version the caller supplied. A Home change is a real 409.
  for (let attempt = 0; attempt < 3; attempt++) {
    // Merge over the snapshot's home.json: the editor only knows about proof/
    // recognition/philosophy, and must not drop other authored sections.
    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(snapshot.homeFile?.content || "{}");
    } catch {}
    const merged: Record<string, unknown> = { ...existing };
    for (const key of HOME_SECTIONS) {
      const value = home[key];
      if (!Array.isArray(value)) continue;
      // An empty section the file never had is the editor reporting what it
      // found, not an edit.
      if (!value.length && !(key in existing)) continue;
      merged[key] = (value as unknown[]).map(homeEntry);
    }
    const homeOut = JSON.stringify(merged, null, 2) + "\n";
    const changes: Change[] = [];
    if (snapshot.aboutFile?.content !== aboutOut) changes.push({ path: "data/about.md", text: aboutOut });
    if (snapshot.homeFile?.content !== homeOut) changes.push({ path: "data/home.json", text: homeOut });
    if (!changes.length) {
      return {
        ok: true,
        baseSha: homeBaseSha(snapshot.aboutFile?.sha, snapshot.homeFile?.sha),
      };
    }

    const written = await ghCommitAt(changes, "CMS: update Home", snapshot, actor);
    if (written.ok) {
      return {
        ok: true,
        baseSha: homeBaseSha(
          written.blobs.get("data/about.md") || snapshot.aboutFile?.sha,
          written.blobs.get("data/home.json") || snapshot.homeFile?.sha,
        ),
      };
    }

    const latest = await ghHomeSnapshot();
    const latestBase = homeBaseSha(latest.aboutFile?.sha, latest.homeFile?.sha);
    if (latestBase !== expectedBase) return staleWrite(latestBase);
    snapshot = latest;
  }

  throw new Error("gh_ref_busy");
}

async function writeEditable(
  id: string,
  payload: Record<string, unknown>,
  actor?: Actor | null,
): Promise<WriteResult> {
  if (!isAllowed(id)) return { ok: false, error: "not_editable" };
  // A whole-file save without a version can erase any edit that landed after
  // the caller prepared its payload. Every caller must read first and send the
  // read's baseSha back as expectedBase.
  if (typeof payload.expectedBase !== "string" || !payload.expectedBase) {
    return {
      ok: false,
      preconditionRequired: true,
      error: "expectedBase is required. Read the page first, then save with the baseSha that read returned.",
    };
  }
  const expected = payload.expectedBase;

  if (id === "page:home") {
    const snapshot = await ghHomeSnapshot();
    const current = homeBaseSha(snapshot.aboutFile?.sha, snapshot.homeFile?.sha);
    if (expected !== current) return staleWrite(current);
    return writeHome(payload, snapshot, expected, actor);
  }

  const existing = await ghReadFile(id);
  const current = existing?.sha || "";
  if (expected !== current) return staleWrite(current);

  const type = typeOf(id);
  let out: string;
  if (type === "md") {
    const fm = String(payload.frontmatter ?? "");
    try {
      yaml.load(fm);
    } catch (e) {
      return { ok: false, error: `invalid YAML frontmatter: ${(e as Error).message}` };
    }
    if (actor?.scope) {
      // A contributor edits their page's words and pictures. Promotion onto the
      // home strips and the identity moderation checks stay with the team.
      const next = (yaml.load(fm) || {}) as Record<string, unknown>;
      const prev = (yaml.load(splitRaw(existing!.content).fmText) || {}) as Record<string, unknown>;
      if (next.featured === true) return { ok: false, error: "Only the team can feature a page." };
      for (const key of ["submissionId", "creator"] as const) {
        if (JSON.stringify(next[key] ?? null) !== JSON.stringify(prev[key] ?? null)) return { ok: false, error: `Only the team can change ${key}.` };
      }
    }
    const body = String(payload.body ?? "").replace(/\s+$/, "");
    // Every save commits to main, and every commit to main is a production
    // build, so the editor is the last place this can be caught cheaply. A
    // page pointing at an image it does not have fails the repository's own
    // checks, which stops the bot publishing anything at all.
    const listed = await listAssets(id);
    const problem = contentProblem({ body, frontmatter: fm, assets: listed.assets ?? [] });
    if (problem) return { ok: false, error: problem };
    const dated = isDocsPath(id) ? setDocsUpdated(fm) : fm;
    out = `---\n${dated.trim()}\n---\n\n${body}\n`;
  } else {
    // json
    const raw = String(payload.raw ?? "");
    try {
      JSON.parse(raw);
    } catch (e) {
      return { ok: false, error: `invalid JSON: ${(e as Error).message}` };
    }
    out = raw.endsWith("\n") ? raw : raw + "\n";
  }

  const written = await ghWriteFileAtVersion(id, out, `CMS: update ${id}${typeof payload.summary === "string" && payload.summary.trim() ? "\n\n" + payload.summary.trim().slice(0, 800) : ""}`, existing, actor);
  if (!written.ok) {
    // A change after our read makes GitHub reject the stale sha. Read once more
    // only to hand the editor the version it should reload.
    return staleWrite((await ghReadFile(id))?.sha || "");
  }
  return { ok: true, baseSha: written.sha };
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
    lines.push(`updated: "${today}"`);
    // A docs page has no date, no year and no repository of its own. It leads
    // with the sentence under its H1 and says which quadrant it is in.
    lines.push(`summary: "One sentence telling a reader what this page answers."`);
    lines.push(`pageType: "concept"`);
    // A section's own page names the section in navigation.
    if (!section) lines.push(`sectionTitle: "${esc(title)}"`);
  } else if (kind === "blog") {
    lines.push(`date: "${today}"`);
    // A post is bylined to whoever created it, not to the site's default
    // author, which is how someone else's name ends up on your writing — and
    // under the name the team page uses for them, not their GitHub login.
    const byline = actor?.byline || actor?.name || actor?.login;
    if (byline) lines.push(`authors: ["${esc(byline)}"]`);
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

  const snapshot = await ghSnapshot();
  const paths = (await ghListTree(snapshot)).map((e) => e.path);
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

  const body = kind === "docs" && typeof payload.body === "string" ? payload.body.trim() + "\n" : "Write the post here. This body renders as markdown on the item page.\n";
  let frontmatter = stubFrontmatter(kind, title, actor, section);
  if (kind === "docs" && typeof payload.body === "string") {
    const description = String(payload.description || payload.summary || title).trim().slice(0, 400);
    frontmatter = frontmatter.replace(/^desc:.*$/m, `desc: ${JSON.stringify(description)}`).replace(/^summary:.*$/m, `summary: ${JSON.stringify(description)}`);
  }
  const problem = contentProblem({ body, frontmatter, assets: [] });
  if (problem) return { ok: false, error: problem };
  const conflict = await ghPublishMutation(
    [{ path: id, text: `---\n${frontmatter}\n---\n\n${body}` }],
    `cms: add ${where}/${slug}${typeof payload.summary === "string" ? "\n\n" + payload.summary.slice(0, 600) : ""}`,
    snapshot,
    actor,
  );
  if (conflict) return conflict;
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
  const metaOf = (p: string): { title?: string; draft?: boolean; date?: string } => {
    const raw = texts.get(p);
    if (!raw) return {};
    try {
      const fm = (yaml.load(splitRaw(raw).fmText) || {}) as Record<string, unknown>;
      return {
        title: typeof fm.title === "string" ? fm.title : undefined,
        draft: fm.draft === true,
        // The editor orders the blog by this; the folder number is display
        // order for the imported posts and append order for everything since.
        date: typeof fm.date === "string" ? fm.date : undefined,
      };
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
        return { id: p, title: meta.title || prettify(slug), sub: slug, type: "md", draft: !!meta.draft, date: meta.date || "" };
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
    headers: { accept: "application/json", "content-type": "application/json", "user-agent": "cms" },
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
  const user = (await userRes.json().catch(() => ({}))) as { id?: number; login?: string; name?: string; avatar_url?: string };
  if (!userRes.ok || !user.login) return loginFailed("profile");
  if (wikiEnv(req)) {
    if (!user.id) return loginFailed("profile");
    const db = wikiEnv(req)!.WIKI_ACCESS;
    await db.prepare("INSERT INTO wiki_users(github_id,login) VALUES(?,?) ON CONFLICT(github_id) DO UPDATE SET login = excluded.login").bind(String(user.id), user.login.toLowerCase()).run();
    if ((await accessUser(req, user.login))?.suspended) return loginFailed("disabled");
  } else if (!(await mayEdit(user.login)) && !(await contributorScope(user.login)).length) return loginFailed("not_allowed");

  return new Response(null, {
    status: 302,
    headers: [
      ["location", safeNext(typeof payload.next === "string" ? payload.next : "/")],
      ["set-cookie", `cms_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/api/cms; Max-Age=0`],
      ["set-cookie", sessionCookie(user.login.toLowerCase(), { name: user.name || user.login, avatar: user.avatar_url, githubId: user.id ? String(user.id) : undefined })],
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
  const snapshot = await ghSnapshot();
  if (!(await ghReadFile(id, snapshot.head))) return { ok: false, error: "not_found" };
  const path = `${folder}/${name}`;
  const conflict = await ghPublishMutation([{ path, base64 }], `cms: add ${path}`, snapshot, actor);
  if (conflict) return conflict;
  // `path` is what the editor writes into `cover:`, and a cover is resolved
  // against the item's own folder, so it has to be the relative "./name" the
  // dev backend returns. The repo-relative path resolved to nothing and the
  // cover came out blank.
  return { ok: true, path: `./${name}`, name, markdown: `![](./${name})` };
}

async function deleteAsset(body: Record<string, unknown>, actor?: Actor | null) {
  const id = String(body.id || "");
  const folder = itemFolder(id);
  if (!folder) return { ok: false, error: "not_an_item" };
  const name = safeAssetName(String(body.name || ""));
  if (!name) return { ok: false, error: "bad_name" };
  const path = `${folder}/${name}`;
  const snapshot = await ghSnapshot();
  const exists = (await ghListTree(snapshot)).some((e) => e.path === path);
  if (!exists) return { ok: false, error: "not_found" };
  const conflict = await ghPublishMutation([{ path, remove: true }], `cms: remove ${path}`, snapshot, actor);
  if (conflict) return conflict;
  return { ok: true, path };
}

/** Does this text reference that exact page path? A plain substring test was
    wrong: "/games/tomba" is inside "/games/tomba-2", so deleting one page was
    refused because a DIFFERENT page was featured. The lookahead ends the match
    at the end of the path, while still matching a page INSIDE the path being
    deleted (where the next character is "/"), so featuring a docs page still
    protects the section holding it. Mirrored in scripts/cms-dev.mjs. */
function referencesPath(text: string, path: string): boolean {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escaped}(?![A-Za-z0-9._-])`).test(text);
}

/** Remove an item: its whole folder, and the generated preview keyed to its
    slug, which nothing else references once the item is gone. Deleting a docs
    section takes every page inside it, so the reply counts them. */
async function deleteEditable(body: Record<string, unknown>, actor?: Actor | null) {
  const id = String(body.id || "");
  const folder = itemFolder(id);
  const slug = itemSlug(id);
  if (!folder || !slug) return { ok: false, error: "Only content items can be deleted." };
  const snapshot = await ghSnapshot();
  // The homepage names the pages it features, and the build refuses to
  // produce a homepage that links a page which does not exist. Deleting one
  // out from under it therefore breaks every later build, not just this one,
  // and the failure surfaces nowhere near the person who caused it.
  const home = await ghReadFile("data/home.json", snapshot.head);
  if (home && referencesPath(home.content, `/${kindSegment(id)}/${slug}`)) {
    return {
      ok: false,
      error: `The home page features this page, so deleting it would break the site build. Remove it from the home page first: open Pages > Home and take out the card that points at /${kindSegment(id)}/${slug}.`,
    };
  }

  const paths = (await ghListTree(snapshot)).map((e) => e.path);
  const own = paths.filter((p) => p === `${folder}/index.md` || p.startsWith(`${folder}/`));
  if (!own.length) return { ok: false, error: "not_found" };
  const previews = paths.filter((p) => new RegExp(`^public/previews/${slug}\\.(mp4|webp|webm|png|jpg)$`).test(p));
  const files = [...own, ...previews];
  const changes: Change[] = files.map((path) => ({ path, remove: true }));
  // A docs section holds a page per folder, so deleting one deletes them all.
  // Nothing else nests, so this is 0 everywhere else.
  const children = own.filter((p) => p.endsWith("/index.md") && p !== `${folder}/index.md`).length;
  const conflict = await ghPublishMutation(changes, `cms: delete ${folder}`, snapshot, actor);
  if (conflict) return conflict;
  return { ok: true, removed: files.length, children, warning: childWarning(children), files };
}

/** What the editor should tell someone who just deleted a section. Empty when
    the item had nothing inside it. Mirrored in scripts/cms-dev.mjs. */
function childWarning(children: number): string {
  if (!children) return "";
  return `This also deleted ${children} page${children === 1 ? "" : "s"} inside it.`;
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

  const snapshot = await ghSnapshot();
  const tree = await ghListTree(snapshot);
  const paths = tree.map((e) => e.path);
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
  const own = tree.filter((e) => e.path.startsWith(`${source}/`));
  if (!own.length) return { ok: false, error: "not_found" };

  const changes: Change[] = [];
  for (const from of own) {
    // Point the new path at the file's existing blob. Reading the file first
    // would decode it as utf-8, and re-encoding that string destroys every
    // byte sequence that is not text: a moved image arrived corrupt.
    changes.push({ path: `${target}/${from.path.slice(source.length + 1)}`, blobSha: from.sha });
    changes.push({ path: from.path, remove: true });
  }
  const conflict = await ghPublishMutation(changes, `cms: rename ${source} -> ${target}`, snapshot, actor);
  if (conflict) return conflict;
  return { ok: true, id: `${target}/index.md`, slug };
}

/** Start a new page from this one. The copy is a draft, so duplicating never
    publishes anything by itself. */
async function duplicateEditable(body: Record<string, unknown>, actor?: Actor | null) {
  const id = String(body.id || "");
  const parts = itemParts(id);
  if (!parts) return { ok: false, error: "Only content items can be duplicated." };
  const { kind, parent } = parts;
  const snapshot = await ghSnapshot();
  const [file, tree] = await Promise.all([ghReadFile(id, snapshot.head), ghListTree(snapshot)]);
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
  const paths = tree.map((e) => e.path);
  const folders = foldersOf(kind, parent, paths);
  if (folders.some((f) => folderSlugOf(f) === slug)) {
    return { ok: false, error: `"${slug}" already exists in ${kind}.` };
  }
  fm.title = title;
  fm.draft = true;
  fm.featured = false;
  // The copy joins its original's neighbours: a docs page stays in its section.
  const target = `data/${kind}${parent ? `/${parent}` : ""}/${nextOrder(folders)}_${slug}/index.md`;
  const conflict = await ghPublishMutation(
    [{ path: target, text: `---\n${yaml.dump(fm).trim()}\n---\n\n${mdBody.replace(/^\n+/, "")}` }],
    `cms: duplicate ${kind}/${slug}`,
    snapshot,
    actor,
  );
  if (conflict) return conflict;
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
  "updated",
] as const;

// The publishable keys that are LISTS. They need their own loop: the scalar
// one above tests `typeof v === "string"`, which drops an array on the floor,
// so `repos` looked accepted and was silently never written.
export const PUBLISH_LIST_FIELDS = ["tags", "repos", "authors"] as const;

// Which of those keys each kind may actually receive. The copy loop used to
// apply every field to every kind, so an agent posting a docs page could write
// date, year, status, platform and a byline into it, which docs/AUTHORING.md
// and public/agent.md both say a docs page does not take. Each list is what
// that kind's own pages carry plus what those two documents promise it.
export const PUBLISH_KIND_FIELDS: Record<string, readonly string[]> = {
  blog: ["kicker", "desc", "tags", "date", "year", "repo", "updated", "videoUrl", "author", "authors", "authorAvatar", "authorBio", "venue"],
  hardware: ["kicker", "desc", "tags", "year", "status", "availability", "repo", "updated"],
  games: ["kicker", "desc", "tags", "year", "status", "availability", "platform", "repo", "videoUrl", "updated"],
  docs: ["kicker", "desc", "tags", "summary", "pageType", "sectionTitle", "updated", "repos"],
};

async function postItem(payload: Record<string, unknown>, actor?: Actor | null) {
  const kind = String(payload.kind || "");
  if (!(KINDS as readonly string[]).includes(kind)) {
    return { ok: false, error: `kind must be one of: ${KINDS.join(", ")}` };
  }
  const title = String(payload.title || "").trim();
  if (!title) return { ok: false, error: "A title is required." };
  const slug = slugify(String(payload.slug || title));
  if (!slug) return { ok: false, error: "That title has no usable characters for a URL." };

  const snapshot = await ghSnapshot();
  const paths = (await ghListTree(snapshot)).map((e) => e.path);
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
  const takes = new Set(PUBLISH_KIND_FIELDS[kind] ?? []);
  for (const key of PUBLISH_FIELDS) {
    if (!takes.has(key)) continue;
    const v = payload[key];
    if (typeof v === "string" && v.trim()) fm[key] = v.trim();
  }
  for (const key of PUBLISH_LIST_FIELDS) {
    if (!takes.has(key)) continue;
    const v = payload[key];
    if (Array.isArray(v)) fm[key] = (v as unknown[]).filter((t): t is string => typeof t === "string");
  }
  if (!fm.desc) fm.desc = `One line describing this ${KIND_NOUN[kind]}.`;
  if (kind === "docs") {
    if (!fm.updated) fm.updated = today;
    // No date and no year: a docs page is maintained, not published on a day.
    if (!fm.summary) fm.summary = String(fm.desc);
    if (!fm.pageType) fm.pageType = "concept";
  } else if (kind === "blog") {
    if (!fm.date) fm.date = today;
    const byline = actor?.byline || actor?.name || actor?.login;
    if (!authorsOf(fm).length && byline) fm.authors = [byline];
    if (Array.isArray(fm.authors)) fm.authors = canonicalAuthors(await teamRoster(), fm.authors as string[]);
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
  if (kind === "docs") {
    const problem = contentProblem({ body, frontmatter: yaml.dump(fm), assets: attached });
    if (problem) return { ok: false, error: problem };
  }
  changes.push({ path: `${folder}/index.md`, text: `---\n${yaml.dump(fm).trim()}\n---\n\n${body}\n` });

  const conflict = await ghPublishMutation(changes, `cms: post ${kind}/${slug}`, snapshot, actor);
  if (conflict) return conflict;
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
function mutationStatus(result: { ok: boolean; conflict?: boolean }): number {
  return result.ok ? 200 : result.conflict ? 409 : 400;
}

export async function GET(req: Request): Promise<Response> {
  const route = sub(req);
  if (route === "auth/github/start") return githubStart(req);
  if (route === "auth/github/callback") return githubCallback(req);
  if (route === "auth") {
    const actor = await actorFor(req);
    return json({
      required: !!wikiEnv(req) || accessConfigured(),
      authed: !!actor || (!wikiEnv(req) && !accessConfigured()),
      github: !!GH_CLIENT_ID,
      org: allowedOrg() || null,
      orgReady: await orgReady(),
      user: actor
        ? { login: actor.login, via: actor.via, agent: actor.agent ?? null, name: actor.name ?? null, avatar: actor.avatar ?? null, scope: actor.scope ?? null, docs: actor.docs ?? false, discordId: actor.discordId ?? null, wikiAdmin: wikiEnv(req) ? await wikiAdmin(actor) : false }
        : null,
      env: "prod",
    });
  }
  if (route === "wiki/history" || route === "wiki/revision") return wikiHistory(req, route);
  if (!(await authed(req))) return json({ error: "auth", required: true }, 401);
  const actor = await actorFor(req);
  if (route === "wiki/account") return wikiAccount(req, actor);
  if (route === "wiki/admin") return wikiAdministration(req, actor);
  if (route === "list") {
    try {
      const groups = await listEditable();
      if (actor?.scope) {
        const items = groups.flatMap((g) => g.items).filter((i) => actor.scope!.includes(i.id));
        const docs = actor.docs ? groups.filter(g => g.group === "Docs") : [];
        // The platform picker is built from the Hardware folder, which a
        // contributor does not see, so the choices travel separately.
        const platforms = (groups.find((g) => g.group === "Hardware")?.items ?? []).map((i) => ({ slug: i.sub || "", title: i.title })).filter((o) => o.slug);
        return json({ groups: [...docs, { group: "Your pages", items }], platforms });
      }
      return json({ groups });
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }
  }
  if (route === "read") {
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!withinScope(actor, id)) return json({ error: "forbidden" }, 403);
    const data = await readEditable(id);
    return data ? json(data) : json({ error: "not_found" }, 404);
  }
  if (route === "assets") {
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!withinScope(actor, id)) return json({ error: "forbidden" }, 403);
    return json(await listAssets(id));
  }
  return json({ error: "unknown_cms_route" }, 404);
}

export async function POST(req: Request): Promise<Response> {
  const route = sub(req);
  if (route === "wiki/bridge") return wikiBridge(req);
  const body = await readJson(req);
  if (wikiEnv(req) && req.headers.has("cookie") && req.headers.get("origin") !== new URL(req.url).origin) return json({ error: "Invalid request origin." }, 403);

  if (route === "logout") return json({ ok: true }, 200, [clearSession(), hintCookie(false)]);

  if (!(await authed(req))) return json({ error: "auth", required: true }, 401);
  const actor = await actorFor(req);
  if (route.startsWith("wiki/")) return wikiMutation(req, actor, route, body);
  if (wikiEnv(req) && actor) {
    const denial = await wikiWriteGate(req, actor, route, body);
    if (denial) return denial;
    await limit(req, actor.githubId || actor.login);
  }
  // A contributor may change their own page and its files, and nothing else:
  // no new pages, no renames, no deletions, no posting.
  if (actor?.scope) {
    if (!["upload", "asset/delete", "save", "publish", ...(actor.docs ? ["new", "post"] : [])].includes(route)) return json({ ok: false, error: "forbidden" }, 403);
    if (route !== "publish" && route !== "new" && route !== "post" && !withinScope(actor, String(body.id || ""))) return json({ ok: false, error: "forbidden" }, 403);
  }
  if (route === "upload") {
    try {
      const r = await uploadAsset(body, actor);
      return json(r, mutationStatus(r));
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  if (route === "asset/delete") {
    try {
      const r = await deleteAsset(body, actor);
      return json(r, mutationStatus(r));
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  if (route === "post") {
    try {
      const r = await postItem(body, actor);
      return json(r, mutationStatus(r));
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  if (route === "rename") {
    try {
      const r = await renameEditable(body, actor);
      return json(r, mutationStatus(r));
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  if (route === "duplicate") {
    try {
      const r = await duplicateEditable(body, actor);
      return json(r, mutationStatus(r));
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  if (route === "delete") {
    try {
      const r = await deleteEditable(body, actor);
      return json(r, mutationStatus(r));
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  if (route === "save") {
    try {
      const result = await writeEditable(String(body.id || ""), body, actor);
      // 428 tells clients to read before their first save. 409 tells an editor
      // that the version it did read is no longer current.
      return json(result, result.ok ? 200 : result.preconditionRequired ? 428 : result.staleBase ? 409 : 400);
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  if (route === "new") {
    try {
      const result = await createEditable(body, actor);
      return json(result, mutationStatus(result));
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500);
    }
  }
  // "publish" is a no-op on prod: every save already commits (which redeploys).
  if (route === "publish") return json({ ok: true, nothing: true });
  return json({ error: "unknown_cms_route" }, 404);
}

// Wiki capabilities are additive to existing CMS and game-owner permissions.
export function isDocsPath(id: string): boolean {
  return /^data\/docs\/\d+_[a-z0-9-]+\/(?:\d+_[a-z0-9-]+\/)?index\.md$/.test(id);
}
function setDocsUpdated(fm: string) {
  const date = `updated: "${new Date().toISOString().slice(0, 10)}"`;
  return /^updated:.*$/m.test(fm) ? fm.replace(/^updated:.*$/m, date) : `${fm.trim()}\n${date}`;
}
async function wikiAdmin(actor: Actor | null): Promise<boolean> {
  if (!actor || actor.via !== "github") return false;
  const response = await fetch(`https://api.github.com/orgs/RetroPortingToolKit/memberships/${encodeURIComponent(actor.login)}`, { headers: ghHeaders() });
  if (!response.ok) return false;
  const membership = await response.json() as { state: string; role: string };
  return membership.state === "active" && membership.role === "admin";
}
async function wikiWriteGate(req: Request, actor: Actor, route: string, body: Record<string, unknown>): Promise<Response | null> {
  const id = String(body.id || "");
  const admin = await wikiAdmin(actor);
  if (["new", "post"].includes(route) && body.kind === "docs" && !body.section && !admin) return json({ error: "Only org admins may create docs sections." }, 403);
  if (isDocsPath(id) && route === "rename") return json({ error: "Docs URL changes require a tracked migration so page history and protections remain intact." }, 400);
  if (["new", "post"].includes(route) && actor.scope && (body.kind !== "docs" || !actor.docs || !body.section)) return json({ error: "You may create docs inside existing sections only." }, 403);
  if (route === "post" && body.kind === "docs" && body.featured === true && !admin) return json({ error: "Only org admins may promote docs." }, 403);
  if (isDocsPath(id)) {
    if (!withinScope(actor, id)) return json({ error: "Docs editing permission is required." }, 403);
    if (!admin && (await protectedPage(req, id) || !["save", "upload", "asset/delete"].includes(route))) return json({ error: "This action requires an org admin." }, 403);
    if (!admin && route === "save") {
      const before = await ghReadFile(id);
      if (!before) return json({ error: "not_found" }, 404);
      const prev = yaml.load(splitRaw(before.content).fmText) as Record<string, unknown>;
      const next = yaml.load(String(body.frontmatter || "")) as Record<string, unknown>;
      for (const key of ["order", "sectionTitle", "featured"])
        if (JSON.stringify(prev?.[key] ?? null) !== JSON.stringify(next?.[key] ?? null)) return json({ error: `Only admins may change ${key}.` }, 403);
    }
  }
  return null;
}
async function wikiAccount(req: Request, actor: Actor | null) {
  if (!actor || !wikiEnv(req)) return json({ error: "Sign in with GitHub." }, 401);
  return json({ pending: (await wikiEnv(req)!.WIKI_ACCESS.prepare("SELECT hash,discord_id,discord_name FROM wiki_links WHERE github_id = ? AND discord_id IS NOT NULL AND expires > ?").bind(actor.githubId || "", Date.now()).all()).results, user: await accessUser(req, actor.login), docs: !!actor.docs || !actor.scope, admin: await wikiAdmin(actor) });
}
async function wikiAdministration(req: Request, actor: Actor | null) {
  if (!wikiEnv(req) || !await wikiAdmin(actor)) return json({ error: "Org admin required." }, 403);
  const db = wikiEnv(req)!.WIKI_ACCESS;
  const [users, protections, events] = await Promise.all([
    db.prepare("SELECT * FROM wiki_users ORDER BY login").all(),
    db.prepare("SELECT path FROM wiki_protections ORDER BY path").all(),
    db.prepare("SELECT * FROM wiki_audit ORDER BY id DESC LIMIT 100").all(),
  ]);
  return json({ users: users.results, protections: protections.results, audit: events.results });
}
async function wikiMutation(req: Request, actor: Actor | null, route: string, body: Record<string, unknown>) {
  const env = wikiEnv(req);
  if (!env || !actor || actor.via !== "github") return json({ error: "Sign in with GitHub." }, 401);
  const user = await accessUser(req, actor.login);
  if (!user || user.suspended) return json({ error: "Sign in again to refresh your account." }, 403);
  await limit(req, user.github_id);
  if (route === "wiki/link") {
    if (user.discord_id) return json({ error: "Discord is already linked. An admin can clear an incorrect link." }, 400);
    const code = crypto.randomBytes(18).toString("hex");
    await env.WIKI_ACCESS.batch([
      env.WIKI_ACCESS.prepare("DELETE FROM wiki_links WHERE expires < ? OR github_id = ?").bind(Date.now(), user.github_id),
      env.WIKI_ACCESS.prepare("INSERT INTO wiki_links(hash,github_id,expires) VALUES(?,?,?)").bind(linkHash(code), user.github_id, Date.now() + 600000),
    ]);
    return json({ ok: true, code });
  }
  if (route === "wiki/confirm-link") {
    const link = await env.WIKI_ACCESS.prepare("DELETE FROM wiki_links WHERE hash = ? AND github_id = ? AND discord_id IS NOT NULL AND expires > ? RETURNING discord_id").bind(String(body.hash || ""), user.github_id, Date.now()).first<{discord_id:string}>();
    if (!link || user.discord_id) return json({ error: "Link expired or account already linked." }, 400);
    await env.WIKI_ACCESS.batch([
      env.WIKI_ACCESS.prepare("UPDATE wiki_users SET discord_id = ? WHERE github_id = ? AND discord_id IS NULL AND suspended = 0").bind(link.discord_id, user.github_id),
      env.WIKI_ACCESS.prepare("INSERT INTO wiki_audit(actor,action,target,reason) VALUES(?,?,?,?)").bind(actor.login, "link", link.discord_id, "Confirmed in GitHub-authenticated CMS"),
    ]);
    return json({ ok: true });
  }
  if (!await wikiAdmin(actor)) return json({ error: "Org admin required." }, 403);
  const reason = String(body.reason || "").trim().slice(0, 500);
  if (!reason) return json({ error: "A reason is required." }, 400);
  if (route === "wiki/user") {
    const target = String(body.githubId || "");
    const record = await env.WIKI_ACCESS.prepare("SELECT * FROM wiki_users WHERE github_id = ?").bind(target).first<WikiUser>();
    if (!record) return json({ error: "Account not found. They must sign in first." }, 404);
    if (body.suspended === true && target === user.github_id) return json({ error: "You cannot disable your own account." }, 400);
    if (body.unlink === true && record.suspended) return json({ error: "Enable this user before clearing their identity link." }, 400);
    const docs = typeof body.docs === "boolean" ? Number(body.docs) : record.docs;
    const suspended = typeof body.suspended === "boolean" ? Number(body.suspended) : record.suspended;
    await env.WIKI_ACCESS.batch([
      env.WIKI_ACCESS.prepare("UPDATE wiki_users SET docs = ?, suspended = ?, discord_id = ? WHERE github_id = ?").bind(docs, suspended, body.unlink === true ? null : record.discord_id, target),
      env.WIKI_ACCESS.prepare("INSERT INTO wiki_audit(actor,action,target,reason) VALUES(?,?,?,?)").bind(actor.login, JSON.stringify({ docs, suspended, unlink: body.unlink === true }), target, reason),
    ]);
    return json({ ok: true });
  }
  if (route === "wiki/protect") {
    const id = String(body.id || "");
    if (!isDocsPath(id) || !await ghReadFile(id)) return json({ error: "A current docs page is required." }, 400);
    await env.WIKI_ACCESS.batch([
      body.protected === true ? env.WIKI_ACCESS.prepare("INSERT OR IGNORE INTO wiki_protections(path) VALUES(?)").bind(id) : env.WIKI_ACCESS.prepare("DELETE FROM wiki_protections WHERE path = ?").bind(id),
      env.WIKI_ACCESS.prepare("INSERT INTO wiki_audit(actor,action,target,reason) VALUES(?,?,?,?)").bind(actor.login, body.protected === true ? "protect" : "unprotect", id, reason),
    ]);
    return json({ ok: true });
  }
  if (route === "wiki/restore") return restoreWiki(req, actor, body, reason);
  return json({ error: "Unknown wiki action." }, 404);
}
async function reachableRevision(ref: string) {
  if (!/^[a-f0-9]{40}$/.test(ref)) return false;
  const comparison = await ghJson(`${GH}/compare/${ref}...${BRANCH}?per_page=1`);
  return comparison.status === "ahead" || comparison.status === "identical";
}
async function wikiHistory(req: Request, route: string) {
  const url = new URL(req.url);
  let id = url.searchParams.get("id") || "";
  if (id.startsWith("/docs/")) {
    const slug = id.slice(6);
    id = (await ghListTree()).find(e => isDocsPath(e.path) && itemSlug(e.path) === slug)?.path || "";
  }
  if (!isDocsPath(id)) return json({ error: "Invalid docs page." }, 400);
  if (route === "wiki/revision") {
    const ref = url.searchParams.get("ref") || "";
    if (!await reachableRevision(ref)) return json({ error: "Revision must belong to main." }, 400);
    const file = await ghReadFile(id, ref);
    const commit = await ghJson(`${GH}/commits/${ref}`);
    const parent = (commit.parents as {sha:string}[] | undefined)?.[0]?.sha;
    const previous = parent ? await ghReadFile(id, parent) : null;
    const files = ((commit.files || []) as { filename:string; status:string }[]).filter(f => f.filename.startsWith(id.slice(0,-8)) && !f.filename.slice(id.length - 8).includes("/")).map(f => ({ path:f.filename, status:f.status }));
    return json({ id, raw: file?.content || "", previousRaw: previous?.content || "", files, baseSha: file?.sha || "", deleted: !file, ref });
  }
  const page = Math.max(1, Math.min(10000, Number(url.searchParams.get("page")) || 1));
  const r = await fetch(`${GH}/commits?sha=${BRANCH}&path=${encodeURIComponent(id.slice(0, -8))}&per_page=30&page=${page}`, { headers: ghHeaders() });
  if (!r.ok) throw new Error("Page history unavailable.");
  const candidates = await r.json() as {sha:string}[];
  const latestRef = candidates[0]?.sha || null;
  let revisions = candidates;
  // A section index owns only direct media, never its child pages.
  if (id.split("/").length === 4) {
    const folder = id.slice(0,-8);
    const details = await Promise.all(candidates.map(commit => ghJson(`${GH}/commits/${commit.sha}`)));
    revisions = candidates.filter((_, i) => ((details[i].files || []) as {filename:string}[]).some(file => file.filename.startsWith(folder) && !file.filename.slice(folder.length).includes("/")));
  }
  return json({ revisions, latestRef, next: r.headers.get("link")?.includes('rel="next"') ? page + 1 : null });
}
async function restoreWiki(req: Request, actor: Actor, body: Record<string, unknown>, reason: string) {
  const id = String(body.id || "");
  const ref = String(body.ref || "");
  if (!isDocsPath(id) || !await reachableRevision(ref)) return json({ error: "Invalid page or revision." }, 400);
  const snapshot = await ghSnapshot();
  const current = await ghReadFile(id, snapshot.head);
  if (body.expectedBase !== (current?.sha || "")) return json({ error: "Page changed. Reload before restoring." }, 409);
  const file = await ghReadFile(id, ref);
  if (!file) return json({ error: "Page did not exist at that revision." }, 404);
  const folder = id.slice(0, -8);
  const historicCommit = await ghJson(`${GH}/git/commits/${ref}`);
  const historicTree = await ghListTree({ head: ref, tree: (historicCommit.tree as { sha:string }).sha });
  const currentTree = await ghListTree(snapshot);
  const oldAssets = historicTree.filter(e => e.path.startsWith(folder) && !e.path.slice(folder.length).includes("/") && e.path !== id);
  const changes: Change[] = [{ path: id, text: file.content.replace(splitRaw(file.content).fmText, setDocsUpdated(splitRaw(file.content).fmText)) }];
  // Restore the complete local media snapshot; leave newer, unreferenced files intact.
  for (const asset of oldAssets) changes.push({ path: asset.path, blobSha: asset.sha });
  const assets = [...new Set([...oldAssets, ...currentTree.filter(e => e.path.startsWith(folder) && !e.path.slice(folder.length).includes("/"))].map(e => e.path.slice(folder.length)))];
  const split = splitRaw(file.content);
  const problem = contentProblem({ body: split.body, frontmatter: split.fmText, assets });
  if (problem) return json({ error: problem }, 400);
  if ((await accessUser(req, actor.login))?.suspended || !await wikiAdmin(actor)) return json({ error: "Access revoked." }, 403);
  const result = await ghCommitAt(changes, `Wiki: restore ${id} to ${ref}\n\n${reason}`, snapshot, actor);
  if (!result.ok) return json({ error: "Repository changed. Reload before restoring." }, 409);
  await audit(req, actor.login, "restore", `${id}@${ref}`, reason);
  return json({ ok: true, commit: result.sha });
}
async function wikiBridge(req: Request) {
  const raw = await req.text();
  if (raw.length > 1500000 || !verifyBridge(req, raw)) return json({ error: "Invalid bridge signature." }, 401);
  const body = JSON.parse(raw) as Record<string, unknown>;
  const discordId = String(body.discordId || "");
  if (!/^\d{15,22}$/.test(discordId)) return json({ error: "Invalid Discord identity." }, 400);
  const env = wikiEnv(req)!;
  const db = env.WIKI_ACCESS;
  const user = await db.prepare("SELECT * FROM wiki_users WHERE discord_id = ?").bind(discordId).first<WikiUser>();
  if (user?.suspended) return json({ error: "Your website contribution access is disabled." }, 403);
  if (body.action === "link") {
    if (user) return json({ error: "This Discord account is already linked." }, 409);
    const link = await db.prepare("UPDATE wiki_links SET discord_id = ?, discord_name = ? WHERE hash = ? AND expires > ? AND discord_id IS NULL RETURNING github_id").bind(discordId, String(body.discordName || discordId).slice(0, 100), linkHash(String(body.code || "")), Date.now()).first<{github_id:string}>();
    if (!link) return json({ error: "Link code expired or already used. Generate another in the CMS." }, 400);
    return json({ ok: true, pending: true });
  }
  if (body.action === "check") return json({ ok: true });
  if (!user) return json({ error: "Sign in at /admin and link Discord before contributing through the bot." }, 403);
  const roles = await memberRoles(env, discordId, true);
  const actor: Actor = { login: user.login, githubId: user.github_id, discordId, request: req, via: "github", agent: "Discord bot", docs: !!user.docs || docsRole(roles), scope: [] };
  if (await mayEdit(user.login)) actor.scope = undefined;
  if (body.action === "status") return json({ ok: true, docs: !!actor.docs || !actor.scope, publish: docsRole(roles) || PUBLISH_USERS.includes(discordId), destructive: DESTRUCTIVE_USERS.includes(discordId), login: user.login });
  if (body.action === "game-owner") {
    const id = String((body.payload as Record<string,unknown> | undefined)?.id || "");
    const allowed = /^data\/games\/[^/]+\/index\.md$/.test(id) && (!actor.scope || (await contributorScope(user.login)).includes(id));
    return allowed ? json({ok:true}) : json({error:"Only the verified repository owner can update this game page."},403);
  }
  if (!actor.docs && actor.scope) return json({ error: "Docs contribution access is required." }, 403);
  await limit(req, user.github_id);
  const action = String(body.action || "");
  if (!["read", "save", "new"].includes(action)) return json({ error: "Unsupported wiki action." }, 400);
  const payload = (body.payload || {}) as Record<string, unknown>;
  if (String(payload.id || "").startsWith("/docs/")) payload.id = (await ghListTree()).find(e => isDocsPath(e.path) && itemSlug(e.path) === String(payload.id).slice(6))?.path || "";
  if (action === "new") { payload.kind = "docs"; if (!payload.section) return json({ error: "Choose an existing docs section." }, 400); }
  else if (!isDocsPath(String(payload.id || ""))) return json({ error: "Docs pages only." }, 403);
  if (action === "read") {
    if (await protectedPage(req, String(payload.id)) && !await wikiAdmin(actor)) return json({ error: "This page is protected. Ask an org admin to edit it." }, 403);
    const page = await readEditable(String(payload.id));
    return page ? json(page) : json({ error: "Docs page not found." }, 404);
  }
  const denied = await wikiWriteGate(req, actor, action, payload);
  if (denied) return denied;
  // Recheck after reads and validation, immediately before committing.
  if ((await accessUser(req, user.login))?.suspended) return json({ error: "Access disabled." }, 403);
  payload.summary = `${String(payload.summary || "Discord edit").slice(0, 250)}\nDiscord-requester: ${discordId}\nDiscord-message: ${String(body.messageUrl || "").slice(0, 200)}`;
  const result = action === "new" ? await createEditable(payload, actor) : await writeEditable(String(payload.id), payload, actor);
  return json(result, mutationStatus(result));
}

async function assertActiveActor(actor: Actor | null | undefined, paths: string[]) {
  if (!actor?.request || !wikiEnv(actor.request)) return;
  const record = await accessUser(actor.request, actor.login);
  if (!record || record.suspended) throw new Error("Contribution access disabled. Nothing was published.");
  if (actor.scope && paths.some(path => path.startsWith("data/docs/")) && !await docsAccess(actor.request, record)) throw new Error("Docs access revoked. Nothing was published.");
  if (paths.some(path => path.startsWith("data/docs/")) && !await wikiAdmin(actor)) {
    for (const path of paths) {
      const id = path.replace(/[^/]+$/, "index.md");
      if (isDocsPath(id) && await protectedPage(actor.request, id)) throw new Error("Page is protected. Nothing was published.");
    }
  }
}
