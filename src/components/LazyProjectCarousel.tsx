import { lazy, Suspense } from "react";
import type { CSSProperties } from "react";
import type { ProjectCarouselProps } from "./ProjectCarousel";

export type { Slide } from "./ProjectCarousel";

// Embla is useful only when an item actually has gallery media. Keep both the
// carousel implementation and Embla behind this single runtime edge so an
// ordinary item page does not pull either into the app's startup graph.
const ProjectCarousel = lazy(() =>
  import("./ProjectCarousel").then((module) => ({
    default: module.ProjectCarousel,
  })),
);

function CarouselFallback({
  slides,
  showThumbs,
}: Pick<ProjectCarouselProps, "slides" | "showThumbs">) {
  const lqip = slides[0]?.lqip;
  const lqipStyle: CSSProperties | undefined = lqip
    ? {
        backgroundImage: `url(${lqip})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "blur(14px)",
        transform: "scale(1.08)",
      }
    : undefined;

  // This is the first slide's existing skeleton structure. Matching the real
  // carousel's full-height outer box prevents either side of a split layout
  // from shifting while the module is fetched.
  return (
    <div
      className={"proj-carousel" + (showThumbs ? " with-thumbs" : "")}
      aria-label="Loading project media"
      aria-busy="true"
    >
      <div className="proj-carousel-stage">
        <div className="proj-carousel-viewport">
          <div className="proj-carousel-track">
            <div className="proj-carousel-slide">
              <div className="proj-carousel-card">
                <div className="proj-carousel-stack">
                  <div className="proj-carousel-media">
                    <div
                      className="proj-carousel-skeleton"
                      aria-hidden="true"
                      style={lqipStyle}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LazyProjectCarousel(props: ProjectCarouselProps) {
  // React.lazy starts its import only when the lazy component is rendered.
  // Forced split layouts with no gallery should stay empty, as they did when
  // ProjectCarousel returned null, without downloading the carousel chunk.
  if (props.slides.length === 0) return null;

  return (
    <Suspense
      fallback={
        <CarouselFallback slides={props.slides} showThumbs={props.showThumbs} />
      }
    >
      <ProjectCarousel {...props} />
    </Suspense>
  );
}
