import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Standalone test config: just the path aliases (so src modules resolve) + a
// node environment, kept separate from the app's vite.config.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@data": fileURLToPath(new URL("./data", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
