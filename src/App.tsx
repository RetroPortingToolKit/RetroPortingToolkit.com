import { Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  Link,
  type Location,
} from "react-router-dom";
import { useEffect, useRef } from "react";
import Home from "./pages/Home";
import { ItemPage } from "./pages/ItemPage";
// Admin is a static import (NOT lazy): a React.lazy route remounts on every
// Fast Refresh, which would drop editor focus mid-edit.
import Admin from "./pages/Admin";
import { ItemView } from "./components/ItemView";
import {
  COLLECTION_TITLE,
  titleForCollection,
  titleForItem,
  titleForTopic,
  useDocumentTitle,
} from "./lib/pageTitle";
import { OverlayOpenContext } from "./lib/overlay";
import { CollectionView } from "./components/CollectionView";
import { Footer } from "./components/Footer";
import {
  COLLECTION_KIND,
  findItem,
  itemsForKind,
  itemsForTopic,
} from "./lib/content";
import { findTopic } from "./lib/topics";
import type { Kind } from "./lib/types";

interface BgState {
  background?: Location;
}

// The Games section briefly shipped as /software; keep those URLs alive.
function SoftwareRedirect() {
  const { slug = "" } = useParams<{ slug: string }>();
  return <Navigate to={`/games/${slug}`} replace />;
}

function NotFound() {
  return (
    <div className="page page-fade">
      <div className="container" style={{ padding: "120px 0" }}>
        <h1 className="hero-title">404</h1>
        <p className="hero-sub" style={{ marginTop: 16 }}>
          Nothing here.
        </p>
        <Link to="/" className="btn btn-secondary" style={{ marginTop: 24 }}>
          ← Home
        </Link>
      </div>
    </div>
  );
}

function ModalRoute({
  kind,
  onClose,
  covered,
}: {
  kind: Kind;
  onClose: () => void;
  covered?: boolean;
}) {
  const { slug = "" } = useParams<{ slug: string }>();
  const item = findItem(kind, slug);
  // Called before the early return so the hook order stays stable. This layer
  // is on top, so it owns the title: it restates what the server prerendered
  // for this URL instead of letting the tab page underneath overwrite it.
  useDocumentTitle(item ? titleForItem(item) : "", !!item);
  if (!item) {
    onClose();
    return null;
  }
  return <ItemView item={item} onClose={onClose} covered={covered} />;
}

const MODALISH_RE =
  /^\/(hardware|games|blog)\/[^/]+\/?$|^\/(all|topic)\/[^/]+\/?$/;

function CollectionAllRoute({
  onClose,
  covered,
}: {
  onClose: () => void;
  covered?: boolean;
}) {
  const { segment = "" } = useParams<{ segment: string }>();
  const kind = COLLECTION_KIND[segment];
  useDocumentTitle(kind ? titleForCollection(kind) : "", !!kind);
  if (!kind) {
    onClose();
    return null;
  }
  return (
    <CollectionView
      title={COLLECTION_TITLE[kind]}
      items={itemsForKind(kind)}
      onClose={onClose}
      covered={covered}
    />
  );
}

function CollectionTopicRoute({
  onClose,
  covered,
}: {
  onClose: () => void;
  covered?: boolean;
}) {
  const { topicId = "" } = useParams<{ topicId: string }>();
  const topic = findTopic(topicId);
  useDocumentTitle(topic ? titleForTopic(topic) : "", !!topic);
  if (!topic) {
    onClose();
    return null;
  }
  return (
    <CollectionView
      eyebrow="Topic"
      title={topic.label}
      items={itemsForTopic(topic)}
      onClose={onClose}
      covered={covered}
    />
  );
}

// Tab pages are real pages; switching tabs scrolls to the top like any
// navigation.
const HOME_TAB_PATHS = new Set(["/"]);

function ScrollManager() {
  const location = useLocation();
  const state = location.state as BgState | null;
  const hasBackground = !!state?.background;
  const hadBackgroundRef = useRef(false);
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    const prevPath = prevPathRef.current;
    prevPathRef.current = location.pathname;
    if (hasBackground) {
      hadBackgroundRef.current = true;
      return;
    }
    if (hadBackgroundRef.current) {
      hadBackgroundRef.current = false;
      return;
    }
    if (HOME_TAB_PATHS.has(location.pathname) && HOME_TAB_PATHS.has(prevPath)) {
      return;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname, hasBackground]);
  return null;
}

const COLLECTION_PATH_RE = /^\/all\/[^/]+\/?$|^\/topic\/[^/]+\/?$/;
const ITEM_PATH_RE = /^\/(hardware|games|blog)\/[^/]+\/?$/;

