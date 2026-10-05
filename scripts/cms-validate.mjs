/** What the editor must refuse before it reaches main.
 *
 * The CMS commits straight to main, and every commit to main is a production
 * build. It validated YAML syntax and nothing else, so on 2026-10-03 a creator
 * editing their own page replaced a screenshot, left the old `![](./…)` line
 * behind, and seven commits later the repository's own checks were failing on
 * main. The bot runs those checks before it publishes, so it stopped — and
 * nothing could reach the site until a person looked.
 *
 * The bot cannot publish without passing the checks. The editor could not even
 * see them. These are the content rules that the checks enforce, applied at
 * the point the content is written rather than discovered afterwards.
 */

/** File types an item folder holds. The quoted form below is matched only for
 * these, so a save is never refused over a "./something" that is not an asset. */
const ASSET = /\.(png|jpe?g|webp|gif|avif|svg|mp4|webm|mov|m4v|pdf)$/i;

/** Co-located assets a page refers to: in markdown, in HTML, or as a quoted
 * frontmatter value such as `cover: "./shot.png"`. */
export function referencedAssets(body) {
  const text = String(body ?? "");
  const found = new Set();
  const add = (raw) => {
    let name;
    try { name = decodeURIComponent(raw); } catch { name = raw; }
    found.add(name);
  };
  for (const m of text.matchAll(/!\[[^\]]*\]\(\s*\.\/([^)\s"']+)/g)) add(m[1]);
  for (const m of text.matchAll(/(?:src|href)\s*=\s*["']\.\/([^"']+)["']/g)) add(m[1]);
  for (const m of text.matchAll(/["']\.\/([^"'\s]+)["']/g)) if (ASSET.test(m[1])) add(m[1]);
  return [...found];
}

/** Those the folder does not actually hold. `present` is the item's own files,
 * named relative to its folder, which is what the CMS's asset list gives. */
export function missingAssets(body, present = []) {
  const have = new Set(present.map((p) => String(p).replace(/^\.\//, "")));
  return referencedAssets(body).filter((ref) => !have.has(ref));
}

/** The one-line refusal an editor sees, or null when the page is publishable.
 *
 * It names the file and says what to do, because the person reading it is a
 * creator editing their own page, not someone who can read a test failure.
 */
export function contentProblem({ body, assets = [], frontmatter = "" }) {
  const missing = missingAssets(`${frontmatter}\n${body}`, assets);
  if (missing.length) {
    const names = missing.slice(0, 3).join(", ");
    const rest = missing.length - Math.min(missing.length, 3);
    return `This page points at ${missing.length === 1 ? "an image" : "images"} that ${missing.length === 1 ? "is" : "are"} not on it: ${names}${rest > 0 ? ` and ${rest} more` : ""}. Upload ${missing.length === 1 ? "it" : "them"}, or remove the line that uses ${missing.length === 1 ? "it" : "them"}, and save again.`;
  }
  return null;
}
