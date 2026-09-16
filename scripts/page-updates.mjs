/** Dated "What's new" entries on a game page, kept in frontmatter as
 *   updates:
 *     - date: "2026-09-16"
 *       text: "Saves now work."
 * newest first. Shared by the editor backends, the bot, and the watcher. */
const ENTRY = /^\s*-\s*date:\s*["']?(\d{4}-\d{2}-\d{2})["']?\s*\n\s+text:\s*(.*)$/gm;

export function parseUpdates(fmText) {
  const block = fmText.match(/^updates:\n((?:[ \t]+.*\n?)*)/m)?.[1] ?? '';
  const out = [];
  for (const m of block.matchAll(ENTRY)) {
    let text = m[2].trim();
    try { text = JSON.parse(text); } catch { text = text.replace(/^["']|["']$/g, ''); }
    if (text) out.push({ date: m[1], text: String(text).slice(0, 300) });
  }
  return out;
}

export function updatesBlock(list) {
  return list.length ? `updates:\n${list.map((u) => `  - date: ${JSON.stringify(u.date)}\n    text: ${JSON.stringify(u.text)}`).join('\n')}` : '';
}

/** Rewrites the updates block in frontmatter text (no other line touched). */
export function setUpdates(fmText, list) {
  const block = updatesBlock(list);
  const re = /^updates:[^\n]*(?:\n[ \t]+[^\n]*)*/m;
  if (re.test(fmText)) return fmText.replace(re, block).replace(/\n{2,}/g, '\n').replace(/^\n+|\n+$/g, '');
  return block ? `${fmText.replace(/\s+$/, '')}\n${block}` : fmText;
}

export function addUpdate(fmText, text, date = new Date().toISOString().slice(0, 10)) {
  const clean = String(text).replace(/\s+/g, ' ').trim().slice(0, 300);
  if (!clean) return fmText;
  return setUpdates(fmText, [{ date, text: clean }, ...parseUpdates(fmText)].slice(0, 20));
}
