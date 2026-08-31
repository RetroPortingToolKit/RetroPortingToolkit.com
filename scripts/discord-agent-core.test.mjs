import { describe, expect, it } from "vitest";
import {
  chunkDiscordMessage,
  isAuthorized,
  isStopRequest,
  replyContext,
  stripBotMention,
  summaryHeading,
  taskPrompt,
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
});
