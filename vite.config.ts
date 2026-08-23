import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { renderFeeds, generateFeeds } from "./scripts/gen-feeds.mjs";
import { renderAgentSurfaces, generateAgentSurfaces } from "./scripts/gen-llms.mjs";
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

// The machine-readable documentation surfaces: /llms.txt, /llms-full.txt,
// /docs.md, a .md next to every documentation URL, and robots.txt. Emitted into
// dist/ at build time (closeBundle), exactly like the feeds above, and served
// on the fly in dev from the same renderer so the two cannot drift.
//
// ORDER MATTERS in the plugins array below. scripts/vite-prerender.mjs writes
// its own robots.txt during ITS closeBundle, carrying the sitemap only. Both
// closeBundle hooks are synchronous, so they run in plugin order: this plugin
// sits after prerenderRoutes() and writes robots.txt again, last, with the
// llms.txt references added. Move it earlier and the prerenderer's shorter
// robots.txt is what ships.
//
// The .md files are emitted as real files in dist/. vercel.json rewrites every
// unmatched path to "/", but Vercel checks the filesystem BEFORE it applies
// rewrites, so a real dist/docs/<slug>.md is served as itself and the catch-all
// never sees the request. That is also why the count assertion in gen-llms.mjs
// matters: a .md that was never written would not 404, it would answer 200 with
// the home page.
function agentSurfacesPlugin(): Plugin {
  const MD = "text/markdown; charset=utf-8";
  let outDir = "dist";
  return {
    name: "agent-surfaces",
    configResolved(cfg) {
      outDir = cfg.build.outDir;
    },
    // build: emit alongside the bundle, after the prerenderer has run
    closeBundle() {
      if (process.env.VITEST) return;
      const r = generateAgentSurfaces(outDir);
      this.info?.(
        `[llms] llms.txt + llms-full.txt + robots.txt + docs.md + ${r.pages} page .md ` +
          `across ${r.sections} section(s)`,
      );
      if (r.missingDescription.length) {
        this.warn?.(
          `[llms] no summary or desc, so no description in llms.txt: ` +
            r.missingDescription.join(", "),
        );
      }
    },
    // dev: serve the same bytes without a build. Registered here rather than in
    // a returned function so it runs BEFORE vite's SPA fallback, which would
    // otherwise answer these paths with index.html. Note the prerenderer's own
    // dev meta middleware skips any path containing a dot, so it never sees a
    // .md request and cannot inject HTML meta into one.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.originalUrl || req.url || "").split("?")[0];
        if (
          url !== "/llms.txt" &&
          url !== "/llms-full.txt" &&
          url !== "/robots.txt" &&
          url !== "/docs.md" &&
          !(url.startsWith("/docs/") && url.endsWith(".md"))
        )
          return next();
        try {
          const s = renderAgentSurfaces();
          let body: string | undefined;
          let type = MD;
          if (url === "/llms.txt") body = s.llms;
          else if (url === "/llms-full.txt") body = s.llmsFull;
          else if (url === "/docs.md") body = s.docsIndex;
          else if (url === "/robots.txt") {
            body = s.robots;
            type = "text/plain; charset=utf-8";
          } else body = s.pageFiles.get(url.slice(1));
          if (body === undefined) {
            // A path that looks like a docs page but has none behind it. Say so
            // rather than falling through to the SPA, which would answer 200
            // with the app shell.
            res.statusCode = 404;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end(`no documentation page at ${url}\n`);
            return;
          }
          res.statusCode = 200;
          res.setHeader("content-type", type);
          res.setHeader("cache-control", "no-store");
          res.end(body);
        } catch (e) {
          res.statusCode = 500;
          res.end(`agent surfaces error: ${(e as Error).message}`);
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
  let autoPull = { enabled: false, intervalMs: 45000 };
  return {
    name: "cms-dev-api",
    apply: "serve",
    configResolved(cfg) {
      const env = loadEnv(cfg.mode, process.cwd(), "");
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
      server.middlewares.use(createCmsMiddleware());
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
  // agentSurfacesPlugin() must stay AFTER prerenderRoutes(): both write
  // robots.txt at closeBundle and the last one wins. See its comment.
  plugins: [react(), prerenderRoutes(), feedsPlugin(), agentSurfacesPlugin(), cmsDevApi()],
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
