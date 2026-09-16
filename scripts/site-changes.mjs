import fs from 'node:fs/promises';
import path from 'node:path';

/** Watches the site repository's main branch and reports each batch of new
 * commits to the website channel, so changes made from anywhere (the editor,
 * the submission form, a laptop) are announced, not only the bot's own work.
 * Reads the public commits API without credentials; state is the last commit
 * reported. The first run records the current head silently. */
export function siteChangeWatcher({ repo, branch = 'main', stateDir, send, channelId, siteUrl = '', fetcher = fetch, limit = 20 }) {
  const stateFile = path.join(stateDir, 'site-changes.json');
  const api = `https://api.github.com/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${limit}`;
  let state = { lastSha: '' };
  let ticking = false;
  const save = async () => {
    await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
    const temp = `${stateFile}.tmp`;
    await fs.writeFile(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
    await fs.rename(temp, stateFile);
  };
  async function tick() {
    if (ticking || !channelId) return null;
    ticking = true;
    try {
      const response = await fetcher(api, { signal: AbortSignal.timeout(20_000), headers: { accept: 'application/vnd.github+json' } });
      if (!response.ok) return null;
      const commits = await response.json();
      if (!Array.isArray(commits) || !commits.length) return null;
      if (!state.lastSha) { state.lastSha = commits[0].sha; await save(); return null; }
      const index = commits.findIndex(c => c.sha === state.lastSha);
      const fresh = (index === -1 ? commits : commits.slice(0, index)).reverse();
      if (!fresh.length) return null;
      const content = changeReport(fresh, { siteUrl, truncated: index === -1 });
      await send({ channelId, content, suppressMentions: true });
      state.lastSha = commits[0].sha;
      await save();
      return content;
    } finally { ticking = false; }
  }
  return {
    async start() {
      try { state = JSON.parse(await fs.readFile(stateFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await tick();
    },
    tick,
  };
}

export function changeReport(commits, { siteUrl = '', truncated = false } = {}) {
  const lines = commits.map(c => `• ${(c.commit?.message ?? '').split('\n')[0].trim().slice(0, 140)}`);
  const count = commits.length + (truncated ? '+' : '');
  return `🚀 Site updated: ${count} change${commits.length === 1 && !truncated ? '' : 's'}, live${siteUrl ? ` at ${siteUrl}` : ''} within a couple of minutes.\n${lines.join('\n')}`;
}
