/** Is a trusted developer asking the bot to do something, or just talking?
 *
 * This decides which lane a message takes: the publishing lane, which runs an
 * agent that edits the site, or the answer lane, which only reads. For two
 * weeks it was decided by regular expressions over the words, and every few
 * days a new shape of sentence fell on the wrong side: "Please remove this for
 * now" was chat, "Do it" was a question, "It seems bomberman world got
 * updated" started an agent. The words carry the meaning, but a pattern
 * cannot read them. A small model can, cheaply: one short call, one word back.
 *
 * It has no hard dependency on that call. With no API key, or when the call
 * fails, times out or answers nonsense, the old heuristic decides as before.
 */

/** A fast, small model is right for a one-word answer. */
export const INTENT_MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 8_000;

export function intentPrompt({ text, replyTo = "", channel = "" }) {
  const lines = [
    "You route messages for a Discord bot that publishes a website about recompiled retro games.",
    "A trusted developer has addressed the bot. Decide what they want.",
    "",
    "Answer REQUEST when the message asks the bot to change, make, fix, remove, roll back, publish or otherwise DO something — to the site, a page, the bot, or the project. Instructions count, however short, and a reply to one of the bot's own posts usually means \"that one\". Attachments to publish count.",
    "Answer CHAT when the message is anything else: a reaction, an observation, a thought, a question to be answered, a thank-you, a joke, or talk about the bot's work without asking for more of it.",
    "",
    "Examples:",
    "- \"Please remove this for now\" (replying to a release announcement) → REQUEST",
    "- \"Do it\" (replying to a proposed fix) → REQUEST",
    "- \"Raise the harness idle budget. And have a deep think about how to prevent this again\" → REQUEST",
    "- \"take this down\" → REQUEST",
    "- \"I think we should add a download button\" → REQUEST",
    "- \"It seems bomberman world and many others got updated\" → CHAT",
    "- \"Ah shit. I didn't want to publicize that yet\" → CHAT",
    "- \"Check whether there are games that got updated\" → CHAT (a question; the bot answers it)",
    "- \"huh\" / \"nice\" / \"tf happened\" → CHAT",
    "",
  ];
  if (channel) lines.push("Recent messages in the channel, oldest first, for context only:", "```", channel, "```", "");
  if (replyTo) lines.push("The message replies to this post by the bot:", "```", replyTo, "```", "");
  lines.push("The message:", "```", text, "```", "", "Reply with exactly one word: REQUEST or CHAT.");
  return lines.join("\n");
}

/** "request", "chat", or null when the answer is not one of those. */
export function parseIntent(raw) {
  const word = String(raw ?? "").trim().toUpperCase().match(/\b(REQUEST|CHAT)\b/)?.[1];
  return word ? word.toLowerCase() : null;
}

/** The model's verdict, or the fallback's when there is no model to ask or it
 * does not give a usable answer. `call(prompt)` returns the model's text. */
export async function classifyIntent({ text, replyTo = "", channel = "" }, { call, fallback, log = () => {} }) {
  const settle = (intent, how) => { log(`${how}: ${intent} for ${JSON.stringify(String(text).slice(0, 60))}`); return intent; };
  if (!call) return settle(fallback(text), "heuristic");
  try {
    const intent = parseIntent(await call(intentPrompt({ text, replyTo, channel })));
    if (intent) return settle(intent, "model");
    return settle(fallback(text), "heuristic (model answered off-list)");
  } catch (error) {
    return settle(fallback(text), `heuristic (${error?.message ?? error})`);
  }
}

/** A `call` for classifyIntent, against the Messages API. The key goes in the
 * header and nowhere else. */
export function apiIntentCall(apiKey, fetcher = fetch) {
  if (!apiKey) return null;
  return async (prompt) => {
    const r = await fetcher("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: INTENT_MODEL, max_tokens: 5, temperature: 0, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) throw new Error(`intent model: HTTP ${r.status}`);
    const body = await r.json();
    return body?.content?.map((c) => c?.text ?? "").join("") ?? "";
  };
}
