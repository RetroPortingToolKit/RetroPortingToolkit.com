import { useAbout } from "@/lib/about";

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
