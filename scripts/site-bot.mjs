// The site's Discord bot, and all it does:
//   - records new game releases on their pages and pushes them to main;
//   - announces those releases, and page changes from any push, in #website.
// It takes no requests and holds no queue. It posts through Discord's REST
// API, so it never connects to the gateway, and it works in its own clone,
// reset to origin/main before every pass, so nobody else's checkout matters.
// Vercel builds every push; a push that fails to build never goes live.
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { repoUpdateWatcher, applyRepoUpdates, releasesAnnouncement } from './repo-updates.mjs';
import { siteChangeWatcher } from './site-changes.mjs';
import { SITE } from './site-config.mjs';

const run = promisify(execFile);
const minutes = (name, fallback) => Number(process.env[name]) * 60_000 || fallback * 60_000;
const TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const CHANNEL = process.env.DISCORD_ADMIN_CHANNEL_ID || '1523871171551039649';
const SITE_REPO = process.env.DISCORD_SITE_REPO || 'RetroPortingToolKit/RetroPortingToolkit.com';
const STATE_DIR = process.env.DISCORD_AGENT_STATE_DIR || path.join(os.homedir(), 'Library/Application Support/RetroPortingToolkitDiscordAgent/state');
const CLONE = path.join(STATE_DIR, 'site-clone');
const HERE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
if (!TOKEN) throw new Error('DISCORD_BOT_TOKEN is required.');

/** Posts to a channel. Never throws: a missed announcement is logged, not fatal. */
async function send({ channelId, content }) {
  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST', signal: AbortSignal.timeout(20_000),
      headers: { authorization: `Bot ${TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ content: content.slice(0, 2000), allowed_mentions: { parse: [] } }),
    });
    if (!response.ok) console.error(`[site-bot] Discord answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
  } catch (error) { console.error('[site-bot] could not post', error); }
}

const git = (...args) => run('git', args, { cwd: CLONE, maxBuffer: 8 * 1024 * 1024 });

/** A clean copy of origin/main, whatever the last pass left behind. */
async function freshClone() {
  try { await fs.access(path.join(CLONE, '.git')); }
  catch {
    const { stdout } = await run('git', ['remote', 'get-url', 'origin'], { cwd: HERE });
    await run('git', ['clone', '--quiet', stdout.trim(), CLONE]);
  }
  await git('fetch', '--quiet', 'origin', 'main');
  await git('checkout', '--quiet', '-B', 'main', 'origin/main');
  await git('reset', '--quiet', '--hard', 'origin/main');
  await git('clean', '-fdq');
}

const releases = repoUpdateWatcher({ root: CLONE, stateDir: STATE_DIR, passTicks: 4 });

async function releasePass() {
  await freshClone();
  const updates = await releases.tick();
  if (!updates.length) return;
  const summary = await applyRepoUpdates({ root: CLONE, updates, siteUrl: SITE.url, git });
  console.log(`[site-bot] ${summary.split('\n').join(' | ')}`);
  const announce = updates.filter((update) => update.announce);
  if (announce.length) await send({ channelId: CHANNEL, content: releasesAnnouncement(announce, SITE.url) });
}

const changes = siteChangeWatcher({ repo: SITE_REPO, stateDir: STATE_DIR, send, channelId: CHANNEL, siteUrl: SITE.url });

/** Runs a pass now and then on a timer; one pass at a time, errors logged. */
function every(ms, name, pass) {
  let busy = false;
  const go = async () => {
    if (busy) return;
    busy = true;
    try { await pass(); } catch (error) { console.error(`[site-bot] ${name} failed`, error); } finally { busy = false; }
  };
  void go();
  setInterval(go, ms);
}

await fs.mkdir(STATE_DIR, { recursive: true, mode: 0o700 });
await freshClone();
await changes.start().catch((error) => console.error('[site-bot] site change watch failed', error));
every(minutes('DISCORD_REPO_UPDATE_POLL_MINUTES', 15), 'release pass', releasePass);
every(minutes('DISCORD_SITE_CHANGE_POLL_MINUTES', 30), 'site change pass', () => changes.tick());
console.log(`[site-bot] running; announcing in ${CHANNEL}`);
