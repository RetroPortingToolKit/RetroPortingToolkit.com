import { describe, expect, it, vi } from "vitest";
import {
  buildSiteTools,
  findModelContext,
  registerSiteTools,
  toCallResult,
  type ModelContextCarrier,
  type SiteToolDefinition,
  type ToolCallResult,
} from "./webmcp";
import { DOCS, GAMES, HARDWARE } from "./content";
import { toolError, type Fetcher, type HttpResponse } from "./siteTools";

/* ------------------------------- the fakes -------------------------------- */

interface Recorder {
  carrier: ModelContextCarrier;
  registered: SiteToolDefinition[];
}

/** A browser that has the API, recording what a page registers. */
function fakeBrowser(onRegister?: (tool: SiteToolDefinition) => void): Recorder {
  const registered: SiteToolDefinition[] = [];
  return {
    carrier: {
      modelContext: {
        registerTool: (tool: SiteToolDefinition) => {
          onRegister?.(tool);
          registered.push(tool);
        },
      },
    },
    registered,
  };
}

const fetchNothing: Fetcher = async () => {
  const res: HttpResponse = {
    ok: false,
    status: 404,
    headers: { get: () => null },
    text: async () => "",
  };
  return res;
};

const DEPS = {
  content: { games: GAMES, hardware: HARDWARE, docs: DOCS },
  fetchImpl: fetchNothing,
};

const TOOL_NAMES = [
  "search_site",
  "check_game_ported",
  "list_platforms",
  "get_page_markdown",
  "plan_my_port",
  "define_term",
  "draft_page",
];

/* --------------------------- finding the registrar ------------------------ */

describe("finding the model context", () => {
  it("prefers document.modelContext, which is where the spec is going", () => {
    const doc = fakeBrowser();
    const nav = fakeBrowser();
    const found = findModelContext(doc.carrier, nav.carrier);
    found!.registerTool({ name: "x" } as SiteToolDefinition);
    expect(doc.registered).toHaveLength(1);
    expect(nav.registered).toHaveLength(0);
  });

  it("falls back to navigator.modelContext, which Chrome's origin trial serves", () => {
    const nav = fakeBrowser();
    const found = findModelContext(undefined, nav.carrier);
    found!.registerTool({ name: "x" } as SiteToolDefinition);
    expect(nav.registered).toHaveLength(1);
  });

  it("ignores a modelContext that is not this API, and finds nothing when there is none", () => {
    expect(findModelContext({ modelContext: {} }, undefined)).toBeUndefined();
    expect(findModelContext({ modelContext: { registerTool: 3 } }, undefined)).toBeUndefined();
    expect(findModelContext({ modelContext: null }, { modelContext: null })).toBeUndefined();
    expect(findModelContext(undefined, undefined)).toBeUndefined();
    expect(findModelContext(null, null)).toBeUndefined();
  });
});

/* ------------------------------ registration ------------------------------ */

describe("registerSiteTools", () => {
  it("registers all seven tools, once, and says so once", async () => {
    const browser = fakeBrowser();
    const log = vi.fn();
    const names = await registerSiteTools({ ...DEPS, documentRef: browser.carrier, log });
    expect(names).toEqual(TOOL_NAMES);
    expect(browser.registered.map((t) => t.name)).toEqual(TOOL_NAMES);
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0][1])).toContain("search_site");
  });

  it("is idempotent: a second call on the same browser registers nothing more", async () => {
    const browser = fakeBrowser();
    const log = vi.fn();
    await registerSiteTools({ ...DEPS, documentRef: browser.carrier, log });
    const again = await registerSiteTools({ ...DEPS, documentRef: browser.carrier, log });
    expect(again).toEqual([]);
    expect(browser.registered).toHaveLength(TOOL_NAMES.length);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("does nothing at all in a browser without the API", async () => {
    const log = vi.fn();
    const names = await registerSiteTools({
      ...DEPS,
      documentRef: {},
      navigatorRef: {},
      log,
    });
    expect(names).toEqual([]);
    expect(log).not.toHaveBeenCalled();
  });

  it("keeps the other tools when the browser refuses one", async () => {
    const browser = fakeBrowser((tool) => {
      if (tool.name === "draft_page") throw new Error("host says no");
    });
    const names = await registerSiteTools({ ...DEPS, documentRef: browser.carrier, log: () => {} });
    expect(names).toContain("search_site");
    expect(names).not.toContain("draft_page");
    expect(names).toHaveLength(TOOL_NAMES.length - 1);
  });
});

/* -------------------------------- the shapes ------------------------------ */

const tools = buildSiteTools(DEPS);
const byName = new Map(tools.map((t) => [t.name, t]));

