import fs from 'node:fs/promises';
import path from 'node:path';
import { discordSubmission, moderationPage, SUBMISSIONS_PATH, plainText } from './submissions.mjs';

/** Public intake never invokes an agent or writes arbitrary paths. */
export function submissionBridge({ client, endpoint, adminChannelId, stateDir, authorized, enqueue, send, siteUrl }) {
  const stateFile = path.join(stateDir, 'submission-notices.json');
  let state = { notices: {}, sources: {}, intake: {} };
  let saveChain = Promise.resolve();
  let polling = false;
  const pending = new Set();
  const save = () => {
    const content = JSON.stringify(state, null, 2);
    saveChain = saveChain.catch(() => {}).then(async () => {
      await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
      const temp = `${stateFile}.tmp`;
      await fs.writeFile(temp, content, { mode: 0o600 });
      await fs.rename(temp, stateFile);
    });
    return saveChain;
  };
  async function postIntake(key, intake) {
    const response = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(60_000), headers: { 'content-type': 'application/json' }, body: JSON.stringify(intake.input) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The submission could not be published.');
    const record = result.record;
    if (!record?.id || !/^\/games\/[a-z0-9-]+$/.test(record.url)) throw new Error('The submission returned an incomplete result.');
    state.sources[record.id] ??= { ref: intake.ref, username: intake.username, url: intake.url };
    delete state.intake[key];
    await save();
    const auto = intake.trusted && !result.duplicate;
    await send({ ...intake.ref, content: `${result.message}${auto ? ' As a team submission it is confirmed without review.' : ''}\n${siteUrl}${record.url}`, ping: true, suppressMentions: true });
    await poll();
    // A trusted author's submission takes the same serialized path as a ✅.
    if (auto) await enqueue({ ref: intake.ref, request: `Moderate submission ${record.id}`, messageUrl: intake.url,
      submissionModeration: { id: record.id, decision: 'confirmed', moderator: intake.ref.authorId } });
  }
  async function intake(message, ref, request, trusted = false) {
    if (!endpoint) return false;
    const input = discordSubmission(request, [...(message.attachments?.values() ?? [])]);
    if (!input) return false;
    const key = ref.messageId;
    if (state.intake[key]) return true;
    if (Object.keys(state.intake).length >= 10) {
      await send({ ...ref, content: 'There are several submissions in progress. Please try again shortly.', ping: true });
      return true;
    }
    const item = { input, ref, username: plainText(message.author.username, 80), url: message.url, trusted: trusted === true };
    state.intake[key] = item;
    await save();
    await message.react('🔍').catch(() => {});
    try { await postIntake(key, item); await message.react('✅').catch(() => {}); }
    catch (error) {
      delete state.intake[key]; await save();
      await send({ ...ref, content: `${error.message} You can retry safely; duplicate repositories are detected.`, ping: true, suppressMentions: true });
    }
    return true;
  }
  async function queueReaction(message, emoji, user) {
    if (!user || user.bot || !['✅', '❌'].includes(emoji)) return;
    const entry = Object.entries(state.notices).find(([, n]) => n.messageId === message.id && n.channelId === message.channelId);
    if (!entry || !message.guildId || message.author?.id !== client.user.id) return;
    const [id, notice] = entry;
    if (notice.done || pending.has(id)) return;
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member || !authorized({ guildId: message.guildId, channelId: message.channelId, author: user, member })) return;
    pending.add(id);
    try {
      await enqueue({ ref: { channelId: message.channelId, messageId: message.id, authorId: user.id },
        request: `Moderate submission ${id}`, messageUrl: message.url,
        submissionModeration: { id, decision: emoji === '✅' ? 'confirmed' : 'removed', moderator: user.id } });
    } catch (error) { pending.delete(id); throw error; }
  }
  async function poll() {
    if (!endpoint || !adminChannelId || polling) return;
    polling = true;
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) return;
      const { submissions } = await response.json();
      if (!Array.isArray(submissions)) return;
      const channel = await client.channels.fetch(adminChannelId);
      if (!channel?.isTextBased()) return;
      for (const record of submissions) {
        if (!/^[a-f0-9]{16}$/.test(record.id)) continue;
        let notice = state.notices[record.id];
        const source = state.sources[record.id];
        let message = notice ? await channel.messages.fetch(notice.messageId).catch(() => null) : null;
        if (!message) {
          // Recover the send/save crash window using the stable submission ID
          // embedded in the notice before sending another copy.
          const recent = await channel.messages.fetch({ limit: 100 });
          message = recent.find(m => m.author.id === client.user.id && m.embeds?.[0]?.footer?.text === `Submission ${record.id}`);
        }
        if (!message) {
          message = await channel.send({ allowedMentions: { parse: [] }, embeds: [{
            title: plainText(record.title, 100), url: `${siteUrl}${record.url}`, color: 0x0066cc,
            description: plainText(record.description, 500),
            fields: [
              { name: 'Page', value: `${siteUrl}${record.url}` },
              { name: 'Repository', value: record.repo },
              { name: 'Artwork', value: record.mediaNote || 'No imported artwork recorded.' },
              { name: 'Repository owner', value: record.owner || source?.username || 'Not available' },
              { name: 'Submitted through', value: source ? `Discord: ${source.username}\n${source.url}` : 'Website form' },
              { name: 'Moderation', value: 'The game page publishes automatically. ✅ confirms it; ❌ removes it from listings (keeps its unlisted URL). Only approved site editors can moderate.' },
            ], footer: { text: `Submission ${record.id}` },
          }] });
        }
        notice = state.notices[record.id] = { ...notice, messageId: message.id, channelId: channel.id };
        await save();
        await message.react('✅'); await message.react('❌');
        // Fetch reaction users as well as listening live, so moderation made
        // while the bridge was offline still reaches the serialized queue.
        for (const emoji of ['❌', '✅']) {
          const reaction = message.reactions.cache.find(r => r.emoji.name === emoji);
          if (!reaction) continue;
          let after;
          for (;;) {
            const users = await reaction.users.fetch({ limit: 100, ...(after ? { after } : {}) });
            for (const user of users.values()) await queueReaction(message, emoji, user);
            if (users.size < 100 || pending.has(record.id)) break;
            after = users.last().id;
          }
        }
      }
    } finally { polling = false; }
  }
  return {
    intake,
    async start() {
      try { state = JSON.parse(await fs.readFile(stateFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      // A crash during an HTTP request can leave its outcome unknown. The
      // canonical repository key makes resubmitting this durable input safe.
      for (const [key, item] of Object.entries(state.intake)) {
        try { await postIntake(key, item); }
        catch { await send({ ...item.ref, content: 'Your submission was interrupted. Please retry; duplicates are detected.', ping: true }); delete state.intake[key]; await save(); }
      }
      await poll();
    },
    poll,
    async reaction(reaction, user) {
      if (reaction.partial) await reaction.fetch();
      const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
      await queueReaction(message, reaction.emoji.name, user);
    },
    async completed(id, success, decision) {
      pending.delete(id);
      const notice = state.notices[id];
      if (!success || !notice) return;
      notice.done = true;
      await save();
      // A confirmed page needs no further moderation, so its notice goes.
      // An unlisted one stays as the record of what was removed and why.
      if (decision === 'confirmed') {
        const channel = await client.channels.fetch(notice.channelId).catch(() => null);
        const message = channel ? await channel.messages.fetch(notice.messageId).catch(() => null) : null;
        if (message) await message.delete().catch(() => {});
      }
    },
  };
}

export async function moderateSubmission({ root, action, exec, siteUrl = '' }) {
  if (!/^[a-f0-9]{16}$/.test(action.id) || !['confirmed', 'removed'].includes(action.decision)) throw new Error('Invalid moderation action.');
  await exec('git', ['pull', '--ff-only']);
  const records = JSON.parse(await fs.readFile(path.join(root, SUBMISSIONS_PATH), 'utf8'));
  const record = records.find(r => r.id === action.id);
  if (!record) throw new Error('Submission not found.');
  if (record.status !== 'pending') return `This submission is already ${record.status}.`;
  if (!/^data\/games\/\d+_[a-z0-9-]+\/index\.md$/.test(record.path)) throw new Error('Invalid submission path.');
  const target = path.join(root, record.path);
  const raw = await fs.readFile(target, 'utf8');
  const updated = moderationPage(raw, record, action.decision);
  record.status = action.decision;
  record.moderatedBy = action.moderator;
  record.moderatedAt = new Date().toISOString();
  await fs.writeFile(target, updated);
  await fs.writeFile(path.join(root, SUBMISSIONS_PATH), JSON.stringify(records, null, 2) + '\n');
  for (const check of ['typecheck', 'build', 'test']) await exec('npm', ['run', check]);
  await exec('git', ['add', '--', record.path, SUBMISSIONS_PATH]);
  await exec('git', ['-c', 'user.name=Shokunin', '-c', 'user.email=30949000+tetrisgm@users.noreply.github.com', 'commit', '-m', `${action.decision === 'confirmed' ? 'Confirm' : 'Unlist'} community submission ${record.id}`]);
  await exec('git', ['push', 'origin', 'main']);
  return action.decision === 'confirmed' ? `Submission confirmed. ${siteUrl}${record.url}` : `Submission removed from listings. Its unlisted URL is retained: ${siteUrl}${record.url}`;
}
