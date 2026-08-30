import { useAbout } from "@/lib/about";
import { SITE_TOOLS_PATH } from "@/lib/siteToolPaths";
import { SmartLink } from "./SmartLink";

export function Footer() {
  const about = useAbout();
  const mailto = about.email ? `mailto:${about.email}` : undefined;
  return (
    <footer className="site-footer">
      <div className="site-footer-inner container">
        <div className="site-footer-locations">
          {mailto ? (
            <a href={mailto} className="site-footer-name">
              {about.headerName}
            </a>
          ) : (
            <span className="site-footer-name">{about.headerName}</span>
          )}
          {about.locations.map((label) => (
            <span key={label} className="site-footer-location">
              <span className="sep" />
              <span>{label}</span>
            </span>
          ))}
        </div>
        <div className="site-footer-right">
          {/* The WebMCP tools this site registers for an agentic browser. One
              quiet line, in the muted footer style the other links use, on
              every page: someone whose browser just offered them "site tools"
              needs somewhere to read what those are. */}
          <div className="site-footer-elsewhere">
            <SmartLink href={SITE_TOOLS_PATH}>Site tools for browser agents</SmartLink>
          </div>
          {mailto && (
            <a href={mailto} className="site-footer-contact">
              {about.email}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
