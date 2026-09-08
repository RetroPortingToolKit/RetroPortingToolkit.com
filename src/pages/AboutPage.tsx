import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import aboutTeam from "../../data/about-team.md?raw";
import { Markdown } from "@/components/Markdown";
import { Tabs } from "@/components/Tabs";
import { NAV_TABS, TAB_PATH } from "@/components/navTabs";
import { SITE } from "@/lib/site";
import { useDocumentTitle } from "@/lib/pageTitle";

/**
 * The team page.
 *
 * It carries the site's own nav and reading column rather than a bare <main>:
 * without them it rendered as an unstyled column jammed against the left edge
 * of a blank page, with no way back to the site. "Draft" is a reason for a page
 * not to be linked, not a reason for it to look broken.
 *
 * The bar shows no active tab, because /about is not one of them.
 */
export function AboutPage() {
  useDocumentTitle(`About ${SITE.title}`);
  const navigate = useNavigate();
  const tabsRef = useRef<HTMLDivElement>(null);

  return (
    <div className="home-next-page is-subpage">
      <Tabs
        active="none"
        onChange={(id) => navigate(TAB_PATH[id])}
        tabsRef={tabsRef}
        tabs={NAV_TABS}
      />
      <main className="page-main">
        <div className="about-layout">
          <article className="docs-article">
            <h1 className="docs-title">About {SITE.title}</h1>
            <p className="docs-summary">Who works on this site, and what each of us looks after.</p>
            <Markdown className="docs-prose">{aboutTeam}</Markdown>
          </article>
        </div>
      </main>
    </div>
  );
}
