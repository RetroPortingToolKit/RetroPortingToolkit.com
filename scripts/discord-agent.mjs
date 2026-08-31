import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Client, Events, GatewayIntentBits } from "discord.js";
import {
  chunkDiscordMessage,
  isAuthorized,
  parseCsv,
  stripBotMention,
  summaryHeading,
  taskPrompt,
} from "./discord-agent-core.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const config = {
  guildIds: parseCsv(process.env.DISCORD_ALLOWED_GUILD_IDS),
  channelIds: parseCsv(process.env.DISCORD_ALLOWED_CHANNEL_IDS),
  userIds: parseCsv(process.env.DISCORD_ALLOWED_USER_IDS),
  roleIds: parseCsv(process.env.DISCORD_ALLOWED_ROLE_IDS),
};

if (!TOKEN) throw new Error("DISCORD_BOT_TOKEN is required.");
if (!config.userIds.size && !config.roleIds.size) {
  throw new Error("At least one allowed Discord user or role ID is required.");
}
if (!config.guildIds.size || !config.channelIds.size) {
  throw new Error("Allowed Discord guild and channel IDs are required.");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const queue = [];
let running = null;

function safeAgentEnv() {
  const env = { ...process.env };
  delete env.DISCORD_BOT_TOKEN;
  return env;
}

async function replyChunks(message, heading, body) {
  const chunks = chunkDiscordMessage(body);
  for (let i = 0; i < chunks.length; i++) {
    await message.reply({
      content: `${i === 0 ? heading : "Continued:"}\n${chunks[i]}`,
      allowedMentions: { repliedUser: i === 0 },
    });
  }
}

async function runCodex(job) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rpt-discord-agent-"));
  const outputFile = path.join(tempDir, "final.txt");
  const prompt = taskPrompt({
    request: job.request,
    authorId: job.message.author.id,
    channelId: job.message.channelId,
    messageUrl: job.message.url,
  });
  try {
    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn(
        "codex",
        [
          "exec", "--ephemeral", "--color", "never",
          "--sandbox", "danger-full-access",
          "-c", 'approval_policy="never"',
          "-c", 'model_reasoning_effort="high"',
          "-C", ROOT,
          "--output-last-message", outputFile,
          "-",
        ],
        { cwd: ROOT, env: safeAgentEnv(), stdio: ["pipe", "pipe", "pipe"] },
      );
      child.stdin.end(prompt);
      child.stdout.on("data", (data) => process.stdout.write(data));
      child.stderr.on("data", (data) => process.stderr.write(data));
      child.once("error", reject);
      child.once("close", resolve);
    });
    const summary = await fs.readFile(outputFile, "utf8").catch(() => "");
    if (exitCode !== 0) {
      throw new Error(summary.trim() || `Codex exited with status ${exitCode}.`);
    }
    return summary.trim() || "Task completed, but the agent returned no summary.";
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function drainQueue() {
  if (running || !queue.length) return;
  running = queue.shift();
  const job = running;
  await job.message.reply({
    content: `Starting your request now. ${queue.length ? `${queue.length} request(s) remain queued.` : ""}`.trim(),
    allowedMentions: { repliedUser: true },
  });
  try {
    const summary = await runCodex(job);
    await replyChunks(job.message, summaryHeading(summary), summary);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    await replyChunks(job.message, "❌ The task did not complete.", detail);
  } finally {
    running = null;
    void drainQueue();
  }
}

client.on("messageCreate", async (message) => {
  if (!client.user || message.author.bot || !message.guildId) return;
  if (!message.mentions.users.has(client.user.id)) return;
  if (!isAuthorized(message, config)) {
    await message.reply({ content: "This bot is restricted to approved developers and channels.", allowedMentions: { repliedUser: true } });
    return;
  }
  const request = stripBotMention(message.content, client.user.id);
  if (!request) {
    await message.reply({ content: "Tag me with a concrete request. I’ll queue it, run the repository checks, publish approved changes, and report the result here.", allowedMentions: { repliedUser: true } });
    return;
  }
  queue.push({ message, request });
  await message.react("🔍").catch(() => undefined);
  if (running) {
    await message.reply({ content: `Queued. You are number ${queue.length} waiting.`, allowedMentions: { repliedUser: true } });
  }
  void drainQueue();
});

client.once(Events.ClientReady, () => {
  console.log(`[discord-agent] ready as ${client.user.tag}; repo=${ROOT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    client.destroy();
    process.exit(0);
  });
}

await client.login(TOKEN);
