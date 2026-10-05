import { describe, it, expect } from 'vitest';
import { referencedAssets, missingAssets, contentProblem } from './cms-validate.mjs';

/** On 2026-10-03 a creator editing their own page through /admin replaced a
 * screenshot and left the old line behind. The CMS validated YAML and nothing
 * else, committed straight to main seven times, and the repository's own
 * checks went red — so the bot, which runs those checks before it publishes,
 * stopped publishing anything for anyone. */
describe("refusing a page that cannot pass the checks", () => {
  it("finds the co-located images a page points at", () => {
    expect(referencedAssets("![](./shot.png)")).toEqual(["shot.png"]);
    expect(referencedAssets("![A caption](./a%20b.png)")).toEqual(["a b.png"]);
    expect(referencedAssets('<img src="./inline.webp">')).toEqual(["inline.webp"]);
    // Anything that is not a co-located asset is somebody else's problem.
    expect(referencedAssets("![](https://example.test/x.png)")).toEqual([]);
    expect(referencedAssets("![](/og/items/x.webp)")).toEqual([]);
    expect(referencedAssets("no images here")).toEqual([]);
  });

  it("names exactly the ones the folder does not hold", () => {
    const body = "![](./kept.png)\n![](./gone.png)";
    expect(missingAssets(body, ["kept.png"])).toEqual(["gone.png"]);
    expect(missingAssets(body, ["kept.png", "gone.png"])).toEqual([]);
    expect(missingAssets(body, ["./kept.png", "./gone.png"])).toEqual([]);
  });

  it("checks the cover in the frontmatter too", () => {
    const problem = contentProblem({ frontmatter: 'cover: "./cover.png"', body: "", assets: [] });
    expect(problem).toContain("cover.png");
  });

  it("tells a creator what to do, in words they can act on", () => {
    const problem = contentProblem({ body: "![](./Screenshot-2026-10-02-223619.png)", assets: ["Screenshot-2026-10-03-203348.png"] });
    expect(problem).toContain("Screenshot-2026-10-02-223619.png");
    expect(problem).toMatch(/Upload it, or remove the line/);
    // No test names, no check names: the reader is editing their own page.
    expect(problem).not.toMatch(/npm|assert|test|FAIL/i);
  });

  it("says nothing when the page is publishable", () => {
    expect(contentProblem({ body: "![](./shot.png)", assets: ["shot.png"] })).toBeNull();
    expect(contentProblem({ body: "plain words", assets: [] })).toBeNull();
  });
});
