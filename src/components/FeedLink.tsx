/**
 * The site has published RSS, Atom and JSON feeds since launch, but nothing on
 * any page said so: the only pointer was a <link rel="alternate"> that a reader
 * app can find and a person cannot. This is that pointer, made visible.
 *
 * A plain <a>, not SmartLink: the feeds are static files written at build time,
 * so this has to be a real navigation rather than a client-side route.
 */
export const FEED_PATHS = {
  rss: "/rss.xml",
  atom: "/atom.xml",
  json: "/feed.json",
} as const;

function RssGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">
      <circle cx="3.2" cy="12.8" r="1.7" fill="currentColor" />
      <path
        d="M2 7.4a6.6 6.6 0 0 1 6.6 6.6M2 3a11 11 0 0 1 11 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The button shown beside the Blog heading. */
export function FeedButton() {
  return (
    <a className="feed-button" href={FEED_PATHS.rss} title="Subscribe with a feed reader">
      <RssGlyph />
      <span>RSS</span>
    </a>
  );
}

/** The quiet footer variant, matching the other footer links. */
export function FeedFooterLink() {
  return (
    <a className="feed-footer-link" href={FEED_PATHS.rss} title="Subscribe with a feed reader">
      <RssGlyph />
      <span>RSS</span>
    </a>
  );
}
