import { describe, it, expect } from "vitest";
import { creatorOf, creatorsIndex, downloadUrl, repoOwner } from "./creators";
import type { Item } from "./types";
const item = (over: Partial<Item>): Item => ({ kind: "game", slug: "x", title: "X", desc: "", tags: [], gallery: [], links: [], body: "", order: 0, draft: false, meta: [], ...over } as Item);
describe("creators", () => {
  it("prefers the page's creator, then a team byline, then the repository owner of a community project", () => {
    expect(creatorOf(item({ creator: { github: "a" }, repo: "https://github.com/b/c" }))).toEqual({ github: "a" });
    expect(creatorOf(item({ authors: ["Shokunin"] }))).toMatchObject({ github: expect.any(String) });
    expect(creatorOf(item({ repo: "https://github.com/DerrickGold/ar-recomp" }))).toEqual({ github: "DerrickGold" });
    expect(creatorOf(item({ repo: "https://gitlab.com/team/sub/game" }))).toEqual({ gitlab: "team" });
    expect(creatorOf(item({ repo: "https://github.com/RetroPortingToolKit/x", provenance: "core" }))).toBeNull();
    expect(creatorOf(item({}))).toBeNull();
    expect(repoOwner("https://example.com/a/b")).toBeNull();
  });
  it("points downloads at the recorded release only", () => {
    expect(downloadUrl(item({ download: "https://x/y.zip", repo: "https://github.com/a/b" }))).toBe("https://x/y.zip");
    expect(downloadUrl(item({ repo: "https://github.com/a/b/" }))).toBeNull();
    expect(downloadUrl(item({}))).toBeNull();
  });
  it("groups pages by login, case-insensitively, merging what each page knows", () => {
    const index = creatorsIndex([
      item({ slug: "one", repo: "https://github.com/Maker/one" }),
      item({ slug: "two", creator: { github: "maker", discord: "mk" } }),
      item({ slug: "three", creator: { github: "solo" } }),
      item({ slug: "hidden", creator: { github: "solo" }, draft: true }),
    ]);
    expect(index.map((e) => [e.login, e.items.length])).toEqual([["maker", 2], ["solo", 1]]);
    expect(index[0].creator).toEqual({ github: "maker", discord: "mk" });
  });
});
