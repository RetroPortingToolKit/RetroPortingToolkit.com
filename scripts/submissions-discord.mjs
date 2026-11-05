import fs from 'node:fs/promises';
import path from 'node:path';
import { discordSubmission, plainText } from './submissions.mjs';

/** Public intake never invokes an agent or writes arbitrary paths. A
 * submission publishes on arrival; there is no review step to wait for. */
export function submissionBridge({ endpoint, stateDir, send, siteUrl }) {
  const stateFile = path.join(stateDir, 'submission-notices.json');
  let state = { intake: {} };
  let saveChain = Promise.resolve();
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
    delete state.intake[key];
    await save();
    await send({ ...intake.ref, content: `<@${intake.ref.authorId}> ${result.message}\n${siteUrl}${record.url}`, ping: true, suppressMentions: true, mentionUsers: [intake.ref.authorId] });
  }
  async function intake(message, ref, request) {
    if (!endpoint) return false;
    const input = discordSubmission(request, [...(message.attachments?.values() ?? [])], message.author.username);
    if (!input) return false;
    const key = ref.messageId;
    if (state.intake[key]) return true;
    if (Object.keys(state.intake).length >= 10) {
      await send({ ...ref, content: 'There are several submissions in progress. Please try again shortly.', ping: true });
      return true;
    }
    const item = { input, ref, username: plainText(message.author.username, 80), url: message.url };
    state.intake[key] = item;
    await save();
    await message.react('🔍').catch(() => {});
    try { await postIntake(key, item); await message.react('✅').catch(() => {}); }
    catch (error) {
      delete state.intake[key]; await save();
      await send({ ...ref, content: `<@${ref.authorId}> ${error.message} You can retry safely; duplicate repositories are detected.`, ping: true, suppressMentions: true, mentionUsers: [ref.authorId] });
    }
    return true;
  }
  return {
    intake,
    async start() {
      try { state = { intake: JSON.parse(await fs.readFile(stateFile, 'utf8')).intake ?? {} }; } catch (error) { if (error.code !== 'ENOENT') throw error; }
      // A crash during an HTTP request can leave its outcome unknown. The
      // canonical repository key makes resubmitting this durable input safe.
      for (const [key, item] of Object.entries(state.intake)) {
        try { await postIntake(key, item); }
        catch { await send({ ...item.ref, content: `<@${item.ref.authorId}> Your submission was interrupted. Please retry; duplicates are detected.`, ping: true, suppressMentions: true, mentionUsers: [item.ref.authorId] }); delete state.intake[key]; await save(); }
      }
    },
  };
}
