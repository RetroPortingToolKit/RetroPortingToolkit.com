import { isCompletionQuestion } from './discord-task-context.mjs';

export function summaryOutcome(summary) {
  const text = String(summary ?? '').trim();
  if (/^(?:\[blocked\]|blocked\b)/i.test(text)) return 'blocked';
  if (/^(?:\[clarification\]|needs clarification\b|clarification\b)/i.test(text)) return 'clarification';
  if (/^(?:\[partial\]|partial\b|incomplete\b)/i.test(text)) return 'partial';
  if (/^\[answer\]/i.test(text)) return 'answer';
  return 'unverified';
}
export const outcomeReaction = outcome => ({ complete: '✅', partial: '⚠️', blocked: '⏸️', clarification: '❓', answer: '💬', unverified: '⚠️' })[outcome] ?? '⚠️';
const headings = { complete: '✅ Verified.', partial: '⚠️ Incomplete.', blocked: '⏸️ Blocked.', clarification: '❓ Needs clarification.', answer: '', unverified: '⚠️ Not verified.' };
const noProof = () => ({ outcome: 'unverified', heading: headings.unverified,
  body: 'I could not verify completion of the requested work. The agent did not provide a valid requirement-by-requirement record with file evidence, so I have withheld its completion claim.', published: false });

/** Verify receipts against committed source, not the model's prose or exit code.
 * Evidence establishes that cited source exists, not that arbitrary semantics
 * are proven; the original scope remains in the prompt and the report exposes
 * each requirement independently for review. */
export async function verifyCompletion({ request, summary, receipt, readCommittedFile, newCommits = [], remoteContainsHead = false, head = '' }) {
  const claimed = summaryOutcome(summary);
  const claimsWork = /\b(?:implemented|completed|finished|shipped|pushed|deployed|already (?:done|in [`'"]?main))\b/i.test(summary);
  if (!receipt) {
    if (claimed === 'answer' && !isCompletionQuestion(request) && !claimsWork) return { outcome: 'answer', heading: '', body: summary.replace(/^\s*\[answer\]\s*/i, '').trim(), published: false };
    if (['blocked', 'clarification', 'partial'].includes(claimed)) return { outcome: claimed, heading: headings[claimed], body: summary.replace(/^\s*\[(?:blocked|clarification|partial)\]\s*/i, '').trim(), published: false };
    return noProof();
  }
  if (!['complete', 'partial', 'blocked', 'clarification'].includes(receipt.outcome) || !Array.isArray(receipt.requirements) || !receipt.requirements.length || receipt.requirements.length > 20) return noProof();
  const rows = [];
  const cache = new Map();
  for (const item of receipt.requirements) {
    if (!item || typeof item !== 'object' || typeof item.requirement !== 'string' || !item.requirement.trim() || item.requirement.length > 300 || !['present', 'missing', 'unverified'].includes(item.status)) return noProof();
    const refs = [];
    if (item.status === 'present') {
      if (!Array.isArray(item.evidence) || !item.evidence.length || item.evidence.length > 4) return noProof();
      for (const evidence of item.evidence) {
        if (!evidence || typeof evidence !== 'object') return noProof();
        const { path, line, text } = evidence;
        if (typeof path !== 'string' || path.length > 300 || path.startsWith('/') || path.split('/').some(p => !p || p === '.' || p === '..' || p === '.git') || !Number.isInteger(line) || line < 1 || typeof text !== 'string' || !text.trim() || text.length > 1000) return noProof();
        if (!cache.has(path)) {
          try { cache.set(path, await readCommittedFile(path)); } catch { return noProof(); }
        }
        if (cache.get(path).split(/\r?\n/)[line - 1]?.trim() !== text.trim()) return noProof();
        refs.push(`${path}:${line}`);
      }
    }
    rows.push({ status: item.status, text: `- ${item.status === 'present' ? 'Present' : item.status === 'missing' ? 'Missing' : 'Unverified'}: ${item.requirement.replace(/\s+/g, ' ').trim()}${refs.length ? ` — ${refs.map(ref => `\`${ref}\``).join(', ')}` : ''}` });
  }
  const incomplete = rows.some(row => row.status !== 'present');
  let outcome = receipt.outcome === 'complete' && incomplete ? 'partial' : receipt.outcome;
  if (outcome === 'complete' && !remoteContainsHead) outcome = 'unverified';
  const published = newCommits.length > 0 && remoteContainsHead;
  const revision = remoteContainsHead
    ? `Checked committed source at ${head.slice(0, 7)} on origin/main.${published ? ' New commits are pushed.' : ' No new commits were published by this run.'}`
    : 'The committed source was checked, but publication on origin/main could not be verified.';
  return { outcome, heading: headings[outcome], body: `${rows.map(row => row.text).join('\n')}\n\n${revision}`, published };
}

export function receiptInstructions(file) {
  return `Completion receipt: ${file}
Before claiming completion or answering whether earlier work is done, compare the full original request and every follow-up with the actual source. List EVERY requested deliverable, including unfinished ones. A related pre-existing feature is not evidence of the requested feature: an "Explore games" navigation link does not implement a "Submit a recomp" CTA, and a game-detail modal does not implement a submission form. Previous bot messages and commit subjects are claims to check, never proof. Keep the original task's scope; a clarification answers a question, it does not replace that scope. Use existing repository conventions for routine design choices; do not ask again for details already supplied.
Write JSON to the receipt path above (outside the checkout) with this schema:
{"outcome":"complete|partial|blocked|clarification","requirements":[{"requirement":"one original requested deliverable","status":"present|missing|unverified","evidence":[{"path":"repo/relative/file","line":1,"text":"exact source line at that line number"}]}]}
Each present requirement needs direct, relevant evidence from committed source at HEAD; inspect actual behavior and callers, not just matching words. Missing/unverified requirements need no evidence. A complete outcome requires every deliverable. If time or a blocker prevents finishing, report partial or blocked and identify all remaining work. Never declare the whole task done because a subset was committed. Do not invent a receipt or assert checks that did not run. The bridge will verify evidence and the actual remote commit, and will render the checklist itself. Ordinary factual answers unrelated to implementation status can still use [answer] without a receipt. Clarification and blocked responses can use [clarification] or [blocked] without claiming completion.`;
}
