// Who wrote a post, in one place.
//
// A post names its authors in frontmatter as `authors: ["Shokunin", "Matthew
// Stanley"]` — a list of team names exactly as data/team.json spells them. The
// older single `author: "Shokunin"` is still read, so nothing already published
// changes. Every consumer — the page, the feeds, the structured data, both CMS
// servers and the Discord bot — goes through this file, because the last time
// two of them described the same field in their own words it took three bugs
// to notice (see the CMS note in AGENTS.md).
//
// Plain ESM with a .d.mts beside it, the pattern site-config.mjs and
// vite-prerender.mjs already use, so the build scripts, the API function and the
// client can all import the same code.

const members = (team) => (Array.isArray(team) ? team : team?.members ?? []);

/** The authors a frontmatter object names, oldest field included; never a handle. */
export function authorsOf(fm, fallback = "") {
  const listed = Array.isArray(fm?.authors)
    ? fm.authors.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim())
    : [];
  if (listed.length) return [...new Set(listed)];
  if (typeof fm?.author === "string" && fm.author.trim()) return [fm.author.trim()];
  return fallback ? [fallback] : [];
}

/** "Shokunin" / "Shokunin and Matthew Stanley" / "A, B and C". */
export function authorsLine(names) {
  const list = (names ?? []).filter(Boolean);
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

// A handle field in team.json is prose as often as it is a handle
// ("wretched99, also known as CobaltCryptid"), so match on its words.
const tokens = (value) =>
  String(value ?? "")
    .toLowerCase()
    .split(/also known as|[\s,;/()]+/)
    .map((t) => t.trim().replace(/^@/, ""))
    .filter(Boolean);
const handles = (member, label) =>
  (member.handles ?? []).filter((h) => h.label === label).flatMap((h) => tokens(h.value));
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/^@/, "");

export function teamMemberByDiscord(team, username) {
  const want = norm(username);
  if (!want) return null;
  return members(team).find((m) => handles(m, "Discord").includes(want)) ?? null;
}

export function teamMemberByGithub(team, login) {
  const want = norm(login);
  if (!want) return null;
  return members(team).find((m) => handles(m, "GitHub").includes(want)) ?? null;
}

export function teamMemberByName(team, name) {
  const want = norm(name);
  if (!want) return null;
  return members(team).find((m) => norm(m.name) === want || norm(m.slug) === want) ?? null;
}

/**
 * Turn whatever someone typed — a name in the wrong case, a Discord handle, a
 * GitHub login — into the team's spelling of it. A name that matches nobody is
 * kept as written: a guest author is allowed, a mangled team member is not.
 */
export function canonicalAuthors(team, names) {
  const out = [];
  for (const raw of names ?? []) {
    const name = String(raw ?? "").trim();
    if (!name) continue;
    const member = teamMemberByName(team, name) ?? teamMemberByDiscord(team, name) ?? teamMemberByGithub(team, name);
    const canonical = member ? member.name : name;
    if (!out.includes(canonical)) out.push(canonical);
  }
  return out;
}

/** The /team anchor for a name, or null for a guest. */
export function teamSlugFor(team, name) {
  return teamMemberByName(team, name)?.slug ?? null;
}

/** One line per member, for a prompt: who they are and how they are known. */
export function rosterLines(team) {
  return members(team).map((m) => {
    const known = (m.handles ?? []).map((h) => `${h.label} ${h.value}`).join("; ");
    return `${m.name}${known ? ` — ${known}` : ""}`;
  });
}