describe("the tool definitions", () => {
  it("are the seven the site offers, each named once", () => {
    expect(tools.map((t) => t.name)).toEqual(TOOL_NAMES);
    expect(new Set(tools.map((t) => t.name)).size).toBe(tools.length);
  });

  it("carry a JSON Schema that is closed and bounded", () => {
    for (const tool of tools) {
      const schema = tool.inputSchema as {
        type: string;
        properties: Record<string, Record<string, unknown>>;
        required?: string[];
        additionalProperties: boolean;
      };
      expect(schema.type, tool.name).toBe("object");
      expect(schema.additionalProperties, tool.name).toBe(false);
      expect(typeof schema.properties, tool.name).toBe("object");
      for (const name of schema.required ?? []) {
        expect(schema.properties[name], `${tool.name}.${name}`).toBeDefined();
      }
      // Narrowly scoped inputs: every string a caller can send has a ceiling,
      // and every field says what it is for.
      for (const [field, spec] of Object.entries(schema.properties)) {
        expect(spec.description ?? spec.enum, `${tool.name}.${field}`).toBeTruthy();
        if (spec.type === "string") {
          // Bounded either by a ceiling on its length or by a list of the only
          // values it may take.
          const bounded = typeof spec.maxLength === "number" || Array.isArray(spec.enum);
          expect(bounded, `${tool.name}.${field}`).toBe(true);
        }
        if (spec.type === "array") {
          expect(typeof spec.maxItems, `${tool.name}.${field}`).toBe("number");
        }
      }
    }
  });

  it("annotate the six read tools as read only, and nothing else", () => {
    for (const tool of tools) {
      const a = tool.annotations;
      expect(a.title, tool.name).toBeTruthy();
      expect(a.openWorldHint, tool.name).toBe(false);
      expect(a.destructiveHint, tool.name).toBe(false);
      if (tool.name === "draft_page") continue;
      expect(a.readOnlyHint, tool.name).toBe(true);
      expect(a.idempotentHint, tool.name).toBe(true);
    }
    const draft = byName.get("draft_page")!.annotations;
    expect(draft.readOnlyHint).toBe(false);
    // It only ever creates a new draft, so it destroys nothing and repeating
    // the call makes another page rather than the same one.
    expect(draft.destructiveHint).toBe(false);
    expect(draft.idempotentHint).toBe(false);
    expect(draft.openWorldHint).toBe(false);
  });

  it("describe the one tool with side effects as having them", () => {
    const description = byName.get("draft_page")!.description;
    expect(description).toContain("DRAFT");
    expect(description).toContain("commits");
    expect(description).toMatch(/no listing/);
    // and no read tool claims to write
    for (const tool of tools) {
      if (tool.name === "draft_page") continue;
      expect(tool.description, tool.name).not.toMatch(/\bcommit|\bwrite\b|\bpublish\b/i);
    }
  });

  it("keep the house rule on dashes", () => {
    for (const tool of tools) {
      const text = `${tool.description} ${tool.annotations.title} ${JSON.stringify(tool.inputSchema)}`;
      expect(text, tool.name).not.toMatch(/[–—]/);
    }
  });
});

/* ------------------------------- the envelope ----------------------------- */

async function call(name: string, args: Record<string, unknown> = {}): Promise<ToolCallResult> {
  return byName.get(name)!.execute(args);
}

/** Every result, whatever it is, has to look like this. */
function expectEnvelope(result: ToolCallResult, name: string) {
  expect(typeof result.ok, name).toBe("boolean");
  expect(Array.isArray(result.content), name).toBe(true);
  expect(result.content[0].type, name).toBe("text");
  expect(JSON.parse(result.content[0].text).ok, name).toBe(result.ok);
  if (result.ok) {
    expect(result.isError, name).toBeUndefined();
    expect(result.error, name).toBeUndefined();
  } else {
    expect(result.isError, name).toBe(true);
    expect(typeof result.error, name).toBe("string");
    expect(String(result.error).length, name).toBeGreaterThan(10);
  }
}

describe("the result envelope", () => {
  it("holds for a good call on every tool", async () => {
    const good: Record<string, Record<string, unknown>> = {
      search_site: { query: "tomba" },
      check_game_ported: { title: "Tomba" },
      list_platforms: {},
      plan_my_port: { game_title: "Tomba" },
      define_term: { term: "dispatch miss" },
    };
    for (const [name, args] of Object.entries(good)) {
      const result = await call(name, args);
      expectEnvelope(result, name);
      expect(result.ok, name).toBe(true);
    }
  });

  it("holds for a refusal on every tool", async () => {
    const bad: Record<string, Record<string, unknown>> = {
      search_site: {},
      check_game_ported: { title: "" },
      get_page_markdown: { path: "https://evil.example/docs" },
      plan_my_port: {},
      define_term: { term: "flux capacitor" },
      draft_page: { kind: "games", title: "x", desc: "x", body: "x" },
    };
    for (const [name, args] of Object.entries(bad)) {
      const result = await call(name, args);
      expectEnvelope(result, name);
      expect(result.ok, name).toBe(false);
    }
  });

  it("answers rather than throwing when a handler breaks", async () => {
    const broken = buildSiteTools({
      ...DEPS,
      fetchImpl: () => {
        throw new Error("the network is on fire");
      },
    });
    const result = await broken
      .find((t) => t.name === "get_page_markdown")!
      .execute({ path: "/docs/start/quickstart" });
    expectEnvelope(result, "get_page_markdown");
    expect(result.ok).toBe(false);
  });

  it("finds the game through the tool, not only through the handler", async () => {
    const result = await call("search_site", { query: "tomba" });
    const results = (result as unknown as { results: { title: string; url: string }[] }).results;
    expect(results[0].title).toBe("Tomba!");
    expect(results[0].url).toBe("https://retroportingtoolkit.com/games/tomba");
  });

  it("marks a refusal as an error for a host that speaks MCP", () => {
    const refusal = toCallResult(toolError("Nothing doing, for a plainly stated reason."));
    expect(refusal.isError).toBe(true);
    expect(refusal.ok).toBe(false);
    const fine = toCallResult({ ok: true as const, count: 1 });
    expect(fine.isError).toBeUndefined();
    expect(fine.count).toBe(1);
  });
});
