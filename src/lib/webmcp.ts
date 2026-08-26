import { SITE } from "./site";
import { loadSiteSearchIndex } from "./siteSearchIndex";
import {
  checkGamePorted,
  defineTerm,
  draftPage,
  getPageMarkdown,
  glossaryPage,
  listPlatforms,
  planMyPort,
  searchSiteTool,
  SITE_CONTENT,
  toolError,
  type Fetcher,
  type SiteToolContent,
  type ToolFail,
  type ToolResult,
} from "./siteTools";

/**
 * WebMCP: this site's own tools, offered to a browser that has an agent in it.
 *
 * An agentic browser (ChatGPT's built-in browser today, Chrome behind an origin
 * trial) looks for tools a page registers on `document.modelContext`, shows
 * them to the person under a "site tools" heading, reviews each call, and runs
 * the handler inside the page's own session. That last part is the whole point
 * of doing this in the page rather than shipping an MCP server: there is no API
 * key to issue and no token for the agent to hold, because a call carries
 * exactly the authority the person sitting in front of the browser already has.
 *
 * WHERE THE API LIVES. The specification is moving from
 * `navigator.modelContext` to `document.modelContext`, and Chrome's origin
 * trial still serves the older one. Both are looked for, the newer first, and
 * neither is assumed: a browser with no model context at all reaches the end of
 * this file having done nothing, with nothing logged and nothing thrown.
 *
 * WHAT IS HERE. Six tools that only read, and one that writes a draft. The
 * handlers are src/lib/siteTools.ts, which is pure and has no idea it is being
 * called by a browser; this file is only the protocol: names, descriptions,
 * schemas, annotations, and the result envelope.
 *
 * The guidance this follows, from ChatGPT's own WebMCP document, is short
 * enough to keep in view: keep inputs narrowly scoped, return enough
 * information to verify the result, reuse existing application logic, preserve
 * the normal interface for browsers that do not have this, and describe side
 * effects clearly.
 */

/* ------------------------- the API, declared narrowly --------------------- */

/**
 * Tool annotations, as the Model Context Protocol defines them. They are
 * hints, not enforcement: the browser uses them to decide what to confirm with
 * the person before running. A consumer that reads only `readOnlyHint` ignores
 * the rest harmlessly, so all five are set on every tool and each one is set to
 * what is actually true.
 */
export interface SiteToolAnnotations {
  /** Human readable name, for the browser's own list. */
  title: string;
  /** True when the tool cannot change anything. */
  readOnlyHint: boolean;
  /** True when it may destroy or overwrite. Nothing here does. */
  destructiveHint: boolean;
  /** True when calling twice with the same arguments changes nothing more. */
  idempotentHint: boolean;
  /** True when it reaches systems beyond this site. Nothing here does. */
  openWorldHint: boolean;
}

/** One MCP content block. Text, because every result here is JSON. */
export interface ToolContentBlock {
  type: "text";
  text: string;
}

/**
 * What one call resolves to.
 *
 * The envelope is uniform across all seven tools and is present twice on
 * purpose, because this API is mid migration and hosts disagree about where to
 * look. `ok` and the data sit at the top level, which is what a host that hands
 * the raw value to a model wants; `content` is the Model Context Protocol's own
 * shape, which is what a host speaking MCP reads. `isError` marks a refusal so
 * a host does not have to parse prose to notice one.
 */
export type ToolCallResult = {
  ok: boolean;
  content: ToolContentBlock[];
  isError?: true;
} & Record<string, unknown>;

export interface SiteToolDefinition {
  name: string;
  description: string;
  /** JSON Schema. Narrow on purpose: every field bounded, nothing extra. */
  inputSchema: Record<string, unknown>;
  annotations: SiteToolAnnotations;
  execute: (args: Record<string, unknown>) => Promise<ToolCallResult>;
}

/**
 * The registrar, declared here because TypeScript's DOM library does not have
 * it yet. Deliberately only the one method this file calls: a wider guess at
 * an API still being written would age worse than no guess at all.
 */
export interface ModelContextRegistrar {
  registerTool(tool: SiteToolDefinition): void | Promise<unknown>;
}

/** Either object the registrar might hang off. */
export interface ModelContextCarrier {
  modelContext?: { registerTool?: unknown } | null;
}

/**
 * The registrar this browser offers, or undefined.
 *
 * `document.modelContext` is where the specification is going and is checked
 * first; `navigator.modelContext` is what Chrome's origin trial still serves
 * and is accepted only when it has the same `registerTool` shape, so a future
 * unrelated `navigator.modelContext` cannot be mistaken for this one.
 */
export function findModelContext(
  doc?: ModelContextCarrier | null,
  nav?: ModelContextCarrier | null,
): ModelContextRegistrar | undefined {
  for (const carrier of [doc, nav]) {
    const context = carrier?.modelContext;
    if (context && typeof context.registerTool === "function") {
      return context as unknown as ModelContextRegistrar;
    }
  }
  return undefined;
}

