import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs } from "@/components/Tabs";
import { NAV_TABS, TAB_PATH } from "@/components/navTabs";
import { SmartLink } from "@/components/SmartLink";
import { CATALOG_ITEMS } from "@/lib/catalogContent";
import { creatorsIndex, creatorProfile, type CreatorEntry } from "@/lib/creators";
import { pathFor } from "@/lib/contentCore";
import { titleForCreators, useDocumentTitle } from "@/lib/pageTitle";

// Everyone with a page on the site, and the pages they made. The list is
// derived from the same items the catalogue renders, so a page appears here
// the moment it names a creator, gets a byline, or links a repository.
export const CREATORS = creatorsIndex(CATALOG_ITEMS.filter((item) => item.kind !== "blog"));

function CreatorCard({ entry }: { entry: CreatorEntry }) {
  const name = entry.creator.github ?? entry.creator.gitlab ?? entry.creator.discord ?? entry.login;
  const profile = creatorProfile(entry.creator);
  return (
    <article className="team-card creator-card" id={entry.login}>
      <div className="team-body">
        <h2 className="team-name">
          {profile ? <a href={profile} target="_blank" rel="noopener noreferrer">{name}</a> : name}
        </h2>
        <ul className="team-handles">
          {entry.creator.github && <li className="team-handle"><span className="team-handle-label">GitHub</span><a href={`https://github.com/${entry.creator.github}`} target="_blank" rel="noopener noreferrer">{entry.creator.github}</a></li>}
          {entry.creator.gitlab && <li className="team-handle"><span className="team-handle-label">GitLab</span><a href={`https://gitlab.com/${entry.creator.gitlab}`} target="_blank" rel="noopener noreferrer">{entry.creator.gitlab}</a></li>}
          {entry.creator.discord && <li className="team-handle"><span className="team-handle-label">Discord</span><span>{entry.creator.discord}</span></li>}
        </ul>
        <ul className="creator-pages">
          {entry.items.map((item) => (
            <li key={item.slug}>
              <SmartLink href={pathFor(item.kind, item.slug)}>{item.title}</SmartLink>
              {item.status && <span className="creator-page-status">{item.status}</span>}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function CreatorsPage() {
  const navigate = useNavigate();
  const tabsRef = useRef<HTMLDivElement>(null);
  useDocumentTitle(titleForCreators());
  return (
    <div className="home-next-page is-subpage">
      <Tabs active="none" onChange={(id) => navigate(TAB_PATH[id])} tabsRef={tabsRef} tabs={NAV_TABS} />
      <section className="hn-section hn-subpage-section" aria-label="Creators">
        <div className="hn-container">
          <header className="hn-tab-head">
            <h1 className="hn-tab-title">Creators</h1>
            <span className="hn-tab-count">{CREATORS.length}</span>
          </header>
          <p className="blog-tab-sub">The people who made the projects on this site, and every page of theirs. Submit a repository you own and your page joins the list.</p>
          <div className="team-list">
            {CREATORS.map((entry) => <CreatorCard key={entry.login} entry={entry} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

export default CreatorsPage;
