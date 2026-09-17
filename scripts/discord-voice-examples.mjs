#!/usr/bin/env node
// Collects a few dozen of the owner's recent Discord messages as few-shot
// style examples for the answer lane. Written to the bridge's state directory,
// never to the repository: they are chat, not content. Usage:
//   DISCORD_BOT_TOKEN="$(security find-generic-password -s retroportingtoolkit-discord-bot -w)" node scripts/discord-voice-examples.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const GUILD = process.env.DISCORD_ALLOWED_GUILD_IDS?.split(',')[0]?.trim() || '1514467450429640824';
const OWNER = process.env.DISCORD_VOICE_USER_ID || '398336732287991808';
const STATE_DIR = process.env.DISCORD_AGENT_STATE_DIR || path.join(os.homedir(), 'Library/Application Support/RetroPortingToolkitDiscordAgent/state');
const LIMIT = Number(process.env.DISCORD_VOICE_EXAMPLES || 40);
if (!TOKEN) throw new Error('DISCORD_BOT_TOKEN is required.');
const h = { authorization: `Bot ${TOKEN}` };
const api = async (route) => { const r = await fetch(`https://discord.com/api/v10${route}`, { headers: h }); return r.ok ? r.json() : null; };

/** Short, plain lines: no links, code, mentions, or emoji-only reactions. */
export function usableExample(text) {
  const t = String(text).replace(/<@!?\d+>|<#\d+>|<@&\d+>/g, '').replace(/\s+/g, ' ').trim();
  if (t.length < 4 || t.length > 160) return null;
  if (/https?:\/\/|```|`/.test(t)) return null;
  if (!/[a-z]{3,}/i.test(t)) return null;
  return t;
}

const found = [];
for (const ch of ((await api(`/guilds/${GUILD}/channels`)) ?? []).filter((c) => c.type === 0)) {
  let before;
  for (let page = 0; page < 3; page++) {
    const msgs = await api(`/channels/${ch.id}/messages?limit=100${before ? `&before=${before}` : ''}`);
    if (!Array.isArray(msgs) || !msgs.length) break;
    for (const m of msgs) if (m.author.id === OWNER) { const t = usableExample(m.content); if (t) found.push({ t, at: m.timestamp }); }
    before = msgs.at(-1).id;
    if (msgs.length < 100) break;
    await new Promise((r) => setTimeout(r, 300));
  }
}
const examples = [...new Map(found.sort((a, b) => b.at.localeCompare(a.at)).map((e) => [e.t.toLowerCase(), e.t])).values()].slice(0, LIMIT);
await fs.mkdir(STATE_DIR, { recursive: true, mode: 0o700 });
await fs.writeFile(path.join(STATE_DIR, 'voice-examples.json'), JSON.stringify(examples, null, 2), { mode: 0o600 });
console.log(`${examples.length} examples written to ${path.join(STATE_DIR, 'voice-examples.json')}`);
