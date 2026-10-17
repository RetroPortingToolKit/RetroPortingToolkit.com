import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import { bindWiki, type AccessDB, type Statement } from "../../api/wiki-access";
vi.stubEnv("CMS_SESSION_SECRET", "discord-test-session");
vi.stubEnv("CMS_DISCORD_CLIENT_ID", "discord-client");
vi.stubEnv("CMS_DISCORD_CLIENT_SECRET", "oauth-test-secret");
vi.stubEnv("CMS_GITHUB_CLIENT_ID", "github-client");
vi.stubEnv("CMS_GITHUB_CLIENT_SECRET", "github-test-secret");
vi.stubEnv("CMS_ALLOWED_LOGINS", "admin"); vi.stubEnv("CMS_ALLOWED_ORG", "");
vi.stubEnv("CMS_REPO_OWNER", "test"); vi.stubEnv("CMS_REPO_NAME", "site"); vi.stubEnv("GITHUB_TOKEN", "test");
const cms = await import("../../api/cms");
const discordId = "333333333333333333";
let sql: DatabaseSync;
const db: AccessDB = {
  prepare(query) {
    const stmt = (values: unknown[] = []): Statement => ({ bind: (...next) => stmt(next),
      first: async <T,>() => (sql.prepare(query).get(...values as never[]) ?? null) as T | null,
      all: async <T,>() => ({ results: sql.prepare(query).all(...values as never[]) as T[] }),
      run: async () => sql.prepare(query).run(...values as never[]),
    }); return stmt();
  },
  async batch(statements) { sql.exec("BEGIN"); try { const result=[]; for (const stmt of statements) result.push(await stmt.run()); sql.exec("COMMIT"); return result; } catch(e) { sql.exec("ROLLBACK"); throw e; } },
};
function request(route: string, cookie = "", body?: unknown) {
  const req = new Request(`https://site.test/api/cms/${route}`, { method: body === undefined ? "GET" : "POST", headers: { host:"site.test", origin:"https://site.test", cookie, "content-type":"application/json" }, ...(body === undefined ? {} : { body:JSON.stringify(body) }) });
  bindWiki(req, {WIKI_ACCESS:db,DISCORD_BOT_TOKEN:"bridge-test-secret"}); return req;
}
const value = (response: Response, name: string) => new RegExp(`${name}=([^;]+)`).exec(response.headers.get("set-cookie") || "")?.[1] || "";
async function begin(route = "auth/discord/start?next=%2Fadmin%2Fdocs", session = "") {
  const response = await cms.GET(request(route, session));
  const url = new URL(response.headers.get("location")!);
  const cookie = `cms_discord_oauth=${value(response,"cms_discord_oauth")}${session ? "; " + session : ""}`;
  return {response,url,cookie};
}
async function finish(start: Awaited<ReturnType<typeof begin>>, params: Record<string,string> = {}) {
  const query = new URLSearchParams({ state:start.url.searchParams.get("state")!, code:"one-use-code", iss:"https://discord.com", ...params });
  return cms.GET(request(`auth/discord/callback?${query}`, start.cookie));
}
async function signIn() { const response = await finish(await begin()); return { response, cookie:`cms_session=${value(response,"cms_session")}` }; }
function bridge(action: string) {
  const raw = JSON.stringify({discordId,action}); const timestamp = String(Date.now());
  const req = new Request("https://site.test/api/cms/wiki/bridge", {method:"POST", headers:{"x-rpt-time":timestamp,"x-rpt-signature":crypto.createHmac("sha256","bridge-test-secret").update(`${timestamp}\n${raw}`).digest("hex")},body:raw});
  bindWiki(req,{WIKI_ACCESS:db,DISCORD_BOT_TOKEN:"bridge-test-secret"}); return req;
}
let roles: string[], member: boolean, exchangeOK: boolean, revoked: number, exchanged: number;
let tokenForm: URLSearchParams;
beforeAll(() => vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url === "https://discord.com/api/oauth2/token") { exchanged++; tokenForm = new URLSearchParams(String(init?.body)); return Response.json(exchangeOK ? {access_token:"ephemeral-token"} : {error:"invalid_grant"}, {status:exchangeOK?200:400}); }
  if (url.endsWith("/oauth2/token/revoke")) { revoked++; return new Response(null,{status:200}); }
  if (url.endsWith("/users/@me")) return Response.json({id:discordId,username:"admin",global_name:"Discord contributor",avatar:"avatar-hash"});
  if (url.includes("discord.com/api/v10/guilds/")) return member ? Response.json({roles}) : Response.json({}, {status:404});
  if (url === "https://github.com/login/oauth/access_token") return Response.json({access_token:"ephemeral-github-token"});
  if (url === "https://api.github.com/user") return Response.json({id:1,login:"admin",name:"Admin"});
  if (url.includes("/memberships/")) return Response.json({state:"active",role:"admin"});
  if (url.includes("/contents/data/team.json")) return Response.json({content:Buffer.from('{"members":[]}').toString("base64"),encoding:"base64",sha:"team"});
  if (url.includes("/contents/data/submissions.json")) return Response.json({content:Buffer.from('[]').toString("base64"),encoding:"base64",sha:"subs"});
  if (url.includes("/git/trees/")) return Response.json({tree:[]});
  return Response.json({}, {status:404});
}));
beforeEach(() => {
  sql = new DatabaseSync(":memory:");
  for (const name of ["0001_wiki_access.sql","0002_link_confirmation.sql","0003_discord_login.sql"]) sql.exec(readFileSync(`migrations/${name}`,"utf8"));
  roles=["1528990973131231365"]; member=true; exchangeOK=true; revoked=0; exchanged=0; cms.clearScopeCache();
});
afterAll(() => {vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe("Discord website sign-in", () => {
  it("requests only identify, binds random state to the browser, and uses PKCE", async () => {
    const a=await begin(),b=await begin();
    expect(a.response.status).toBe(302); expect(a.url.hostname).toBe("discord.com");
    expect(a.url.searchParams.get("scope")).toBe("identify");
    expect(a.url.searchParams.get("redirect_uri")).toBe("https://site.test/api/cms/auth/discord/callback");
    expect(a.url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(a.url.searchParams.get("state")).not.toBe(b.url.searchParams.get("state"));
    const response=await finish(a); expect(response.headers.get("location")).toBe("/admin/docs");
    expect(tokenForm.get("grant_type")).toBe("authorization_code"); expect(tokenForm.get("client_secret")).toBe("oauth-test-secret");
    expect(crypto.createHash("sha256").update(tokenForm.get("code_verifier")!).digest("base64url")).toBe(a.url.searchParams.get("code_challenge"));
    expect(revoked).toBe(1);
  });
  it("signs in without GitHub and derives docs access from the real roles", async () => {
    const {cookie}=await signIn();
    const auth=await (await cms.GET(request("auth",cookie))).json();
    expect(auth.user).toMatchObject({via:"discord",login:`discord:${discordId}`,docs:true,wikiAdmin:false,scope:[]});
    expect((await (await cms.POST(bridge("status"))).json()).docs).toBe(true);
    expect(JSON.stringify(sql.prepare("SELECT * FROM wiki_users").all())).not.toContain("ephemeral-token");
    expect((await cms.POST(request("new",cookie,{kind:"blog",title:"Escape"}))).status).toBe(403);
  });
  it("does not interpret a Discord username matching a GitHub admin as org access", async () => {
    roles=[]; const {cookie}=await signIn();
    const auth=await (await cms.GET(request("auth",cookie))).json();
    expect(auth.user.docs).toBe(true); expect(auth.user.wikiAdmin).toBe(false); expect(auth.user.scope).toEqual([]);
    expect((await cms.GET(request("wiki/admin",cookie))).status).toBe(403);
  });
  it("grants roleless members automatic access and shares suspensions with active sessions", async () => {
    roles=[]; const {cookie}=await signIn();
    expect((await (await cms.GET(request("auth",cookie))).json()).user.docs).toBe(true);
    expect((await (await cms.POST(bridge("status"))).json()).docs).toBe(true);
    sql.exec("UPDATE wiki_users SET suspended=1");
    expect((await cms.GET(request("list",cookie))).status).toBe(401);
    expect((await cms.POST(bridge("status"))).status).toBe(403);
    expect((await finish(await begin())).headers.get("location")).toContain("disabled");
  });
  it("keeps member docs access after role removal without granting publishing", async () => {
    const {cookie}=await signIn(); roles=[];
    expect((await (await cms.GET(request("auth",cookie))).json()).user.docs).toBe(true);
    expect((await (await cms.POST(bridge("status"))).json()).docs).toBe(true);
    expect((await (await cms.POST(bridge("status"))).json()).publish).toBe(false);
  });
  it("revokes existing browser and bot access when membership ends", async () => {
    roles=[]; const {cookie}=await signIn(); member=false;
    expect((await (await cms.GET(request("auth",cookie))).json()).user.docs).toBe(false);
    await expect(cms.POST(bridge("status"))).rejects.toThrow("belong to the Discord server");
  });
  it("rejects wrong state, browser binding, cancellation, issuer, and failed exchanges", async () => {
    const a=await begin(),b=await begin();
    expect((await finish(a,{state:b.url.searchParams.get("state")!})).headers.get("location")).toContain("discord_state");
    expect((await finish(a,{error:"access_denied"})).headers.get("location")).toContain("discord_cancelled");
    expect((await finish(a,{iss:"https://evil.test"})).headers.get("location")).toContain("discord_state");
    expect(exchanged).toBe(0); exchangeOK=false;
    expect((await finish(a)).headers.get("location")).toContain("discord_exchange"); expect(sql.prepare("SELECT * FROM wiki_users").all()).toHaveLength(0);
  });
  it("rejects people outside the Discord server without creating a user", async () => {
    member=false; expect((await finish(await begin())).headers.get("location")).toContain("discord_membership"); expect(revoked).toBe(1);
    expect(sql.prepare("SELECT * FROM wiki_users").all()).toHaveLength(0);
  });
  it("keeps linked GitHub users on the same account when signing in with Discord", async () => {
    sql.prepare("INSERT INTO wiki_users(github_id,login,discord_id,docs) VALUES('1','admin',?,1)").run(discordId);
    const {cookie}=await signIn(); const auth=await (await cms.GET(request("auth",cookie))).json();
    expect(auth.user).toMatchObject({login:"admin",via:"discord",wikiAdmin:true,scope:null});
    expect(sql.prepare("SELECT * FROM wiki_users").all()).toHaveLength(1);
  });
  it("links a Discord-first user to proven GitHub ownership without losing grants or old sessions", async () => {
    const {cookie}=await signIn(); sql.exec("UPDATE wiki_users SET docs=1");
    const start=await cms.GET(request("auth/github/start?link=1&next=%2Fadmin",cookie));
    const state=new URL(start.headers.get("location")!).searchParams.get("state")!;
    const response=await cms.GET(request(`auth/github/callback?code=github-code&state=${encodeURIComponent(state)}`,`cms_oauth=${value(start,"cms_oauth")}; ${cookie}`));
    expect(response.headers.get("location")).toBe("/admin");
    expect(sql.prepare("SELECT canonical_id FROM wiki_users WHERE github_id=?").get(`discord:${discordId}`)?.canonical_id).toBe("1");
    const auth=await (await cms.GET(request("auth",cookie))).json(); expect(auth.user.login).toBe("admin"); expect(auth.user.wikiAdmin).toBe(true);
    expect(sql.prepare("SELECT docs FROM wiki_users WHERE github_id='1'").get()?.docs).toBe(1);
    sql.exec("UPDATE wiki_users SET suspended=1 WHERE github_id='1'");
    expect((await cms.GET(request("list",cookie))).status).toBe(401); expect((await cms.POST(bridge("status"))).status).toBe(403);
  });
  it("does not merge a suspended Discord identity into an unsuspended GitHub identity", async () => {
    const {cookie}=await signIn(); sql.exec("UPDATE wiki_users SET suspended=1");
    const start=await cms.GET(request("auth/github/start?link=1",cookie));
    const state=new URL(start.headers.get("location")!).searchParams.get("state")!;
    const response=await cms.GET(request(`auth/github/callback?code=github-code&state=${encodeURIComponent(state)}`,`cms_oauth=${value(start,"cms_oauth")}; ${cookie}`));
    expect(response.headers.get("location")).toContain("link_conflict");
    expect(sql.prepare("SELECT canonical_id FROM wiki_users WHERE github_id=?").get(`discord:${discordId}`)?.canonical_id).toBeNull();
  });
  it("rejects external or backslash return destinations", async () => {
    const start=await begin("auth/discord/start?next="+encodeURIComponent("/\\evil.test"));
    expect((await finish(start)).headers.get("location")).toBe("/");
  });
  it("rejects expired OAuth state before exchanging a code", async () => {
    const start=await begin(); const now=Date.now(); const clock=vi.spyOn(Date,"now").mockReturnValue(now+601000);
    try { expect((await finish(start)).headers.get("location")).toContain("discord_state"); expect(exchanged).toBe(0); } finally {clock.mockRestore();}
  });
  it("does not link another GitHub account when the initiating session changed", async () => {
    sql.exec("INSERT INTO wiki_users(github_id,login) VALUES('1','admin'),('2','other')");
    const signed=(id:string) => { const payload=Buffer.from(JSON.stringify({sub:id==='1'?'admin':'other',githubId:id,via:'github',exp:Date.now()+60000})).toString('base64url'); return `cms_session=${payload}.${crypto.createHmac('sha256','discord-test-session').update(payload).digest('base64url')}`; };
    const start=await begin("auth/discord/start?link=1",signed('1'));
    const changed={...start,cookie:`cms_discord_oauth=${value(start.response,'cms_discord_oauth')}; ${signed('2')}`};
    expect((await finish(changed)).headers.get('location')).toContain('discord_state');
    expect(sql.prepare('SELECT discord_id FROM wiki_users').all().every(row=>row.discord_id===null)).toBe(true);
  });

});
