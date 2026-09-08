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
  agentCommand,
  askInterruptedMessage,
  canRequestDestructive,
  containsSensitiveContent,
  askPrompt,
  channelMode,
  chunkDiscordMessage,
  cooldownRemaining,
  formatElapsed,
  interruptedMessage,
  isCancelMineRequest,
  checkoutBusyReason,
  isAuthorized,
  isDestructiveRequest,
  isMassDestructiveRequest,
  isRunnerUnavailable,
  isStatusRequest,
  isStopRequest,
  parseCsv,
  progressMessage,
  pulseChanged,
  replyContext,
  runnerChain,
  runnerCooldownUntil,
  parseStreamResult,
  traceStreamLine,
  statusMessage,
  stripBotMention,
  presentSummary,
  resumedMessage,
  taskPrompt,
} from "./discord-agent-core.mjs";

// Every timing below, and the checkout itself, can be overridden from the
// environment. The defaults are the production values; the overrides exist so
// the bridge can be run against a throwaway repository with second-long
// waits by scripts/discord-agent.harness.test.mjs, which is the only way the
// queueing and shared-checkout behaviour gets exercised without a live Discord.
const envMs = (name, fallback) => {
  const raw = process.env[name];
  const value = raw === undefined || raw === "" ? NaN : Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};
const ROOT =
  process.env.DISCORD_AGENT_REPO ||
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const config = {
  guildIds: parseCsv(process.env.DISCORD_ALLOWED_GUILD_IDS),
  channelIds: parseCsv(process.env.DISCORD_ALLOWED_CHANNEL_IDS),
  publicChannelIds: parseCsv(process.env.DISCORD_PUBLIC_CHANNEL_IDS),
  userIds: parseCsv(process.env.DISCORD_ALLOWED_USER_IDS),
  roleIds: parseCsv(process.env.DISCORD_ALLOWED_ROLE_IDS),
  destructiveUserIds: parseCsv(process.env.DISCORD_DESTRUCTIVE_USER_IDS),
  destructiveRoleIds: parseCsv(process.env.DISCORD_DESTRUCTIVE_ROLE_IDS),
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
// When a runner last said it was out of credit, and until when. Survives a
// restart: a quota does not reset because the bridge did.
const COOLDOWNS_FILE = path.join(STATE_DIR, "runner-cooldowns.json");
const TASK_LOG_MAX_BYTES = 2 * 1024 * 1024;
const TASK_LOGS_KEPT = 20;
const PROGRESS_INTERVAL_MS = envMs("DISCORD_AGENT_PROGRESS_MS", 60_000);
// The hard cap is a backstop. The watchdog below is what actually catches a
// dead run: one that finished its work and then sat idle held the queue for
// the whole of the old fifteen minutes.
const AGENT_TIMEOUT_MS = envMs("DISCORD_AGENT_TIMEOUT_MS", 10 * 60 * 1_000);
// No event from the agent for this long means it is dead, not slow. A working
// run at low effort emits something every few seconds; the build step, the
// longest silent stretch, is under a minute.
const IDLE_TIMEOUT_MS = envMs("DISCORD_AGENT_IDLE_MS", 3 * 60 * 1_000);
// Public questions get their own, much shorter budget, and one at a time. A
// question is not allowed to cost what a publish costs.
const ASK_TIMEOUT_MS = envMs("DISCORD_AGENT_ASK_TIMEOUT_MS", 4 * 60 * 1_000);
const ASK_COOLDOWN_MS = envMs("DISCORD_AGENT_ASK_COOLDOWN_MS", 45_000);
const ASK_QUEUE_LIMIT = 5;
// Files a trusted author attaches to a request are downloaded into the run's
// temp dir and handed to the agent by path. Bounded, because a request is one
// post's worth of material, not a media library.
const MAX_ATTACHMENTS = 8;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const ATTACHMENT_FETCH_MS = 60_000;
// A busy shared checkout is a wait, not a failure. Someone editing the repo by
// hand is normal and usually brief, so a request parks and retries instead of
// being thrown away.
const CHECKOUT_WAIT_MS = envMs("DISCORD_AGENT_WAIT_MS", 5 * 60 * 1_000);
// Waiting is the bot's job, not the requester's. A request parks for as long as
// the repository stays busy and starts itself when it goes quiet; the cap only
// exists so a tree left dirty overnight eventually reports something instead of
// sitting silently forever.
const CHECKOUT_PATIENCE_MS = envMs("DISCORD_AGENT_PATIENCE_MS", 6 * 60 * 60 * 1_000);
// A reply that could not be delivered is spooled; this is how often the spool
// is retried while the process lives, so a Discord blip does not hold replies
// until the next restart.
const OUTBOX_FLUSH_MS = envMs("DISCORD_AGENT_OUTBOX_MS", 5 * 60 * 1_000);
// How long the repository must have been untouched before the agent starts, and
// how long a quiet reading has to hold before it is believed.
// Was 90s. Every request paid it in full, because the previous request's own
// commit counted as "someone busy" — the bot was waiting for itself. 20s is
// still long enough that a person mid-edit, who saves every few seconds,
// keeps the tree busy.
const QUIET_PERIOD_MS = envMs("DISCORD_AGENT_QUIET_MS", 20 * 1_000);
const SETTLE_MS = envMs("DISCORD_AGENT_SETTLE_MS", 5_000);

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

// The answer-only lane. Deliberately separate from the publishing queue: a
// public question must never delay a maintainer's publish, and a long publish
// must never make the community channel look dead.
const askQueue = [];
let askRunning = null;
let askChild = null;
const lastAskAt = new Map();

class TaskStoppedError extends Error {}
class SensitiveAnswerError extends Error {}
/** The tree was dirty before any work began, so the job can simply wait. */
class CheckoutBusyError extends Error {}
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
  // Write-then-rename, so a crash mid-write leaves the previous file rather
  // than half of the new one. A torn jobs.json reads as "nothing to recover",
  // which loses the queue and the notices about it, silently.
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  await fs.rename(tmp, file);
}

