// Cloudflare Worker for retroportingtoolkit.com. Static assets are served
// straight from dist (see wrangler.jsonc); this script runs for /api/* and
// hosts the three server endpoints. /api/cms/* and /api/newsletter/* reach
// their handlers with the subpath in ?__sub=, the shape the handlers expect.
import * as cms from "../api/cms";
import * as newsletter from "../api/newsletter";
import * as submissions from "../api/submissions";

type Handlers = { GET(req: Request): Promise<Response>; POST(req: Request): Promise<Response> };

const ROUTES: Record<string, Handlers> = {
  "/api/cms": cms,
  "/api/newsletter": newsletter,
  "/api/submissions": submissions,
};

export function route(request: Request): { handlers: Handlers; request: Request } | null {
  const url = new URL(request.url);
  for (const [base, handlers] of Object.entries(ROUTES)) {
    if (url.pathname === base) return { handlers, request };
    if (url.pathname.startsWith(base + "/") && base !== "/api/submissions") {
      url.searchParams.set("__sub", url.pathname.slice(base.length + 1));
      url.pathname = base;
      return { handlers, request: new Request(url, request) };
    }
  }
  return null;
}

export default {
  async fetch(request: Request, env: { ASSETS: { fetch(request: Request): Promise<Response> } }): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    const match = route(request);
    if (!match) return new Response("Not found", { status: 404 });
    if (request.method === "GET" || request.method === "HEAD") return match.handlers.GET(match.request);
    if (request.method === "POST") return match.handlers.POST(match.request);
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, POST" } });
  },
};
