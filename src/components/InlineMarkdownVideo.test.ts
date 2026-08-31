import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  InlineMarkdownVideo,
  inlineMarkdownVideoState,
} from "./InlineMarkdownVideo";

describe("inlineMarkdownVideoState", () => {
  const src = "/data/blog/large.mp4";

  it("exposes no requestable URL before viewport proximity", () => {
    expect(
      inlineMarkdownVideoState({
        src,
        nearViewport: false,
        userActivated: false,
        ambientAllowed: true,
      }),
    ).toEqual({ src: undefined, autoPlay: false, preload: "none" });
  });

  it("activates ambient playback near the viewport when policy permits", () => {
    expect(
      inlineMarkdownVideoState({
        src,
        nearViewport: true,
        userActivated: false,
        ambientAllowed: true,
      }),
    ).toEqual({ src, autoPlay: true, preload: "metadata" });
  });

  it("keeps data use explicit when ambient playback is suppressed", () => {
    expect(
      inlineMarkdownVideoState({
        src,
        nearViewport: true,
        userActivated: false,
        ambientAllowed: false,
      }),
    ).toEqual({ src, autoPlay: false, preload: "none" });
  });

  it("allows a direct user gesture to activate the source without ambient autoplay", () => {
    expect(
      inlineMarkdownVideoState({
        src,
        nearViewport: false,
        userActivated: true,
        ambientAllowed: false,
      }),
    ).toEqual({ src, autoPlay: false, preload: "none" });
  });

  it("hands an already-near player to explicit controls after interaction", () => {
    expect(
      inlineMarkdownVideoState({
        src,
        nearViewport: true,
        userActivated: true,
        ambientAllowed: true,
      }),
    ).toEqual({ src, autoPlay: false, preload: "none" });
  });

  it("removes the source while its containing overlay is covered", () => {
    expect(
      inlineMarkdownVideoState({
        src,
        nearViewport: true,
        userActivated: true,
        ambientAllowed: true,
        enabled: false,
      }),
    ).toEqual({ src: undefined, autoPlay: false, preload: "none" });
  });
});

describe("InlineMarkdownVideo", () => {
  it("server-renders a controllable inert player with no src", () => {
    const html = renderToStaticMarkup(
      createElement(InlineMarkdownVideo, {
        src: "/data/blog/large.mp4",
        title: "A native build",
      }),
    );
    expect(html).toContain("<video");
    expect(html).toContain('preload="none"');
    expect(html).toContain("controls");
    expect(html).toContain('aria-label="A native build"');
    expect(html).not.toContain('src="');
    expect(html).not.toContain("autoplay");
  });
});
