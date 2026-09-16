import team from "@data/team.json";
import { teamMemberByName } from "../../scripts/authors.mjs";
import type { Creator, Item } from "./types";

/** The code-host owner of a repository URL, or null for anything else. */
export function repoOwner(repo?: string): { github?: string; gitlab?: string } | null {
  const m = repo?.match(/^https:\/\/(github|gitlab)\.com\/([^/\s]+)\/[^/\s]+/i);
  if (!m) return null;
  return m[1].toLowerCase() === "github" ? { github: m[2] } : { gitlab: m[2] };
}

/** The person behind a page. A page's own `creator` wins; then the first
    stated author's handles in data/team.json; then the repository owner of a
    community project. The site-wide default author is never a creator. */
export function creatorOf(item: Item): Creator | null {
  if (item.creator) return item.creator;
  const named = item.authors?.length ? item.authors : item.author ? [item.author] : [];
  const member = named.map((name) => teamMemberByName(team, name)).find(Boolean);
  if (member) {
    const handle = (label: string) => member.handles?.find((h) => h.label === label)?.value?.split(/[\s,]/)[0]?.replace(/^@/, "");
    const creator = { github: handle("GitHub"), discord: handle("Discord") };
    if (creator.github || creator.discord) return creator;
  }
  if (item.provenance !== "core") return repoOwner(item.repo);
  return null;
}

export function creatorLogin(creator: Creator): string {
  return (creator.github ?? creator.gitlab ?? creator.discord ?? "").toLowerCase();
}

export function creatorProfile(creator: Creator): string {
  if (creator.github) return `https://github.com/${creator.github}`;
  if (creator.gitlab) return `https://gitlab.com/${creator.gitlab}`;
  return "";
}

/** Where a project's builds are: an explicit `download`, else the host's releases page. */
export function downloadUrl(item: Item): string | null {
  if (item.download) return item.download;
  if (!item.repo) return null;
  if (/^https:\/\/github\.com\//.test(item.repo)) return `${item.repo.replace(/\/$/, "")}/releases`;
  if (/^https:\/\/gitlab\.com\//.test(item.repo)) return `${item.repo.replace(/\/$/, "")}/-/releases`;
  return null;
}

export interface CreatorEntry { login: string; creator: Creator; items: Item[] }

/** Every creator with a page, most pages first, then alphabetically. */
export function creatorsIndex(items: Item[]): CreatorEntry[] {
  const map = new Map<string, CreatorEntry>();
  for (const item of items) {
    if (item.draft) continue;
    const creator = creatorOf(item);
    if (!creator) continue;
    const login = creatorLogin(creator);
    if (!login) continue;
    const entry = map.get(login) ?? { login, creator, items: [] };
    // Fill in what a later page knows, such as a Discord name.
    entry.creator = { ...entry.creator, ...Object.fromEntries(Object.entries(creator).filter(([, v]) => v)) };
    entry.items.push(item);
    map.set(login, entry);
  }
  return [...map.values()].sort((a, b) => b.items.length - a.items.length || a.login.localeCompare(b.login));
}
