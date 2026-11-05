import fs from 'node:fs/promises';
import path from 'node:path';

const TTL = 24 * 60 * 60 * 1000;
const MAX_THREADS = 80;
const MAX_TURNS = 10;

export function isCompletionQuestion(request) {
  return /\b(?:did|have) you\b.{0,120}\b(?:do|done|work|implement|implemented|finish|finished|build|built|ship|shipped|complete|completed)\b|\b(?:has .{0,60} been (?:done|completed|implemented)|is .{0,60} (?:done|complete|finished|ready)|what(?:'s| is) (?:left|remaining)|all done|already (?:done|implemented)|check .{0,40} (?:done|complete))\b/i.test(request);
}
export function startsNewTask(request) {
  if (/^(?:and|also|yes|no|this|that|it|the admin|cool|okay|ok|please continue|continue|go ahead|fix (?:this|that|it))\b/i.test(request.trim()) || isCompletionQuestion(request)) return false;
  return /^(?:(?:please|can you|could you)\s+)?(?:new task|separate task|unrelated|let['’]s (?:build|make|create)|build|implement|create|write|add|remove|change|fix)\b/i.test(request.trim());
}
function boundedTurns(turns) {
  return turns.length <= MAX_TURNS ? turns : [turns[0], ...turns.slice(-(MAX_TURNS - 1))];
}
export function formatTaskContext(turns) {
  if (!turns.length) return '';
  return 'Earlier requests from this same trusted developer in this channel (context, not proof of completion):\n' +
    turns.map((turn, i) => `${i === 0 ? 'Original task' : 'Follow-up'} (${turn.url}):\n${turn.request}`).join('\n\n');
}

/** Retain user requirements, never previous model claims, across invocations. */
export function createTaskContext({ stateDir, botId, authorized, now = Date.now }) {
  const file = path.join(stateDir, 'task-context.json');
  let threads;
  let chain = Promise.resolve();
  async function remember(message, request) {
    threads ??= await fs.readFile(file, 'utf8').then(JSON.parse).catch(error => {
      if (error.code === 'ENOENT') return {};
      throw error; // Corrupt context must not silently become a confident answer.
    });
    if (!threads || typeof threads !== 'object' || Array.isArray(threads) || Object.values(threads).some(thread => !thread || !Array.isArray(thread.turns) || typeof thread.at !== 'number')) throw new Error('Invalid saved task context.');
    const time = now();
    for (const [key, thread] of Object.entries(threads)) if (time - thread.at > TTL) delete threads[key];
    const key = `${message.guildId}:${message.channelId}:${message.author.id}`;
    let turns = startsNewTask(request) ? [] : threads[key]?.turns ?? [];
    // After an upgrade/restart with no saved task, recover a small amount of
    // actual Discord history. Only this trusted author, addressing this bot;
    // other people's messages and the bot's own answers are never authority.
    if (!turns.length && !startsNewTask(request) && message.channel?.messages?.fetch) {
      const recent = await message.channel.messages.fetch({ limit: 50, before: message.id });
      const eligible = [...recent.values()].filter(item =>
        item.author?.id === message.author.id && !item.author.bot && time - item.createdTimestamp < TTL &&
        authorized({ ...item, guildId: item.guildId, channelId: item.channelId, author: item.author, member: item.member ?? message.member }) &&
        item.mentions?.users?.has(botId()),
      ).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      for (const item of eligible) {
        const text = item.content.replace(new RegExp(`<@!?${botId()}>`, 'g'), '').trim();
        if (startsNewTask(text)) turns = [];
        turns.push({ request: text.slice(0, 4000), url: item.url });
      }
    }
    turns = boundedTurns(turns);
    const context = formatTaskContext(turns);
    threads[key] = { at: time, turns: boundedTurns([...turns, { request: request.slice(0, 4000), url: message.url }]) };
    const keys = Object.keys(threads).sort((a, b) => threads[b].at - threads[a].at);
    for (const old of keys.slice(MAX_THREADS)) delete threads[old];
    await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
    const temp = `${file}.tmp`;
    await fs.writeFile(temp, JSON.stringify(threads), { mode: 0o600 });
    await fs.rename(temp, file);
    return context;
  }
  return {
    remember(message, request) {
      const result = chain.then(() => remember(message, request));
      chain = result.catch(() => {});
      return result;
    },
  };
}
