import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { renderFeeds, generateFeeds } from "./scripts/gen-feeds.mjs";
import { prerenderRoutes } from "./scripts/vite-prerender.mjs";
import { createCmsMiddleware, startAutoPull } from "./scripts/cms-dev.mjs";

// Feeds are written into dist/ at build time, so they do not exist on the dev
// server. Serve them on the fly here with the same renderer the build uses, so
// /rss, /atom, /feed[.xml], and /feed.json work in dev too, matching the
// rewrites in vercel.json. Emitting also happens here (closeBundle) so the
// feeds ship with every build.
function feedsPlugin(): Plugin {
  const ROUTES: Record<string, "rss" | "atom" | "json"> = {
    "/rss.xml": "rss",
    "/rss": "rss",
    "/feed.xml": "rss",
    "/feed": "rss",
    "/atom.xml": "atom",
    "/atom": "atom",
    "/feed.json": "json",
  };
  const TYPE = {
    rss: "application/rss+xml; charset=utf-8",
    atom: "application/atom+xml; charset=utf-8",
    json: "application/feed+json; charset=utf-8",
  } as const;
  let outDir = "dist";
  return {
    name: "feeds",
    configResolved(cfg) {
      outDir = cfg.build.outDir;
    },
    // build: emit the three files alongside the bundle
    closeBundle() {
      if (process.env.VITEST) return;
      const n = generateFeeds(outDir);
      this.info?.(`[feeds] rss.xml + atom.xml + feed.json (${n} posts)`);
    },
    // dev: serve the same bytes without a build
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.originalUrl || req.url || "").split("?")[0];
        const which = ROUTES[url];
        if (!which) return next();
        try {
          const feeds = renderFeeds();
          res.statusCode = 200;
          res.setHeader("content-type", TYPE[which]);
          res.setHeader("cache-control", "no-store");
          res.end(
            which === "rss" ? feeds.rss : which === "atom" ? feeds.atom : feeds.json,
          );
        } catch (e) {
          res.statusCode = 500;
          res.end(`feed error: ${(e as Error).message}`);
        }
      });
    },
  };
}

// Dev-only: the content editor (/admin) backend. Mounts the CMS read/list/save
// API only under `vite` (apply: "serve"), so it never exists on the static prod
// build. On prod, api/cms.ts serves the same routes as a Vercel function. See
// scripts/cms-dev.mjs for the allow-list and write logic.
function cmsDevApi(): Plugin {
  let password: string | undefined;
  let autoPull = { enabled: false, intervalMs: 45000 };
  return {
    name: "cms-dev-api",
    apply: "serve",
    configResolved(cfg) {
      // read CMS_PASSWORD server-side from .env.local (or the shell); never
      // exposed to the client (only VITE_-prefixed vars reach import.meta.env).
      // No password => the editor is open, with a warning.
      const env = loadEnv(cfg.mode, process.cwd(), "");
      password = env.CMS_PASSWORD || process.env.CMS_PASSWORD;
      if (!password) {
        console.warn(
          "[cms] no CMS_PASSWORD set: the /admin editor is OPEN on this dev server",
        );
      }
      // Background auto-pull keeps the dev working tree current with edits made
      // on the live site. Opt-in (CMS_AUTOPULL=1): it runs `git` against the
      // repo on a timer, so only enable it on a dev box you own, and never on
      // two vite instances sharing one .git.
      const raw = env.CMS_AUTOPULL ?? process.env.CMS_AUTOPULL;
      autoPull = {
        enabled: raw === "1" || raw === "true",
        intervalMs:
          Number(env.CMS_AUTOPULL_INTERVAL_MS || process.env.CMS_AUTOPULL_INTERVAL_MS) ||
          45000,
      };
    },
    configureServer(server) {
      server.middlewares.use(createCmsMiddleware({ password }));
      if (!autoPull.enabled) return;
      const http = server.httpServer;
      if (!http) return;
      const begin = () => {
        const stop = startAutoPull({
          intervalMs: autoPull.intervalMs,
          // non-forcing: tell open dev tabs the live site changed. The editor
          // reloads a clean doc; browsing tabs show a dismissible reload hint.
          notify: (data: { sha: string }) => {
            try {
              server.ws.send({ type: "custom", event: "cms:pulled", data });
            } catch {
              /* ws not ready */
            }
          },
        });
        http.on("close", stop);
      };
      if (http.listening) begin();
      else http.once("listening", begin);
    },
  };
}

export default defineConfig({
  plugins: [react(), prerenderRoutes(), feedsPlugin(), cmsDevApi()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@data": fileURLToPath(new URL("./data", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // bind to 0.0.0.0 so the dev server is reachable from other devices on the
    // same network. Vite listens on localhost only without this.
    host: true,
  },
});