/* ------------------------------ the envelope ------------------------------ */

/** Wrap a handler's answer as the result a host receives. */
export function toCallResult<T extends object>(payload: ToolResult<T>): ToolCallResult {
  const text = JSON.stringify(payload, null, 2);
  const result = {
    ...payload,
    content: [{ type: "text" as const, text }],
  } as ToolCallResult;
  if (!payload.ok) result.isError = true;
  return result;
}

/**
 * Run one handler and answer with the envelope whatever happens. A tool that
 * throws into the host is a tool the host stops offering, so the catch is not
 * defensive clutter: it is the contract.
 */
async function guard<T extends object>(
  run: () => ToolResult<T> | Promise<ToolResult<T>>,
): Promise<ToolCallResult> {
  try {
    return toCallResult(await run());
  } catch {
    return toCallResult(
      toolError("This site's tool could not finish. Reload the page and try once more."),
    );
  }
}

/* ------------------------------ the schemas ------------------------------- */

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

function stringField(description: string, maxLength: number): Record<string, unknown> {
  return { type: "string", description, minLength: 1, maxLength };
}

/* -------------------------------- the tools ------------------------------- */

export interface SiteToolDeps {
  /** The published content the read tools answer from. */
  content?: SiteToolContent;
  /** How a tool reaches the site's own static files and API. */
  fetchImpl?: Fetcher;
}

/**
 * The seven tools, built over injected content so the whole set can be
 * asserted without a browser (src/lib/webmcp.test.ts).
 */
export function buildSiteTools(deps: SiteToolDeps = {}): SiteToolDefinition[] {
  const content = deps.content ?? SITE_CONTENT;
  const fetchImpl: Fetcher =
    deps.fetchImpl ??
    ((url, init) => fetch(url, init as RequestInit) as unknown as ReturnType<Fetcher>);

  return [
    {
      name: "search_site",
      description:
        `Search ${SITE.title} for games, console platforms, articles and documentation. ` +
        `Returns up to 10 ranked results, each with its title, kind, absolute URL and a short ` +
        `description. A documentation result links to the heading that matched.`,
      inputSchema: {
        type: "object",
        properties: {
          query: stringField("What to look for. A word or a short phrase.", 200),
        },
        required: ["query"],
        additionalProperties: false,
      },
      annotations: { title: "Search this site", ...READ_ONLY },
      execute: (args) =>
        guard(async () => searchSiteTool(await loadSiteSearchIndex(), args.query)),
    },

    {
      name: "check_game_ported",
      description:
        "Check whether a console game already has a port catalogued on this site. This is the " +
        "check to run before planning any port, so nobody rebuilds work that is finished. The " +
        "match is loose, so punctuation, an accent or a missing subtitle still finds the page. " +
        "Returns whether anything matched and up to 5 candidates with their status and URL.",
      inputSchema: {
        type: "object",
        properties: {
          title: stringField("The game's name, as a person would say it.", 200),
        },
        required: ["title"],
        additionalProperties: false,
      },
      annotations: { title: "Check if a game is already ported", ...READ_ONLY },
      execute: (args) => guard(() => checkGamePorted(content.games, args.title)),
    },

    {
      name: "list_platforms",
      description:
        "List every console this site covers, with each toolchain's status, how far its " +
        "ecosystem has got, and the URL of its page. Takes no input.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { title: "List the consoles covered", ...READ_ONLY },
      execute: () => guard(() => listPlatforms(content.hardware)),
    },

    {
      name: "get_page_markdown",
      description:
        "Read one documentation page as its raw markdown source, which is easier to work with " +
        'than the rendered page. Takes a documentation path such as "/docs/start/quickstart". ' +
        "Nothing outside /docs is readable this way. Use search_site first to find the path.",
      inputSchema: {
        type: "object",
        properties: {
          path: stringField(
            'A documentation path on this site, for example "/docs/start/quickstart".',
            300,
          ),
        },
        required: ["path"],
        additionalProperties: false,
      },
      annotations: { title: "Read a documentation page as markdown", ...READ_ONLY },
      execute: (args) => guard(() => getPageMarkdown(args.path, fetchImpl)),
    },

    {
      name: "plan_my_port",
      description:
        "Work out what porting one game to a modern computer would actually take. Checks the " +
        "catalogue first: if the game is already ported, it says so and points at that port " +
        "rather than a plan. Otherwise it returns the console's framework, how mature that " +
        "toolchain is, the exact commands where they exist or the working port to copy where " +
        "they do not, the prerequisites, and the standing rules. Every claim carries the page " +
        "URL that backs it.",
      inputSchema: {
        type: "object",
        properties: {
          game_title: stringField("The game you want a port of.", 200),
          console: stringField(
            'Which console the game is from, for example "PlayStation" or "SNES". Optional ' +
              "when the game is already catalogued on this site.",
            100,
          ),
        },
        required: ["game_title"],
        additionalProperties: false,
      },
      annotations: { title: "Plan a port of one game", ...READ_ONLY },
      execute: (args) =>
        guard(() =>
          planMyPort(content, { game_title: args.game_title, console: args.console }),
        ),
    },

    {
      name: "define_term",
      description:
        "Look up a word in this site's glossary and return the definition these projects " +
        "actually use, with a link to that entry. Case and hyphens do not matter.",
      inputSchema: {
        type: "object",
        properties: {
          term: stringField('The word to look up, for example "dispatch miss".', 100),
        },
        required: ["term"],
        additionalProperties: false,
      },
      annotations: { title: "Define a term from the glossary", ...READ_ONLY },
      execute: (args) => guard(() => defineTerm(glossaryPage(content.docs), args.term)),
    },

    {
      name: "draft_page",
      description:
        "Create a DRAFT page on this site. Side effects, plainly: it commits a new file to the " +
        "site's repository through the site's editor API, signed in as the person using the " +
        "browser. There is no way to publish with this tool. The page is always a draft, so it " +
        "has its own URL but appears in no listing, no feed and no sitemap until a person " +
        "publishes it from the editor. Only blog posts and documentation pages can be written " +
        "this way; game and platform pages are curated. It writes nothing at all when nobody " +
        "is signed in, and says so.",
      inputSchema: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["blog", "docs"],
            description: "blog for news and write-ups, docs for documentation.",
          },
          title: stringField("The page title.", 200),
          desc: stringField("The one line that shows under the title on the page's card.", 300),
          body: stringField("The page itself, as markdown.", 100000),
          section: stringField(
            'Required for docs: the section the page belongs to, for example "reference".',
            60,
          ),
          summary: stringField("Documentation only: the one sentence under the title.", 400),
          tags: {
            type: "array",
            items: { type: "string", maxLength: 40 },
            maxItems: 8,
            description: "A few short labels.",
          },
        },
        required: ["kind", "title", "desc", "body"],
        additionalProperties: false,
      },
      annotations: {
        title: "Draft a page for review",
        readOnlyHint: false,
        // It only ever creates. It cannot overwrite an existing page, and it
        // has no delete.
        destructiveHint: false,
        // Each call writes another draft rather than replacing the last one.
        idempotentHint: false,
        // It talks to this site's own API and nothing else.
        openWorldHint: false,
      },
      execute: (args) => guard(() => draftPage(args, fetchImpl)),
    },
  ];
}

