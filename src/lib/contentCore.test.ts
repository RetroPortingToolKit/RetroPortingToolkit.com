import { describe, expect, it } from "vitest";
import { createContentParsers } from "./contentCore";

const parsers = createContentParsers({});

function parse(body: string) {
  return parsers.parseItem(
    "/data/docs/01_start/01_example/index.md",
    `---\ntitle: Example\n---\n\n${body}`,
  );
}

describe("reader-facing documentation", () => {
  it("omits a Source appendix and its heading while preserving what follows", () => {
    const item = parse(
      "Introduction.\n\n## Source\n\n- private working note\n\n## Next\n\nKeep reading.",
    );

    expect(item?.body).toContain("Introduction.");
    expect(item?.body).toContain("## Next\n\nKeep reading.");
    expect(item?.body).not.toContain("## Source");
    expect(item?.body).not.toContain("private working note");
  });

  it("omits a Sources appendix at the end of a page", () => {
    const item = parse("Introduction.\n\n## Sources\n\n- private working note\n");

    expect(item?.body).toBe("Introduction.");
  });
});
