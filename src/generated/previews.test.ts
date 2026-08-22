import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PREVIEW_SLUGS } from "./previews";

// previews.ts is generated from public/previews/ by scripts/gen-previews.mjs,
// and nothing regenerates it automatically. Delete a page through the CMS and
// its clip goes with it, leaving the manifest claiming a clip that is not
// there: previewFor() then hands a card a video and a poster that both 404,
// and it renders as an empty box with a play button. That is exactly what
// happened to the retcomm-rbengine card. Hold the two together.
const DIR = path.join(process.cwd(), "public", "previews");

describe("preview manifest", () => {
  it("lists only clips that exist, with their posters", () => {
    const missing = [...PREVIEW_SLUGS].flatMap((slug) => {
      const out: string[] = [];
      if (!fs.existsSync(path.join(DIR, `${slug}.mp4`))) out.push(`${slug}.mp4`);
      if (!fs.existsSync(path.join(DIR, `${slug}.webp`))) out.push(`${slug}.webp`);
      return out;
    });
    expect(missing, "run: node scripts/gen-previews.mjs").toEqual([]);
  });

  it("lists every clip that exists, so a new one is not silently ignored", () => {
    // The generator skips hero-montage, which is the home page's hero video
    // rather than a card clip, and skips any mp4 with no poster beside it.
    const SKIP = new Set(["hero-montage"]);
    const onDisk = fs
      .readdirSync(DIR)
      .filter((f) => f.endsWith(".mp4"))
      .map((f) => f.replace(/\.mp4$/, ""))
      .filter((s) => !SKIP.has(s) && fs.existsSync(path.join(DIR, `${s}.webp`)))
      .sort();
    expect([...PREVIEW_SLUGS].sort(), "run: node scripts/gen-previews.mjs").toEqual(onDisk);
  });
});
