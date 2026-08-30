import { defineConfig, loadEnv, type Plugin } from "vite";
import { originTrialExpiry } from "./src/lib/originTrial";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { renderFeeds, generateFeeds } from "./scripts/gen-feeds.mjs";
import {
  renderAgentSurfaces,
  generateAgentSurfaces,
  collectDocs,
} from "./scripts/gen-llms.mjs";
import { docsUpdated } from "./scripts/gen-docs-dates.mjs";
import { prerenderRoutes } from "./scripts/vite-prerender.mjs";
import { createCmsMiddleware, startAutoPull } from "./scripts/cms-dev.mjs";
import { buildDocsSearchIndex, docsSearchSources } from "./src/lib/docsSearch";

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
  let devSurfaces: ReturnType<typeof renderAgentSurfaces> | undefined;
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
          const s = (devSurfaces ??= renderAgentSurfaces());
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
    handleHotUpdate({ file }) {
      if (file.replaceAll("\\", "/").includes("/data/docs/")) {
        devSurfaces = undefined;
      }
    },
  };
}

// The documentation's two build-time data surfaces, served as virtual modules
// so nothing is written into src/ and nothing is fetched at runtime:
//
//   virtual:docs-search-index   every published documentation page reduced to
//                               plain text (table cells included) plus its
//                               headings. src/components/DocsSearch.tsx reaches
//                               it through a DYNAMIC import, so rollup gives it
//                               its own chunk and a reader downloads it the
//                               first time they open search, never on load.
//   virtual:docs-updated        slug -> { date, source } for the "last updated"
//                               stamp in the article footer.
//
// Both are built from the same walk scripts/gen-llms.mjs uses (collectDocs),
// which mirrors the DOCS export and is already draft-filtered, so a draft page
// is not searchable and carries no stamp. src/lib/docsSearch.test.ts asserts
// the index covers exactly DOCS.
//
// Generation is a plugin, like feedsPlugin and agentSurfacesPlugin above, and
// not a scheduled job or a checked-in generated file: it runs during the build
// that consumes it and nowhere else.
const DOCS_SEARCH_ID = "virtual:docs-search-index";
const DOCS_UPDATED_ID = "virtual:docs-updated";

function docsDataPlugin(): Plugin {
  // The "\0" prefix is rollup's convention for a module that is not on disk;
  // it stops other plugins (and the dev server's file middleware) from trying
  // to resolve it as a path.
  const resolved = (id: string) => `\0${id}`;
  let cache: { search?: string; updated?: string } = {};

  // JSON.parse of one string literal is measurably faster to evaluate than the
  // equivalent object literal, and this module is close to a megabyte.
  const asModule = (value: unknown) =>
    `export default /* @__PURE__ */ JSON.parse(${JSON.stringify(JSON.stringify(value))});\n`;

  return {
    name: "docs-data",
    resolveId(id) {
      if (id === DOCS_SEARCH_ID || id === DOCS_UPDATED_ID) return resolved(id);
      return null;
    },
    load(id) {
      if (id === resolved(DOCS_SEARCH_ID)) {
        if (cache.search === undefined) {
          const index = buildDocsSearchIndex(docsSearchSources(collectDocs()));
          cache.search = asModule(index);
          this.info?.(
            `[docs-search] ${index.entries.length} pages, ` +
              `${Math.round(cache.search.length / 1024)} kB of module source`,
          );
        }
        return cache.search;
      }
      if (id === resolved(DOCS_UPDATED_ID)) {
        if (cache.updated === undefined) {
          const { pages } = collectDocs();
          const { map, stale, git } = docsUpdated(pages);
          cache.updated = asModule(map);
          const fromGit = Object.values(map).filter((e) => e.source === "git").length;
          this.info?.(
            `[docs-updated] ${Object.keys(map).length} dated ` +
              `(${fromGit} from git, ${Object.keys(map).length - fromGit} from frontmatter); ` +
              `git available=${git.available} shallow=${git.shallow}`,
          );
          // The one thing a hand-written date gets wrong, named rather than
          // silently published.
          if (stale.length) {
            this.warn?.(
              `[docs-updated] declared date is older than the last commit: ` +
                stale.map((s) => `${s.slug} (${s.declared} < ${s.committed})`).join(", "),
            );
          }
        }
        return cache.updated;
      }
      return null;
    },
    // dev: a documentation edit has to reach both surfaces, or search keeps
    // answering from the page as it was when the server started.
    handleHotUpdate({ file, server }) {
      if (!file.replaceAll("\\", "/").includes("/data/docs/")) return;
      cache = {};
      for (const id of [DOCS_SEARCH_ID, DOCS_UPDATED_ID]) {
        const mod = server.moduleGraph.getModuleById(resolved(id));
        if (mod) server.moduleGraph.invalidateModule(mod);
      }
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

// The WebMCP tools in src/lib/webmcp.ts need somewhere to register. Chrome
// serves that API through an origin trial, which needs a token issued for this
// exact origin; Edge and ChatGPT's browser need nothing. So the token is a
// build-time slot: set VITE_WEBMCP_OT_TOKEN and the meta tag is emitted, leave
// it unset and the built HTML is byte for byte what it was. The owner gets a
// token by registering https://retroportingtoolkit.com at Chrome's origin
// trials console; it expires, and renewing it means rebuilding with the new
// value. The prerenderer copies the built index.html into every route, so the
// tag reaches every page or none.
function webmcpOriginTrialPlugin(): Plugin {
  let token = "";
  return {
    name: "webmcp-origin-trial",
    configResolved(cfg) {
      const env = loadEnv(cfg.mode, process.cwd(), "");
      token = String(env.VITE_WEBMCP_OT_TOKEN ?? process.env.VITE_WEBMCP_OT_TOKEN ?? "").trim();
      const expiry = originTrialExpiry(token);
      if (token && expiry !== undefined && expiry <= Date.now()) {
        throw new Error("VITE_WEBMCP_OT_TOKEN has expired; renew it before building");
      }
    },
    transformIndexHtml() {
      if (!token) return;
      return [
        {
          tag: "meta",
          attrs: { "http-equiv": "origin-trial", content: token },
          injectTo: "head" as const,
        },
      ];
    },
  };
}

export default defineConfig({
  // agentSurfacesPlugin() must stay AFTER prerenderRoutes(): both write
  // robots.txt at closeBundle and the last one wins. See its comment.
  plugins: [
    react(),
    prerenderRoutes(),
    feedsPlugin(),
    agentSurfacesPlugin(),
    docsDataPlugin(),
    cmsDevApi(),
    webmcpOriginTrialPlugin(),
  ],
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
  build: {
    // The documentation search index is a deliberately lazy, data-only chunk
    // (~809 kB minified); keep the warning focused on bootstrap code and
    // content chunks rather than flagging that one deferred payload.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Content is build-time data, not application code. Keep the large
        // markdown collections out of the bootstrap chunk so the warning is
        // actionable and the browser can cache each collection independently.
        manualChunks(id) {
          if (id.includes("/data/docs/")) {
            const section = id.match(/\/data\/docs\/(\d+_[^/]+)\//)?.[1];
            return section ? `content-docs-${section.replace(/^\d+_/, "")}` : "content-docs";
          }
          if (id.includes("/data/blog/")) return "content-blog";
          if (id.includes("/data/games/") || id.includes("/data/hardware/")) {
            return "content-catalog";
          }
          if (id.includes("/node_modules/js-yaml/")) return "yaml";
          return undefined;
        },
      },
    },
  },
});