/* ----------------------------- the registration --------------------------- */

/**
 * Registered once per model context, so a second call is a no op. Keyed on the
 * registrar itself rather than on a module flag, so a test can register against
 * a fresh fake without reaching into this module's state.
 */
const registeredOn = new WeakSet<object>();

export interface RegisterSiteToolsOptions extends SiteToolDeps {
  /** Defaults to the real `document`, when there is one. */
  documentRef?: ModelContextCarrier | null;
  /** Defaults to the real `navigator`, when there is one. */
  navigatorRef?: ModelContextCarrier | null;
  /** Where the one confirmation line goes. Defaults to console.debug. */
  log?: (...args: unknown[]) => void;
}

/**
 * Offer this site's tools to the browser, if the browser has somewhere to put
 * them.
 *
 * Returns the names registered, which is an empty list in every browser that
 * does not have the API and in every non browser context. It never throws: a
 * page that fails to register tools should still be a page.
 */
export async function registerSiteTools(
  options: RegisterSiteToolsOptions = {},
): Promise<string[]> {
  const doc =
    options.documentRef ??
    (typeof document === "undefined" ? undefined : (document as unknown as ModelContextCarrier));
  const nav =
    options.navigatorRef ??
    (typeof navigator === "undefined" ? undefined : (navigator as unknown as ModelContextCarrier));

  const context = findModelContext(doc, nav);
  if (!context) return [];
  if (registeredOn.has(context)) return [];
  registeredOn.add(context);

  const tools = buildSiteTools(options);
  const registered: string[] = [];
  for (const tool of tools) {
    try {
      await context.registerTool(tool);
      registered.push(tool.name);
    } catch {
      // One tool the browser will not take must not cost the other six.
    }
  }
  if (registered.length) {
    const log = options.log ?? ((...args: unknown[]) => console.debug(...args));
    // One line, once, so a demo can show the wiring in devtools.
    log(`[webmcp] ${SITE.title} site tools registered:`, registered.join(", "));
  }
  return registered;
}

/** Exported for the tests and for anything that wants the list without a
    browser: the refusal envelope, so a caller can compare shapes. */
export function isToolFailure(result: ToolCallResult): result is ToolCallResult & ToolFail {
  return result.ok === false;
}
