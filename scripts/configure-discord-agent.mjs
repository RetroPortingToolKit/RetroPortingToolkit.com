import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { Client, Events, GatewayIntentBits } from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN || "";
const guildName = process.env.DISCORD_TARGET_GUILD || "";
const channelName = process.env.DISCORD_TARGET_CHANNEL || "";
const roleNames = (process.env.DISCORD_TARGET_ROLES || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!token) throw new Error("DISCORD_BOT_TOKEN is required.");
if (!guildName || !channelName || !roleNames.length) {
  throw new Error("DISCORD_TARGET_GUILD, DISCORD_TARGET_CHANNEL, and DISCORD_TARGET_ROLES are required.");
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

try {
  const ready = new Promise((resolve) => client.once(Events.ClientReady, resolve));
  await client.login(token);
  await ready;

  const guildMatches = client.guilds.cache.filter((guild) => guild.name === guildName);
  if (guildMatches.size !== 1) {
    throw new Error(`Expected one installed guild named ${JSON.stringify(guildName)}; found ${guildMatches.size}.`);
  }
  const guild = guildMatches.first();
  const channels = await guild.channels.fetch();
  const channelMatches = channels.filter((channel) => channel?.name === channelName && channel.isTextBased());
  if (channelMatches.size !== 1) {
    throw new Error(`Expected one text channel named ${JSON.stringify(channelName)}; found ${channelMatches.size}.`);
  }

  const roles = await guild.roles.fetch();
  const roleIds = roleNames.map((name) => {
    const matches = roles.filter((role) => role.name === name);
    if (matches.size !== 1) {
      throw new Error(`Expected one role named ${JSON.stringify(name)}; found ${matches.size}.`);
    }
    return matches.first().id;
  });

  const configDir = path.join(os.homedir(), "Library", "Application Support", "RetroPortingToolkitDiscordAgent");
  const configFile = path.join(configDir, "config.env");
  const channel = channelMatches.first();
  const contents = [
    `DISCORD_ALLOWED_GUILD_IDS="${guild.id}"`,
    `DISCORD_ALLOWED_CHANNEL_IDS="${channel.id}"`,
    'DISCORD_ALLOWED_USER_IDS=""',
    `DISCORD_ALLOWED_ROLE_IDS="${roleIds.join(",")}"`,
    "",
  ].join("\n");

  await fs.mkdir(configDir, { recursive: true, mode: 0o700 });
  await fs.writeFile(configFile, contents, { encoding: "utf8", mode: 0o600 });
  await fs.chmod(configDir, 0o700);
  await fs.chmod(configFile, 0o600);
  console.log(`[discord-agent] configured guild=${guild.name} channel=#${channel.name} roles=${roleNames.join(", ")}`);
} finally {
  client.destroy();
}
