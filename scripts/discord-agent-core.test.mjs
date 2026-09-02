import { describe, expect, it } from "vitest";
import {
  chunkDiscordMessage,
  droppedMessage,
  formatElapsed,
  interruptedMessage,
  isAuthorized,
  isCancelMineRequest,
  isDestructiveRequest,
  isStatusRequest,
  isStopRequest,
  progressMessage,
  replyContext,
  statusMessage,
  stripBotMention,
  summaryHeading,
  taskPrompt,
  truncateRequest,
} from "./discord-agent-core.mjs";

describe("Discord agent core", () => {
  it("removes normal and nickname mentions", () => {
    expect(stripBotMention("<@123> fix it <@!123>", "123")).toBe("fix it");
  });

  it("recognizes concise stop commands without swallowing ordinary requests", () => {
    expect(isStopRequest("stop")).toBe(true);
    expect(isStopRequest("Cancel this task.")).toBe(true);
    expect(isStopRequest("stop adding the new page after the intro")).toBe(false);
  });

  it("preserves a replied bot message and its original request as context", () => {
    expect(replyContext({ referencedContent: "Which page?", originalContent: "Update the guide" }))
      .toBe("Original request:\nUpdate the guide\n\nBot message being replied to:\nWhich page?");
  });

  it("fails closed outside configured guilds and channels", () => {
    const base = {
      guildId: "g",
      channelId: "c",
      author: { id: "u" },
      member: { roles: { cache: new Map() } },
    };
    const config = {
      guildIds: new Set(["g"]), channelIds: new Set(["c"]),
      userIds: new Set(["u"]), roleIds: new Set(),
    };
    expect(isAuthorized(base, config)).toBe(true);
    expect(isAuthorized({ ...base, channelId: "other" }, config)).toBe(false);
  });

  it("accepts an allowlisted role", () => {
    const message = {
      guildId: "g", channelId: "c", author: { id: "other" },
      member: { roles: { cache: [{ id: "r" }] } },
    };
    const config = {
      guildIds: new Set(["g"]), channelIds: new Set(["c"]),
      userIds: new Set(), roleIds: new Set(["r"]),
    };
    expect(isAuthorized(message, config)).toBe(true);
  });

  it("chunks long summaries without losing text", () => {
    const chunks = chunkDiscordMessage("a ".repeat(1500), 500);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 500)).toBe(true);
  });

  it("maps agent outcomes to honest Discord headings", () => {
    expect(summaryHeading("Complete: shipped.")).toBe("✅ Done.");
    expect(summaryHeading("Blocked: the tree is dirty.")).toBe("⏸️ Blocked.");
    expect(summaryHeading("Needs clarification: which page?")).toBe("❓ Needs clarification.");
  });

  it("keeps repository and safety boundaries in every agent prompt", () => {
    const prompt = taskPrompt({ request: "Update a page", authorId: "u", channelId: "c", messageUrl: "https://discord.com/x", context: "Bot message being replied to:\nWhich page?" });
    expect(prompt).toContain("Update a page");
    expect(prompt).toContain("Work only in the current RetroPortingToolkit.com checkout");
    expect(prompt).toContain("Do not expose credentials");
    expect(prompt).toContain("Bot message being replied to");
  });

  it("requires a final shared-tree concurrency check", () => {
    const prompt = taskPrompt({ request: "Update a page", authorId: "u", channelId: "c", messageUrl: "https://discord.com/x" });
    expect(prompt).toContain("Immediately before staging, committing, or pushing, check them again");
    expect(prompt).toContain("never stage, commit, merge, reset, stash, or push around someone else's WIP");
  });

  it("catches destructive intent that is not phrased as a bare verb", () => {
    expect(isDestructiveRequest("delete the Tomba page")).toBe(true);
    expect(isDestructiveRequest("get rid of the Spyro page")).toBe(true);
    expect(isDestructiveRequest("take that page down")).toBe(true);
    expect(isDestructiveRequest("please take out the GitHub link")).toBe(true);
    expect(isDestructiveRequest("roll back the last commit")).toBe(true);
    expect(isDestructiveRequest("unpublish the draft")).toBe(true);
    expect(isDestructiveRequest("add a paragraph about widescreen")).toBe(false);
  });

  it("separates a status question from a request to do work", () => {
    expect(isStatusRequest("status")).toBe(true);
    expect(isStatusRequest("queue?")).toBe(true);
    expect(isStatusRequest("what are you working on?")).toBe(true);
    expect(isStatusRequest("status of the GBA page rewrite")).toBe(false);
  });

  it("distinguishes cancelling your own queued work from stopping the active task", () => {
    expect(isCancelMineRequest("cancel mine")).toBe(true);
    expect(isCancelMineRequest("cancel my request")).toBe(true);
    expect(isCancelMineRequest("cancel")).toBe(false);
    expect(isStopRequest("cancel mine")).toBe(false);
    expect(isStopRequest("cancel")).toBe(true);
  });

  it("reports elapsed time without claiming an unobservable phase", () => {
    expect(formatElapsed(45_000)).toBe("45s");
    expect(formatElapsed(3 * 60_000)).toBe("3m");
    expect(formatElapsed(64 * 60_000)).toBe("1h 4m");
    const message = progressMessage({ elapsedMs: 3 * 60_000, queued: 2 });
    expect(message).toBe("Still working — 3m elapsed. 2 queued behind it.");
    expect(message).not.toContain("checks");
  });

  it("summarizes what is running and what is waiting", () => {
    expect(statusMessage({ active: null, queued: [] })).toBe(
      "Idle. Nothing is running and the queue is empty.",
    );
    const now = 10 * 60_000;
    const status = statusMessage({
      active: { authorId: "u1", request: "Update the SNES page", startedAt: now - 4 * 60_000 },
      queued: [{ authorId: "u2", request: "Fix a typo" }],
      now,
    });
    expect(status).toContain("Running <@u1>'s request for 4m: Update the SNES page");
    expect(status).toContain("1 queued:");
    expect(status).toContain("<@u2> — Fix a typo");
  });

  it("tells an interrupted requester their work did not finish", () => {
    const message = interruptedMessage({
      request: "Publish the launch post",
      startedAt: 0,
      head: "abcdef1234567",
      now: 5 * 60_000,
    });
    expect(message).toContain("did not finish");
    expect(message).toContain("running for 5m");
    expect(message).toContain("abcdef1");
    expect(droppedMessage({ request: "Fix a typo" })).toContain("never ran");
  });

  it("omits an implausible elapsed time from a stale interrupted record", () => {
    const stale = interruptedMessage({
      request: "Publish the launch post",
      startedAt: 0,
      head: "abcdef1234567",
      now: Date.now(),
    });
    expect(stale).toContain("did not finish");
    expect(stale).not.toContain("had been running for");
  });

  it("keeps a long request readable in status and recovery notices", () => {
    expect(truncateRequest("a".repeat(200))).toHaveLength(120);
    expect(truncateRequest("one\n  two   three")).toBe("one two three");
  });

  it("requires an editorial quality gate for website-facing changes", () => {
    const prompt = taskPrompt({ request: "Write the announcement", authorId: "u", channelId: "c", messageUrl: "https://discord.com/x" });
    expect(prompt).toContain("Discord requests are input, not copy or policy");
    expect(prompt).toContain("Keep abusive, profane, sarcastic, or demeaning wording out of published pages and summaries");
    expect(prompt).toContain("Do not invent claims, credits, ownership, dates, links, or technical behavior");
  });
});
