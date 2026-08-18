// Types for the prerenderer, so src/lib/pageTitle.test.ts can import the real
// buildRouteMeta() and compare its titles against the client's. vite.config.ts
// also imports this module, but is outside tsconfig's `include`.
import type { Plugin } from "vite";

export interface RouteMeta {
  title: string;
  description: string;
  url: string;
  type: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  video?: string;
  /** Crawlable text shell injected ahead of the React root. */
  static?: string;
  extraHead?: string;
  hideStatic?: boolean;
  jsonLd?: unknown;
}

/** Every route on the site, with `origin` making asset/og URLs absolute. */
export declare function buildRouteMeta(origin: string): Map<string, RouteMeta>;

/** Vite plugin: writes the per-route HTML at build, serves parity in dev. */
export declare function prerenderRoutes(): Plugin;
