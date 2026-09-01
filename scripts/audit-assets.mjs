import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import {
  collectItems,
  itemCoverCopies,
  itemCoverPublicPath,
  itemCoverSource,
  itemImagePath,
} from "./vite-prerender.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const MEDIA_RE = /\.(?:avif|gif|jpe?g|mov|mp4|png|svg|webm|webp)$/i;
const SOURCE_IMAGE_RE = /\.(?:jpe?g|png)$/i;
const VIDEO_RE = /\.(?:mov|mp4|webm)$/i;

// These files are deliberately kept at stable public URLs until their callers
// can move without breaking old links. Everything else must be reachable from
// authored content, application source, or one of the delivery rules below.
export const INTENTIONAL_UNREACHABLE = Object.freeze([
  "public/consoles/cd-i.jpg",
  "public/consoles/game-boy-advance.jpg",
  "public/consoles/nes.jpg",
  "public/consoles/nintendo-ds.jpg",
  "public/consoles/playstation.jpg",
  "public/consoles/sega-genesis.jpg",
  "public/consoles/super-nintendo.jpg",
  "public/consoles/virtual-boy.jpg",
  "public/covers/minish-widescreen.webp",
  "public/covers/smw-extensible.jpg",
  "public/covers/tm4-boxart.png",
  "public/covers/warioware-gyro.webp",
  "public/covers/x6-tweaks-1280.webp",
  "public/covers/x6-tweaks-640.webp",
  "public/covers/x6-tweaks.png",
  "public/covers/x6-tweaks.webp",
  "public/covers/zelda-voxel.webp",
]);

const posix = (value) => value.replaceAll(path.sep, "/");
const relativeToRoot = (value) => posix(path.relative(ROOT, value));

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function splitFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };
  return { frontmatter: yaml.load(match[1]) ?? {}, body: match[2] ?? "" };
}

