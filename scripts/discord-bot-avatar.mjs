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
const image = `data:image/png;base64,${png.toString("base64")}`;
const rest = new REST({ version: "10" }).setToken(token);

// Two different pictures wear the same icon. The bot USER's avatar is what
// sits beside its messages; the APPLICATION's icon is what the profile
// popout, the app directory and the server's integration list show. Setting
// only the first leaves the app looking blank in every one of those places,
// which is what happened on 2026-09-08.
const user = await rest.patch(Routes.user("@me"), { body: { avatar: image } });
console.log(`bot avatar: ${user.username} (${user.id}) -> ${user.avatar}`);

const app = await rest.patch(Routes.currentApplication(), { body: { icon: image } });
console.log(`app icon:   ${app.name} (${app.id}) -> ${app.icon}`);
