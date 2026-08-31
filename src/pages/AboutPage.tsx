import aboutTeam from "../../data/about-team.md?raw";
import { Markdown } from "@/components/Markdown";
import { SITE } from "@/lib/site";
import { useDocumentTitle } from "@/lib/pageTitle";

export function AboutPage() {
  useDocumentTitle(`About ${SITE.title} - Team Draft`);
  return (
    <main className="page page-fade">
      <article className="docs-article" style={{ paddingTop: 84 }}>
        <h1 className="docs-title">About Retro Porting Toolkit</h1>
        <p className="docs-summary">
          Team and ownership notes for RetroPortingToolkit.com. This page is a draft and is not linked from public navigation yet.
        </p>
        <Markdown className="modal-content docs-prose">{aboutTeam}</Markdown>
      </article>
    </main>
  );
}
