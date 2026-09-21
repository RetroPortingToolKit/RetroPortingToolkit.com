import fs from 'node:fs/promises';
import path from 'node:path';
import { addUpdate } from './page-updates.mjs';
import { teamMemberByGithub } from './authors.mjs';
import { plainText } from './submissions.mjs';
import { rollbackOnFailure, pushPending } from './checkout.mjs';

/** A page's creator updating it from Discord:
 *   @Bot update /games/lufia2snesrecomp-1bdbebef status: Playable; news: Saves now work.
 * Fields: status, description, news (also "what's new" or "update"). The
 * author must be the page's Discord creator, or the team member who owns its
 * repository. Nothing here runs an agent; the edit is a frontmatter rewrite. */
export function parseOwnerRequest(text) {
  const m = text.trim().match(/^update\s+(?:my\s+page\s+)?(?:<?https?:\/\/[^\s/]+)?\/?games\/([a-z0-9-]+)>?\s*[:,]?\s*([\s\S]*)$/i);
  if (!m) return null;
  const fields = {};
  const body = m[2].replace(/\r/g, '');
  for (const part of body.split(/\n|;/)) {
    const f = part.match(/^\s*(status|description|desc|news|what'?s new|update|note)\s*:\s*(.+)$/i);
    if (!f) continue;
    const key = /^(status)$/i.test(f[1]) ? 'status' : /^(desc|description)$/i.test(f[1]) ? 'description' : 'note';
    fields[key] = plainText(f[2], key === 'description' ? 500 : key === 'status' ? 60 : 300);
  }
  if (!Object.keys(fields).length) return null;
  return { slug: m[1], ...fields };
}

export async function findGamePage(root, slug) {
  const dir = path.join(root, 'data/games');
  for (const folder of await fs.readdir(dir).catch(() => [])) {
    if (folder.replace(/^\d+_/, '') === slug) return `data/games/${folder}/index.md`;
  }
  return null;
}

/** Is this Discord user the page's creator? Case-insensitive on names. */
export async function isPageOwner(root, raw, username) {
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const want = String(username || '').toLowerCase();
  if (!want) return false;
  const discord = fm.match(/^creator:.*discord["']?\s*:\s*["']?([^"',}\n]+)/m)?.[1] ?? fm.match(/^\s+discord:\s*["']?([^"'\n]+)/m)?.[1];
  if (discord && discord.trim().toLowerCase() === want) return true;
  const owner = fm.match(/^repo:\s*["']?https:\/\/github\.com\/([^/\s"']+)\//m)?.[1];
  if (!owner) return false;
  try {
    const team = JSON.parse(await fs.readFile(path.join(root, 'data/team.json'), 'utf8'));
    const member = teamMemberByGithub(team, owner);
    return Boolean(member?.handles?.some((h) => h.label === 'Discord' && String(h.value).toLowerCase().split(/[\s,]+/).map((v) => v.replace(/^@/, '')).includes(want)));
  } catch { return false; }
}

function setScalar(fm, key, value) {
  const line = `${key}: ${JSON.stringify(value)}`;
  const re = new RegExp(`^${key}:.*$`, 'm');
  return re.test(fm) ? fm.replace(re, line) : `${fm.replace(/\s+$/, '')}\n${line}`;
}

export function ownerUpdatedPage(raw, update) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('The page has no frontmatter.');
  let fm = match[1];
  if (update.status) fm = setScalar(fm, 'status', update.status);
  if (update.description) fm = setScalar(fm, 'desc', update.description);
  if (update.note) fm = addUpdate(fm, update.note, update.date);
  fm = setScalar(fm, 'updated', update.date ?? new Date().toISOString().slice(0, 10));
  return raw.replace(match[0], `---\n${fm}\n---`);
}

export async function applyOwnerUpdate({ root, update, exec, siteUrl = '' }) {
  if (!/^data\/games\/[^/]+\/index\.md$/.test(update.path)) throw new Error('Invalid page path.');
  await exec('git', ['pull', '--ff-only']);
  await pushPending(exec);
  const written = [];
  await rollbackOnFailure(exec, written, async () => {
    const target = path.join(root, update.path);
    const raw = await fs.readFile(target, 'utf8');
    const next = ownerUpdatedPage(raw, update);
    await fs.writeFile(target, next);
    written.push(update.path);
    for (const check of ['typecheck', 'build', 'test']) await exec('npm', ['run', check]);
    await exec('git', ['add', '--', update.path]);
    await exec('git', ['-c', 'user.name=Shokunin', '-c', 'user.email=30949000+tetrisgm@users.noreply.github.com', 'commit', '-m', `Update ${update.title} from its creator on Discord`]);
    written.length = 0; // committed: a failed push must not undo the work
    await exec('git', ['push', 'origin', 'main']);
  });
  const changed = [update.status && `status: ${update.status}`, update.description && 'description', update.note && `note: “${update.note}”`].filter(Boolean).join(', ');
  return `${update.title} updated (${changed}). Live within a couple of minutes: ${siteUrl}/games/${update.slug}`;
}
