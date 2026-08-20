#!/usr/bin/env node
// SINGLE-FILE media pipeline. Converts exactly ONE media file, in place, to the
// web formats the site serves, and merges its blur-up placeholder into
// src/generated/lqip.ts.
//
//   node scripts/optimize-media.mjs <path relative to the repo root>
//
// This is deliberately NOT a tree walker. scripts/cms-dev.mjs (doUpload) calls
// it on the single file a person just uploaded; a full walk would re-encode and
// DELETE originals across all of data/ and public/. Give it one path or nothing
// happens.
//
// The contract, which doUpload depends on (it derives the frontmatter path from
// the same rules and never re-checks the disk):
//
//   jpg / jpeg / png   -> <stem>.webp          original deleted
//   mov / m4v          -> <stem>.mp4           original deleted, plus <stem>.webm
//   mp4                -> <stem>.mp4 (in place, normalized) plus <stem>.webm
//   webp / gif / avif  -> untouched
//   webm               -> untouched
//
// In every case one LQIP entry is merged for the PRIMARY output (the path
// frontmatter references). Video placeholders are keyed on the .mp4, which is
// what resolveMedia() in src/lib/content.ts falls back to when it finds no
// .webm entry.
//
// Silence is success: nothing is written to stderr unless the job actually
// failed, and the exit code is the only signal doUpload reads.
//
// Encoders: cwebp for stills (this machine's ffmpeg has NO webp encoder, so
// never try `ffmpeg -o x.webp`), ffmpeg for video and for decoding a frame down
// to placeholder size.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LQIP_FILE = path.join(ROOT, "src", "generated", "lqip.ts");

// Width of the placeholder image, in pixels. It is blurred and scaled up over
// the real asset, so it only has to carry colour and gross layout.
const LQIP_WIDTH = 16;

const IMAGE_TO_WEBP = new Set([".jpg", ".jpeg", ".png"]);
const IMAGE_KEEP = new Set([".webp", ".gif", ".avif"]);
const VIDEO_TO_MP4 = new Set([".mov", ".m4v"]);
const VIDEO_KEEP = new Set([".webm"]);

// Never touch anything under these, whatever the caller passes.
const FORBIDDEN_TOP = new Set(["node_modules", ".git", "dist", "build"]);

class Fail extends Error {}

// ---- binaries ---------------------------------------------------------------
//
// The dev server can be launched from a GUI with a minimal PATH, so fall back to
// the usual Homebrew / system locations rather than failing with "not found".

const BIN_DIRS = ["/opt/homebrew/bin", "/usr/local/bin", "/opt/local/bin", "/usr/bin", "/bin"];

const binCache = new Map();
function findBin(name) {
  if (binCache.has(name)) return binCache.get(name);
  const override = process.env[`${name.toUpperCase()}_BIN`];
  const candidates = [];
  if (override) candidates.push(override);
  for (const dir of String(process.env.PATH || "").split(path.delimiter)) {
    if (dir) candidates.push(path.join(dir, name));
  }
  candidates.push(...BIN_DIRS.map((dir) => path.join(dir, name)));
  let found = null;
  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      found = candidate;
      break;
    } catch {
      /* keep looking */
    }
  }
  binCache.set(name, found);
  return found;
}

function requireBin(name) {
  const bin = findBin(name);
  if (!bin) throw new Fail(`${name} not found on PATH (install it, or set ${name.toUpperCase()}_BIN)`);
  return bin;
}

// execFile with an argv array: no shell, so spaces and quotes in filenames are
// passed through literally and cannot be reinterpreted.
function run(bin, args) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { cwd: ROOT, timeout: 110_000, maxBuffer: 8 << 20 }, (err, stdout, stderr) => {
      if (err) {
        const detail = String(stderr || stdout || err.message)
          .trim()
          .split("\n")
          .slice(-3)
          .join(" ");
        reject(new Fail(`${path.basename(bin)} failed: ${detail || err.message}`));
      } else {
        resolve({ stdout: String(stdout || ""), stderr: String(stderr || "") });
      }
    });
  });
}

// ---- paths ------------------------------------------------------------------

