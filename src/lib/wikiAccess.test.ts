import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import { bindWiki, type AccessDB, type Statement } from "../../api/wiki-access";

const SECRET = "wiki-test-secret";
vi.stubEnv("CMS_SESSION_SECRET", SECRET);
vi.stubEnv("CMS_ALLOWED_ORG", "");
vi.stubEnv("CMS_ALLOWED_LOGINS", "admin,editor");
vi.stubEnv("CMS_REPO_OWNER", "test"); vi.stubEnv("CMS_REPO_NAME", "site"); vi.stubEnv("GITHUB_TOKEN", "test");
const cms = await import("../../api/cms");
let sql: DatabaseSync;
const db: AccessDB = {
  prepare(query) {
    const statement = (values: unknown[] = []): Statement => ({
      bind: (...next) => statement(next),
      first: async <T,>() => (sql.prepare(query).get(...values as never[]) ?? null) as T | null,
      all: async <T,>() => ({ results: sql.prepare(query).all(...values as never[]) as T[] }),
      run: async () => sql.prepare(query).run(...values as never[]),
    });
    return statement();
  },
  async batch(statements) { sql.exec("BEGIN"); try { const result = []; for (const stmt of statements) result.push(await stmt.run()); sql.exec("COMMIT"); return result; } catch(e) { sql.exec("ROLLBACK"); throw e; } },
};
const path = "data/docs/01_start/01_intro/index.md";
const game = "data/games/01_game/index.md";
let files: Record<string, string>;
const hash = (text: string) => crypto.createHash("sha1").update(text).digest("hex");
function request(login: string, route: string, body?: unknown, id = login === "admin" ? "1" : login === "editor" ? "2" : "3") {
  const payload = Buffer.from(JSON.stringify({ sub: login, githubId: id, via: "github", exp: Date.now() + 60000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  const req = new Request(`https://site.test/api/cms/${route}`, { method: body === undefined ? "GET" : "POST", headers: { cookie: `cms_session=${payload}.${sig}`, origin: "https://site.test", "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  bindWiki(req, { WIKI_ACCESS: db, DISCORD_BOT_TOKEN: "bridge-secret" }); return req;
}
function bridge(discordId: string, action: string, payload = {}, extra = {}) {
  const body = JSON.stringify({ discordId, action, payload, ...extra }); const time = String(Date.now());
  const req = new Request("https://site.test/api/cms/wiki/bridge", { method: "POST", headers: { "x-rpt-time": time, "x-rpt-signature": crypto.createHmac("sha256", "bridge-secret").update(`${time}\n${body}`).digest("hex") }, body });
  bindWiki(req, { WIKI_ACCESS: db, DISCORD_BOT_TOKEN: "bridge-secret" }); return req;
}
let writes: string[];
let createdBlobs: string[];
let historical: Record<string,string>;
let proposedTree: {path:string;sha:string}[];
let refUpdates: string[];
let disableBeforeRef: boolean;
beforeAll(() => vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.includes("discord.com/api/")) return Response.json({ roles: url.endsWith("111111111111111111") ? ["1522645500724121620"] : url.endsWith("222222222222222222") ? ["1550041387217719327"] : [] });
  if (url.includes("/memberships/")) return Response.json({ state: "active", role: url.endsWith("admin") ? "admin" : "member" });
  const match = /\/contents\/(.+?)(\?|$)/.exec(url);
  if (match) {
    const id = decodeURIComponent(match[1]);
    if (init?.method === "PUT") { writes.push(id); const body = JSON.parse(String(init.body)); files[id] = Buffer.from(body.content, "base64").toString(); return Response.json({ content: { sha: hash(files[id]) } }); }
    const source = url.includes("ref=" + "b".repeat(40)) ? historical : files;
    return source[id] ? Response.json({ content: Buffer.from(source[id]).toString("base64"), encoding: "base64", sha: hash(source[id]) }) : Response.json({}, { status: 404 });
  }
  if (url.endsWith("/graphql")) {
    const query = JSON.parse(String(init?.body)).query;
    const repository: Record<string, unknown> = {};
    for (const match of query.matchAll(/(f\d+): object\(expression: "main:([^"]+)"\)/g)) repository[match[1]] = files[match[2]] ? { text: files[match[2]] } : null;
    return Response.json({ data: { repository } });
  }
  if (url.includes("/compare/")) return Response.json({ status: "ahead" });
  if (url.includes("/commits?")) return Response.json([{sha:"a".repeat(40),html_url:"https://github.com/test/site/commit/a",commit:{message:"Edit",author:{name:"writer",date:"2026-10-17T00:00:00Z"}}}]);
  if (!url.includes("/git/") && /\/commits\/[a-f0-9]{40}$/.test(url)) return Response.json({parents:[],files:[]});
  if (url.endsWith("/git/blobs")) { const body = JSON.parse(String(init?.body)); createdBlobs.push(body.encoding === "base64" ? Buffer.from(body.content, "base64").toString() : body.content); return Response.json({sha:"new-blob"}); }
  if (url.endsWith("/git/trees")) { proposedTree = JSON.parse(String(init?.body)).tree; return Response.json({sha:"new-tree"}); }
  if (url.endsWith("/git/commits")) { if (disableBeforeRef) sql.exec("UPDATE wiki_users SET suspended=1 WHERE login='admin'"); return Response.json({sha:"c".repeat(40)}); }
  if (url.includes("/git/refs/heads/")) { refUpdates.push(JSON.parse(String(init?.body)).sha); return Response.json({}); }
  if (url.includes("/git/ref/heads/")) return Response.json({ object: { sha: "a".repeat(40) } });
  if (url.includes("/git/commits/")) return Response.json({ tree: { sha: url.endsWith("b".repeat(40)) ? "old-tree" : "tree" } });
  if (url.includes("/git/trees/")) return Response.json({ tree: Object.entries(url.includes("/old-tree?") ? historical : files).map(([path, text]) => ({ path, type: "blob", sha: hash(text) })) });
  return Response.json({}, { status: 404 });
}));
beforeEach(() => {
  sql = new DatabaseSync(":memory:"); sql.exec(readFileSync("migrations/0001_wiki_access.sql", "utf8")); sql.exec(readFileSync("migrations/0002_link_confirmation.sql", "utf8")); sql.exec(readFileSync("migrations/0003_discord_login.sql", "utf8"));
  sql.exec("INSERT INTO wiki_users(github_id,login,discord_id,docs) VALUES('1','admin',NULL,0),('2','editor',NULL,0),('3','writer','111111111111111111',0),('4','maker','222222222222222222',0)");
  files = { [path]: '---\ntitle: Intro\ndesc: Intro\nsummary: Intro\ntags: []\npageType: concept\nupdated: "2026-10-17"\n---\n\nOriginal words.\n', [game]: '---\ntitle: Game\nrepo: https://github.com/writer/game\n---\n\nGame.', "data/team.json": '{"members":[]}', "data/submissions.json": "[]" };
  historical = {}; proposedTree = []; refUpdates = []; disableBeforeRef = false;
  writes = []; createdBlobs = []; cms.clearScopeCache();
});
afterAll(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const read = async (login = "writer", id = "3") => (await cms.GET(request(login, `read?id=${encodeURIComponent(path)}`, undefined, id))).json();
const save = async (login = "writer", id = "3") => { const current = await read(login, id); return cms.POST(request(login, "save", { id: path, frontmatter: current.frontmatter, body: "Updated words.", expectedBase: current.baseSha, summary: "Clarify intro" }, id)); };
describe("shared wiki authorization", () => {
  it("completes the contributor lifecycle through admin actions with an existing Discord session", async () => {
    files["data/docs/01_start/index.md"] = files[path];
    const contributor = (route: string, body?: unknown) => {
      const req = request("maker", route, body, "4");
      const payload = Buffer.from(JSON.stringify({ sub: "discord:222222222222222222", discordId: "222222222222222222", via: "discord", exp: Date.now() + 60000 })).toString("base64url");
      req.headers.set("cookie", `cms_session=${payload}.${crypto.createHmac("sha256", SECRET).update(payload).digest("base64url")}`);
      return req;
    };
    const moderate = (change: Record<string, unknown>) => cms.POST(request("admin", "wiki/user", {githubId:"4", reason:"Isolated contributor pilot", ...change}));
    const botStatus = () => cms.POST(bridge("222222222222222222", "status"));
    expect((await cms.GET(contributor(`read?id=${encodeURIComponent(path)}`))).status).toBe(403);
    expect((await moderate({docs:true})).status).toBe(200);
    expect((await (await botStatus()).json()).docs).toBe(true);

    expect((await cms.POST(contributor("new", {kind:"docs",section:"start",title:"Pilot guide"}))).status).toBe(200);
    expect(createdBlobs.at(-1)).toContain("draft: true");
    expect((await cms.POST(bridge("222222222222222222", "new", {section:"start",title:"Complete bot guide",body:"Verified instructions.",summary:"Explain setup"}))).status).toBe(200);
    expect(createdBlobs.at(-1)).not.toContain("draft: true");

    const current = await (await cms.GET(contributor(`read?id=${encodeURIComponent(path)}`))).json();
    historical[path] = files[path];
    expect((await cms.POST(contributor("save", {id:path,frontmatter:current.frontmatter,body:"Pilot correction.",expectedBase:current.baseSha,summary:"Clarify setup"}))).status).toBe(200);
    expect(files[path]).toContain("Pilot correction.");
    const history = await (await cms.GET(contributor(`wiki/history?id=${encodeURIComponent(path)}`))).json();
    expect(history.revisions).toHaveLength(1);
    const revision = await (await cms.GET(contributor(`wiki/revision?id=${encodeURIComponent(path)}&ref=${"b".repeat(40)}`))).json();
    expect(revision.raw).toContain("Original words.");
    const restore = {id:path,ref:"b".repeat(40),expectedBase:hash(files[path]),reason:"Restore verified instructions"};
    expect((await cms.POST(contributor("wiki/restore",restore))).status).toBe(403);
    expect((await cms.POST(request("admin","wiki/restore",restore))).status).toBe(200);
    expect(createdBlobs.at(-1)).toContain("Original words.");

    expect((await moderate({suspended:true})).status).toBe(200);
    const writesBefore = writes.length, refsBefore = refUpdates.length;
    expect((await cms.GET(contributor("list"))).status).toBe(401);
    expect((await cms.POST(contributor("save", {id:path}))).status).toBe(401);
    expect((await botStatus()).status).toBe(403);
    expect((await cms.POST(bridge("222222222222222222", "save", {id:path}))).status).toBe(403);
    expect(writes).toHaveLength(writesBefore); expect(refUpdates).toHaveLength(refsBefore);
    expect((await moderate({suspended:false})).status).toBe(200);
    expect((await cms.GET(contributor(`read?id=${encodeURIComponent(path)}`))).status).toBe(200);
    expect((await (await botStatus()).json()).docs).toBe(true);
    expect((await moderate({docs:false})).status).toBe(200);
    expect((await cms.GET(contributor(`read?id=${encodeURIComponent(path)}`))).status).toBe(403);
    expect((await (await botStatus()).json()).docs).toBe(false);
    expect(sql.prepare("SELECT * FROM wiki_audit WHERE target='4'").all()).toHaveLength(4);
  });
  it("maps verified publishing roles to shared docs access, preserving game scope", async () => {
    const auth = await (await cms.GET(request("writer", "auth"))).json(); expect(auth.user.docs).toBe(true);
    const list = await (await cms.GET(request("writer", "list"))).json(); expect(list.groups.find((g: {group:string}) => g.group === "Docs")).toBeTruthy();
    expect((await save()).status).toBe(200); expect(writes).toEqual([path]);
    expect(files[path]).toContain('updated: "');
  });
  it("keeps the recognition role from silently granting docs access", async () => {
    expect((await cms.GET(request("maker", `read?id=${encodeURIComponent(path)}`, undefined, "4"))).status).toBe(403);
    expect((await cms.POST(bridge("222222222222222222", "save", { id: path }))).status).toBe(403);
  });
  it("honors explicit docs grants in both interfaces", async () => {
    sql.exec("UPDATE wiki_users SET docs=1 WHERE github_id='4'");
    expect((await save("maker", "4")).status).toBe(200);
    const status = await (await cms.POST(bridge("222222222222222222", "status"))).json(); expect(status.docs).toBe(true);
  });
  it("disables an already signed-in org editor and a linked role holder across both paths", async () => {
    sql.exec("UPDATE wiki_users SET suspended=1 WHERE github_id IN ('2','3')");
    expect((await cms.GET(request("editor", "list"))).status).toBe(401);
    expect((await cms.GET(request("writer", "list"))).status).toBe(401);
    expect((await cms.POST(bridge("111111111111111111", "status"))).status).toBe(403);
    expect((await cms.POST(bridge("111111111111111111", "check"))).status).toBe(403);
    expect(writes).toEqual([]);
  });
  it("protects pages even from existing full editors who are not org admins", async () => {
    sql.prepare("INSERT INTO wiki_protections VALUES(?)").run(path);
    expect((await save("editor", "2")).status).toBe(403);
    expect((await save()).status).toBe(403);
    expect((await save("admin", "1")).status).toBe(200);
  });
  it("requires an actual org admin for grants and prevents cross-origin mutations", async () => {
    expect((await cms.POST(request("editor", "wiki/user", { githubId: "3", suspended: true, reason: "test" }, "2"))).status).toBe(403);
    const req = request("admin", "wiki/user", { githubId: "3", suspended: true, reason: "test" }); req.headers.set("origin", "https://evil.test");
    expect((await cms.POST(req)).status).toBe(403);
    expect((await cms.POST(request("admin", "wiki/user", { githubId: "3", suspended: true, reason: "test" }))).status).toBe(200);
    expect((await cms.POST(bridge("111111111111111111", "status"))).status).toBe(403);
    expect(sql.prepare("SELECT action FROM wiki_audit").all()).toHaveLength(1);
  });
  it("rejects stale saves and attempts to escape docs permissions", async () => {
    const current = await read(); await save();
    expect((await cms.POST(request("writer", "save", { id: path, frontmatter: current.frontmatter, body: "stale", expectedBase: current.baseSha }))).status).toBe(409);
    expect((await cms.POST(request("writer", "new", { kind: "blog", title: "Escape" }))).status).toBe(403);
    expect((await cms.POST(request("writer", "new", { kind: "docs", title: "Section" }))).status).toBe(403);
    expect((await cms.POST(bridge("111111111111111111", "save", { id: game }))).status).toBe(403);
  });
  it("requires browser confirmation of a single-use Discord link", async () => {
    sql.exec("UPDATE wiki_users SET discord_id=NULL WHERE github_id='3'");
    const code = (await (await cms.POST(request("writer", "wiki/link", {}))).json()).code;
    expect((await cms.POST(bridge("333333333333333333", "link", {}, { code, discordName: "Actual person" }))).status).toBe(200);
    expect(sql.prepare("SELECT discord_id FROM wiki_users WHERE github_id='3'").get()?.discord_id).toBeNull();
    expect((await cms.POST(bridge("444444444444444444", "link", {}, { code }))).status).toBe(400);
    const account = await (await cms.GET(request("writer", "wiki/account"))).json();
    expect((await cms.POST(request("writer", "wiki/confirm-link", { hash: account.pending[0].hash }))).status).toBe(200);
    expect(sql.prepare("SELECT discord_id FROM wiki_users WHERE github_id='3'").get()?.discord_id).toBe("333333333333333333");
  });
  it("refuses unsigned bridge claims", async () => {
    const req = bridge("111111111111111111", "status"); req.headers.set("x-rpt-signature", "0".repeat(64)); expect((await cms.POST(req)).status).toBe(401);
  });
  it("returns existing Git history and a historical page without authentication", async () => {
    historical[path] = files[path];
    const history = await (await cms.GET(new Request(`https://site.test/api/cms/wiki/history?id=${encodeURIComponent(path)}`))).json();
    expect(history.revisions[0].commit.author.name).toBe("writer");
    const revision = await (await cms.GET(new Request(`https://site.test/api/cms/wiki/revision?id=${encodeURIComponent(path)}&ref=${"b".repeat(40)}`))).json();
    expect(revision.raw).toBe(files[path]);
  });
  it("restores a page and missing media in one new commit without deleting newer files", async () => {
    const folder = path.slice(0,-8);
    historical = { [path]: files[path].replace("Original words.", "![Old screenshot](./old.png)"), [folder + "old.png"]: "old-image" };
    files[folder + "new.png"] = "new-image";
    const response = await cms.POST(request("admin", "wiki/restore", { id:path, ref:"b".repeat(40), expectedBase:hash(files[path]), reason:"Restore known instructions" }));
    expect(response.status).toBe(200);
    expect(proposedTree.map(entry => entry.path)).toEqual([path, folder + "old.png"]);
    expect(proposedTree.find(entry => entry.path.endsWith("old.png"))?.sha).toBe(hash("old-image"));
    expect(refUpdates).toEqual(["c".repeat(40)]);
    expect(files[folder + "new.png"]).toBe("new-image");
  });
  it("does not advance main if the admin is disabled during restore preparation", async () => {
    historical[path] = files[path]; disableBeforeRef = true;
    await expect(cms.POST(request("admin", "wiki/restore", { id:path, ref:"b".repeat(40), expectedBase:hash(files[path]), reason:"Restore" }))).rejects.toThrow("disabled");
    expect(refUpdates).toEqual([]);
  });
  it("refuses a restore after another contributor changes the page", async () => {
    historical[path] = files[path];
    const result = await cms.POST(request("admin", "wiki/restore", { id:path, ref:"b".repeat(40), expectedBase:"stale", reason:"Restore" }));
    expect(result.status).toBe(409); expect(refUpdates).toEqual([]);
  });

  it("restores a deleted page while retaining optimistic concurrency", async () => {
    historical[path] = files[path]; delete files[path];
    const result = await cms.POST(request("admin", "wiki/restore", { id:path, ref:"b".repeat(40), expectedBase:"", reason:"Recover removed page" }));
    expect(result.status).toBe(200); expect(refUpdates).toHaveLength(1);
  });
  it("rechecks publishing roles separately from a docs-only grant", async () => {
    const founder = await (await cms.POST(bridge("111111111111111111", "status"))).json(); expect(founder.publish).toBe(true);
    sql.exec("UPDATE wiki_users SET docs=1 WHERE github_id='4'");
    const writer = await (await cms.POST(bridge("222222222222222222", "status"))).json(); expect(writer.docs).toBe(true); expect(writer.publish).toBe(false);
    expect((await cms.POST(bridge("222222222222222222", "game-owner", { id:game }))).status).toBe(403);
    expect((await cms.POST(bridge("111111111111111111", "game-owner", { id:game }))).status).toBe(200);
  });

  it("restores section-local media without rolling back child pages", async () => {
    const section = "data/docs/01_start/index.md";
    files[section] = files[path];
    historical = { [section]: files[path], [path]: "Older child page", "data/docs/01_start/section.png": "image", "data/docs/01_start/01_intro/child.png": "child-image" };
    const response = await cms.POST(request("admin", "wiki/restore", { id:section, ref:"b".repeat(40), expectedBase:hash(files[section]), reason:"Restore section introduction" }));
    expect(response.status).toBe(200);
    expect(proposedTree.map(entry => entry.path)).toEqual([section, "data/docs/01_start/section.png"]);
  });

  it("allows the existing draft-post API for docs grants, while blocking other kinds and invalid media", async () => {
    files["data/docs/01_start/index.md"] = files[path];
    expect((await cms.POST(request("writer", "post", {kind:"blog",title:"No",body:"Words"}))).status).toBe(403);
    expect((await cms.POST(request("writer", "post", {kind:"docs",section:"start",title:"Broken",body:"![Missing](./missing.png)"}))).status).toBe(400);
    expect(refUpdates).toHaveLength(0);
    expect((await cms.POST(request("writer", "post", {kind:"docs",section:"start",title:"New guide",body:"Complete instructions.",draft:true}))).status).toBe(200);
    expect(refUpdates).toHaveLength(1);
  });

});
