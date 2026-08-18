import { useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { useLocation, useNavigate } from "react-router-dom";
import type { Item, Kind } from "@/lib/types";
import { useMobile } from "@/lib/useMobile";
import { pathFor } from "@/lib/content";
import { labAll, type LabMedia } from "@/lab/labContent";
import { SpatialCard } from "./SpatialCard";
import { lockBody, unlockBody } from "@/lib/bodyLock";

interface Props {
  title: string;
  eyebrow?: string;
  /** one-line context shown under the title (e.g. a topic's description) */
  intro?: string;
  items: Item[];
  onClose: () => void;
  /** another modal is stacked on top: stay mounted but ignore all input */
  covered?: boolean;
}

const CloseIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3 3L13 13M13 3L3 13"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      className="modal-close"
      onClick={onClose}
      aria-label="Close"
    >
      <span className="modal-close-icon">
        <CloseIcon />
      </span>
    </button>
  );
}

const KIND_LABEL: Record<Kind, string> = {
  project: "Projects",
  talk: "Talks",
  writing: "Articles",
  blog: "Blog",
};

// Item -> the SAME LabMedia the home/tab cards render, so every surface that
// shows items (home grids, tab pages, these collection overlays) uses one card.
const MEDIA_BY_KEY = new Map<string, LabMedia>();
for (const k of ["project", "talk", "writing"] as const) {
  for (const m of labAll[k]) MEDIA_BY_KEY.set(`${m.kind}-${m.slug}`, m);
}

function KindGrid({ items }: { kind: Kind; items: Item[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  // Opening an item from this overlay swaps it for the item modal while keeping
  // the ORIGINAL page as the background, so closing lands somewhere real.
  const onOpen = (m: LabMedia) => {
    // chain: item modal opens over the collection; closing returns here
    navigate(pathFor(m.kind as Kind, m.slug), {
      state: { background: location },
    });
  };
  return (
    <div className="tv-grid">
      {items.map((item) => {
        const m = MEDIA_BY_KEY.get(`${item.kind}-${item.slug}`);
        return m ? (
          <SpatialCard key={`${item.kind}-${item.slug}`} media={m} onOpen={onOpen} />
        ) : null;
      })}
    </div>
  );
}

// Projects split into the main body of work and a lighter "side projects"
// shelf (any item with `group: side` in its frontmatter). Side projects live
// only on the Projects tab, never the home grid.
function ProjectSections({ items }: { items: Item[] }) {
  const main = items.filter((p) => p.group !== "side");
  const side = items.filter((p) => p.group === "side");
  if (side.length === 0) return <KindGrid kind="project" items={main} />;
  return (
    <div className="collection-sections">
      <section className="collection-section">
        <h2 className="collection-section-title">Selected work</h2>
        <KindGrid kind="project" items={main} />
      </section>
      <section className="collection-section">
        <h2 className="collection-section-title">Fun side projects</h2>
        <KindGrid kind="project" items={side} />
      </section>
    </div>
  );
}

export function CollectionBody({ items }: { items: Item[] }) {
  const buckets: Record<Kind, Item[]> = {
    project: [],
    talk: [],
    writing: [],
    blog: [],
  };
  for (const item of items) buckets[item.kind].push(item);
  const order: Kind[] = ["project", "talk", "writing", "blog"];
  const present = order.filter((k) => buckets[k].length > 0);

  if (items.length === 0) {
    return (
      <div className="collection-empty">
        Nothing here yet.
      </div>
    );
  }

  if (present.length === 1) {
    const kind = present[0];
    if (kind === "project") return <ProjectSections items={buckets.project} />;
    return <KindGrid kind={kind} items={buckets[kind]} />;
  }

  return (
    <div className="collection-sections">
      {present.map((kind) => (
        <section key={kind} className="collection-section">
          <h2 className="collection-section-title">{KIND_LABEL[kind]}</h2>
          <KindGrid kind={kind} items={buckets[kind]} />
        </section>
      ))}
    </div>
  );
}

export function CollectionView(props: Props) {
  const isMobile = useMobile();
  if (isMobile) return <MobileSheet {...props} />;
  return <DesktopModal {...props} />;
}

function DesktopModal({ title, eyebrow, intro, items, onClose, covered }: Props) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    lockBody();
    return () => {
      cancelAnimationFrame(raf);
      unlockBody();
    };
  }, []);

  useEffect(() => {
    modalRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [title]);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    setOpen(false);
    setTimeout(onClose, 380);
  };

  useEffect(() => {
    if (covered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [covered]);

  return (
    <>
      <div
        className={"modal-backdrop" + (open ? " open" : "")}
        onClick={requestClose}
      />
      <div
        className={"modal" + (open ? " open" : "")}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="modal-card"
          onClick={(e) => {
            const content = e.currentTarget.firstElementChild;
            if (!content) return;
            const { left, right } = content.getBoundingClientRect();
            if (e.clientX < left || e.clientX > right) requestClose();
          }}
        >
          <div className="collection-body">
            <header className="collection-header">
              {eyebrow && <div className="collection-eyebrow">{eyebrow}</div>}
              <h1 className="collection-title">{title}</h1>
              {intro && <p className="collection-intro">{intro}</p>}
              <div className="collection-count">
                {items.length} {items.length === 1 ? "item" : "items"}
              </div>
            </header>
            <CollectionBody items={items} />
          </div>
        </div>
        <CloseButton onClose={requestClose} />
      </div>
    </>
  );
}

function MobileSheet({ title, eyebrow, intro, items, onClose, covered }: Props) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    lockBody();
    return () => {
      cancelAnimationFrame(raf);
      unlockBody();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [title]);

  const requestClose = () => {
    if (!open) return;
    setOpen(false);
    setTimeout(onClose, 500);
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => {
        if (!o && !covered) requestClose();
      }}
      shouldScaleBackground
    >
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay" />
        <Drawer.Content
          className="sheet-content"
          aria-describedby={undefined}
        >
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <CloseButton onClose={requestClose} />
          <div className="sheet-scroll" ref={scrollRef}>
            <div className="collection-body">
              <header className="collection-header">
                {eyebrow && (
                  <div className="collection-eyebrow">{eyebrow}</div>
                )}
                <h1 className="collection-title">{title}</h1>
                {intro && <p className="collection-intro">{intro}</p>}
                <div className="collection-count">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </div>
              </header>
              <CollectionBody items={items} />
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
