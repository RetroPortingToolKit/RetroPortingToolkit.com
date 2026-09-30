/** Which of a repository's releases is the one a game page should carry.
 *
 * The watcher used to take the first entry of GitHub's releases feed. That is
 * not the latest release and not even the newest by date: on 2026-09-29 the
 * Mega Man X page was moved from v1.6.6 to zero-v0.0.1, an X3 mod published
 * from the same repository, and its download button pointed at the mod. The
 * WarioWare feed lists android-v0.0.1 (August 2) ahead of v0.0.1 (August 29),
 * so feed order is not date order either, and Ruby & Sapphire's oldest entry
 * carries the newest <updated> because its notes were edited later. Dates
 * cannot decide this. Versions can, so tags are ranked and nothing else is.
 */

/** A tag's version, or null when this tag is not a version of anything.
 *
 * The rule is the anchor, not a list of bad words: a release tag starts with
 * an optional v and then digits. That single property rejects zero-v0.0.1,
 * android-v0.0.1, shared-staging-20260903, ws-baseline-prehistory, seam-good
 * and backup/pre-gbrecomp-merge, without the watcher having to know what any
 * of them mean. Do not loosen it into keyword matching: an unranked tag is
 * left alone, which is safe, while a mis-ranked one rewrites a live page.
 */
export function releaseRank(tag) {
  const t = String(tag ?? "").trim();
  if (!t || t.includes("/") || /%2f/i.test(t)) return null;
  const m = /^([vV]?)(\d+(?:\.\d+)*)(.*)$/.exec(t);
  if (!m) return null;
  const parts = m[2].split(".").map(Number);
  // A date is not a version. 2026.04.20 would outrank every real release
  // forever; 20260903 is the tail of a staging tag that lost its prefix.
  if (!m[1] && parts.length > 1 && parts[0] >= 1000) return null;
  if (parts.length === 1 && parts[0] >= 100_000) return null;
  return { parts, suffix: m[3] };
}

