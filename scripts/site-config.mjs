// Reads the brand constants out of src/lib/site.ts so build scripts share the
// one source of truth AGENTS.md mandates. Node cannot import a .ts module, and
// pulling in a transpiler for six strings is not worth it: site.ts is a flat
// `as const` object literal of string fields, so a scan is sufficient and has
// no dependency cost.
//
// If site.ts ever grows nested or computed values, replace this with a real
// parse rather than widening the regex.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

const SITE_TS = path.join(ROOT, "src", "lib", "site.ts");

function parseSite() {
  const raw = fs.readFileSync(SITE_TS, "utf8");
  // Strip comments first so a `//` line mentioning quotes cannot register as a
  // field. site.ts is heavily commented, so this matters.
  const body = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const out = {};
  // key: "value". The value may sit on the next line, since prettier wraps the
  // longer fields (description) below the key.
  const re = /(\w+)\s*:\s*(?:\r?\n\s*)?"((?:[^"\\]|\\.)*)"/g;
  for (const m of body.matchAll(re)) {
    out[m[1]] = m[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return out;
}

const parsed = parseSite();

for (const required of ["title", "url", "description", "author", "tagline", "owner"]) {
  if (!parsed[required]) {
    throw new Error(
      `[site-config] src/lib/site.ts is missing "${required}". Feeds and prerender read it from there.`,
    );
  }
}

export const SITE = {
  ...parsed,
  // SITE_URL wins so preview deploys can emit correct absolute URLs without
  // editing tracked source.
  url: (process.env.SITE_URL || parsed.url).replace(/\/$/, ""),
};
