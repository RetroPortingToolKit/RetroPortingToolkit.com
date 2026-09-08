// Set the Discord bot's avatar to the site's icon. One-off, re-run when the
// icon changes. Reads the token the way the bridge does, from the
// environment; the installer's line puts it there from the Keychain:
//
//   DISCORD_BOT_TOKEN="$(security find-generic-password -s retroportingtoolkit-discord-bot -w)" node scripts/discord-bot-avatar.mjs
//
// REST only, no gateway session, so it can run while the bridge is up. Discord
// allows a couple of avatar changes an hour; a 429 here means wait, not retry.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REST, Routes } from "discord.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ICON = path.join(ROOT, "public", "site-icon.png");
const token = process.env.DISCORD_BOT_TOKEN || "";
if (!token) throw new Error("DISCORD_BOT_TOKEN is required.");

const png = fs.readFileSync(ICON);
const rest = new REST({ version: "10" }).setToken(token);
const user = await rest.patch(Routes.user("@me"), {
  body: { avatar: `data:image/png;base64,${png.toString("base64")}` },
});
console.log(`avatar set for ${user.username} (${user.id}): ${user.avatar}`);