/** Componentwise, as integers: 0.1.20 is above 0.1.19, and v1.0 equals v1.0.0. */
export function compareParts(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** The trailing integer of a suffix, and the suffix without it: -build.7 and
 * -build.8 are the same series, -rc1 and -linux are not. */
const stem = (suffix) => suffix.replace(/\d+$/, "");
const trail = (suffix) => {
  const m = /(\d+)$/.exec(suffix);
  return m ? Number(m[1]) : null;
};

function compareCandidates(a, b) {
  const byParts = compareParts(a.rank.parts, b.rank.parts);
  if (byParts) return byParts;
  // At the same version a bare tag is the release and a suffixed one is a
  // variant of it: v1.7.0 over v1.7.0-hd, v0.0.10 over v0.0.10-ita.1.
  const bare = Number(Boolean(b.rank.suffix)) - Number(Boolean(a.rank.suffix));
  if (bare) return bare;
  if (a.rank.suffix && b.rank.suffix && stem(a.rank.suffix) === stem(b.rank.suffix)) {
    const d = (trail(a.rank.suffix) ?? -1) - (trail(b.rank.suffix) ?? -1);
    if (d) return d > 0 ? 1 : -1;
  }
  // Feed position, never the publish date.
  return b.index - a.index;
}

/** Tags people use for builds that are not the release yet. Consulted only to
 * decide whether replacing one is a correction or a downgrade — never to pick. */
const PRERELEASE = /(^|[^0-9a-z])(rc|alpha|beta|pre|preview|dev|nightly|snapshot|wip|experimental|unstable|candidate)([^0-9a-z]|\d|$)/i;

export function isPrerelease(tag) {
  const rank = releaseRank(tag);
  return Boolean(rank && PRERELEASE.test(rank.suffix));
}

/** The release to use out of every entry in the feed, or null when not one of
 * them can be ranked. Returning null holds the page as it is, which is the
 * right answer for a repository that publishes only staging artifacts.
 *
 * A tag with no suffix at all is the release; everything else is a variant of
 * one — a release candidate, a platform build, a backup. So the unsuffixed
 * tags are considered first, and the rest only when a repository has never
 * published one. On 2026-09-30 the watcher put v1.7.0-rc.1 on the Mega Man X
 * page and announced it, and its author had not meant to make it public yet.
 *
 * Asking "is this a prerelease" instead would have been worse: Tomba has
 * published nothing but -alpha, and its next-best tag is a -bak backup.
 */
export function pickRelease(list) {
  const candidates = (list ?? [])
    .map((entry, index) => ({ ...entry, index, rank: releaseRank(entry.tag) }))
    .filter((c) => c.rank);
  if (!candidates.length) return null;
  const released = candidates.filter((c) => !c.rank.suffix);
  const pool = released.length ? released : candidates;
  let best = pool[0];
  for (const c of pool.slice(1)) if (compareCandidates(c, best) > 0) best = c;
  const { index, rank, ...entry } = best;
  return entry;
}

/** What to do with a pick, given what the page already says.
 *
 * This is the invariant, and it is deliberately stricter than the selection
 * above: the only thing that happens automatically is a version going up.
 * Everything else is left for a person, because the failure being prevented
 * here is a live page losing its real release.
 *
 *   write  — put the pick on the page
 *   seen   — the page is already right
 *   review — leave the page alone; a person decides
 */
export function releaseDecision({ recorded, recordedUrl, pick, feedTags = [] }) {
  if (!pick?.tag) return "review";
  if (!recorded) return "write"; // first sighting: nothing to protect
  if (recorded === pick.tag) return recordedUrl === pick.url ? "seen" : "write";

  const rec = releaseRank(recorded);
  const cand = releaseRank(pick.tag);
  if (rec && cand) {
    // Taking a release candidate back off a page is a correction, not a
    // downgrade, even though the number goes down: the watcher published it
    // and should be able to undo that. Only for a prerelease, and only when
    // the tag came from this feed — a platform build like -linux, or a
    // -build.7 series, is a real release and stays until a person says
    // otherwise.
    if (!cand.suffix && PRERELEASE.test(rec.suffix) && feedTags.includes(recorded)) return "write";
    const byParts = compareParts(cand.parts, rec.parts);
    if (byParts > 0) return "write";
    if (byParts === 0 && rec.suffix && cand.suffix && stem(rec.suffix) === stem(cand.suffix)) {
      // The same series moving on: v1.0.0-build.7 to -build.8, -rc1 to -rc2.
      if ((trail(cand.suffix) ?? -1) > (trail(rec.suffix) ?? -1)) return "write";
    }
    return "review"; // a downgrade, or sideways between variants
  }
  // The page carries something unrankable. If it is a tag still in the feed,
  // the watcher put it there itself and may correct it. If it is not, a person
  // wrote it by hand and it is not the watcher's to overwrite.
  if (!rec && feedTags.includes(recorded)) return "write";
  return "review";
}

/** Whether a release is news, as opposed to the watcher catching up.
 *
 * Repairing a page must not announce a build from July as new. The version
 * read here is deliberately lenient — it finds 0.0.1 inside android-v0.0.1 —
 * because the question is "is this actually newer than what we announced",
 * and a variant tag we announced by mistake still tells us where we were.
 */
export function looseVersion(tag) {
  const t = String(tag ?? "");
  const m = /(\d+(?:\.\d+)+)/.exec(t) ?? /v(\d{1,5})(?!\d)/i.exec(t);
  return m ? m[1].split(".").map(Number) : null;
}

export function isNewsRelease(before, release) {
  if (!before?.tag || !release?.tag) return false;
  if (before.tag === release.tag) return false;
  const was = looseVersion(before.tag);
  const now = looseVersion(release.tag);
  // A version that did not go up is a correction, whatever its date says.
  if (was && now && compareParts(now, was) <= 0) return false;
  // And a build published before the one we already knew about is not news.
  if (before.at && release.date && release.date < before.at) return false;
  return true;
}
