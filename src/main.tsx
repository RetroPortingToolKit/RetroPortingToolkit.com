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

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element");
createRoot(rootEl).render(
  <div className="app-root">
    <App />
  </div>,
);
