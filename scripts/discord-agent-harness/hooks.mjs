// Loaded with `node --import`, before the bridge: swaps discord.js for the
// stub so the real bridge runs, unmodified, against a fake Discord.
import { register } from "node:module";
register("./resolver.mjs", import.meta.url);
