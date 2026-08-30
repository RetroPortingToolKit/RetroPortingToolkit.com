import { lazy, Suspense } from "react";
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
import { useEffect, useLayoutEffect, useRef } from "react";
import Home from "./pages/Home";
import { ItemPage } from "./pages/ItemPage";
// The editor is 2300 lines that only ever run on /admin, so it loads from its
// own chunk rather than riding in the bundle every visitor downloads. It has to
// be lazy ONLY: a module that is both statically and dynamically imported gets
// inlined back into the main chunk by the bundler, which is exactly what this
// is avoiding. (It used to be static, to stop Fast Refresh remounting the
// editor and dropping focus mid-edit. Editing Admin.tsx refreshes that module
// rather than this one, so the lazy wrapper here survives it.)
const Admin = lazy(() => import("./pages/Admin"));
const DocsPage = lazy(() =>
  import("./pages/DocsPage").then((module) => ({ default: module.DocsPage })),
);
const CollectionRoutes = lazy(() => import("./components/CollectionRoutes"));
import { ItemView } from "./components/ItemView";
import {
  titleForItem,
  useDocumentTitle,
} from "./lib/pageTitle";
import { OverlayOpenContext } from "./lib/overlay";
import { Footer } from "./components/Footer";
import { SearchPaletteHost } from "./components/SearchPaletteHost";
import { IS_CMS_PREVIEW, useItem } from "./lib/cmsPreview";
import type { CatalogKind } from "./lib/catalogContent";

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

// createRoot replaces the prerendered DOM before a lazy route has arrived.
// Keep that brief interval meaningful and accessible instead of presenting a
// blank viewport on a direct documentation visit.
function DocsRouteFallback() {
  return (
    <main className="page" aria-busy="true" aria-label="Loading documentation">
      <div className="container" style={{ padding: "120px 0" }}>
        <p className="hero-sub">Loading documentation…</p>
      </div>
    </main>
  );
}

function CollectionRouteFallback() {
  return (
    <>
      <div className="modal-backdrop open" />
      <div className="modal open" role="status" aria-live="polite" aria-busy="true">
        <div className="modal-card">
          <div className="collection-body">
            <p className="collection-empty">Loading collection…</p>
          </div>
        </div>
      </div>
    </>
  );
}

function ModalRoute({
  kind,
  onClose,
  covered,
}: {
  kind: CatalogKind;
  onClose: () => void;
  covered?: boolean;
}) {
  const { slug = "" } = useParams<{ slug: string }>();
  // Draft-aware: inside the editor's preview frame this resolves from the
  // streamed draft, so a page being written renders before it is ever built.
  const item = useItem(kind, slug);
  // Called before the early return so the hook order stays stable. This layer
  // is on top, so it owns the title: it restates what the server prerendered
  // for this URL instead of letting the tab page underneath overwrite it.
  useDocumentTitle(item ? titleForItem(item) : "", !!item);
  if (!item) {
    // Inside the editor's preview frame, a missing item means the first draft
    // has not arrived yet. Closing would drop the author back to the listing,
    // which is what made a new page look like it had not been created.
    if (IS_CMS_PREVIEW) return null;
    onClose();
    return null;
  }
  return <ItemView item={item} onClose={onClose} covered={covered} />;
}

const MODALISH_RE =
  /^\/(hardware|games|blog)\/[^/]+\/?$|^\/(all|topic)\/[^/]+\/?$/;

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

// Direct modal URLs have no real page behind them. The modal itself owns the
// whole viewport and carries the site navigation, so mounting a complete Home
// catalog underneath only creates hidden cards, observers and media requests.
function DirectModalUnderlay() {
  return <div className="modal-direct-underlay" aria-hidden="true" />;
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const appBackgroundRef = useRef<HTMLDivElement>(null);
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
        pageLocation = {
          pathname: "/__modal-underlay",
          search: "",
          hash: "",
          state: null,
          key: "synthetic",
        };
        break;
      }
      loc = bg;
    }
  }
  const showOverlay = layers.length > 0;

  // aria-hidden removes the covered page from the accessibility tree; inert
  // also prevents its links and controls from receiving focus or pointer
  // input while a modal owns the viewport.
  useLayoutEffect(() => {
    const backgroundElement = appBackgroundRef.current;
    if (!backgroundElement) return;
    backgroundElement.inert = showOverlay;
    return () => {
      backgroundElement.inert = false;
    };
  }, [showOverlay]);

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
      <div
        ref={appBackgroundRef}
        className="app-bg"
        aria-hidden={showOverlay || undefined}
      >
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
            {/* Documentation is the one nested section: /docs/<section>/<page>.
                A `:slug` param matches exactly one segment, so the splat is
                what makes the second one reachable. Both are registered
                because the splat form is what carries the path, and the bare
                /docs is the section index. Docs never open as a modal: they
                are pages with their own navigation, so they are deliberately
                absent from MODALISH_RE and the modal layers below. */}
            <Route
              path="/docs"
              element={
                <Suspense fallback={<DocsRouteFallback />}>
                  <DocsPage />
                </Suspense>
              }
            />
            <Route
              path="/docs/*"
              element={
                <Suspense fallback={<DocsRouteFallback />}>
                  <DocsPage />
                </Suspense>
              }
            />
            <Route path="/all/:segment" element={<Home />} />
            <Route path="/topic/:topicId" element={<Home />} />
            <Route path="/__modal-underlay" element={<DirectModalUnderlay />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Footer />
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
              element={
                <Suspense fallback={<CollectionRouteFallback />}>
                  <CollectionRoutes route="all" onClose={closeModal} covered={covered} />
                </Suspense>
              }
            />
            <Route
              path="/topic/:topicId"
              element={
                <Suspense fallback={<CollectionRouteFallback />}>
                  <CollectionRoutes route="topic" onClose={closeModal} covered={covered} />
                </Suspense>
              }
            />
          </Routes>
        );
      })}

      {/* The site's one command palette, above every route and every overlay,
          so the bars below only have to render its button. */}
      <SearchPaletteHost />
    </OverlayOpenContext.Provider>
  );
}

export default function App() {
  // /admin renders OUTSIDE the router (and away from the modal/Suspense tree):
  // the editor owns the whole viewport, keeps its own history, and must not
  // remount when the app's route state changes mid-edit. Only a direct URL
  // reaches it: there is no in-app link to /admin.
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    );
  }
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