function jobRecord(job) {
  return {
    ref: job.ref,
    messageUrl: job.messageUrl ?? null,
    request: job.request,
    context: job.context ?? "",
    startedAt: job.startedAt ?? null,
    startedHead: job.startedHead ?? null,
    attachments: job.attachments ?? [],
    // So a restart can tidy the previous process's status line.
    statusMessageId: job.status?.id ?? null,
    queuedNoticeId: job.queuedNotice?.id ?? null,
  };
}

async function persistJobs() {
  try {
    await writeJson(JOBS_FILE, {
      active: running ? jobRecord(running) : null,
      queued: queue.map(jobRecord),
      askActive: askRunning ? jobRecord(askRunning) : null,
      askQueued: askQueue.map(jobRecord),
    });
  } catch (error) {
    console.error("[discord-agent] could not persist job state", error);
  }
}

/**
 * Deliver by ID rather than through a live Message object, so a reply still
 * works after a restart when the original object is long gone.
 */
const SUPPRESS_EMBEDS = 1 << 2;

async function deliver({ channelId, messageId, content, ping = false, suppressMentions = false, suppressEmbeds = false }) {
  const channel = await client.channels.fetch(channelId);
  const allowedMentions = suppressMentions
    ? { parse: [], repliedUser: ping }
    : { repliedUser: ping };
  // Belt and braces with the prompt's angle brackets: a link the model forgot
  // to wrap still cannot expand into a preview card.
  const payload = { content, allowedMentions, ...(suppressEmbeds ? { flags: SUPPRESS_EMBEDS } : {}) };
  const target = messageId
    ? await channel.messages.fetch(messageId).catch(() => null)
    : null;
  if (target) return target.reply(payload);
  return channel.send(payload);
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

async function replyChunks(ref, heading, body, options = {}) {
  const chunks = chunkDiscordMessage(body);
  for (let i = 0; i < chunks.length; i++) {
    await safeSend({
      ...ref,
      // A heading of "" is the answer lane: no blank first line before the text.
      content: heading || i > 0 ? `${i === 0 ? heading : "Continued:"}\n${chunks[i]}` : chunks[i],
      ping: i === 0,
      ...options,
    });
  }
}

async function gitSnapshot() {
  const [{ stdout: status }, { stdout: last }] = await Promise.all([
    execFileAsync("git", ["status", "--porcelain"], { cwd: ROOT }),
    execFileAsync("git", ["log", "-1", "--format=%H %ct"], { cwd: ROOT }),
  ]);
  const [head = "", committedAt = ""] = last.trim().split(" ");
  return {
    status: status.trim(),
    head,
    lastCommitMs: Number(committedAt) * 1000,
  };
}

/**
 * Wait for the checkout to be quiet, not merely clean, and then for it to stay
 * that way across a settle window before handing it to the agent. Starting the
 * moment a tree looks clean is what walked a request into someone else's
 * session between two of their commits.
 */
async function waitForQuietCheckout(timeoutMs, onWait) {
  const started = Date.now();
  const deadline = started + timeoutMs;
  let previous = null;
  while (true) {
    const pulse = await gitSnapshot();
    const reason = checkoutBusyReason(pulse, Date.now(), QUIET_PERIOD_MS);
    if (!reason && !pulseChanged(previous, pulse)) return pulse;
    if (Date.now() >= deadline) return { ...pulse, busyReason: reason ?? "the tree kept changing" };
    if (reason) {
      previous = null;
      onWait?.(reason);
    } else {
      // Looked quiet once; confirm it is still identical a moment later.
      previous = pulse;
    }
    // A wait that has already gone on for a minute is someone's working
    // session, not a moment; polling git every few seconds for hours on end
    // buys nothing. Settling a quiet reading stays quick.
    const interval = reason && Date.now() - started > 60_000 ? SETTLE_MS * 3 : SETTLE_MS;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

function safeAgentEnv(runner) {
  const env = { ...process.env };
  delete env.DISCORD_BOT_TOKEN;
  // Only the paid tier gets the API key. The "claude" tier must NOT see it, or
  // the CLI would bill prepaid credits for work the subscription already
  // covers, which is the whole reason that tier is tried first.
  if (runner !== "claude-api") delete env.ANTHROPIC_API_KEY;
  return env;
}

class RunnerUnavailableError extends Error {
  constructor(message, output = "") {
    super(message);
    this.output = output;
  }
}

/**
 * Run one agent attempt. Resolves with the produced text, or throws
 * RunnerUnavailableError when this runner cannot serve at all (out of credits,
 * expired auth, not installed) so the caller can try the next one.
 */
function runAgentOnce({ runner, mode, prompt, outputFile, taskLog, timeoutMs, onSpawn, onTimeout, onActivity }) {
  const { command, args, resultFrom } = agentCommand({ runner, mode, root: ROOT, outputFile });
  return new Promise((resolve, reject) => {
    let stdout = ""; // only for runners that answer on plain stdout
    let streamResult = null; // the last "result" event of a stream-json run
    let diagnostics = "";
    let pending = ""; // partial stream line between chunks
    let idle = null;
    const stop = (why) => {
      try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); }
      reject(new Error(why));
    };
    const alive = () => {
      if (idle) clearTimeout(idle);
      idle = setTimeout(
        () => stop(`The ${runner} agent went silent for ${Math.round(IDLE_TIMEOUT_MS / 60_000)} minutes and was stopped.`),
        IDLE_TIMEOUT_MS,
      );
      idle.unref();
    };
    const trace = (chunk) => {
      pending += chunk;
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        // The answer is the last result event. Keeping only that, rather than
        // the whole stream, is what bounds memory: tool output rides along in
        // these events and a long run can be many megabytes of it.
        const result = parseStreamResult(line);
        if (result) streamResult = result;
        const entry = traceStreamLine(line);
        if (!entry) continue;
        taskLog.write(entry + "\n");
        onActivity?.(entry);
      }
    };
    const note = (text) => {
      // Bounded: only enough tail to classify the failure.
      diagnostics = (diagnostics + text).slice(-4_000);
    };
    let child;
    try {
      child = spawn(command, args, {
        cwd: ROOT,
        env: safeAgentEnv(runner),
        stdio: ["pipe", "pipe", "pipe"],
        detached: true,
      });
    } catch (error) {
      reject(new RunnerUnavailableError(`${runner} could not start: ${error.message}`));
      return;
    }
    onSpawn?.(child);
    const timeout = setTimeout(() => {
      onTimeout?.();
      stop(`The ${runner} agent exceeded its time limit and was stopped.`);
    }, timeoutMs);
    timeout.unref();
    alive();
    child.stdin.on("error", (error) => note(String(error.message)));
    child.stdin.end(prompt);
    child.stdout.on("data", (data) => {
      alive();
      const text = data.toString();
      if (resultFrom === "stream") {
        trace(text);
      } else {
        taskLog.write(data);
        if (resultFrom === "stdout") stdout += text;
      }
      note(text);
    });
    child.stderr.on("data", (data) => {
      alive();
      taskLog.write(data);
      note(data.toString());
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      if (idle) clearTimeout(idle);
      if (error.code === "ENOENT") {
        reject(new RunnerUnavailableError(`${runner} is not installed`));
        return;
      }
      reject(error);
    });
    child.once("close", async (code) => {
      clearTimeout(timeout);
      if (idle) clearTimeout(idle);
      if (pending) trace("\n");
      const fromFile =
        resultFrom === "file"
          ? (await fs.readFile(outputFile, "utf8").catch(() => "")).trim()
          : "";
      let text;
      if (resultFrom === "stream") {
        if (streamResult?.isError) {
          reject(new Error(streamResult.text || `${runner} reported an error.`));
          return;
        }
        text = streamResult?.text ?? "";
      } else {
        text = (resultFrom === "stdout" ? stdout : fromFile).trim();
      }
      if (code !== 0 || !text) {
        if (isRunnerUnavailable(diagnostics)) {
          reject(new RunnerUnavailableError(`${runner} is unavailable`, diagnostics));
          return;
        }
        reject(new Error(text || `${runner} exited with status ${code}.`));
        return;
      }
      resolve(text);
    });
  });
}

