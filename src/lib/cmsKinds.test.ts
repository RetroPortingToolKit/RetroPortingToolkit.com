import { describe, it, expect } from "vitest";
import { CMS_KINDS, FOLDER_KIND, NEW_LABEL } from "./cmsKinds";
import { KINDS } from "../../api/cms";
import { KIND_DIRS } from "../../scripts/cms-dev.mjs";

// The editor sends `kind` to POST /api/cms/new, and both backends reject
// anything they do not recognise with "unknown_kind". Nothing else holds the
// three lists together, and a mismatch is invisible until someone clicks Add:
// FOLDER_KIND once mapped Games -> "game" while both backends wanted "games",
// so creating a game failed everywhere.
describe("CMS kind vocabulary", () => {
  it("matches the prod function's accepted kinds", () => {
    expect([...CMS_KINDS].sort()).toEqual([...KINDS].sort());
  });

  it("matches the dev middleware's accepted kinds", () => {
    expect([...CMS_KINDS].sort()).toEqual([...KIND_DIRS].sort());
  });

  it("maps every sidebar folder to a kind a backend accepts", () => {
    for (const [folder, kind] of Object.entries(FOLDER_KIND)) {
      expect(CMS_KINDS, `folder "${folder}"`).toContain(kind);
    }
  });

  it("labels every kind, so the Add field never reads 'New undefined title'", () => {
    for (const kind of CMS_KINDS) expect(NEW_LABEL[kind]).toBeTruthy();
  });

  it("covers the folder labels both backends actually emit", () => {
    // prod capitalises the directory name; dev uses its own KIND_GROUP labels.
    for (const label of ["Blog", "Hardware", "Games", "Articles"]) {
      expect(FOLDER_KIND[label], `label "${label}"`).toBeTruthy();
    }
  });
});
