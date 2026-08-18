// Every brand-facing string the shell renders lives here. Change these first
// when standing up a new site; nothing else hardcodes the name or domain.
export const SITE = {
  /** Wordmark stem, rendered before the accented suffix. */
  name: "retroportingtoolkit",
  /** Accented wordmark suffix (the ".com" half of the logo). */
  nameSuffix: ".com",
  /** Full product name for titles, feeds, and Open Graph. */
  title: "Retro Porting Toolkit",
  /** Canonical origin, no trailing slash. Used for feeds and absolute URLs. */
  url: "https://retroportingtoolkit.com",
  /** One-line description for <meta name="description"> and feed subtitles. */
  description:
    "A toolkit for porting and preserving retro software. Placeholder copy — replace it in src/lib/site.ts.",
  /** Shown in the footer next to the copyright year. */
  owner: "Retro Porting Toolkit",
  /** Byline on articles and blog posts. */
  author: "Placeholder Author",
} as const;
