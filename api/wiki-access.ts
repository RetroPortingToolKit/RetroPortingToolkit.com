import crypto from "node:crypto";

export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface AccessDB { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<unknown>; }
export interface WikiEnv { WIKI_ACCESS: AccessDB; DISCORD_BOT_TOKEN: string; }
export interface WikiUser { github_id: string; login: string; discord_id: string | null; docs: number; suspended: number; }
const contexts = new WeakMap<Request, WikiEnv>();
export function bindWiki(req: Request, env: WikiEnv) { contexts.set(req, env); }
export function wikiEnv(req: Request) { return contexts.get(req); }
export const GUILD = "1514467450429640824";
// Verified against the live guild on 2026-10-17: Founder, Community Advocate.
export const PUBLISH_ROLES = ["1522645500724121620", "1528990973131231365"];
// Existing explicit publishing/destructive lists, verified from bot config.
export const PUBLISH_USERS = ["121056800341491712"];
export const DESTRUCTIVE_USERS = ["398336732287991808", "174355715551526912", "71388029540900864", "326147493517590528"];
export const CONTRIBUTOR_ROLE = "1550041387217719327";
export function docsRole(roles: string[]) { return roles.some(id => PUBLISH_ROLES.includes(id)); }
export async function memberRoles(env: WikiEnv, discordId: string, requireMember = false): Promise<string[]> {
  const r = await fetch(`https://discord.com/api/v10/guilds/${GUILD}/members/${discordId}`, {
    headers: { authorization: `Bot ${env.DISCORD_BOT_TOKEN}` },
  });
  if (r.status === 404) { if (requireMember) throw new Error("You must still belong to the Discord server."); return []; }
  if (!r.ok) throw new Error("Discord membership could not be verified.");
  return ((await r.json()) as { roles: string[] }).roles;
}
export async function accessUser(req: Request, login: string): Promise<WikiUser | null> {
  const env = wikiEnv(req);
  if (!env) return null;
  return env.WIKI_ACCESS.prepare("SELECT * FROM wiki_users WHERE login = ?").bind(login).first<WikiUser>();
}
export async function protectedPage(req: Request, path: string) {
  const env = wikiEnv(req);
  return !!env && !!await env.WIKI_ACCESS.prepare("SELECT path FROM wiki_protections WHERE path = ?").bind(path).first();
}
export async function docsAccess(req: Request, user: WikiUser | null) {
  if (!user || user.suspended) return false;
  return !!user.docs || !!(user.discord_id && docsRole(await memberRoles(wikiEnv(req)!, user.discord_id)));
}
export async function audit(req: Request, actor: string, action: string, target: string, reason: string) {
  await wikiEnv(req)!.WIKI_ACCESS.prepare("INSERT INTO wiki_audit (actor,action,target,reason) VALUES (?,?,?,?)").bind(actor, action, target, reason).run();
}
export async function limit(req: Request, identity: string) {
  const env = wikiEnv(req);
  if (!env) return;
  const window = Math.floor(Date.now() / 3600000);
  const row = await env.WIKI_ACCESS.prepare(`INSERT INTO wiki_limits(identity,window,count) VALUES(?,?,1)
    ON CONFLICT(identity) DO UPDATE SET count = CASE WHEN window = excluded.window THEN count + 1 ELSE 1 END, window = excluded.window RETURNING count`).bind(identity, window).first<{count:number}>();
  if (!row || row.count > 60) throw new Error("Contribution limit reached. Try again next hour.");
}
export function verifyBridge(req: Request, raw: string): boolean {
  const env = wikiEnv(req);
  const timestamp = req.headers.get("x-rpt-time") || "";
  const signature = req.headers.get("x-rpt-signature") || "";
  if (!env?.DISCORD_BOT_TOKEN || !/^\d+$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > 60000 || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = crypto.createHmac("sha256", env.DISCORD_BOT_TOKEN).update(`${timestamp}\n${raw}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
export function linkHash(code: string) { return crypto.createHash("sha256").update(code).digest("hex"); }
