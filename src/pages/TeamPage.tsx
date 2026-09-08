import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import team from "@data/team.json";
import { Tabs } from "@/components/Tabs";
import { NAV_TABS, TAB_PATH } from "@/components/navTabs";
import { titleForTeam, useDocumentTitle } from "@/lib/pageTitle";

// The team page borrows the Platforms page's chrome exactly: the shared <Tabs>
// bar in its subpage form, then "hn-section hn-subpage-section" > "hn-container"
// with the same heading, count and standfirst. What differs is the card. A
// Platforms card is a SpatialCard, which is a button that opens an item modal
// over a cover image; a person is not an item, has no modal and no cover, so
// these are plain articles laid out to match the wide "news-list" shape the
// Platforms page uses - square portrait on one side, copy on the other.
//
// The bar is rendered with active="none" on purpose. /team is deliberately not
// in NAV_TABS: that array is also the home pager's pane order, so an entry here
// would promise a swipeable pane that does not exist. "none" is the documented
// case for a page the bar has no entry for - no pill, no capsule, but the site's
// own navigation still present. See Tabs.tsx's NavActive.

interface Handle {
  label: string;
  value: string;
  href?: string;
}

interface ProjectLink {
  label: string;
  href: string;
}

interface Member {
  slug: string;
  name: string;
  role: string;
  photo: string | null;
  handles: Handle[];
  bio: string[];
  links: ProjectLink[];
}

const MEMBERS = team.members as Member[];

// A member with no photo yet still needs a portrait-shaped block, or their row
// collapses to a different shape than everyone else's and the list looks broken
// rather than incomplete. The initial is decoration, so it is aria-hidden and
// the block carries no alt text of its own.
function Portrait({ member }: { member: Member }) {
  if (!member.photo) {
    return (
      <div className="team-photo team-photo--placeholder">
        <span aria-hidden="true">{member.name.slice(0, 1).toUpperCase()}</span>
      </div>
    );
  }
  return (
    <img
      className="team-photo"
      src={member.photo}
      alt={member.name}
      width={460}
      height={460}
      loading="lazy"
      decoding="async"
    />
  );
}

function MemberCard({ member }: { member: Member }) {
  return (
    <article className="team-card">
      <Portrait member={member} />
      <div className="team-body">
        <h2 className="team-name">{member.name}</h2>
        <p className="team-role">{member.role}</p>
        <ul className="team-handles">
          {member.handles.map((h) => (
            <li key={h.label + h.value} className="team-handle">
              <span className="team-handle-label">{h.label}</span>
              {h.href ? (
                <a href={h.href} target="_blank" rel="noopener noreferrer">
                  {h.value}
                </a>
              ) : (
                <span>{h.value}</span>
              )}
            </li>
          ))}
        </ul>
        {member.bio.map((paragraph) => (
          <p key={paragraph} className="team-bio">
            {paragraph}
          </p>
        ))}
        {member.links.length > 0 && (
          <ul className="team-links">
            {member.links.map((l) => (
              <li key={l.href}>
                <a
                  className="team-link"
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export function TeamPage() {
  const navigate = useNavigate();
  const tabsRef = useRef<HTMLDivElement>(null);
  useDocumentTitle(titleForTeam());

  return (
    <div className="home-next-page is-subpage">
      <Tabs
        active="none"
        onChange={(id) => navigate(TAB_PATH[id])}
        tabsRef={tabsRef}
        tabs={NAV_TABS}
      />
      <section className="hn-section hn-subpage-section" aria-label={team.title}>
        <div className="hn-container">
          <header className="hn-tab-head">
            <h1 className="hn-tab-title">{team.title}</h1>
            <span className="hn-tab-count">{MEMBERS.length}</span>
          </header>
          <p className="blog-tab-sub">{team.intro}</p>
          <div className="team-list">
            {MEMBERS.map((m) => (
              <MemberCard key={m.slug} member={m} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default TeamPage;
