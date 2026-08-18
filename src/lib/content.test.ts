import { describe, expect, it } from "vitest";
import { formatArticleDate, isVideoSrc, isYouTubeSrc, youtubeEmbedUrl } from "./content";

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
});
