import crypto from 'node:crypto';

export async function wikiBridge(token, discordId, action, payload = {}, extra = {}, fetcher = fetch) {
  const raw = JSON.stringify({ discordId, action, payload, ...extra });
  const timestamp = String(Date.now());
  const signature = crypto.createHmac('sha256', token).update(`${timestamp}\n${raw}`).digest('hex');
  const response = await fetcher('https://retroportingtoolkit.com/api/cms/wiki/bridge', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-rpt-time': timestamp, 'x-rpt-signature': signature }, body: raw,
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok || result.error || result.ok === false) {
    const error = new Error(result.error || 'Website contribution access could not be verified.');
    // A refusal is a decision about one person, never evidence that the site is
    // broken: on 2026-10-20 one requester's missing Discord link was announced
    // to everyone as "Publishing is stopped".
    if ([400, 401, 403, 409].includes(response.status)) error.denied = true;
    throw error;
  }
  return result;
}
export function parseWikiRequest(text) {
  const link = /^link\s+([a-f0-9]{36})\s*$/i.exec(text.trim());
  if (link) return { action: 'link', code: link[1] };
  const create = /^wiki\s+new\s+([a-z0-9-]+)\s+([^\n]+)\n([\s\S]+)$/i.exec(text.trim());
  if (create) return { action: 'new', section: create[1], title: create[2].trim(), instructions: create[3].trim() };
  const edit = /^(?:wiki\s+(?:edit|update)|edit|update|fix|correct|improve|expand)\s+(?:<?https:\/\/retroportingtoolkit\.com)?(\/docs\/[a-z0-9-]+(?:\/[a-z0-9-]+)?)>?\s*[:\n ]\s*([\s\S]+)$/i.exec(text.trim());
  if (edit) return { action: 'save', id: edit[1], instructions: edit[2].trim() };
  return null;
}
export async function applyWikiRequest({ call, request, generate, messageUrl }) {
  await call('status'); // Recheck when queued work begins, before running a model.
  const current = request.action === 'save' ? await call('read', { id: request.id }) : null;
  const output = await generate({ instructions: request.instructions, current, title: request.title });
  const json = JSON.parse(output.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```$/, ''));
  if (typeof json.body !== 'string' || !json.body.trim() || typeof json.summary !== 'string' || !json.summary.trim()) throw new Error('The proposed docs edit was incomplete. No page was saved.');
  await call('status'); // A suspension during generation cancels publication.
  if (request.action === 'new') return call('new', { section: request.section, title: request.title, body: json.body, summary: json.summary, description: typeof json.description === "string" ? json.description : json.summary }, { messageUrl });
  // Preserve all frontmatter. Community prose requests cannot change navigation or identity.
  return call('save', { id: current.id, frontmatter: current.frontmatter, body: json.body, summary: json.summary, expectedBase: current.baseSha }, { messageUrl });
}
