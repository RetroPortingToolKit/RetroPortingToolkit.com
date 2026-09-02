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
  droppedMessage,
  interruptedMessage,
  isAuthorized,
  isCancelMineRequest,
  isDestructiveRequest,
  isMassDestructiveRequest,
  isStatusRequest,
  isStopRequest,
  parseCsv,
  progressMessage,
  replyContext,
  statusMessage,
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

// State that has to outlive the process: which requests were in flight when it
// died, and any reply that could not be delivered. Without this a restart is
// silent, and the requester waits forever for a summary that no longer exists.
const STATE_DIR =
  process.env.DISCORD_AGENT_STATE_DIR ||
  path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "RetroPortingToolkitDiscordAgent",
    "state",
  );
const JOBS_FILE = path.join(STATE_DIR, "jobs.json");
const OUTBOX_FILE = path.join(STATE_DIR, "outbox.json");
const TASK_LOG_DIR = path.join(STATE_DIR, "task-logs");
const TASK_LOG_MAX_BYTES = 2 * 1024 * 1024;
const TASK_LOGS_KEPT = 20;
const PROGRESS_INTERVAL_MS = 60_000;
const AGENT_TIMEOUT_MS = 15 * 60 * 1_000;

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

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await fs.writeFile(file, JSON.stringify(value, null, 2), { mode: 0o600 });
}

function jobRecord(job) {
  return {
    ref: job.ref,
    request: job.request,
    startedAt: job.startedAt ?? null,
    startedHead: job.startedHead ?? null,
  };
}

async function persistJobs() {
  try {
    await writeJson(JOBS_FILE, {
      active: running ? jobRecord(running) : null,
      queued: queue.map(jobRecord),
    });
  } catch (error) {
    console.error("[discord-agent] could not persist job state", error);
  }
}

/**
 * Deliver by ID rather than through a live Message object, so a reply still
 * works after a restart when the original object is long gone.
 */
async function deliver({ channelId, messageId, content, ping = false, suppressMentions = false }) {
  const channel = await client.channels.fetch(channelId);
  const allowedMentions = suppressMentions
    ? { parse: [], repliedUser: ping }
    : { repliedUser: ping };
  const target = messageId
    ? await channel.messages.fetch(messageId).catch(() => null)
    : null;
  if (target) return target.reply({ content, allowedMentions });
  return channel.send({ content, allowedMentions });
}

async function spool(entry) {
  const pending = await readJson(OUTBOX_FILE, []);
  pending.push({ ...entry, spooledAt: Date.now() });
  await writeJson(OUTBOX_FILE, pending);
}

/**
 * Never throws. A Discord hiccup used to reject out of an un-caught await and
 * take the whole bridge down with the queue still in memory; the summary this
 * carries is the entire point of a task, so a failure spools for later instead.
 */
async function safeSend(entry) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await deliver(entry);
    } catch (error) {
      console.error(`[discord-agent] send failed (attempt ${attempt + 1})`, error);
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1_000));
    }
  }
  await spool(entry).catch((error) =>
    console.error("[discord-agent] could not spool undelivered message", error),
  );
  return null;
}

async function flushOutbox() {
  const pending = await readJson(OUTBOX_FILE, []);
  if (!pending.length) return;
  const stillPending = [];
  for (const entry of pending) {
    try {
      await deliver(entry);
    } catch (error) {
      console.error("[discord-agent] outbox delivery failed", error);
      stillPending.push(entry);
    }
  }
  await writeJson(OUTBOX_FILE, stillPending);
  if (pending.length !== stillPending.length) {
    console.log(`[discord-agent] delivered ${pending.length - stillPending.length} spooled message(s)`);
  }
}

async function replyChunks(ref, heading, body) {
  const chunks = chunkDiscordMessage(body);
  for (let i = 0; i < chunks.length; i++) {
    await safeSend({
      ...ref,
      content: `${i === 0 ? heading : "Continued:"}\n${chunks[i]}`,
      ping: i === 0,
    });
  }
}

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

function safeAgentEnv() {
  const env = { ...process.env };
  delete env.DISCORD_BOT_TOKEN;
  return env;
}

/**
 * The Codex transcript goes to its own capped file rather than to the bridge's
 * stdout: piped into launchd's StandardErrorPath it grew unbounded (6.7 MB in a
 * day) and put the whole agent transcript in one never-rotated log.
 */
