#!/usr/bin/env node
// Grants the "RPTK contributor" Discord role to everyone who owns a GitHub
// repository the site tracks. Runs from the command line, and hourly inside
// the bridge on a timer. It is deliberately NOT part of the bot's message or
// reaction handling: the bot's role carries Administrator and no Discord
// message may ever trigger an admin action. Usage:
//
//   DISCORD_BOT_TOKEN="$(security find-generic-password -s retroportingtoolkit-discord-bot -w)" \
//   node scripts/discord-contributor-roles.mjs [--dry-run] [--announce <channel-id>]
//
// Owners come from every live games/hardware page's `repo:`; Discord members
// are matched by the page's creator.discord, the team roster's Discord handle,
// or a username / display name equal to the GitHub login.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ROLE_NAME = 'RPTK contributor';
const ROLE_COLOR = 0xd4af37; // gold
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export function trackedOwners(root = ROOT) {
  const team = JSON.parse(fs.readFileSync(path.join(root, 'data/team.json'), 'utf8'));
  const teamDiscord = new Map(team.members.map((m) => [m.handles?.find((h) => h.label === 'GitHub')?.value?.split(/[\s,]/)[0]?.toLowerCase(), m.handles?.find((h) => h.label === 'Discord')?.value?.split(/[\s,]/)[0]]).filter(([k, v]) => k && v));
  const owners = new Map();
  for (const kind of ['games', 'hardware']) {
    for (const folder of fs.readdirSync(path.join(root, 'data', kind))) {
      const file = path.join(root, 'data', kind, folder, 'index.md');
      if (!fs.existsSync(file)) continue;
      const fm = fs.readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
      if (/^draft:\s*true/m.test(fm)) continue;
      const owner = fm.match(/^repo:\s*["']?https:\/\/github\.com\/([^/\s"']+)\//m)?.[1];
      if (!owner) continue;
      const key = owner.toLowerCase();
      const entry = owners.get(key) ?? { login: owner, pages: 0, hints: new Set([owner]) };
      entry.pages += 1;
      const discord = fm.match(/^creator:.*discord["']?\s*:\s*["']?([^"',}\n]+)/m)?.[1];
      if (discord) entry.hints.add(discord.trim());
      if (teamDiscord.get(key)) entry.hints.add(teamDiscord.get(key));
      owners.set(key, entry);
    }
  }
  return [...owners.values()];
}

/** Grants the role to every tracked owner on the server who lacks it.
 * Returns { added: [memberIds], missing: [logins] }. */
export async function syncContributorRoles({ token, guild, root = ROOT, announceChannelId = '', dryRun = false, log = () => {}, fetcher = fetch }) {
  if (!token) throw new Error('A bot token is required.');
  const api = async (route, init = {}) => {
    const r = await fetcher(`https://discord.com/api/v10${route}`, { ...init, headers: { authorization: `Bot ${token}`, 'content-type': 'application/json', ...(init.headers || {}) } });
    if (r.status === 429) { const j = await r.json(); await pause((j.retry_after ?? 1) * 1000 + 100); return api(route, init); }
    if (!r.ok) throw new Error(`${init.method || 'GET'} ${route}: ${r.status} ${await r.text()}`);
    return r.status === 204 ? null : r.json();
  };
  const findMember = async (hints) => {
    for (const hint of hints) {
      const found = await api(`/guilds/${guild}/members/search?query=${encodeURIComponent(hint)}&limit=10`);
      await pause(400);
      const want = hint.toLowerCase();
      const hit = found.find((m) => [m.user.username, m.user.global_name, m.nick].filter(Boolean).some((n) => n.toLowerCase() === want));
      if (hit) return hit;
    }
    return null;
  };
  const roles = await api(`/guilds/${guild}/roles`);
  let role = roles.find((r) => r.name === ROLE_NAME);
  if (!role) {
    if (dryRun) log(`would create role ${ROLE_NAME}`);
    else { role = await api(`/guilds/${guild}/roles`, { method: 'POST', body: JSON.stringify({ name: ROLE_NAME, color: ROLE_COLOR, hoist: false, mentionable: false, permissions: '0' }) }); log(`created role ${ROLE_NAME} (${role.id})`); }
  }
  const added = [];
  const missing = [];
  for (const owner of trackedOwners(root)) {
    const member = await findMember(owner.hints);
    if (!member) { missing.push(owner.login); log(`${owner.login}: no Discord member found (${[...owner.hints].join(', ')})`); continue; }
    const has = role && member.roles.includes(role.id);
    if (has) continue;
    log(`${owner.login} (${owner.pages} page${owner.pages === 1 ? '' : 's'}): ${member.user.username} ${dryRun ? 'would get the role' : 'granted'}`);
    if (dryRun) continue;
    await api(`/guilds/${guild}/members/${member.user.id}/roles/${role.id}`, { method: 'PUT' });
    await pause(400);
    added.push(member.user.id);
  }
  if (announceChannelId && added.length && !dryRun) {
    const content = `${added.map((id) => `<@${id}>`).join(' ')} you now have the **${ROLE_NAME}** role: you each maintain a project the site tracks. Thanks for building these.`;
    await api(`/channels/${announceChannelId}/messages`, { method: 'POST', body: JSON.stringify({ content, allowed_mentions: { users: added }, flags: 4 }) });
    log(`announced in ${announceChannelId}`);
  }
  return { added, missing };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dryRun = process.argv.includes('--dry-run');
  const announceChannelId = process.argv.includes('--announce') ? process.argv[process.argv.indexOf('--announce') + 1] : '';
  await syncContributorRoles({
    token: process.env.DISCORD_BOT_TOKEN || '', guild: process.env.DISCORD_ALLOWED_GUILD_IDS?.split(',')[0]?.trim() || '1514467450429640824',
    announceChannelId, dryRun, log: console.log,
  });
}
