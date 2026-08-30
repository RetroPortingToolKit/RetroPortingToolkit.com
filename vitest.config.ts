import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
import { collectDocs, docsManifest } from "./scripts/gen-llms.mjs";

// The app's body-free docs manifest is a Vite virtual module. Tests deliberately
// do not load the production Vite config (and its CMS/feed/prerender plugins),
// so provide just this one deterministic data module here.
const DOCS_MANIFEST_ID = "virtual:docs-manifest";
const RESOLVED_DOCS_MANIFEST_ID = `\0${DOCS_MANIFEST_ID}`;

// Standalone test config: just the path aliases (so src modules resolve) + a
// node environment. Deliberately NOT the app's vite.config (which pulls in the
// dev-only CMS/feeds/prerender plugins we don't want under test).
export default defineConfig({
  plugins: [
    {
      name: "test-docs-manifest",
      resolveId(id) {
        return id === DOCS_MANIFEST_ID ? RESOLVED_DOCS_MANIFEST_ID : null;
      },
      load(id) {
        if (id !== RESOLVED_DOCS_MANIFEST_ID) return null;
        return `export default ${JSON.stringify(docsManifest(collectDocs()))};\n`;
      },
    },
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@data": fileURLToPath(new URL("./data", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
  },
});