async function createTaskLog(id) {
  await fs.mkdir(TASK_LOG_DIR, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(TASK_LOG_DIR, `${stamp}-${id}.log`);
  const handle = await fs.open(file, "a", 0o600);
  let written = 0;
  let truncated = false;
  return {
    file,
    write(chunk) {
      if (written >= TASK_LOG_MAX_BYTES) {
        if (!truncated) {
          truncated = true;
          handle.write("\n[truncated: task log size limit reached]\n").catch(() => {});
        }
        return;
      }
      written += chunk.length;
      handle.write(chunk).catch(() => {});
    },
    async close() {
      await handle.close().catch(() => {});
    },
  };
}

async function pruneTaskLogs() {
  const names = (await fs.readdir(TASK_LOG_DIR).catch(() => []))
    .filter((name) => name.endsWith(".log"))
    .sort(); // ISO-prefixed, so lexical order is chronological
  for (const name of names.slice(0, Math.max(0, names.length - TASK_LOGS_KEPT))) {
    await fs.rm(path.join(TASK_LOG_DIR, name), { force: true }).catch(() => {});
  }
}

async function runCodex(job) {
  let notified = false;
  const starting = await waitForCleanCheckout(30_000, () => {
    if (notified) return;
    notified = true;
    void safeSend({
      ...job.ref,
      content:
        "The shared checkout is busy, so I’m waiting briefly for the other work to finish before I start. I won’t overwrite it.",
    });
  });
  if (starting.status) {
    throw new SharedCheckoutConflictError(
      "Blocked: the shared checkout already has uncommitted work. Please finish or clear that work before asking the bot to publish another change.",
    );
  }
  job.startedHead = starting.head;
  await persistJobs();

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rpt-discord-agent-"));
  const outputFile = path.join(tempDir, "final.txt");
  const taskLog = await createTaskLog(job.ref.messageId);
  console.log(`[discord-agent] task ${job.ref.messageId} log: ${taskLog.file}`);
  const prompt = taskPrompt({
    request: job.request,
    authorId: job.ref.authorId,
    channelId: job.ref.channelId,
    messageUrl: job.messageUrl,
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
      child.stdin.on("error", (error) => console.error("[discord-agent] agent stdin error", error));
      child.stdin.end(prompt);
      child.stdout.on("data", (data) => taskLog.write(data));
      child.stderr.on("data", (data) => taskLog.write(data));
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
    await taskLog.close();
    await pruneTaskLogs();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function killActiveChild() {
  const child = activeChild;
  if (!child?.pid) return;
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

function stopActiveTask() {
  if (!running) return false;
  running.stopRequested = true;
  killActiveChild();
  return true;
}

function startProgress(job) {
  let posted = null;
  const timer = setInterval(async () => {
    const content = progressMessage({
      elapsedMs: Date.now() - job.startedAt,
      queued: queue.length,
    });
    try {
      // One message that keeps its elapsed time current, rather than a new
      // reply every minute (up to 14 per long task).
      if (posted) await posted.edit({ content });
      else posted = await deliver({ ...job.ref, content });
    } catch (error) {
      console.error("[discord-agent] progress update failed", error);
    }
  }, PROGRESS_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}

async function drainQueue() {
  if (running || !queue.length) return;
  running = queue.shift();
  const job = running;
  job.startedAt = Date.now();
  let stopProgress = () => {};
  try {
    await persistJobs();
    await safeSend({
      ...job.ref,
      content: `On it.${queue.length ? ` ${queue.length} queued.` : ""}`.trim(),
      ping: true,
    });
    stopProgress = startProgress(job);
    const summary = await runCodex(job);
    await replyChunks(job.ref, summaryHeading(summary), summary);
  } catch (error) {
    if (error instanceof TaskStoppedError) {
      await replyChunks(
        job.ref,
        "🛑 Stopped.",
        "The active agent task was stopped. Work completed before the stop may remain in the shared checkout, so the next task will inspect the tree before changing anything.",
      );
    } else if (error instanceof SharedCheckoutConflictError) {
      await replyChunks(job.ref, "⏸️ Blocked.", error.message);
    } else {
      const detail = error instanceof Error ? error.message : String(error);
      await replyChunks(job.ref, "❌ The task did not complete.", detail);
    }
  } finally {
    stopProgress();
    running = null;
    await persistJobs();
    void drainQueue().catch((error) =>
      console.error("[discord-agent] queue drain failed", error),
    );
  }
}

/**
 * Tell everyone whose request died with the previous process. Their work is
 * gone from an in-memory queue that did not survive, and silence is the one
 * outcome a requester cannot act on.
 */
async function recoverInterruptedJobs() {
  const saved = await readJson(JOBS_FILE, null);
  if (!saved) return;
  await writeJson(JOBS_FILE, { active: null, queued: [] });
  if (saved.active) {
    await safeSend({
      ...saved.active.ref,
      content: `⚠️ Interrupted.\n${interruptedMessage({ ...saved.active, head: saved.active.startedHead })}`,
      ping: true,
    });
  }
  for (const job of saved.queued ?? []) {
    await safeSend({ ...job.ref, content: `⚠️ Dropped.\n${droppedMessage(job)}`, ping: true });
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
  const ref = {
    channelId: message.channelId,
    messageId: message.id,
    authorId: message.author.id,
  };
  const request = stripBotMention(message.content, client.user.id);

  if (isStatusRequest(request)) {
    await safeSend({
      ...ref,
      content: statusMessage({ active: running ? { ...jobRecord(running), authorId: running.ref.authorId } : null, queued: queue.map((job) => ({ ...jobRecord(job), authorId: job.ref.authorId })) }),
      ping: true,
      suppressMentions: true,
    });
    return;
  }

  if (isCancelMineRequest(request)) {
    // Only ever drops this requester's own queued work; the running task is
    // stop's business, and stop is the documented word for it.
    const mine = queue.filter((job) => job.ref.authorId === message.author.id);
    for (const job of mine) queue.splice(queue.indexOf(job), 1);
    await persistJobs();
    await safeSend({
      ...ref,
      content: mine.length
        ? `Removed ${mine.length} of your queued request(s). ${running ? "The running task is unaffected; reply `stop` to end that." : ""}`.trim()
        : "You have no queued requests to cancel.",
      ping: true,
    });
    return;
  }

  if (isStopRequest(request)) {
    const stopped = stopActiveTask();
    await message.react(stopped ? "🛑" : "ℹ️").catch(() => undefined);
    await safeSend({
      ...ref,
      content: stopped
        ? `Stopping the active request now.${queue.length ? ` ${queue.length} queued request(s) remain.` : ""}`
        : "There is no active request to stop.",
      ping: true,
    });
    return;
  }
  if (isDestructiveRequest(request) && !config.destructiveUserIds.has(message.author.id)) {
    await safeSend({
      ...ref,
      content: "⏸️ Blocked. Destructive changes are restricted to the designated maintainers.",
      ping: true,
    });
    return;
  }
  if (isMassDestructiveRequest(request)) {
    await safeSend({
      ...ref,
      content: "⏸️ Blocked. That request is too broad or destructive. Please name the exact files and a scoped, reviewable change.",
      ping: true,
    });
    return;
  }
  if (!request) {
    await safeSend({
      ...ref,
      content: "Tag me with a concrete request. I’ll queue it, run the repository checks, publish approved changes, and report the result here.",
      ping: true,
    });
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
  queue.push({ ref, messageUrl: message.url, request, context });
  await persistJobs();
  await message.react("🔍").catch(() => undefined);
  if (running) {
    await safeSend({ ...ref, content: `Queued. You are number ${queue.length} waiting.`, ping: true });
  }
  void drainQueue().catch((error) =>
    console.error("[discord-agent] queue drain failed", error),
  );
});

client.once(Events.ClientReady, async () => {
  console.log(`[discord-agent] ready as ${client.user.tag}; repo=${ROOT}`);
  await flushOutbox().catch((error) => console.error("[discord-agent] outbox flush failed", error));
  await recoverInterruptedJobs().catch((error) =>
    console.error("[discord-agent] interrupted-job recovery failed", error),
  );
});
client.on(Events.Error, (error) => console.error("[discord-agent] Discord client error", error));
client.on(Events.Warn, (warning) => console.warn("[discord-agent] Discord warning", warning));
client.on(Events.ShardError, (error) => console.error("[discord-agent] Discord shard error", error));

// Last line of defence. Everything that talks to Discord already goes through
// safeSend, but an unhandled rejection is a crash on Node 22, and a crash here
// loses the in-memory queue.
process.on("unhandledRejection", (reason) =>
  console.error("[discord-agent] unhandled rejection", reason),
);
process.on("uncaughtException", (error) => {
  console.error("[discord-agent] uncaught exception; exiting for a clean restart", error);
  killActiveChild();
  try { client.destroy(); } catch {}
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    // Take the agent down with the bridge: a detached Codex process outliving a
    // restart would edit the shared checkout with nothing left to report it.
    killActiveChild();
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
