export const MAX_DISCORD_MESSAGE = 1900;

export function parseCsv(value = "") {
  return new Set(String(value).split(",").map((part) => part.trim()).filter(Boolean));
}

export function stripBotMention(content, botId) {
  return String(content)
    .replace(new RegExp(`<@!?${botId}>`, "g"), "")
    .trim();
}

export function isStopRequest(content) {
  return /^(?:stop|cancel|abort)(?:\s+(?:it|this(?:\s+(?:task|request))?|the\s+(?:task|request)|task|request|now))?[.!]?$/i.test(String(content).trim());
}

export function replyContext({ referencedContent = "", originalContent = "" } = {}) {
  const parts = [];
  if (originalContent.trim()) parts.push(`Original request:\n${originalContent.trim()}`);
  if (referencedContent.trim()) parts.push(`Bot message being replied to:\n${referencedContent.trim()}`);
  return parts.join("\n\n");
}

export function isAuthorized(message, config) {
  if (config.guildIds.size && !config.guildIds.has(message.guildId)) return false;
  if (config.channelIds.size && !config.channelIds.has(message.channelId)) return false;
  if (config.userIds.has(message.author.id)) return true;
  return message.member?.roles?.cache?.some((role) => config.roleIds.has(role.id)) ?? false;
}

export function chunkDiscordMessage(text, limit = MAX_DISCORD_MESSAGE) {
  const input = String(text || "No summary was produced.").trim();
  if (input.length <= limit) return [input];
  const chunks = [];
  let rest = input;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf("\n", limit);
    if (cut < Math.floor(limit * 0.6)) cut = rest.lastIndexOf(" ", limit);
    if (cut < Math.floor(limit * 0.6)) cut = limit;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

export function summaryHeading(summary) {
  const firstLine = String(summary).trimStart().split("\n", 1)[0].toLowerCase();
  if (firstLine.startsWith("blocked")) return "⏸️ Blocked.";
  if (firstLine.startsWith("needs clarification") || firstLine.startsWith("clarification")) {
    return "❓ Needs clarification.";
  }
  return "✅ Done.";
}

export function taskPrompt({ request, authorId, channelId, messageUrl, context = "" }) {
  return `A trusted Retro Porting Toolkit developer requested work through the project Discord bot.

Request:
${request}

${context ? `Reply context:\n${context}\n\n` : ""}
Discord context (identifiers only): author ${authorId}, channel ${channelId}, message ${messageUrl}

Work only in the current RetroPortingToolkit.com checkout. Follow AGENTS.md exactly. Start by pulling main and checking that the shared tree is clean. Determine whether this is a question, diagnosis, content edit, or implementation request. For requested repository changes, implement them, run the project's full required verification, commit coherent work to main, push it, and verify the production deployment. Do not expose credentials or copy Discord data elsewhere. Do not create accounts, credentials, tunnels, recurring jobs, or infrastructure. Do not perform destructive or out-of-repository work; instead explain in the final summary what human approval is needed. If the request is ambiguous in a way that materially changes the result, do not guess: return a concise question for the requester.

Your final response will be posted back to Discord. Lead with whether the task is complete, blocked, or needs clarification, then state what changed, verification performed, commit/push/deployment status, and any follow-up. Keep it under 5,500 characters.`;
}
