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
    "An open ecosystem for turning code from original console games into modern apps: static recompilers, runtimes, game projects, and community ports. You provide your own game files.",
  /**
   * Short positioning line. Used in the prerendered page title
   * ("<title> · <tagline>") and the static shell header crawlers read.
   */
  tagline: "Bring classic console games to modern hardware",
  /** Shown in the footer next to the copyright year. */
  owner: "Retro Porting Toolkit",
  /** Byline on articles and blog posts. */
  author: "Matthew Stanley",
  /**
   * Contact address for feed authorship (RSS managingEditor/webMaster, Atom
   * <email>). Optional: both specs allow omitting it, and the feed generator
   * leaves those elements out entirely while this is empty, which is better
   * than publishing a placeholder address.
   */
  email: "hello@retroportingtoolkit.com",
} as const;
