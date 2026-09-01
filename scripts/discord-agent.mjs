import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { Client, Events, GatewayIntentBits } from "discord.js";
import {
  chunkDiscordMessage,
  isAuthorized,
  isDestructiveRequest,
  isMassDestructiveRequest,
  isStopRequest,
  parseCsv,
  replyContext,
  stripBotMention,
  summaryHeading,
  taskPrompt,
} from "./discord-agent-core.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const config = {
  guildIds: parseCsv(process.env.DISCORD_ALLOWED_GUILD_IDS),
  channelIds: parseCsv(process.env.DISCORD_ALLOWED_CHANNEL_IDS),
  userIds: parseCsv(process.env.DISCORD_ALLOWED_USER_IDS),
  roleIds: parseCsv(process.env.DISCORD_ALLOWED_ROLE_IDS),
  destructiveUserIds: parseCsv(process.env.DISCORD_DESTRUCTIVE_USER_IDS),
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
let activeChild = null;

class TaskStoppedError extends Error {}
class SharedCheckoutConflictError extends Error {}

async function gitSnapshot() {
  const [{ stdout: status }, { stdout: head }] = await Promise.all([
    execFileAsync("git", ["status", "--porcelain"], { cwd: ROOT }),
    execFileAsync("git", ["rev-parse", "HEAD"], { cwd: ROOT }),
  ]);
  return { status: status.trim(), head: head.trim() };
}

async function waitForCleanCheckout(timeoutMs = 30_000, onWait) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const snapshot = await gitSnapshot();
    if (!snapshot.status || Date.now() >= deadline) return snapshot;
    onWait?.(snapshot);
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
}

const AGENT_TIMEOUT_MS = 15 * 60 * 1_000;

function safeAgentEnv() {
  const env = { ...process.env };
  delete env.DISCORD_BOT_TOKEN;
  return env;
}

async function replyChunks(message, heading, body) {
  const chunks = chunkDiscordMessage(body);
  for (let i = 0; i < chunks.length; i++) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await message.reply({
          content: `${i === 0 ? heading : "Continued:"}\n${chunks[i]}`,
          allowedMentions: { repliedUser: i === 0 },
        });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1_000));
      }
    }
    if (lastError) throw lastError;
  }
}

async function runCodex(job) {
  let notified = false;
  const starting = await waitForCleanCheckout(30_000, () => {
    if (notified) return;
    notified = true;
    void job.message.reply({
      content: "The shared checkout is busy, so I’m waiting briefly for the other work to finish before I start. I won’t overwrite it.",
      allowedMentions: { repliedUser: false },
    }).catch((error) => console.error("[discord-agent] wait update failed", error));
  });
  if (starting.status) {
    throw new SharedCheckoutConflictError(
      "Blocked: the shared checkout already has uncommitted work. Please finish or clear that work before asking the bot to publish another change.",
    );
  }
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rpt-discord-agent-"));
  const outputFile = path.join(tempDir, "final.txt");
  const prompt = taskPrompt({
    request: job.request,
    authorId: job.message.author.id,
    channelId: job.message.channelId,
    messageUrl: job.message.url,
    context: job.context,
  });
  try {
    if (job.stopRequested) throw new TaskStoppedError("Stopped before the agent started.");
    const exitCode = await new Promise((resolve, reject) => {
      let timeout;
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
        { cwd: ROOT, env: safeAgentEnv(), stdio: ["pipe", "pipe", "pipe"], detached: true },
      );
      activeChild = child;
      timeout = setTimeout(() => {
        job.timeout = true;
        try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); }
        reject(new Error("The agent exceeded the 15-minute execution limit and was stopped."));
      }, AGENT_TIMEOUT_MS);
      timeout.unref();
      child.stdin.end(prompt);
      child.stdout.on("data", (data) => process.stdout.write(data));
      child.stderr.on("data", (data) => process.stderr.write(data));
      child.once("error", reject);
      child.once("close", (code) => {
        clearTimeout(timeout);
        if (activeChild === child) activeChild = null;
        resolve(code);
      });
    });
    const summary = await fs.readFile(outputFile, "utf8").catch(() => "");
    if (job.stopRequested) throw new TaskStoppedError("The active Codex process was terminated.");
    if (exitCode !== 0) {
      throw new Error(summary.trim() || `Codex exited with status ${exitCode}.`);
    }
    const ending = await gitSnapshot();
    if (ending.status) {
      throw new SharedCheckoutConflictError(
        "Blocked: the shared checkout changed while this request was running, so nothing was published. Please resolve the other work and retry.",
      );
    }
    return summary.trim() || "Task completed, but the agent returned no summary.";
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function stopActiveTask() {
  if (!running) return false;
  running.stopRequested = true;
  const child = activeChild;
  if (child?.pid) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
    const killTimer = setTimeout(() => {
      if (activeChild !== child || !child.pid) return;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }, 5000);
    killTimer.unref();
  }
  return true;
}

