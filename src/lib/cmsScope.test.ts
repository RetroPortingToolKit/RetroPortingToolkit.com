import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import crypto from "node:crypto";

// A contributor is someone who owns a submitted repository. They sign in with
// GitHub like anyone else, but see and touch only their own page. The module
// reads its secrets at import time, so this file sets them before loading it.
const SECRET = "test-secret";
process.env.CMS_SESSION_SECRET = SECRET;
process.env.GITHUB_TOKEN = "gh-test";
process.env.CMS_ALLOWED_LOGINS = "alice";
process.env.CMS_ALLOWED_ORG = "";
process.env.CMS_AGENT_KEYS = "";
const cms = await import("../../api/cms");

const page = (title: string, extra = "") => `---\ntitle: "${title}"\n${extra}---\n\nbody\n`;
const files: Record<string, string> = {
  "data/games/01_tomba/index.md": page("Tomba"),
  "data/games/02_game-abcd1234/index.md": page("Game", 'submissionId: "abcd1234abcd1234"\n'),
  "data/submissions.json": JSON.stringify([
    { id: "abcd1234abcd1234", owner: "Maker", path: "data/games/02_game-abcd1234/index.md", status: "pending" },
    { id: "ffff1234abcd1234", owner: "Maker", path: "data/games/03_gone-ffff1234/index.md", status: "removed" },
  ]),
};
const sha = (s: string) => crypto.createHash("sha1").update(s).digest("hex");
function cookie(login: string) {
  const p = Buffer.from(JSON.stringify({ sub: login, via: "github", exp: Date.now() + 60_000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(p).digest().toString("base64url");
  return `cms_session=${p}.${sig}`;
}
const as = (login: string, route: string, init: RequestInit = {}) =>
  new Request(`https://site.test/api/cms?__sub=${route}`, { ...init, headers: { cookie: cookie(login), "content-type": "application/json", ...(init.headers || {}) } });

beforeAll(() => {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    const contents = /\/contents\/(.+?)(\?|$)/.exec(url);
    if (contents) {
      const file = files[decodeURIComponent(contents[1])];
      return file
        ? Response.json({ content: Buffer.from(file).toString("base64"), encoding: "base64", sha: sha(file) })
        : Response.json({ message: "Not Found" }, { status: 404 });
    }
    if (/\/git\/ref\/heads\//.test(url)) return Response.json({ object: { sha: "head" } });
    if (/\/git\/commits\/head$/.test(url)) return Response.json({ tree: { sha: "tree" } });
    if (/\/git\/trees\/[^/]+\?recursive=1$/.test(url)) return Response.json({ tree: Object.keys(files).map((path) => ({ path, type: "blob", sha: sha(files[path]) })) });
    return Response.json({ message: "unexpected" }, { status: 500 });
  });
});
afterAll(() => vi.unstubAllGlobals());

describe("contributor scope", () => {
  it("is the pages of the repositories a login owns, minus removed ones", async () => {
    cms.clearScopeCache();
    expect(await cms.contributorScope("maker")).toEqual(["data/games/02_game-abcd1234/index.md"]);
    expect(await cms.contributorScope("nobody")).toEqual([]);
  });
  it("lists and reads only the contributor's own page", async () => {
    const list = await (await cms.GET(as("maker", "list"))).json();
    expect(list.groups).toEqual([{ group: "Your pages", items: [expect.objectContaining({ id: "data/games/02_game-abcd1234/index.md" })] }]);
    expect((await cms.GET(as("maker", "read&id=data%2Fgames%2F01_tomba%2Findex.md"))).status).toBe(403);
    expect((await cms.GET(as("maker", "read&id=data%2Fgames%2F02_game-abcd1234%2Findex.md"))).status).toBe(200);
    const auth = await (await cms.GET(as("maker", "auth"))).json();
    expect(auth.user).toMatchObject({ login: "maker", scope: ["data/games/02_game-abcd1234/index.md"] });
  });
  it("refuses writes outside the page and any structural change", async () => {
    const post = (route: string, body: unknown) => cms.POST(as("maker", route, { method: "POST", body: JSON.stringify(body) }));
    expect((await post("save", { id: "data/games/01_tomba/index.md", frontmatter: "", body: "x" })).status).toBe(403);
    expect((await post("new", { kind: "games", title: "Mine" })).status).toBe(403);
    expect((await post("delete", { id: "data/games/02_game-abcd1234/index.md" })).status).toBe(403);
    expect((await post("rename", { id: "data/games/02_game-abcd1234/index.md", slug: "other" })).status).toBe(403);
  });
  it("keeps a stranger out and a full editor unscoped", async () => {
    expect((await cms.GET(as("nobody", "list"))).status).toBe(401);
    const auth = await (await cms.GET(as("alice", "auth"))).json();
    expect(auth.user).toMatchObject({ login: "alice", scope: null });
  });
});
