import { describe, expect, it } from "vitest";
import { formatArticleDate, isVideoSrc, isYouTubeSrc, youtubeEmbedUrl, BLOGS, GAMES } from "./content";

describe("formatArticleDate", () => {
  it("renders a full date", () => {
    expect(formatArticleDate("2026-06-25")).toBe("June 25, 2026");
  });
  it("passes a bare year through", () => {
    expect(formatArticleDate("2009")).toBe("2009");
  });
  it("passes an out-of-range month through unchanged", () => {
    expect(formatArticleDate("2026-13-01")).toBe("2026-13-01");
  });
  it("is empty for no date", () => {
    expect(formatArticleDate(undefined)).toBe("");
  });
});

describe("media source detection", () => {
  it("detects video extensions past a query string", () => {
    expect(isVideoSrc("/a/clip.mp4?v=2")).toBe(true);
    expect(isVideoSrc("/a/still.webp")).toBe(false);
    expect(isVideoSrc(undefined)).toBe(false);
  });
  it("detects YouTube URLs and builds an embed", () => {
    expect(isYouTubeSrc("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(youtubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toContain(
      "youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("exposes responsive variants when an optimized sibling exists", () => {
    const bomberman = GAMES.find((item) => item.slug === "bomberman-world");
    expect(bomberman?.cover).toMatch(/boxart\.webp$/);
    expect(bomberman?.coverSrcSet).toMatch(/640w/);
    expect(bomberman?.coverSrcSet).toMatch(/1280w/);
  });
});

describe("blog ordering", () => {
  const key = (i: (typeof BLOGS)[number]) =>
    i.date || (i.year ? `${i.year}-01-01` : "0000-00-00");
  it("lists newest first", () => {
    for (let n = 1; n < BLOGS.length; n++) {
      expect(key(BLOGS[n - 1]) >= key(BLOGS[n])).toBe(true);
    }
  });
  it("puts the most recent dated post at the top", () => {
    const newest = [...BLOGS].sort((a, b) => key(b).localeCompare(key(a)))[0];
    expect(BLOGS[0].slug).toBe(newest.slug);
  });
});