async function drainQueue() {
  if (running || !queue.length) return;
  running = queue.shift();
  const job = running;
  await job.message.reply({
    content: `On it.${queue.length ? ` ${queue.length} queued.` : ""}`.trim(),
    allowedMentions: { repliedUser: true },
  });
  const progressTimer = setInterval(() => {
    void job.message.reply({
      content: "Still working — running checks now.",
      allowedMentions: { repliedUser: false },
    }).catch((error) => console.error("[discord-agent] progress update failed", error));
  }, 60_000);
  progressTimer.unref();
  try {
    const summary = await runCodex(job);
    await replyChunks(job.message, summaryHeading(summary), summary);
  } catch (error) {
    if (error instanceof TaskStoppedError) {
      await replyChunks(
        job.message,
        "🛑 Stopped.",
        "The active agent task was stopped. Work completed before the stop may remain in the shared checkout, so the next task will inspect the tree before changing anything.",
      );
      return;
    }
    if (error instanceof SharedCheckoutConflictError) {
      await replyChunks(job.message, "⏸️ Blocked.", error.message);
      return;
    }
    const detail = error instanceof Error ? error.message : String(error);
    await replyChunks(job.message, "❌ The task did not complete.", detail);
  } finally {
    clearInterval(progressTimer);
    running = null;
    void drainQueue();
  }
}

client.on("messageCreate", async (message) => {
  if (!client.user || message.author.bot || !message.guildId) return;
  let referenced = null;
  if (message.reference?.messageId) {
    referenced = await message.fetchReference().catch(() => null);
  }
  const addressedByReply = referenced?.author?.id === client.user.id;
  if (!message.mentions.users.has(client.user.id) && !addressedByReply) return;
  if (!isAuthorized(message, config)) {
    await message.reply({ content: "This bot is restricted to approved developers and channels.", allowedMentions: { repliedUser: true } });
    return;
  }
  const request = stripBotMention(message.content, client.user.id);
  if (isStopRequest(request)) {
    const stopped = stopActiveTask();
    await message.react(stopped ? "🛑" : "ℹ️").catch(() => undefined);
    await message.reply({
      content: stopped
        ? `Stopping the active request now.${queue.length ? ` ${queue.length} queued request(s) remain.` : ""}`
        : "There is no active request to stop.",
      allowedMentions: { repliedUser: true },
    });
    return;
  }
  if (isDestructiveRequest(request) && !config.destructiveUserIds.has(message.author.id)) {
    await message.reply({
      content: "⏸️ Blocked. Destructive changes are restricted to the designated maintainers.",
      allowedMentions: { repliedUser: true },
    });
    return;
  }
  if (isMassDestructiveRequest(request)) {
    await message.reply({
      content: "⏸️ Blocked. That request is too broad or destructive. Please name the exact files and a scoped, reviewable change.",
      allowedMentions: { repliedUser: true },
    });
    return;
  }
  if (!request) {
    await message.reply({ content: "Tag me with a concrete request. I’ll queue it, run the repository checks, publish approved changes, and report the result here.", allowedMentions: { repliedUser: true } });
    return;
  }
  let original = null;
  if (addressedByReply && referenced?.reference?.messageId) {
    original = await referenced.fetchReference().catch(() => null);
  }
  const context = addressedByReply
    ? replyContext({
        referencedContent: referenced?.content || "",
        originalContent: original && !original.author?.bot ? original.content : "",
      })
    : "";
  queue.push({ message, request, context });
  await message.react("🔍").catch(() => undefined);
  if (running) {
    await message.reply({ content: `Queued. You are number ${queue.length} waiting.`, allowedMentions: { repliedUser: true } });
  }
  void drainQueue();
});

client.once(Events.ClientReady, () => {
  console.log(`[discord-agent] ready as ${client.user.tag}; repo=${ROOT}`);
});
client.on(Events.Error, (error) => console.error("[discord-agent] Discord client error", error));
client.on(Events.Warn, (warning) => console.warn("[discord-agent] Discord warning", warning));
client.on(Events.ShardError, (error) => console.error("[discord-agent] Discord shard error", error));

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    client.destroy();
    process.exit(0);
  });
}

for (let attempt = 0; ; attempt += 1) {
  try {
    await client.login(TOKEN);
    break;
  } catch (error) {
    const delay = Math.min(60_000, 2 ** Math.min(attempt, 6) * 1_000);
    console.error(`[discord-agent] login failed; retrying in ${delay}ms`, error);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
