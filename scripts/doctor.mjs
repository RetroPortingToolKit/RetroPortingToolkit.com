#!/usr/bin/env node
// One command that says why the Discord bridge is not publishing.
//
//   npm run doctor          full report, runs the checks (~2 min)
//   npm run doctor -- --quick   skips the checks
//
// Written after 2026-09-19, when a test that depended on the machine's
// timezone started failing, every publishing job died holding a half-written
// page, one leftover file parked every job behind it, and the only symptom
// anyone saw was a stream of "Blocked." messages in Discord. Each check below
// prints what to do about it, so the next occurrence is one command long.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_DIR = process.env.DISCORD_AGENT_STATE_DIR
  || path.join(os.homedir(), 'Library/Application Support/RetroPortingToolkitDiscordAgent/state');
const LOG_DIR = path.join(os.homedir(), 'Library/Logs/RetroPortingToolkitDiscordAgent');
const quick = process.argv.includes('--quick');

const run = async (cmd, args, opts = {}) => {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, { cwd: ROOT, maxBuffer: 16 * 1024 * 1024, ...opts });
    return { ok: true, out: `${stdout}${stderr}` };
  } catch (error) {
    return { ok: false, out: `${error.stdout ?? ''}${error.stderr ?? ''}${error.message ?? ''}` };
  }
};
const readJson = async (file, fallback) => {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
};

const report = [];
const ok = (name, detail = '') => report.push({ level: 'ok', name, detail });
const warn = (name, detail, action) => report.push({ level: 'warn', name, detail, action });
const bad = (name, detail, action) => report.push({ level: 'bad', name, detail, action });

/** The one that matters: a dirty tree parks every job the bridge has. */
export async function checkoutState() {
  const status = await run('git', ['--no-optional-locks', 'status', '--porcelain']);
  const branch = (await run('git', ['rev-parse', '--abbrev-ref', 'HEAD'])).out.trim();
  const ahead = (await run('git', ['rev-list', '--count', '@{u}..HEAD'])).out.trim();
  const behind = (await run('git', ['rev-list', '--count', 'HEAD..@{u}'])).out.trim();
  return { dirty: status.out.split('\n').filter(Boolean), branch, ahead: Number(ahead) || 0, behind: Number(behind) || 0 };
}

/** Releases the watcher has published that a page never received. */
export async function staleReleases(root = ROOT, stateDir = STATE_DIR) {
  const seen = (await readJson(path.join(stateDir, 'repo-updates.json'), { seen: {} })).seen ?? {};
  const out = [];
  const gamesDir = path.join(root, 'data/games');
  for (const folder of await fs.readdir(gamesDir).catch(() => [])) {
    const file = path.join(gamesDir, folder, 'index.md');
    const raw = await fs.readFile(file, 'utf8').catch(() => null);
    if (!raw) continue;
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    if (/^draft:\s*true/m.test(fm)) continue;
    const field = (name) => fm.match(new RegExp(`^${name}:\\s*["']?(.*?)["']?\\s*$`, 'm'))?.[1] ?? '';
    // The watcher keys its memory by the lowercased URL, so looking it up with
    // the page's own casing quietly found nothing and reported every page
    // clean: 19 of 61 pages were invisible to this check.
    const repo = field('repo').replace(/\/$/, '').toLowerCase();
    const recorded = seen[repo]?.tag;
    if (repo && recorded && recorded !== field('release')) {
      out.push(`${field('title') || folder}: page has ${field('release') || '(none)'}, watcher saw ${recorded}`);
    }
  }
  return out;
}