// Resolve the one argument to an absolute path, refusing anything that is not a
// regular file inside this repo. Relative paths resolve against the repo root
// (not cwd) so the result does not depend on where the caller was standing.
function resolveTarget(arg) {
  if (typeof arg !== "string" || !arg.trim() || arg.includes("\0")) {
    throw new Fail("expected exactly one path argument");
  }
  const abs = path.resolve(ROOT, arg);
  if (!abs.startsWith(ROOT + path.sep)) throw new Fail(`refusing a path outside the repo: ${arg}`);

  let stat;
  try {
    stat = fs.lstatSync(abs);
  } catch {
    throw new Fail(`no such file: ${arg}`);
  }
  if (stat.isSymbolicLink()) throw new Fail(`refusing a symlink: ${arg}`);
  if (!stat.isFile()) throw new Fail(`not a regular file: ${arg}`);

  // Re-check after resolving the parent chain, so a symlinked directory cannot
  // smuggle the real file out of the repo.
  const realRoot = fs.realpathSync(ROOT);
  const real = fs.realpathSync(abs);
  if (!real.startsWith(realRoot + path.sep)) throw new Fail(`refusing a path outside the repo: ${arg}`);

  const rel = path.relative(ROOT, abs);
  const top = rel.split(path.sep)[0];
  if (FORBIDDEN_TOP.has(top)) throw new Fail(`refusing to touch ${top}/`);
  return { abs, rel };
}

// The key the site references the asset by (see assetKey/resolveKey in
// src/lib/content.ts): data/ assets keep their repo-relative path under a
// leading slash, public/ assets are served from the root with `public/` stripped.
function lqipKey(absPath) {
  const rel = path.relative(ROOT, absPath).split(path.sep).join("/");
  return rel.startsWith("public/") ? `/${rel.slice("public/".length)}` : `/${rel}`;
}

function siblingWithExt(absPath, ext) {
  const dir = path.dirname(absPath);
  const base = path.basename(absPath);
  const stem = base.slice(0, base.length - path.extname(base).length);
  return path.join(dir, stem + ext);
}

// A scratch name next to the destination: same filesystem (so the rename is
// atomic) but an extension no glob in the app matches, so a crashed run can
// never leave a half-written asset that the site would try to serve. The
// counter is load-bearing — two calls for the same destination in the same
// millisecond must not collide, or one encode silently overwrites the other.
let tempSeq = 0;
function tempFor(absPath) {
  return `${absPath}.optimizing-${process.pid}-${Date.now().toString(36)}-${tempSeq++}`;
}

async function publishTemp(tmp, dest) {
  await fs.promises.rename(tmp, dest);
}

function discard(file) {
  try {
    fs.unlinkSync(file);
  } catch {
    /* already gone */
  }
}

// ---- probing ----------------------------------------------------------------

async function probe(absPath, entries, stream) {
  const ffprobe = findBin("ffprobe");
  if (!ffprobe) return [];
  const args = ["-v", "error"];
  if (stream) args.push("-select_streams", stream);
  args.push("-show_entries", entries, "-of", "default=noprint_wrappers=1:nokey=1", absPath);
  try {
    const { stdout } = await run(ffprobe, args);
    return stdout.trim().split("\n").map((s) => s.trim());
  } catch {
    return [];
  }
}

