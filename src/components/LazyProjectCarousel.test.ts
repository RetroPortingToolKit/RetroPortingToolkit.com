import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  LazyProjectCarousel,
  type Slide,
} from "./LazyProjectCarousel";

const carouselModuleLoaded = vi.hoisted(() => vi.fn());

vi.mock("./ProjectCarousel", () => {
  carouselModuleLoaded();
  return { ProjectCarousel: () => null };
});

const render = (slides: Slide[]) =>
  renderToStaticMarkup(
    createElement(LazyProjectCarousel, {
      slides,
      showThumbs: true,
      autoplayDelay: 3000,
    }),
  );

describe("LazyProjectCarousel", () => {
  it("keeps an empty gallery empty without reaching the lazy component", () => {
    expect(render([])).toBe("");
    expect(carouselModuleLoaded).not.toHaveBeenCalled();
  });

  it("holds the carousel layout while its module loads", async () => {
    const html = render([{ src: "/shot.webp", lqip: "data:image/webp;base64,AA==" }]);

    expect(html).toContain('class="proj-carousel with-thumbs"');
    expect(html).toContain('aria-label="Loading project media"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('class="proj-carousel-skeleton"');
    await vi.waitFor(() => expect(carouselModuleLoaded).toHaveBeenCalledOnce());
  });
});
