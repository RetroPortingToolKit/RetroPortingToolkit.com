/**
 * The slice of discord.js the bridge touches, backed by stdin and stdout.
 *
 * Inject a message by writing one JSON line to the bridge's stdin:
 *   {"channelId":"admin","authorId":"U1","content":"<@BOT> do the thing"}
 * Everything the bridge sends back comes out on stdout as one line per event,
 * prefixed "@@" so the harness can tell it from the bridge's own logging:
 *   @@{"t":<ms>,"kind":"reply"|"send"|"edit"|"react","channelId","messageId","content"}
 */
import { EventEmitter } from "node:events";
import readline from "node:readline";

export const Events = { ClientReady: "ready", Error: "error", Warn: "warn", ShardError: "shardError" };
export const GatewayIntentBits = { Guilds: 1, GuildMessages: 2, MessageContent: 4 };

const emit = (record) => process.stdout.write("@@" + JSON.stringify({ t: Date.now(), ...record }) + "\n");
let nextId = 1000;

function sent(kind, channelId, messageId, payload) {
  const id = String(nextId++);
  emit({ kind, id, channelId, messageId, content: payload?.content ?? "" });
  return {
    id,
    edit: async (p) => { emit({ kind: "edit", id, channelId, messageId, content: p?.content ?? "" }); },
    delete: async () => { emit({ kind: "delete", id, channelId, messageId, content: "" }); },
  };
}

function channelFor(channelId) {
  return {
    send: async (payload) => sent("send", channelId, null, payload),
    messages: {
      fetch: async (messageId) => ({
        reply: async (payload) => sent("reply", channelId, messageId, payload),
        delete: async () => { emit({ kind: "delete", id: messageId, channelId, messageId, content: "" }); },
      }),
    },
  };
}

export class Client extends EventEmitter {
  constructor() {
    super();
    this.user = null;
    this.channels = { fetch: async (channelId) => channelFor(channelId) };
  }
  async login() {
    this.user = { id: "BOT", tag: "Bot#0001" };
    const rl = readline.createInterface({ input: process.stdin });
    rl.on("line", (line) => {
      if (!line.trim()) return;
      let m;
      try { m = JSON.parse(line); } catch { return; }
      const id = m.id || String(nextId++);
      const content = m.content ?? "";
      const message = {
        id,
        guildId: m.guildId ?? "G",
        channelId: m.channelId,
        content,
        url: `https://discord.com/channels/G/${m.channelId}/${id}`,
        author: { id: m.authorId, bot: false },
        member: { roles: { cache: [] } },
        mentions: { users: { has: (uid) => content.includes(`<@${uid}>`) } },
        attachments: new Map((m.attachments ?? []).map((a, i) => [String(i), a])),
        reference: null,
        fetchReference: async () => null,
        react: async (emoji) => { emit({ kind: "react", channelId: m.channelId, messageId: id, content: emoji }); },
      };
      this.emit("messageCreate", message);
    });
    setTimeout(() => this.emit("ready"), 0);
  }
  destroy() {}
}