/**
 * Codex first, Claude as the standby. A runner that cannot serve hands over
 * rather than failing the request; anything else is a real failure and is
 * reported as one.
 */
async function readCooldowns() {
  try {
    const parsed = JSON.parse(await fs.readFile(COOLDOWNS_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function noteCooldown(runner, until) {
  const cooldowns = { ...(await readCooldowns()), [runner]: until };
  await fs
    .writeFile(COOLDOWNS_FILE, JSON.stringify(cooldowns, null, 2))
    .catch((error) => console.warn(`[discord-agent] could not record cooldown: ${error.message}`));
  console.warn(
    `[discord-agent] ${runner} is out of credit; not trying it again until ${new Date(until).toISOString()}`,
  );
}

async function runAgent(options) {
  const unavailable = [];
  const cooldowns = await readCooldowns();
  for (const runner of runnerChain({
    hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
    cooldowns,
    mode: options.mode,
  })) {
    try {
      const text = await runAgentOnce({ ...options, runner });
      if (runner !== "codex") {
        console.log(`[discord-agent] served by fallback runner: ${runner}`);
      }
      return { text, runner };
    } catch (error) {
      if (error instanceof RunnerUnavailableError) {
        console.warn(`[discord-agent] ${error.message}; trying the next runner`);
        // A quota is not a transient error: it will say the same thing on every
        // request until it resets, and each of those attempts is dead time in
        // front of someone waiting in a chat window.
        const until = runnerCooldownUntil(error.output ?? "");
        if (until) await noteCooldown(runner, until);
        unavailable.push(runner);
        continue;
      }
      throw error;
    }
  }
  void alertMaintainers(unavailable);
  throw new Error(
    `No agent runner is available right now (tried ${unavailable.join(", ")}). This needs a maintainer to restore Codex credits, re-authenticate the Claude CLI, or set the API key.`,
  );
}

let lastRunnerAlertAt = 0;
/**
 * Subscription auth expires, and an unattended process cannot renew it. Without
 * this the only symptom is community members being told to try later, which
 * nobody with the ability to fix it would ever see.
 */
async function alertMaintainers(unavailable) {
  const now = Date.now();
  if (now - lastRunnerAlertAt < 60 * 60 * 1_000) return;
  lastRunnerAlertAt = now;
  for (const channelId of config.channelIds) {
    await safeSend({
      channelId,
      content: `⚠️ No agent runner is available (tried ${unavailable.join(", ")}), so requests are failing. Restore Codex credits, re-run \`claude\` login, or add the API key to the Keychain, then restart the bridge.`,
    });
  }
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

/**
 * What a message carries besides text. Only the metadata is kept on the job;
 * the bytes are fetched when the run starts, so a request that waits or is
 * resumed after a restart still gets its files (Discord's links stay valid
 * for a day).
 */
function attachmentsOf(message) {
  const list = [];
  for (const a of message.attachments?.values?.() ?? []) {
    if (!a?.url || !a.name) continue;
    list.push({ name: String(a.name), url: String(a.url), size: Number(a.size) || 0, contentType: a.contentType || "" });
  }
  return list;
}

/** Fetch a job's attachments into dir; returns what the agent can be told. */
async function fetchAttachments(job, dir) {
  const files = [];
  const wanted = (job.attachments ?? []).slice(0, MAX_ATTACHMENTS);
  if (!wanted.length) return files;
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  for (const [i, a] of wanted.entries()) {
    if (a.size > MAX_ATTACHMENT_BYTES) {
      files.push({ ...a, path: null, skipped: `larger than ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB` });
      continue;
    }
    // A name is data from the message, not a path: keep the basename only.
    const safe = path.basename(a.name).replace(/[^\w.@+-]+/g, "_").slice(0, 120) || `attachment-${i + 1}`;
    const file = path.join(dir, `${i + 1}-${safe}`);
    try {
      const res = await fetch(a.url, { signal: AbortSignal.timeout(ATTACHMENT_FETCH_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length > MAX_ATTACHMENT_BYTES) throw new Error("larger than allowed");
      await fs.writeFile(file, bytes, { mode: 0o600 });
      files.push({ ...a, size: bytes.length, path: file });
    } catch (error) {
      console.warn(`[discord-agent] attachment ${safe} not fetched: ${error.message}`);
      files.push({ ...a, path: null, skipped: "could not be downloaded" });
    }
  }
  return files;
}

async function runPublish(job) {
  const starting = await waitForQuietCheckout(CHECKOUT_WAIT_MS, () => {
    if (job.phase !== "waiting") {
      job.phase = "waiting";
      job.waitingSince ??= Date.now();
      void updateStatus(job);
    }
  });
  // Both the dirty tree and the wait that timed out on commit churn (clean
  // tree, someone committing every few seconds) are "busy": the second used
  // to slip through because only the status string was checked, and the agent
  // started on top of an active session.
  if (starting.status || starting.busyReason) {
    throw new CheckoutBusyError();
  }
  job.phase = "running";
  job.agentStartedAt = Date.now();
  void updateStatus(job);
  job.startedHead = starting.head;
  await persistJobs();

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rpt-discord-agent-"));
  const outputFile = path.join(tempDir, "final.txt");
  const taskLog = await createTaskLog(job.ref.messageId);
  console.log(`[discord-agent] task ${job.ref.messageId} log: ${taskLog.file}`);
  const attachments = await fetchAttachments(job, path.join(tempDir, "attachments"));
  for (const a of attachments) {
    taskLog.write(`attachment: ${a.name} ${a.path ? `-> ${a.path}` : `(skipped: ${a.skipped})`}\n`);
  }
  const prompt = taskPrompt({
    request: job.request,
    authorId: job.ref.authorId,
    channelId: job.ref.channelId,
    messageUrl: job.messageUrl,
    context: job.context,
    attachments,
  });
  try {
    if (job.stopRequested) throw new TaskStoppedError("Stopped before the agent started.");
    const { text: summary } = await runAgent({
      mode: "publish",
      prompt,
      outputFile,
      taskLog,
      timeoutMs: AGENT_TIMEOUT_MS,
      onSpawn: (child) => { activeChild = child; },
      onTimeout: () => { job.timeout = true; },
      onActivity: (entry) => { job.lastActivity = entry; },
    });
    if (job.stopRequested) throw new TaskStoppedError("The active agent process was terminated.");
    // What matters is whether THIS request's work landed, not whether the tree
    // is pristine. Someone starting an unrelated edit halfway through used to
    // fail a finished request; their files are simply not ours to care about,
    // because the agent stages its own paths by name.
    const ending = await gitSnapshot();
    const published = ending.head !== starting.head;
    if (!published && ending.status) {
      throw new SharedCheckoutConflictError(
        "Blocked: the agent left uncommitted changes in the shared checkout and nothing was published. The tree needs a look before anything else runs.",
      );
    }
    return summary || "Task completed, but the agent returned no summary.";
  } finally {
    activeChild = null; // "stop" must not aim at a process that already exited
    await taskLog.close();
    await pruneTaskLogs();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * Answer a public question. The runner is fenced to reading the checkout
 * (see agentCommand), askPrompt's source rules keep unpublished material out
 * of the answer, and containsSensitiveContent is the last check on the way
 * out.
 */
async function runAsk(job) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rpt-discord-ask-"));
  const outputFile = path.join(tempDir, "answer.txt");
  const taskLog = await createTaskLog(`ask-${job.ref.messageId}`);
  const prompt = askPrompt({
    question: job.request,
    authorId: job.ref.authorId,
    channelId: job.ref.channelId,
  });
  try {
    const { text: answer } = await runAgent({
      mode: "ask",
      prompt,
      outputFile,
      taskLog,
      timeoutMs: ASK_TIMEOUT_MS,
      onSpawn: (child) => { askChild = child; },
    });
    // The output guard, not the prompt, is what actually holds. If an answer
    // carries a credential or an internal path, something got through the
    // instructions and the channel must not see it.
    if (containsSensitiveContent(answer)) {
      console.error(`[discord-agent] withheld an answer containing sensitive content; see ${taskLog.file}`);
      throw new SensitiveAnswerError("withheld");
    }
    return answer;
  } finally {
    askChild = null;
    await taskLog.close();
    await pruneTaskLogs();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function drainAskQueue() {
  if (askRunning || !askQueue.length) return;
  askRunning = askQueue.shift();
  const job = askRunning;
  job.startedAt = Date.now();
  try {
    await persistJobs();
    const answer = await runAsk(job);
    await replyChunks(job.ref, "", answer, { suppressEmbeds: true });
  } catch (error) {
    // Public channel: say something useful without narrating the internals of
    // which runner failed or why.
    console.error("[discord-agent] ask failed", error);
    await safeSend({
      ...job.ref,
      content: "Sorry — I couldn’t answer that just now. Try again in a bit, or browse the site directly at https://retroportingtoolkit.com.",
      ping: true,
    });
  } finally {
    askRunning = null;
    await persistJobs();
    void drainAskQueue().catch((error) =>
      console.error("[discord-agent] ask drain failed", error),
    );
  }
}

async function handleAsk(message, ref, question) {
  if (!question) {
    await safeSend({
      ...ref,
      content: "Ask me anything about the project and the consoles and games it covers, and I’ll answer from the site.",
      ping: true,
    });
    return;
  }
  const waitMs = cooldownRemaining(lastAskAt.get(ref.authorId), Date.now(), ASK_COOLDOWN_MS);
  if (waitMs > 0) {
    await message.react("🕒").catch(() => undefined);
    return;
  }
  if (askQueue.length >= ASK_QUEUE_LIMIT) {
    await safeSend({
      ...ref,
      content: "I have a few questions lined up already — try me again in a minute.",
      ping: true,
    });
    return;
  }
  lastAskAt.set(ref.authorId, Date.now());
  // One entry per person who ever asked, forever, is a slow leak; anything
  // past the window is irrelevant and can go.
  for (const [who, at] of lastAskAt) if (Date.now() - at > ASK_COOLDOWN_MS) lastAskAt.delete(who);
  askQueue.push({ ref, request: question });
  await persistJobs();
  await message.react("💬").catch(() => undefined);
  void drainAskQueue().catch((error) =>
    console.error("[discord-agent] ask drain failed", error),
  );
}

function killChildProcess(child) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
  const killTimer = setTimeout(() => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }, 5000);
  killTimer.unref();
}

function killAllChildren() {
  killChildProcess(activeChild);
  killChildProcess(askChild);
}

function stopActiveTask() {
  if (!running) return false;
  running.stopRequested = true;
  killChildProcess(activeChild);
  return true;
}

function statusText(job) {
  if (job.phase === "waiting") {
    return progressMessage({ elapsedMs: Date.now() - job.waitingSince, phase: "waiting" });
  }
  // The last trace line, with its timestamp trimmed off: "Still working —
  // 3m elapsed. Last: Bash: npm run build" tells a reader whether it is
  // moving, which "3m elapsed" alone never could.
  const last = job.lastActivity ? job.lastActivity.replace(/^\d\d:\d\d:\d\d /, "").slice(0, 140) : "";
  return progressMessage({
    elapsedMs: Date.now() - (job.agentStartedAt ?? job.startedAt),
    queued: queue.length,
    last,
  });
}

/** Edit the request's one status line to match its phase; never throws. */
async function updateStatus(job, content = statusText(job)) {
  try {
    if (job.status?.edit) await job.status.edit({ content });
    else job.status = await deliver({ ...job.ref, content, ping: true });
  } catch (error) {
    console.error("[discord-agent] status update failed", error);
  }
}

function startStatusTicker(job) {
  if (job.ticker) return;
  job.ticker = setInterval(() => void updateStatus(job), PROGRESS_INTERVAL_MS);
  job.ticker.unref();
}

/** The request is over, one way or another: its transient messages go. */
async function clearStatus(job) {
  if (job.ticker) clearInterval(job.ticker);
  job.ticker = null;
  for (const m of [job.status, job.queuedNotice]) {
    if (m?.delete) await m.delete().catch(() => undefined);
  }
  job.status = null;
  job.queuedNotice = null;
}

/** Delete a message this process never held, by id; best effort. */
async function deleteById(channelId, messageId) {
  if (!messageId) return;
  try {
    const channel = await client.channels.fetch(channelId);
    const m = await channel.messages.fetch(messageId).catch(() => null);
    if (m?.delete) await m.delete();
  } catch {}
}

async function drainQueue() {
  if (running || !queue.length) return;
  running = queue.shift();
  const job = running;
  job.startedAt ??= Date.now();
  let parked = false;
  try {
    await persistJobs();
    // One status line per request, created on its first turn and edited from
    // then on. A parked request comes back through here on every retry, and
    // each pass used to post a fresh "On it." and a fresh progress message.
    if (!job.status) {
      await updateStatus(job, job.resumed ? resumedMessage() : `On it.${queue.length ? ` ${queue.length} queued.` : ""}`);
      // Persist again now that the status line exists: a restart during the
      // wait reads its id from here to tidy it, and the first persist above
      // happened before it was posted.
      await persistJobs();
    }
    startStatusTicker(job);
    const summary = await runPublish(job);
    const { heading, body } = presentSummary(summary);
    await replyChunks(job.ref, heading, body);
  } catch (error) {
    if (error instanceof CheckoutBusyError) {
      job.waitingSince ??= Date.now();
      const waited = Date.now() - job.waitingSince;
      if (waited < CHECKOUT_PATIENCE_MS) {
        // Back of the queue, so one parked request cannot starve the others.
        // Its status line keeps ticking as "waiting" in the meantime.
        parked = true;
        queue.push(job);
        console.warn(`[discord-agent] checkout busy; still holding (${formatElapsed(waited)})`);
        return;
      }
      await replyChunks(
        job.ref,
        "⏸️ Blocked.",
        `The shared checkout has been busy for ${formatElapsed(waited)}, so this request never started and nothing was published. Someone has left work in the tree; once it is committed or cleared, send this again.`,
      );
      return;
    }
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
    if (!parked) await clearStatus(job);
    running = null;
    await persistJobs();
    void drainQueue().catch((error) =>
      console.error("[discord-agent] queue drain failed", error),
    );
  }
}

/**
 * Pick up where the previous process left off. Queued requests continue; an
 * active one resumes if the tree is clean and is reported if it is not; the
 * old status lines are removed either way. Silence is the one outcome a
 * requester cannot act on, so a dropped question is at least told so.
 */
async function recoverInterruptedJobs() {
  const saved = await readJson(JOBS_FILE, null);
  if (!saved) return;
  await writeJson(JOBS_FILE, { active: null, queued: [], askActive: null, askQueued: [] });
  // The previous process's status lines are stale the moment it died.
  for (const job of [saved.active, ...(saved.queued ?? [])].filter(Boolean)) {
    await deleteById(job.ref.channelId, job.statusMessageId);
    await deleteById(job.ref.channelId, job.queuedNoticeId);
  }
  const revive = (job) => ({ ref: job.ref, messageUrl: job.messageUrl, request: job.request, context: job.context ?? "", attachments: job.attachments ?? [] });
  if (saved.active) {
    // An interrupted run is resumed when the tree is clean: that means it was
    // killed before it changed anything, usually while waiting for the
    // checkout, and the request itself is exactly what it was. A dirty tree
    // means it died mid-edit, and that needs eyes before anything else runs.
    const pulse = await gitSnapshot().catch(() => null);
    if (pulse && !pulse.status) {
      queue.unshift({ ...revive(saved.active), resumed: true });
    } else {
      await safeSend({
        ...saved.active.ref,
        content: `⚠️ Interrupted.\n${interruptedMessage({ ...saved.active, head: saved.active.startedHead })}`,
        ping: true,
      });
    }
  }
  // Queued requests never started; they lose nothing by simply continuing.
  for (const job of saved.queued ?? []) queue.push(revive(job));
  if (queue.length) {
    await persistJobs();
    void drainQueue().catch((error) => console.error("[discord-agent] queue drain failed", error));
  }
  // A dropped question needs no talk of commits or a dirty tree; nothing it did
  // could have changed anything.
  if (saved.askActive) {
    await safeSend({ ...saved.askActive.ref, content: askInterruptedMessage(), ping: true });
  }
  for (const job of saved.askQueued ?? []) {
    await safeSend({ ...job.ref, content: askInterruptedMessage(), ping: true });
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

  const mode = channelMode(message, config);
  if (mode === "ignore") return;
  const ref = {
    channelId: message.channelId,
    messageId: message.id,
    authorId: message.author.id,
  };
  const request = stripBotMention(message.content, client.user.id);
  if (mode === "denied") {
    await safeSend({
      ...ref,
      content: "Publishing here is restricted to approved developers. Ask me about the site in the community channels and I’ll answer from what it publishes.",
      ping: true,
    });
    return;
  }
  if (mode === "ask") {
    await handleAsk(message, ref, request);
    return;
  }

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
  if (isDestructiveRequest(request) && !canRequestDestructive(message, config)) {
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
  // Files on the message itself, and on a trusted author's message it replies
  // to ("take this and make a post" under an upload). A stranger's upload is
  // never fetched: the reply chain can carry an unauthorised message.
  const attachments = attachmentsOf(message);
  if (addressedByReply && referenced && !referenced.author?.bot && isAuthorized(referenced, config)) {
    attachments.push(...attachmentsOf(referenced));
  }
  if (!request && !attachments.length) {
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
  // The bot replies to unauthorized users too ("publishing here is
  // restricted"), so walking the reply chain could otherwise carry a
  // stranger's text into the trusted publishing prompt. Only an authorized
  // author's message is inherited as context.
  const originalIsTrusted =
    original && !original.author?.bot && isAuthorized(original, config);
  const context = addressedByReply
    ? replyContext({
        referencedContent: referenced?.content || "",
        originalContent: originalIsTrusted ? original.content : "",
      })
    : "";
  const job = { ref, messageUrl: message.url, request: request || "Use the attached file(s).", context, attachments };
  queue.push(job);
  // The place in line is decided here, in the same synchronous step as the
  // push. Everything below awaits, and three requests arriving together used
  // to read the queue after each other's pushes and drains: the first was
  // told "Queued. You are number 2", the second was told nothing. A request
  // that will start at once (nothing running, nothing ahead) gets no notice;
  // "On it." from the drain is its acknowledgement.
  const ahead = (running ? 1 : 0) + queue.length - 1;
  await persistJobs();
  await message.react("🔍").catch(() => undefined);
  if (ahead > 0) {
    job.queuedNotice = await safeSend({ ...ref, content: `Queued. You are number ${ahead} waiting.`, ping: true });
    await persistJobs(); // its id, for a restart to tidy
  }
  void drainQueue().catch((error) =>
    console.error("[discord-agent] queue drain failed", error),
  );
});

client.once(Events.ClientReady, async () => {
  console.log(`[discord-agent] ready as ${client.user.tag}; repo=${ROOT}`);
  await flushOutbox().catch((error) => console.error("[discord-agent] outbox flush failed", error));
  const outboxTimer = setInterval(
    () => void flushOutbox().catch((error) => console.error("[discord-agent] outbox flush failed", error)),
    OUTBOX_FLUSH_MS,
  );
  outboxTimer.unref();
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
  killAllChildren();
  try { client.destroy(); } catch {}
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    // Take the agent down with the bridge: a detached Codex process outliving a
    // restart would edit the shared checkout with nothing left to report it.
    killAllChildren();
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
