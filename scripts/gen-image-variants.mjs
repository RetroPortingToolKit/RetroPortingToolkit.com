#!/usr/bin/env node
// Generate same-stem WebP siblings for large stills without deleting or
// rewriting the originals. The app and prerenderer prefer a sibling when it
// exists, so this is safe to run incrementally as new media lands.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIN_BYTES = 500 * 1024;
const IMAGE_EXT = /\.(png|jpe?g)$/i;
const roots = [path.join(ROOT, "data"), path.join(ROOT, "public")];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const files = roots.flatMap(walk).filter((file) => IMAGE_EXT.test(file));
let generated = 0;
for (const source of files) {
  if (fs.statSync(source).size <= MIN_BYTES) continue;
  const target = source.replace(IMAGE_EXT, ".webp");
  if (!fs.existsSync(target)) {
    execFileSync("cwebp", ["-quiet", "-q", "82", "-m", "6", "-sharp_yuv", source, "-o", target], {
      cwd: ROOT,
      stdio: "inherit",
    });
    generated++;
    console.log(`generated ${path.relative(ROOT, target)}`);
  }
  for (const width of [640, 1280]) {
    const variant = source.replace(IMAGE_EXT, `-${width}.webp`);
    if (fs.existsSync(variant)) continue;
    execFileSync("cwebp", ["-quiet", "-resize", String(width), "0", "-q", "82", "-m", "6", "-sharp_yuv", source, "-o", variant], {
      cwd: ROOT,
      stdio: "inherit",
    });
    generated++;
    console.log(`generated ${path.relative(ROOT, variant)}`);
  }
}
console.log(`generated ${generated} WebP variants`);
