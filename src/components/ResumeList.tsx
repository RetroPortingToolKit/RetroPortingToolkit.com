import { RESUME } from "@/lib/content";
import { useAbout } from "@/lib/about";
import { SITE } from "@/lib/site";
import type { Resume } from "@/lib/types";
import { Markdown } from "./Markdown";
import { SmartLink } from "./SmartLink";


// Frames the entries before the reverse-chronological founder roles can read as
// "serial founder": one body of work, stated with evidence, ending on the present.
const RESUME_SUMMARY =
  "Two decades of product and R&D leadership, as a founder and inside global companies: games played by billions, open-web identity and media, and now AI agents.";

export function ResumeRows({ headTitle = true, resume = RESUME }: { headTitle?: boolean; resume?: Resume } = {}) {
  const about = useAbout();
  const contact = [about.email, about.locations.join(" / "), SITE.name + SITE.nameSuffix]
    .filter(Boolean)
    .join("  ·  ");
  return (
    <>
      <div className="cv-print-header" aria-hidden="true">
        <div className="cv-print-name">{about.headerName}</div>
        {about.role && <div className="cv-print-role">{about.role}</div>}
        {contact && <div className="cv-print-contact">{contact}</div>}
      </div>
      <div className={"hstrip-head resume-head" + (headTitle ? "" : " resume-head--bare")}>
        {headTitle && <h2 className="hstrip-title">Résumé</h2>}
        <button
          type="button"
          className="resume-download"
          onClick={() => window.print()}
        >
          Download as PDF
        </button>
      </div>
      <p className="resume-summary">{RESUME_SUMMARY}</p>
      <div className="resume-list">
        {resume.items.map((r, i) => (
        <div key={i} className="resume-row">
          <h3 className="resume-role">
            <span>{r.role}</span>
            <span className="at">at</span>
            {r.href ? (
              <SmartLink href={r.href} className="resume-co-link">
                <span className="co">{r.company}</span>
              </SmartLink>
            ) : (
              <span className="co">{r.company}</span>
            )}
          </h3>
          <div className="resume-meta">
            {r.location && <span className="resume-tag">{r.location}</span>}
            <span className="resume-year">{r.range}</span>
          </div>
          {r.note && <Markdown className="resume-note">{r.note}</Markdown>}
          </div>
        ))}
      </div>
    </>
  );
}

export function ResumeList() {
  return (
    <section className="section container" id="resume">
      <ResumeRows />
    </section>
  );
}
