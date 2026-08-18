import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Standalone test config: just the path aliases (so src modules resolve) + a
// node environment. Deliberately NOT the app's vite.config (which pulls in the
// dev-only CMS/feeds/prerender plugins we don't want under test).
export default defineConfig({
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
