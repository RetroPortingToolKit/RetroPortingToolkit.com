/**
 * The bridge, run for real as a child process, against a stubbed Discord, a
 * fake agent and a throwaway git repository. This is where queueing and the
 * shared-checkout behaviour are actually exercised: the unit tests cover the
 * pure functions, and nothing else does this.
 *
 * Each scenario gets its own bridge, repo and state dir. Timings are seconds,
 * not minutes, via the DISCORD_AGENT_* overrides.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

// Each scenario spawns a real bridge and waits on second-long timings, so the
// default 5s per test is not enough; 40s is generous and only bites on a hang.
vi.setConfig({ testTimeout: 40_000, hookTimeout: 20_000 });
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BRIDGE = path.join(HERE, "discord-agent.mjs");
const HOOKS = path.join(HERE, "discord-agent-harness", "hooks.mjs");
const FAKE_BIN = path.join(HERE, "discord-agent-harness", "bin");
const ADMIN = "admin", PUBLIC = "public";

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rpt-harness-repo-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe" }).toString();
  git("init", "-q", "-b", "main");
  git("config", "user.email", "harness@example.com"); git("config", "user.name", "Harness");
  fs.writeFileSync(path.join(dir, "README.md"), "hello\n");
  // The real roster, so the bot resolves usernames the way production will.
  fs.mkdirSync(path.join(dir, "data"));
  fs.copyFileSync(path.join(HERE, "..", "data", "team.json"), path.join(dir, "data", "team.json"));
  git("add", "README.md", "data/team.json"); git("commit", "-q", "-m", "init");
  // The initial commit must be old enough not to count as "someone busy".
  git("commit", "-q", "--amend", "--no-edit", "--date", "2020-01-01T00:00:00");
  return { dir, git };
}

function startBridge({ repo, env = {}, state = fs.mkdtempSync(path.join(os.tmpdir(), "rpt-harness-state-")) }) {
  const child = spawn(process.execPath, ["--import", HOOKS, BRIDGE], {
    env: {
      PATH: `${FAKE_BIN}:${path.dirname(process.execPath)}:/usr/bin:/bin:/usr/local/bin`,
      HOME: os.homedir(),
      DISCORD_BOT_TOKEN: "fake",
      DISCORD_ALLOWED_GUILD_IDS: "G", // the stub stamps every message with guild "G"
      DISCORD_ALLOWED_CHANNEL_IDS: ADMIN,
      DISCORD_PUBLIC_CHANNEL_IDS: PUBLIC,
      DISCORD_ALLOWED_USER_IDS: "U1,U2,U3",
      DISCORD_AGENT_STATE_DIR: state,
      DISCORD_AGENT_REPO: repo.dir,
      DISCORD_AGENT_QUIET_MS: "1000",
      DISCORD_AGENT_SETTLE_MS: "200",
      DISCORD_AGENT_IDLE_MS: "2000",
      DISCORD_AGENT_TIMEOUT_MS: "30000",
      DISCORD_AGENT_ASK_TIMEOUT_MS: "30000",
      DISCORD_AGENT_PROGRESS_MS: "300",
      ...env,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const events = []; const logs = []; let buf = "";
  child.stdout.on("data", (d) => {
    buf += d;
    const lines = buf.split("\n"); buf = lines.pop();
    for (const l of lines) {
      if (l.startsWith("@@")) events.push(JSON.parse(l.slice(2)));
      else logs.push({ t: Date.now(), line: l });
    }
  });
  child.stderr.on("data", (d) => logs.push({ t: Date.now(), line: "[stderr] " + d }));
  const t0 = Date.now();
  const send = (channelId, authorId, content, extra = {}) => {
    const id = `m${Date.now()}${Math.floor(Math.random() * 1000)}`;
    child.stdin.write(JSON.stringify({ channelId, authorId, id, content: `<@BOT> ${content}`, ...extra }) + "\n");
    return id;
  };
  const waitFor = (pred, timeoutMs = 15000, label = "condition") => new Promise((res, rej) => {
    const started = Date.now();
    const tick = () => {
      const hit = events.find(pred);
      if (hit) return res(hit);
      if (Date.now() - started > timeoutMs) return rej(new Error(`timed out waiting for ${label}\nevents:\n${events.map(e => `  +${e.t - t0}ms ${e.kind} ${e.messageId ?? ""}: ${e.content.slice(0, 90)}`).join("\n")}\nlogs:\n${logs.slice(-15).map((l) => l.line).join("\n")}`));
      setTimeout(tick, 50);
    };
    tick();
  });
  const ready = new Promise((res, rej) => {
    const started = Date.now();
    const tick = () => {
      if (logs.some((l) => l.line.includes("ready as"))) return res();
      if (Date.now() - started > 10000) return rej(new Error("bridge never became ready:\n" + logs.map((l) => l.line).join("\n")));
      setTimeout(tick, 25);
    };
    tick();
  });
  const stop = () => { try { child.kill("SIGTERM"); } catch {} };
  const agentStartedAt = (messageId) => logs.find((l) => l.line.includes(`task ${messageId} log:`))?.t ?? null;
  return { child, events, logs, send, waitFor, ready, stop, t0, state, agentStartedAt };
}

const bridges = [];
afterEach(() => { for (const b of bridges.splice(0)) b.stop(); });

async function up(opts = {}) {
  const repo = opts.repo ?? makeRepo();
  const b = startBridge({ repo, ...opts });
  bridges.push(b);
  await b.ready;
  return { ...b, repo };
}
// Replies and sends only, never edits: the status line's "Last: …" quotes the
// agent's trace, which can contain the very text a scenario is waiting for.
const forMsg = (id, text) => (e) => e.kind !== "edit" && e.messageId === id && (text instanceof RegExp ? text.test(e.content) : e.content.includes(text));
// First notice and the 15-minute repeat use different words; either means "parked".
const PARKED = /Waiting for the shared checkout|shared checkout is busy|Still waiting for the shared checkout/;
const parkedFor = (id) => (e) => e.messageId === id && PARKED.test(e.content);

describe("bridge harness: queueing and the shared checkout", () => {
  it("runs three simultaneous publish requests one at a time, in order, telling each its place", async () => {
    const b = await up();
    const a = b.send(ADMIN, "U1", "first [[sleep=1]]");
    const c = b.send(ADMIN, "U2", "second [[sleep=1]]");
    const d = b.send(ADMIN, "U1", "third [[sleep=1]]");
    await b.waitFor(forMsg(a, "On it"), 8000, "On it for #1");
    await b.waitFor(forMsg(c, "Queued. You are number 1 waiting"), 8000, "queue position for #2");
    await b.waitFor(forMsg(d, "Queued. You are number 2 waiting"), 8000, "queue position for #3");
    // The one that starts at once is never told it is queued, and nobody is
    // told a position twice: three arrivals in the same tick used to produce
    // "number 2" for the first and nothing for the second.
    expect(b.events.filter((e) => e.messageId === a && e.content.startsWith("Queued"))).toHaveLength(0);
    for (const id of [c, d]) {
      expect(b.events.filter((e) => e.messageId === id && e.content.startsWith("Queued"))).toHaveLength(1);
    }
    const doneA = await b.waitFor(forMsg(a, "OK: first"), 20000, "#1 summary");
    const doneC = await b.waitFor(forMsg(c, "OK: second"), 20000, "#2 summary");
    const doneD = await b.waitFor(forMsg(d, "OK: third"), 20000, "#3 summary");
    // Strictly sequential: each finishes after the previous, never interleaved.
    expect(doneA.t).toBeLessThan(doneC.t);
    expect(doneC.t).toBeLessThan(doneD.t);
    const startC = b.events.find((e) => e.messageId === c && e.content.includes("On it"));
    expect(startC.t).toBeGreaterThanOrEqual(doneA.t);
  });

  it("answers a public question while a publish task is still running", async () => {
    const b = await up();
    const pub = b.send(ADMIN, "U1", "long task [[sleep=4]]");
    await b.waitFor(forMsg(pub, "On it"), 8000, "publish started");
    const ask = b.send(PUBLIC, "STRANGER", "what is this site? [[sleep=1]]");
    const answered = await b.waitFor(forMsg(ask, "OK: what is this site"), 10000, "ask answered");
    const pubDone = await b.waitFor(forMsg(pub, "OK: long task"), 15000, "publish summary");
    expect(answered.t).toBeLessThan(pubDone.t);
  });

  it("parks a publish request while someone has uncommitted work, and starts it by itself once the tree is clean", async () => {
    const b = await up();
    fs.writeFileSync(path.join(b.repo.dir, "someone-elses-edit.txt"), "wip\n");
    const id = b.send(ADMIN, "U1", "please wait for me [[sleep=1]]");
    await b.waitFor(parkedFor(id), 8000, "busy notice");
    expect(b.events.some((e) => e.messageId === id && e.content.includes("OK:"))).toBe(false);
    fs.rmSync(path.join(b.repo.dir, "someone-elses-edit.txt"));
    const done = await b.waitFor(forMsg(id, "OK: please wait"), 20000, "started on its own after the tree cleared");
    expect(done).toBeTruthy();
  });

  it("waits out the quiet period after a fresh commit rather than starting on top of it", async () => {
    // `git log --format=%ct` is whole seconds, so the bridge's idea of "when
    // was the last commit" is up to 999ms early. A 1s window cannot be
    // measured against that; 3s can, with a 1s allowance. At the production
    // 20s the same error is noise.
    const b = await up({ env: { DISCORD_AGENT_QUIET_MS: "3000" } });
    fs.writeFileSync(path.join(b.repo.dir, "README.md"), "changed\n");
    b.repo.git("commit", "-qam", "someone just committed");
    const committedAt = Date.now();
    const id = b.send(ADMIN, "U1", "after commit [[sleep=0]]");
    // "On it." is deliberately immediate; the agent itself must not start
    // inside the 1000ms quiet period this harness configures.
    await b.waitFor(forMsg(id, "OK: after commit"), 15000, "finished after the quiet period");
    const startedAt = b.agentStartedAt(id);
    expect(startedAt).not.toBeNull();
    expect(startedAt - committedAt).toBeGreaterThanOrEqual(1900);
  });

  it("stops an agent that goes silent, reports it, and moves on to the next request", async () => {
    const b = await up();
    const dead = b.send(ADMIN, "U1", "hang forever [[silent]]");
    const next = b.send(ADMIN, "U2", "after the hang [[sleep=0]]");
    const failed = await b.waitFor(forMsg(dead, "went silent"), 12000, "watchdog report");
    expect(failed.content).toMatch(/did not complete/);
    // The watchdog is 2s here; it must not have taken anything like the 30s cap.
    expect(failed.t - b.t0).toBeLessThan(10000);
    await b.waitFor(forMsg(next, "OK: after the hang"), 15000, "next job ran");
  });

  it("reports Blocked when a run leaves the checkout dirty, and the next request parks until it is cleaned", async () => {
    const b = await up();
    const messy = b.send(ADMIN, "U1", "leave a mess [[dirty]]");
    const blocked = await b.waitFor(forMsg(messy, "Blocked"), 12000, "blocked verdict");
    expect(blocked.content).toMatch(/uncommitted changes/);
    const later = b.send(ADMIN, "U2", "after the mess [[sleep=0]]");
    await b.waitFor(parkedFor(later), 8000, "parked behind the mess");
    fs.rmSync(path.join(b.repo.dir, "left-behind.txt"));
    await b.waitFor(forMsg(later, "OK: after the mess"), 20000, "ran once cleaned");
  });

  it("surfaces an agent error as a failed task, not a success", async () => {
    const b = await up();
    const id = b.send(ADMIN, "U1", "break [[fail]]");
    const r = await b.waitFor(forMsg(id, "did not complete"), 12000, "failure report");
    expect(r.content).toMatch(/failed on purpose/);
  });

  it("rate-limits a public asker, and lets a different person through", async () => {
    const b = await up();
    const first = b.send(PUBLIC, "S1", "q one [[sleep=0]]");
    await b.waitFor(forMsg(first, "OK: q one"), 10000, "first answer");
    const second = b.send(PUBLIC, "S1", "q two [[sleep=0]]");
    const other = b.send(PUBLIC, "S2", "q three [[sleep=0]]");
    await b.waitFor((e) => e.messageId === second && e.kind === "react" && e.content === "🕒", 8000, "cooldown reaction");
    await b.waitFor(forMsg(other, "OK: q three"), 10000, "other person answered");
    expect(b.events.some((e) => e.messageId === second && e.content.includes("OK:"))).toBe(false);
  });

  it("posts a question's answer as an answer, with no status heading or checks talk", async () => {
    const b = await up();
    const id = b.send(ADMIN, "U1", "what is the role of Shokunin [[question]]");
    const reply = await b.waitFor(forMsg(id, "Shokunin does"), 12000, "the answer");
    expect(reply.content).toBe("Shokunin does UI/UX, frontend and marketing.");
    expect(reply.content).not.toMatch(/Done|\[answer\]|checks|nothing (was )?changed/i);
  });

  it("keeps one status line per request, edits it through waiting and working, and deletes it with the queued notice when done", async () => {
    const b = await up();
    fs.writeFileSync(path.join(b.repo.dir, "wip.txt"), "someone editing\n");
    const first = b.send(ADMIN, "U1", "held [[sleep=1]]");
    const second = b.send(ADMIN, "U2", "behind it [[sleep=0]]");
    const onIt = await b.waitFor(forMsg(first, "On it"), 8000, "status created");
    const queued = await b.waitFor(forMsg(second, "Queued. You are number 1"), 8000, "queued notice");
    await b.waitFor((e) => e.kind === "edit" && e.id === onIt.id && /Waiting for the shared checkout/.test(e.content), 8000, "edited to waiting");
    fs.rmSync(path.join(b.repo.dir, "wip.txt"));
    await b.waitFor((e) => e.kind === "edit" && e.id === onIt.id && /Still working/.test(e.content), 15000, "edited to working");
    await b.waitFor(forMsg(first, "OK: held"), 15000, "summary");
    await b.waitFor((e) => e.kind === "delete" && e.id === onIt.id, 5000, "status deleted");
    await b.waitFor(forMsg(second, "OK: behind it"), 15000, "second summary");
    await b.waitFor((e) => e.kind === "delete" && e.id === queued.id, 5000, "queued notice deleted");
    // Exactly one status line ever existed for the first request: no second
    // "On it." on the retry, no separate "Still waiting" notices.
    expect(b.events.filter((e) => e.messageId === first && (e.kind === "reply" || e.kind === "send") && /On it|Still working|Waiting for|checkout is busy/.test(e.content))).toHaveLength(1);
    const summary = b.events.find(forMsg(first, "OK: held"));
    expect(b.events.some((e) => e.kind === "delete" && e.id === summary.id)).toBe(false);
  });

  it("resumes a request that a restart interrupted while waiting, and restores the queue behind it", async () => {
    const repo = makeRepo();
    fs.writeFileSync(path.join(repo.dir, "wip.txt"), "someone editing\n");
    const a = await up({ repo });
    const first = a.send(ADMIN, "U1", "survive the restart [[sleep=0]]");
    const second = a.send(ADMIN, "U2", "queued through it [[sleep=0]]");
    const status = await a.waitFor(forMsg(first, "On it"), 8000, "status before restart");
    await a.waitFor((e) => e.kind === "edit" && e.id === status.id && /Waiting/.test(e.content), 8000, "waiting before restart");
    await a.waitFor(forMsg(second, "Queued"), 8000, "queued before restart");
    a.stop();
    await new Promise((r) => setTimeout(r, 800));
    fs.rmSync(path.join(repo.dir, "wip.txt"));
    const b = await up({ repo, state: a.state });
    await b.waitFor((e) => e.kind === "delete" && e.id === status.id, 8000, "old status line tidied");
    await b.waitFor(forMsg(first, "I restarted before finishing this"), 8000, "resumed notice");
    await b.waitFor(forMsg(first, "OK: survive the restart"), 15000, "resumed and finished");
    await b.waitFor(forMsg(second, "OK: queued through it"), 15000, "queue restored");
    expect(b.events.some((e) => /Interrupted|Dropped/.test(e.content))).toBe(false);
  });

  it("parks on commit churn — a clean tree that keeps committing — instead of starting on top of it", async () => {
    // Quiet period 3s, but the wait gives up after 1.5s. With a commit landing
    // every second the wait always times out with a clean tree and a recent
    // commit, which used to be treated as "go".
    const b = await up({ env: { DISCORD_AGENT_QUIET_MS: "3000", DISCORD_AGENT_WAIT_MS: "1500" } });
    let n = 0;
    const churn = setInterval(() => {
      fs.writeFileSync(path.join(b.repo.dir, "README.md"), `edit ${++n}\n`);
      b.repo.git("commit", "-qam", `churn ${n}`);
    }, 1000);
    const id = b.send(ADMIN, "U1", "during churn [[sleep=0]]");
    await b.waitFor(parkedFor(id), 8000, "parked while commits keep landing");
    expect(b.agentStartedAt(id)).toBeNull();
    await new Promise((r) => setTimeout(r, 2500));
    expect(b.agentStartedAt(id)).toBeNull();
    clearInterval(churn);
    const done = await b.waitFor(forMsg(id, "OK: during churn"), 20000, "started once the commits stopped");
    expect(done.t - Date.now()).toBeLessThan(0);
  });

  it("downloads a trusted author's attachment and hands the agent its path", async () => {
    // A tiny server standing in for Discord's CDN.
    const body = "# Introducing Retro Porting Toolkit\n\nOver the past couple of years…\n";
    const server = http.createServer((req, res) => { res.writeHead(200, { "content-type": "text/markdown" }); res.end(body); });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const url = `http://127.0.0.1:${server.address().port}/Introducing%20Retro%20Porting%20Toolkit.md`;
    try {
      const b = await up();
      const id = b.send(ADMIN, "U1", "take this and make a blog post [[attachment]]", {
        attachments: [{ name: "Introducing Retro Porting Toolkit.md", url, size: body.length, contentType: "text/markdown" }],
      });
      const done = await b.waitFor(forMsg(id, "OK: attachment says"), 15000, "agent read the file");
      expect(done.content).toContain("# Introducing Retro Porting Toolkit");
      const logDir = path.join(b.state, "task-logs");
      const log = fs.readdirSync(logDir).map((f) => fs.readFileSync(path.join(logDir, f), "utf8")).join("\n");
      expect(log).toMatch(/attachment: Introducing Retro Porting Toolkit\.md -> /);
    } finally {
      server.close();
    }
  });

  it("does not fetch a stranger's attachment in a public channel", async () => {
    let hits = 0;
    const server = http.createServer((req, res) => { hits++; res.end("secret"); });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    try {
      const b = await up();
      const id = b.send(PUBLIC, "STRANGER", "read this [[sleep=0]]", {
        attachments: [{ name: "x.md", url: `http://127.0.0.1:${server.address().port}/x.md`, size: 6, contentType: "text/markdown" }],
      });
      await b.waitFor(forMsg(id, "OK: read this"), 10000, "answered");
      expect(hits).toBe(0);
    } finally {
      server.close();
    }
  });

  it("tells the agent who asked, by team name, and gives it the roster", async () => {
    const b = await up();
    const id = b.send(ADMIN, "U1", "who am I [[whoami]]", { username: "tetrisgm", display: "shokunin" });
    const r = await b.waitFor(forMsg(id, "OK: Requester:"), 12000, "requester line");
    expect(r.content).toContain("Requester: Shokunin (a team member; Discord tetrisgm)");
    expect(r.content).toMatch(/roster=[1-9]/);
  });

  it("says so when the requester is not on the team page", async () => {
    const b = await up();
    const id = b.send(ADMIN, "U2", "who am I [[whoami]]", { username: "someone-new" });
    const r = await b.waitFor(forMsg(id, "OK: Requester:"), 12000, "requester line");
    expect(r.content).toContain("Discord user someone-new, who is not on the team page");
  });

  it("says what the agent last did in the progress line", async () => {
    const b = await up({ env: { DISCORD_AGENT_QUIET_MS: "0" } });
    // Progress posts every 60s in production and is not overridable; the
    // trace itself is what this checks, via the task log the bridge wrote.
    const id = b.send(ADMIN, "U1", "trace me [[sleep=1]]");
    await b.waitFor(forMsg(id, "OK: trace me"), 15000, "done");
    const logDir = path.join(b.state, "task-logs");
    const log = fs.readdirSync(logDir).map((f) => fs.readFileSync(path.join(logDir, f), "utf8")).join("\n");
    expect(log).toMatch(/\d\d:\d\d:\d\d started/);
    expect(log).toMatch(/Bash: tick/);
    expect(log).toMatch(/done: OK: trace me/);
  });
});