// The tab page rendered UNDER an item opened by deep link, keyed by the item's
// URL segment.
const ITEM_TAB_PATH: Record<string, string> = {
  hardware: "/hardware",
  games: "/games",
  blog: "/blog",
};

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as BgState | null;
  const background = state?.background;

  // Stacked modals: walk the background chain and collect every modal layer
  // (bottom -> top). ALL of them stay mounted, so opening one over another
  // keeps the lower modal visible underneath (no flash of the page behind),
  // and closing the top reveals it instantly. The walk's exit point is the
  // page rendered underneath everything.
  const layers: Location[] = [];
  let pageLocation: Location | undefined;
  {
    let loc: Location = location;
    for (;;) {
      const bg = (loc.state as BgState | null)?.background;
      const itemMatch = loc.pathname.match(ITEM_PATH_RE);
      const modalish =
        MODALISH_RE.test(loc.pathname) &&
        (!!bg || COLLECTION_PATH_RE.test(loc.pathname) || !!itemMatch);
      if (!modalish) {
        pageLocation = loc;
        break;
      }
      layers.unshift(loc);
      if (!bg) {
        // Deep link / reload straight onto an item: render its TAB page
        // underneath and the real modal on top, never the bare fallback page.
        // Must resolve to a tab that RENDERS: /projects, /talks and /writing
        // are <Navigate> aliases into /work, and putting one here would fire a
        // redirect that replaces the URL and tears the item back down.
        if (itemMatch) {
          pageLocation = {
            pathname: ITEM_TAB_PATH[itemMatch[1]] ?? "/",
            search: "",
            hash: "",
            state: null,
            key: "synthetic",
          };
        }
        break; // collection visited directly: page falls back to Home
      }
      loc = bg;
    }
  }
  const showOverlay = layers.length > 0;

  const closeModal = () => {
    if (background) {
      const target =
        background.pathname + (background.search ?? "") + (background.hash ?? "");
      // restore the parent layer WITH its own state: if the parent was itself
      // a modal, it reappears instead of the whole stack collapsing
      navigate(target, { replace: true, state: background.state });
    } else {
      // direct-visit modal (no background chain): close to the item's tab
      const m = location.pathname.match(ITEM_PATH_RE);
      navigate(m ? `/${m[1]}` : "/", { replace: true });
    }
  };

  return (
    <OverlayOpenContext.Provider value={showOverlay}>
      <ScrollManager />
      {/* When a modal is open the background page stays mounted. Mark it
          aria-hidden so reader modes target the modal's <article>. */}
      <div className="app-bg" aria-hidden={showOverlay || undefined}>
        <Suspense fallback={null}>
          <Routes location={pageLocation ?? location}>
            <Route path="/" element={<Home />} />
            <Route path="/hardware" element={<Home tab="hardware" />} />
            <Route path="/games" element={<Home tab="game" />} />
            <Route path="/blog" element={<Home tab="blog" />} />
            {/* legacy routes from the pre-launch structure */}
            <Route path="/work" element={<Navigate to="/games" replace />} />
            <Route path="/projects" element={<Navigate to="/games" replace />} />
            <Route path="/talks" element={<Navigate to="/" replace />} />
            <Route path="/writing" element={<Navigate to="/blog" replace />} />
            <Route path="/software" element={<Navigate to="/games" replace />} />
            <Route path="/software/:slug" element={<SoftwareRedirect />} />
            <Route path="/blog/:slug" element={<ItemPage kind="blog" />} />
            <Route path="/hardware/:slug" element={<ItemPage kind="hardware" />} />
            <Route path="/games/:slug" element={<ItemPage kind="game" />} />
            <Route path="/all/:segment" element={<Home />} />
            <Route path="/topic/:topicId" element={<Home />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>

      {/* One <Routes> per modal layer, keyed by DEPTH (not path) so sibling
          navigation inside a layer reconciles in place while opening/closing
          a child only mounts/unmounts the top. Covered layers ignore Esc and
          keyboard nav; only the top layer drives closeModal. */}
      {layers.map((loc, i) => {
        const covered = i < layers.length - 1;
        return (
          <Routes key={i} location={loc}>
            <Route
              path="/hardware/:slug"
              element={<ModalRoute kind="hardware" onClose={closeModal} covered={covered} />}
            />
            <Route
              path="/games/:slug"
              element={<ModalRoute kind="game" onClose={closeModal} covered={covered} />}
            />
            <Route
              path="/blog/:slug"
              element={<ModalRoute kind="blog" onClose={closeModal} covered={covered} />}
            />
            <Route
              path="/all/:segment"
              element={<CollectionAllRoute onClose={closeModal} covered={covered} />}
            />
            <Route
              path="/topic/:topicId"
              element={<CollectionTopicRoute onClose={closeModal} covered={covered} />}
            />
          </Routes>
        );
      })}

      <Footer />
    </OverlayOpenContext.Provider>
  );
}

export default function App() {
  // /admin renders OUTSIDE the router (and away from the modal/Suspense tree):
  // the editor owns the whole viewport, keeps its own history, and must not
  // remount when the app's route state changes mid-edit. Only a direct URL
  // reaches it: there is no in-app link to /admin.
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return <Admin />;
  }
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