async function videoDuration(absPath) {
  const [value] = await probe(absPath, "format=duration", null);
  const seconds = Number.parseFloat(value ?? "");
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

// A frame a little way in: the very first frame of a clip is often a fade-in or
// a black leader, which makes a useless placeholder.
async function placeholderOffset(absPath) {
  const duration = await videoDuration(absPath);
  return duration > 0 ? Math.min(1, duration * 0.25) : 0;
}

// ---- encoders ---------------------------------------------------------------

const EVEN_DIMS = "scale=trunc(iw/2)*2:trunc(ih/2)*2";

// -sharp_yuv matters on this site: it is mostly pixel art and UI captures, where
// the default chroma subsampling smears hard colour edges.
const CWEBP_LOSSY = ["-q", "82", "-m", "6", "-sharp_yuv"];
// -z 6 rather than -z 9: on a 1.6MP photo -z 9 costs twelve times the CPU for
// 0.08% less file, and an upload is blocking a person at a keyboard.
const CWEBP_LOSSLESS = ["-lossless", "-z", "6"];

async function encodeWebp(srcAbs, destAbs) {
  const cwebp = requireBin("cwebp");
  const isPng = path.extname(srcAbs).toLowerCase() === ".png";
  const attempts = [{ args: CWEBP_LOSSY, tmp: tempFor(destAbs) }];
  // Which mode wins is a property of the picture, not of the format, and the
  // gap is an order of magnitude either way: on flat pixel art and screenshots
  // lossless came out ~20x smaller than lossy, on a photographic cover lossy
  // came out ~12x smaller than lossless. So encode a PNG both ways and keep the
  // smaller file. JPEG input is already lossy, so only the lossy pass makes
  // sense there.
  if (isPng) attempts.push({ args: CWEBP_LOSSLESS, tmp: tempFor(destAbs) });

  try {
    for (const attempt of attempts) {
      await run(cwebp, ["-quiet", ...attempt.args, "-metadata", "none", srcAbs, "-o", attempt.tmp]);
      attempt.size = fs.statSync(attempt.tmp).size;
    }
    attempts.sort((a, b) => a.size - b.size);
    const [best, ...rest] = attempts;
    for (const loser of rest) discard(loser.tmp);
    await publishTemp(best.tmp, destAbs);
  } catch (err) {
    for (const attempt of attempts) discard(attempt.tmp);
    throw err;
  }
}

async function encodeMp4(srcAbs, destAbs) {
  const ffmpeg = requireBin("ffmpeg");
  // yuv420p + High profile + a web-safe level is the combination every browser
  // and the Vision Pro can decode; +faststart puts the moov atom first so
  // playback can begin before the file has finished downloading.
  // -f is explicit because every output here is a temp file whose extension is
  // deliberately NOT .mp4, so ffmpeg cannot infer the muxer from the name.
  const args = [
    "-v", "error", "-y", "-nostdin",
    "-i", srcAbs,
    "-map", "0:v:0", "-map", "0:a?",
    "-vf", EVEN_DIMS,
    "-c:v", "libx264", "-preset", "medium", "-crf", "22",
    "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    "-f", "mp4", destAbs,
  ];
  await run(ffmpeg, args);
}

async function remuxMp4(srcAbs, destAbs) {
  const ffmpeg = requireBin("ffmpeg");
  const args = [
    "-v", "error", "-y", "-nostdin",
    "-i", srcAbs,
    "-c", "copy", "-movflags", "+faststart",
    "-f", "mp4", destAbs,
  ];
  await run(ffmpeg, args);
}

async function encodeWebm(srcAbs, destAbs) {
  const ffmpeg = requireBin("ffmpeg");
  // VP9 in constant-quality mode (-b:v 0 with -crf). row-mt + cpu-used 2 keeps a
  // short clip inside doUpload's two-minute budget without visible cost.
  const args = [
    "-v", "error", "-y", "-nostdin",
    "-i", srcAbs,
    "-map", "0:v:0", "-map", "0:a?",
    "-vf", EVEN_DIMS,
    "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0",
    "-row-mt", "1", "-deadline", "good", "-cpu-used", "2",
    "-pix_fmt", "yuv420p",
    "-c:a", "libopus", "-b:a", "96k",
    "-f", "webm", destAbs,
  ];
  await run(ffmpeg, args);
}

// A tiny webp data URI. ffmpeg does the decoding and downscaling (it reads
// jpeg/png/gif/webp/avif and every video we accept), cwebp does the encoding,
// because ffmpeg on this machine has no webp encoder.
async function makePlaceholder(srcAbs, { isVideo }) {
  const ffmpeg = requireBin("ffmpeg");
  const cwebp = requireBin("cwebp");
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "optimize-media-"));
  const framePng = path.join(scratch, "frame.png");
  const tinyWebp = path.join(scratch, "tiny.webp");
  try {
    const args = ["-v", "error", "-y", "-nostdin"];
    if (isVideo) args.push("-ss", String(await placeholderOffset(srcAbs)));
    args.push(
      "-i", srcAbs,
      "-frames:v", "1",
      // -1 keeps the aspect ratio; PNG and WebP have no even-dimension rule.
      "-vf", `scale=${LQIP_WIDTH}:-1:flags=lanczos`,
      "-f", "image2", "-c:v", "png",
      framePng,
    );
    await run(ffmpeg, args);
    await run(cwebp, ["-quiet", "-q", "45", "-m", "6", framePng, "-o", tinyWebp]);
    return `data:image/webp;base64,${fs.readFileSync(tinyWebp).toString("base64")}`;
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

// ---- src/generated/lqip.ts --------------------------------------------------

const DEFAULT_HEADER =
  "// Generated blur-up placeholders, keyed by asset path. Written by\n" +
  "// scripts/optimize-media.mjs, one entry per processed asset.\n";

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Uploads arrive concurrently when someone drops several files at once, and each
// one is its own process, so the read-modify-write of lqip.ts needs a lock that
// lives outside this process.
function withLqipLock(fn) {
  const lockFile = `${LQIP_FILE}.lock`;
  const deadline = Date.now() + 20_000;
  let fd;
  for (;;) {
    try {
      fd = fs.openSync(lockFile, "wx");
      break;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      // A process killed mid-write would otherwise wedge every later upload.
      try {
        if (Date.now() - fs.statSync(lockFile).mtimeMs > 60_000) {
          fs.unlinkSync(lockFile);
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() > deadline) throw new Fail("timed out waiting for the lqip.ts lock");
      sleepSync(50);
    }
  }
  try {
    return fn();
  } finally {
    try {
      fs.closeSync(fd);
    } catch {
      /* ignore */
    }
    discard(lockFile);
  }
}

const ENTRY_RE = /"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;

function readEntries(raw) {
  const entries = new Map();
  const marker = raw.indexOf("export const LQIP");
  if (marker < 0) return { header: raw.trim() ? `${raw.trimEnd()}\n` : DEFAULT_HEADER, entries };
  const header = marker > 0 ? raw.slice(0, marker) : DEFAULT_HEADER;
  // Scan only the object literal, so nothing quoted in the file header can be
  // mistaken for an entry.
  const open = raw.indexOf("{", marker);
  const body = open < 0 ? "" : raw.slice(open);
  for (const [, key, value] of body.matchAll(ENTRY_RE)) {
    try {
      entries.set(JSON.parse(`"${key}"`), JSON.parse(`"${value}"`));
    } catch {
      /* skip an entry we cannot read rather than dropping the whole file */
    }
  }
  return { header, entries };
}

function mergeLqip(key, dataUri) {
  withLqipLock(() => {
    let raw = "";
    try {
      raw = fs.readFileSync(LQIP_FILE, "utf8");
    } catch {
      /* first run: write a fresh file */
    }
    const { header, entries } = readEntries(raw);
    entries.set(key, dataUri);
    const sorted = [...entries.keys()].sort();
    const body = sorted.length
      ? `export const LQIP: Record<string, string> = {\n` +
        sorted.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(entries.get(k))},`).join("\n") +
        `\n};\n`
      : `export const LQIP: Record<string, string> = {};\n`;
    fs.mkdirSync(path.dirname(LQIP_FILE), { recursive: true });
    const tmp = tempFor(LQIP_FILE);
    fs.writeFileSync(tmp, header + body);
    fs.renameSync(tmp, LQIP_FILE);
  });
}

// ---- the job ----------------------------------------------------------------

async function optimize(target) {
  const ext = path.extname(target.abs).toLowerCase();
  const produced = [];
  let primary = target.abs;
  let isVideo = false;

  if (IMAGE_TO_WEBP.has(ext)) {
    primary = siblingWithExt(target.abs, ".webp");
    await encodeWebp(target.abs, primary);
    produced.push(primary);
    if (path.resolve(primary) !== path.resolve(target.abs)) discard(target.abs);
  } else if (IMAGE_KEEP.has(ext)) {
    // Already a delivery format. Nothing to convert; it still needs a placeholder.
  } else if (VIDEO_TO_MP4.has(ext)) {
    isVideo = true;
    primary = siblingWithExt(target.abs, ".mp4");
    const tmp = tempFor(primary);
    try {
      await encodeMp4(target.abs, tmp);
      await publishTemp(tmp, primary);
    } catch (err) {
      discard(tmp);
      throw err;
    }
    produced.push(primary);
    if (path.resolve(primary) !== path.resolve(target.abs)) discard(target.abs);
    produced.push(await addWebmSibling(primary));
  } else if (ext === ".mp4") {
    isVideo = true;
    primary = target.abs;
    await normalizeMp4InPlace(primary);
    produced.push(primary);
    produced.push(await addWebmSibling(primary));
  } else if (VIDEO_KEEP.has(ext)) {
    isVideo = true;
    // Already a delivery format.
  } else {
    throw new Fail(`unsupported file type: ${ext || path.basename(target.abs)}`);
  }

  const key = lqipKey(primary);
  mergeLqip(key, await makePlaceholder(primary, { isVideo }));
  return { primary, produced, key };
}

// An uploaded mp4 is not necessarily web-ready: phones hand out HEVC, and a
// straight export usually leaves the moov atom at the end of the file. Re-mux
// when the streams are already fine, transcode only when they are not.
async function normalizeMp4InPlace(absPath) {
  const [codec, pixFmt] = await probe(absPath, "stream=codec_name,pix_fmt", "v:0");
  const deliverable = codec === "h264" && (pixFmt === "yuv420p" || pixFmt === "yuvj420p");
  const tmp = tempFor(absPath);
  try {
    if (deliverable) await remuxMp4(absPath, tmp);
    else await encodeMp4(absPath, tmp);
    await publishTemp(tmp, absPath);
  } catch (err) {
    discard(tmp);
    throw err;
  }
}

async function addWebmSibling(mp4Abs) {
  const dest = siblingWithExt(mp4Abs, ".webm");
  const tmp = tempFor(dest);
  try {
    await encodeWebm(mp4Abs, tmp);
    await publishTemp(tmp, dest);
  } catch (err) {
    discard(tmp);
    throw err;
  }
  return dest;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    throw new Fail("usage: node scripts/optimize-media.mjs <path relative to the repo root>");
  }
  const target = resolveTarget(args[0]);
  const { produced, key } = await optimize(target);
  const outputs = produced.length ? produced.map((p) => path.relative(ROOT, p)).join(", ") : "(unchanged)";
  process.stdout.write(`${target.rel} -> ${outputs}  [lqip ${key}]\n`);
}

main().catch((err) => {
  process.stderr.write(`optimize-media: ${err instanceof Fail ? err.message : String(err?.stack || err)}\n`);
  process.exit(1);
});
