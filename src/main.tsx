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
