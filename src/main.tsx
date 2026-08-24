import { createRoot } from "react-dom/client";
import App from "./App";
// Styles are split into ordered partials (cascade order preserved); edit the
// relevant one instead of one large file. Keep this import order.
import "./styles/01-base.css";
import "./styles/02-home.css";
import "./styles/03-nav.css";
import "./styles/04-cards.css";
import "./styles/05-detail.css";
import "./styles/06-responsive.css";
import "./styles/07-collections-cv.css";
import "./styles/08-home-cards.css";
import "./styles/09-blog-demo.css";
import "./styles/10-link-previews.css";
// The documentation section: its own shell, sidebar, TOC rail and prose
// measure. After 05-detail.css because it extends that file's prose rules, and
// after 10-link-previews.css so the hover card is not restyled by a docs
// selector.
import "./styles/12-docs.css";
// The documentation's search dialog and the bar affordance that opens it. Its
// own partial so it can be read on its own; after 12-docs.css because it sits
// inside that file's bar and uses its measurements.
import "./styles/13-docs-search.css";
// The markdown renderer's own class hooks (heading anchors, code figures,
// callouts, table wrappers). They are emitted on every kind of page, not only
// in docs, so they are not in 12-docs.css. Last of the public partials because
// the prose files above style the bare elements these hooks replace, and a
// class hook only wins that tie on source order.
import "./styles/14-markdown.css";
// Scoped to .applecms, so it dresses the /admin editor without touching the
// public site's cascade. Appended last per the partial ordering.
import "./styles/11-apple-cms.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element");
createRoot(rootEl).render(
  <div className="app-root">
    <App />
  </div>,
);