function localAssetPath(value, fromFile) {
  if (typeof value !== "string") return null;
  let clean = value.trim().replace(/^<|>$/g, "");
  if (!clean || /^(?:[a-z]+:|#)/i.test(clean)) return null;
  clean = clean.split(/[?#]/, 1)[0];
  try {
    clean = decodeURIComponent(clean);
  } catch {
    // A malformed escape is still checked as written, which produces the
    // useful missing-reference error instead of aborting the whole audit.
  }
  if (!MEDIA_RE.test(clean)) return null;

  let full;
  if (clean.startsWith("/data/")) full = path.join(ROOT, clean.slice(1));
  else if (clean.startsWith("/")) full = path.join(ROOT, "public", clean.slice(1));
  else full = path.resolve(path.dirname(fromFile), clean.replace(/^\.\//, ""));

  const rel = relativeToRoot(full);
  return rel.startsWith("data/") || rel.startsWith("public/") ? rel : null;
}

function duplicateSummary(media) {
  const bySize = new Map();
  for (const entry of media.values()) {
    const bucket = bySize.get(entry.bytes) ?? [];
    bucket.push(entry);
    bySize.set(entry.bytes, bucket);
  }

  const byHash = new Map();
  for (const candidates of bySize.values()) {
    if (candidates.length < 2) continue;
    for (const entry of candidates) {
      const hash = crypto.createHash("sha256").update(fs.readFileSync(entry.full)).digest("hex");
      const bucket = byHash.get(hash) ?? [];
      bucket.push(entry);
      byHash.set(hash, bucket);
    }
  }

  const groups = [...byHash.values()].filter((entries) => entries.length > 1);
  return {
    groups: groups.length,
    redundantBytes: groups.reduce(
      (total, entries) => total + entries[0].bytes * (entries.length - 1),
      0,
    ),
  };
}

function sourcePublicReferences() {
  const candidates = [path.join(ROOT, "index.html"), ...walk(path.join(ROOT, "src"))].filter(
    (file) =>
      /\.(?:css|html|mjs|ts|tsx)$/.test(file) &&
      !/\.test\.[^.]+$/.test(file) &&
      !file.endsWith(path.join("src", "generated", "lqip.ts")) &&
      !file.endsWith(path.join("src", "generated", "previews.ts")),
  );
  const references = [];
  const literal = /["'`](\/(?!data\/)[^"'`\s)]+?\.(?:avif|gif|jpe?g|mov|mp4|png|svg|webm|webp)(?:[?#][^"'`\s)]*)?)["'`]/gi;
  for (const file of candidates) {
    const raw = fs.readFileSync(file, "utf8");
    for (const match of raw.matchAll(literal)) references.push({ value: match[1], file });
  }
  return references;
}

function previewSlugs() {
  const file = path.join(ROOT, "src", "generated", "previews.ts");
  const raw = fs.readFileSync(file, "utf8");
  const block = raw.match(/new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? "";
  return [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]).sort();
}

function exclusionPaths() {
  const raw = fs.readFileSync(path.join(ROOT, "src", "lib", "catalogContent.ts"), "utf8");
  return [...raw.matchAll(/["']!(\/data\/[^"']+\.(?:jpe?g|png))["']/gi)]
    .map((match) => match[1].slice(1))
    .sort();
}

function formatNumber(value) {
  return value.toLocaleString("en-US");
}

export function auditAssets() {
  const mediaFiles = [path.join(ROOT, "data"), path.join(ROOT, "public")]
    .flatMap(walk)
    .filter((file) => MEDIA_RE.test(file));
  const media = new Map(
    mediaFiles.map((full) => {
      const rel = relativeToRoot(full);
      return [rel, { rel, full, bytes: fs.statSync(full).size }];
    }),
  );
  const reachable = new Set();
  const missing = new Set();

  const markExisting = (rel) => {
    if (media.has(rel)) reachable.add(rel);
  };

  const markReference = (value, fromFile, required = true) => {
    const rel = localAssetPath(value, fromFile);
    if (!rel) return;
    const base = rel.replace(/\.[^.]+$/, "");

    if (VIDEO_RE.test(rel)) {
      const delivery = [`${base}.webm`, `${base}.mp4`, `${base}.thumb.webp`].filter((candidate) =>
        media.has(candidate),
      );
      if (!delivery.length && required) missing.add(`${relativeToRoot(fromFile)} -> ${value}`);
      delivery.forEach(markExisting);
      return;
    }

    if (!media.has(rel)) {
      if (required) missing.add(`${relativeToRoot(fromFile)} -> ${value}`);
      return;
    }

    if (rel.startsWith("data/") && SOURCE_IMAGE_RE.test(rel)) {
      const webp = `${base}.webp`;
      markExisting(media.has(webp) ? webp : rel);
      markExisting(`${base}-640.webp`);
      markExisting(`${base}-1280.webp`);
      return;
    }
    markExisting(rel);
  };

  for (const file of walk(path.join(ROOT, "data")).filter((entry) => entry.endsWith(".md"))) {
    const { frontmatter, body } = splitFrontmatter(fs.readFileSync(file, "utf8"));
    markReference(frontmatter.cover, file);
    markReference(frontmatter.poster, file);
    if (Array.isArray(frontmatter.gallery)) {
      for (const entry of frontmatter.gallery) {
        markReference(typeof entry === "string" ? entry : entry?.src, file);
      }
    }
    for (const match of body.matchAll(/!\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))/g)) {
      markReference(match[1] ?? match[2], file);
    }
  }

  const homeFile = path.join(ROOT, "data", "home.json");
  const visitHome = (value) => {
    if (typeof value === "string") markReference(value, homeFile);
    else if (Array.isArray(value)) value.forEach(visitHome);
    else if (value && typeof value === "object") Object.values(value).forEach(visitHome);
  };
  visitHome(JSON.parse(fs.readFileSync(homeFile, "utf8")));

  // Source literals establish reachability, but examples and editor
  // placeholders are allowed to name files that do not exist.
  for (const { value, file } of sourcePublicReferences()) markReference(value, file, false);

  // The prerenderer discovers this optional convention through fs.existsSync
  // rather than a public-path literal, so teach the asset graph the same rule.
  markExisting("public/og/default.jpg");

  const previews = previewSlugs();
  const previewIssues = [];
  for (const slug of previews) {
    for (const ext of ["mp4", "webp"]) {
      const rel = `public/previews/${slug}.${ext}`;
      if (media.has(rel)) reachable.add(rel);
      else previewIssues.push(`preview manifest -> /previews/${slug}.${ext}`);
    }
  }
  const previewDir = path.join(ROOT, "public", "previews");
  const listedPreviews = new Set(previews);
  const unlistedPreviews = fs
    .readdirSync(previewDir)
    .filter((name) => name.endsWith(".mp4") && name !== "hero-montage.mp4")
    .map((name) => name.slice(0, -4))
    .filter((slug) => fs.existsSync(path.join(previewDir, `${slug}.webp`)) && !listedPreviews.has(slug));
  previewIssues.push(...unlistedPreviews.map((slug) => `preview files absent from manifest -> ${slug}`));

  const provenanceOriginals = [...media.keys()]
    .filter(
      (rel) =>
        rel.startsWith("data/") &&
        SOURCE_IMAGE_RE.test(rel) &&
        media.has(`${rel.replace(/\.[^.]+$/, "")}.webp`),
    )
    .sort();
  const provenanceSet = new Set(provenanceOriginals);
  const exclusions = exclusionPaths();
  const exclusionSet = new Set(exclusions);
  const missingExclusions = provenanceOriginals.filter((rel) => !exclusionSet.has(rel));
  const extraExclusions = exclusions.filter((rel) => !provenanceSet.has(rel));

  const allowed = new Set(INTENTIONAL_UNREACHABLE);
  const appUnreachable = [...media.keys()]
    .filter((rel) => !reachable.has(rel) && !provenanceSet.has(rel))
    .sort();
  const unexpectedUnreachable = appUnreachable.filter((rel) => !allowed.has(rel));
  const staleAllowlist = INTENTIONAL_UNREACHABLE.filter(
    (rel) => !media.has(rel) || reachable.has(rel),
  );

  const lqipRaw = fs.readFileSync(path.join(ROOT, "src", "generated", "lqip.ts"), "utf8");
  const lqipKeys = [...lqipRaw.matchAll(/["'](\/data\/[^"']+)["']\s*:/g)].map(
    (match) => match[1].slice(1),
  );
  const staleLqip = lqipKeys.filter((rel) => !media.has(rel));

  const items = collectItems();
  const copyPaths = new Set(itemCoverCopies(items).map(({ pub }) => pub));
  const shadowedCopies = items
    .filter((item) => {
      const pub = itemCoverPublicPath(item);
      return Boolean(
        itemCoverSource(item) &&
          pub &&
          itemImagePath(item) !== pub &&
          copyPaths.has(pub),
      );
    })
    .map((item) => `${item.kind}-${item.slug}`)
    .sort();
  const suppressedCovers = items.filter((item) => {
    const pub = itemCoverPublicPath(item);
    return Boolean(itemCoverSource(item) && pub && itemImagePath(item) !== pub);
  }).length;

  const duplicates = duplicateSummary(media);
  const bytes = [...media.values()].reduce((total, entry) => total + entry.bytes, 0);
  const unreachableBytes = appUnreachable.reduce(
    (total, rel) => total + (media.get(rel)?.bytes ?? 0),
    0,
  );
  const provenanceBytes = provenanceOriginals.reduce(
    (total, rel) => total + media.get(rel).bytes,
    0,
  );

  const issues = [
    ...[...missing].sort().map((entry) => `missing referenced asset: ${entry}`),
    ...previewIssues.sort(),
    ...unexpectedUnreachable.map((rel) => `unclassified unreachable asset: ${rel}`),
    ...staleAllowlist.map((rel) => `stale intentional-unreachable entry: ${rel}`),
    ...staleLqip.map((rel) => `stale LQIP key: /${rel}`),
    ...missingExclusions.map((rel) => `provenance original still emitted by client glob: ${rel}`),
    ...extraExclusions.map((rel) => `client glob excludes a non-provenance asset: ${rel}`),
    ...shadowedCopies.map((id) => `preview-shadowed OG cover still copied: ${id}`),
  ];

  return {
    issues,
    summary: {
      files: media.size,
      bytes,
      intentionalUnreachable: appUnreachable.length,
      intentionalUnreachableBytes: unreachableBytes,
      duplicateGroups: duplicates.groups,
      duplicateBytes: duplicates.redundantBytes,
      provenanceOriginals: provenanceOriginals.length,
      provenanceBytes,
      staleLqip: staleLqip.length,
      suppressedCovers,
      shadowedCopies: shadowedCopies.length,
    },
  };
}

function printAudit(result) {
  const { summary } = result;
  console.log(`[assets] ${summary.files} media files / ${formatNumber(summary.bytes)} bytes`);
  console.log(
    `[assets] ${summary.intentionalUnreachable} intentional unreachable public files / ` +
      `${formatNumber(summary.intentionalUnreachableBytes)} bytes`,
  );
  console.log(
    `[assets] ${summary.duplicateGroups} exact duplicate groups / ` +
      `${formatNumber(summary.duplicateBytes)} redundant bytes (informational)`,
  );
  console.log(
    `[assets] ${summary.provenanceOriginals} provenance originals excluded from client assets / ` +
      `${formatNumber(summary.provenanceBytes)} bytes`,
  );
  console.log(
    `[assets] ${summary.suppressedCovers} preview-shadowed OG covers suppressed; ` +
      `${summary.staleLqip} stale LQIP keys`,
  );
  if (result.issues.length) {
    console.error(`[assets] audit failed:\n  - ${result.issues.join("\n  - ")}`);
  } else {
    console.log("[assets] audit passed");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditAssets();
  printAudit(result);
  if (result.issues.length) process.exitCode = 1;
}