async function main() {
  // --- the checkout
  const git = await checkoutState();
  if (git.branch !== 'main') warn('branch', `on ${git.branch}`, 'The bridge publishes from main. Switch back with: git switch main');
  if (git.dirty.length) {
    bad('working tree', `${git.dirty.length} uncommitted file(s):\n    ${git.dirty.join('\n    ')}`,
      'Every bot job waits for a clean tree, so this parks all of them. Commit it, or discard with: git checkout HEAD -- <path>');
  } else ok('working tree', 'clean');
  if (git.ahead) bad('unpushed commits', `${git.ahead} commit(s) not on origin`, 'The site never rebuilds from these. Push with: git push origin main');
  else if (git.behind) warn('behind origin', `${git.behind} commit(s)`, 'Run: git pull --ff-only');
  else ok('origin', 'in sync');

  // --- the checks, which every publishing job must pass before it can commit
  const busy = (await readJson(path.join(STATE_DIR, 'jobs.json'), null))?.active?.request;
  if (quick) warn('checks', 'skipped (--quick)', 'Run npm run doctor without --quick before trusting a green report.');
  else if (busy) {
    // Two builds in one checkout collide, and the bridge reads that as a
    // broken site: running the doctor during a job is what triggered the
    // false "publishing is stopped" alert on 2026-09-21.
    warn('checks', `skipped: the bridge is running "${busy}"`,
      'Running them now would collide with it in the same checkout. Wait for the queue to be idle, then run again.');
  } else {
    for (const check of ['typecheck', 'build', 'test']) {
      const result = await run('npm', ['run', check]);
      if (result.ok) { ok(`npm run ${check}`, 'passes'); continue; }
      const failing = result.out.split('\n').filter((l) => /FAIL|error|✕|×/.test(l)).slice(0, 6).join('\n    ');
      bad(`npm run ${check}`, failing || 'failed',
        'No bot job can commit while this fails, and each one dies holding the page it wrote. Fix this first.');
      break; // the first failing check is the one to fix
    }
  }

  // --- the bridge process and its queue
  const alive = await run('pgrep', ['-f', 'discord-agent.mjs']);
  if (alive.ok && alive.out.trim()) ok('bridge process', `pid ${alive.out.trim().split('\n')[0]}`);
  else bad('bridge process', 'not running', `Start it with: launchctl kickstart -k gui/$(id -u)/com.retroportingtoolkit.discord-agent`);

  const jobs = await readJson(path.join(STATE_DIR, 'jobs.json'), null);
  if (!jobs) warn('queue', 'no jobs.json yet', 'Normal before the bridge has run once.');
  else {
    const queued = jobs.queued?.length ?? 0;
    const active = jobs.active?.request;
    if (active) ok('queue', `running: ${active}${queued ? ` (+${queued} queued)` : ''}`);
    else if (queued) warn('queue', `${queued} waiting, nothing running`, 'Usually the tree is dirty. See the working tree check above.');
    else ok('queue', 'idle');
  }

  // --- releases the watcher believes it has delivered but no page carries
  const stale = await staleReleases();
  if (stale.length) warn('release pages', stale.join('\n    '),
    'These are re-detected on the next tick now. If they persist, the release job is failing: check npm run test.');
  else ok('release pages', 'every page matches what the watcher recorded');

  // --- recent trouble in the log
  const stderr = await fs.readFile(path.join(LOG_DIR, 'stderr.log'), 'utf8').catch(() => '');
  const recent = stderr.split('\n').filter((l) => /scheduled job failed|could not|Command failed|blocked after/.test(l)).slice(-3);
  if (recent.length) warn('recent errors', recent.map((l) => l.slice(0, 160)).join('\n    '), `Full log: ${path.join(LOG_DIR, 'stderr.log')}`);
  else ok('recent errors', 'none in the log');

  // --- the environment that broke it last time
  ok('timezone', `${Intl.DateTimeFormat().resolvedOptions().timeZone}; tests pinned to TZ=UTC`);

  const mark = { ok: '  ok  ', warn: ' warn ', bad: ' FAIL ' };
  console.log('');
  for (const line of report) {
    console.log(`[${mark[line.level]}] ${line.name}${line.detail ? `: ${line.detail}` : ''}`);
    if (line.action) console.log(`           → ${line.action}`);
  }
  const failed = report.filter((l) => l.level === 'bad');
  console.log(`\n${failed.length ? `${failed.length} problem(s) stopping the bridge.` : 'The bridge can publish.'}\n`);
  process.exitCode = failed.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
