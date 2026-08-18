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
    "A toolkit for porting and preserving retro software. Placeholder copy, replace it in src/lib/site.ts.",
  /**
   * Short positioning line. Used in the prerendered page title
   * ("<title> · <tagline>") and the static shell header crawlers read.
   */
  tagline: "Porting and preservation tooling",
  /** Shown in the footer next to the copyright year. */
  owner: "Retro Porting Toolkit",
  /** Byline on articles and blog posts. */
  author: "Placeholder Author",
  /**
   * Contact address for feed authorship (RSS managingEditor/webMaster, Atom
   * <email>). Optional: both specs allow omitting it, and the feed generator
   * leaves those elements out entirely while this is empty, which is better
   * than publishing a placeholder address.
   */
  email: "",
} as const;
