import { describe, expect, it } from "vitest";
import { auditAssets } from "./audit-assets.mjs";

describe("asset audit", () => {
  it("has no missing, stale, newly unreachable, or redundantly emitted assets", () => {
    expect(auditAssets().issues).toEqual([]);
  });
});
