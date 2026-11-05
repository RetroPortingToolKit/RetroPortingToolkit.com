// Loaded with `node --import`, before the bridge: swaps discord.js for the
// stub so the real bridge runs, unmodified, against a fake Discord.
import { register } from "node:module";
register("./resolver.mjs", import.meta.url);

// Shared access service is stubbed only inside the harness process tree.
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (String(input) === 'https://retroportingtoolkit.com/api/cms/wiki/bridge') {
    const body = JSON.parse(init.body);
    const blocked = process.env.HARNESS_DISABLED_DISCORD_ID === body.discordId;
    return Response.json(blocked ? { error: 'Your website contribution access is disabled.' } : { ok: true, docs: true, publish: true, destructive: true, login: body.discordId }, { status: blocked ? 403 : 200 });
  }
  return originalFetch(input, init);
};
