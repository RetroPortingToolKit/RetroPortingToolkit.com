/**
 * The invite to the project's Discord, shown beside the feed link in the
 * navigation bar and in the footer.
 *
 * A plain <a> with target="_blank", like the GitHub link in the footer: it
 * leaves the site, so it is a real navigation rather than a client-side route.
 */
import { SITE } from "@/lib/site";

const TITLE = "Join the Retro Porting Toolkit Discord";

function DiscordGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M13.55 3.16A12.3 12.3 0 0 0 10.5 2.2l-.15.28c.98.24 1.87.62 2.68 1.12a9.4 9.4 0 0 0-8.06 0c.81-.5 1.7-.88 2.68-1.12L7.5 2.2c-1.07.19-2.09.51-3.05.96C2.49 6.03 1.96 8.81 2.22 11.55a12.4 12.4 0 0 0 3.76 1.9c.3-.41.57-.85.8-1.31-.44-.16-.86-.36-1.26-.6.11-.08.21-.16.31-.24a8.85 8.85 0 0 0 7.54 0c.1.09.2.17.31.24-.4.24-.82.44-1.27.6.23.46.5.9.8 1.31a12.35 12.35 0 0 0 3.77-1.9c.3-3.18-.53-5.93-2.43-8.39ZM6.35 9.87c-.73 0-1.33-.67-1.33-1.49s.58-1.49 1.33-1.49c.75 0 1.35.67 1.34 1.49 0 .82-.59 1.49-1.34 1.49Zm4.92 0c-.73 0-1.33-.67-1.33-1.49s.58-1.49 1.33-1.49c.75 0 1.35.67 1.34 1.49 0 .82-.59 1.49-1.34 1.49Z"
      />
    </svg>
  );
}

/** The quiet footer variant, matching the other footer links. */
export function DiscordFooterLink() {
  return (
    <a
      className="discord-footer-link"
      href={SITE.discord}
      target="_blank"
      rel="noreferrer"
      title={TITLE}
    >
      <DiscordGlyph />
      <span>Discord</span>
    </a>
  );
}

/**
 * The icon in the navigation bar's controls. Icon only, like the feed link it
 * sits beside: that row is tight on a phone, and the accessible name carries
 * the meaning instead of a visible label.
 */
export function DiscordNavLink() {
  return (
    <a
      className="discord-nav-link"
      href={SITE.discord}
      target="_blank"
      rel="noreferrer"
      title={TITLE}
      aria-label={TITLE}
    >
      <DiscordGlyph />
    </a>
  );
}
