import crypto from 'node:crypto';

export const SUBMISSIONS_PATH = 'data/submissions.json';
export function repositoryUrl(value) {
  if (typeof value !== 'string' || value.length > 300) throw new Error('Enter a public GitHub or GitLab repository URL.');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('Enter a public GitHub or GitLab repository URL.'); }
  if (url.protocol !== 'https:' || !['github.com', 'gitlab.com'].includes(url.hostname) || url.port || url.username || url.password || url.search || url.hash) throw new Error('Use an HTTPS repository URL on github.com or gitlab.com.');
  const parts = url.pathname.replace(/\/$/, '').replace(/\.git$/, '').split('/').slice(1);
  if (parts.length < 2 || (url.hostname === 'github.com' && parts.length !== 2) || parts.some(p => !/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(p) || p.endsWith('.'))) throw new Error('Link to the repository itself, not a file, issue, or release.');
  return `https://${url.hostname}/${parts.join('/')}`;
}
export function submissionId(repo) { return crypto.createHash('sha256').update(repositoryUrl(repo).toLowerCase()).digest('hex').slice(0, 16); }
export function plainText(value, max) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}
export function markdownText(value) { return value.replace(/[\\`*_{}\[\]()<>!#|~]/g, '\\$&'); }
export function submissionPage(record) {
  const fm = {
    title: record.title, desc: record.description, kicker: 'Community submission',
    tags: ['Community'], provenance: 'community', repo: record.repo, status: 'Community submission',
    added: record.createdAt.slice(0, 10), updated: record.createdAt.slice(0, 10),
    submissionId: record.id, draft: false,
  };
  return `---\n${Object.entries(fm).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n${markdownText(record.description)}\n\n## Project\n\n[View the source repository](${record.repo}).\n\nRepository owner: **${markdownText(record.owner)}**. This identifies the repository namespace, not a verified submitter identity.\n\nThis community submission has not yet been reviewed by the team. See the repository for supported platforms, setup instructions, and current progress. Supply your own game files where required.\n`;
}
export function discordSubmission(text) {
  // An explicit submit/add request or a bare repository link is intake. A
  // question that merely mentions a repository keeps the existing answer lane.
  const links = text.match(/https:\/\/(?:github|gitlab)\.com\/[^\s<>]+/gi) ?? [];
  if (links.length !== 1) return null;
  const candidate = links[0].replace(/[),.!?]+$/, '');
  let repo;
  try { repo = repositoryUrl(candidate); } catch { return null; }
  const rest = text.replace(links[0], '').trim();
  if (rest && !/\b(submit|add|list|publish|made|built|my recomp|our recomp|new recomp)\b/i.test(rest)) return null;
  return { repo, description: plainText(rest.replace(/^(?:submit|add|list|publish)(?:\s+(?:this|my|our))?(?:\s+(?:recomp|project|game))?\b[\s:—–-]*/i, ''), 500) };
}
export function moderationPage(raw, record, decision) {
  if (!['confirmed', 'removed'].includes(decision) || !/^data\/games\/\d+_[a-z0-9-]+\/index\.md$/.test(record.path)) throw new Error('Invalid submission moderation target.');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match || !new RegExp(`^submissionId: ["']?${record.id}["']?\\s*$`, 'm').test(match[1])) throw new Error('The page no longer belongs to this submission.');
  // Preserve editorial work. Removal unlists the page; it never deletes files.
  const draft = `draft: ${decision === 'removed'}`;
  const front = /^draft:.*$/m.test(match[1]) ? match[1].replace(/^draft:.*$/m, draft) : `${match[1]}\n${draft}`;
  let body = raw.slice(match[0].length);
  if (decision === 'confirmed') body = body.replace('This community submission has not yet been reviewed by the team.', 'This community submission has been reviewed by the team.');
  return `---\n${front}\n---\n${body}`;
}
