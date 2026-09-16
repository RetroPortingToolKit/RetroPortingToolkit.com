import { messageImages } from './submission-media.mjs';
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
/** Toolkit names as they appear in READMEs and descriptions, linked to the
 * platform page that introduces each recompiler. */
export const TOOLKITS = [
  ['PSXRecomp', 'playstation'], ['NESRecomp', 'nes'], ['SNESRecomp', 'super-nintendo'], ['GBARecomp', 'game-boy-advance'],
  ['SegaGenesisRecomp', 'sega-genesis'], ['NDSRecomp', 'nintendo-ds'], ['VBRecomp', 'virtual-boy'], ['CDiRecomp', 'cd-i'], ['SMSGGRecomp', 'master-system-game-gear'],
];
export function linkToolkits(escaped) {
  // Runs on escaped markdown, so the only brackets it emits are its own.
  return TOOLKITS.reduce((text, [name, slug]) => text.replace(new RegExp(`(?<![\\w/])${name}(?![\\w-])`, 'gi'), `[${name}](/hardware/${slug})`), escaped);
}
export function detectPlatform(...texts) {
  return TOOLKITS.find(([name]) => texts.some(t => new RegExp(`(?<![\\w/])${name}(?![\\w-])`, 'i').test(t || '')))?.[1];
}
export function ownerProfile(record) {
  const host = record.repo.startsWith('https://gitlab.com/') ? 'gitlab.com' : 'github.com';
  return `https://${host}/${record.owner.split('/').map(encodeURIComponent).join('/')}`;
}
export function submissionPage(record) {
  const platform = detectPlatform(record.description, ...(record.summary ?? []));
  const hostName = record.repo.startsWith('https://gitlab.com/') ? 'GitLab' : 'GitHub';
  const fm = {
    title: record.title, desc: record.description, kicker: 'Community submission',
    tags: ['Community'], provenance: 'community', repo: record.repo, status: 'Community submission',
    ...(platform ? { platform } : {}),
    links: [{ label: `Project on ${hostName}`, href: record.repo }],
    added: record.createdAt.slice(0, 10), updated: record.createdAt.slice(0, 10),
    submissionId: record.id, draft: false,
    creator: { [record.repo.startsWith('https://gitlab.com/') ? 'gitlab' : 'github']: record.owner, ...(record.discord ? { discord: record.discord } : {}) },
    ...(record.images?.length ? { cover: record.images[0].path } : {}),
  };
  // The first image is the cover, which the layout already shows above the body.
  const artwork = record.images?.slice(1).map(image => `![${markdownText(image.alt)}](${image.path})`).join('\n\n') || '';
  const summary = (record.summary ?? []).map(block => block.startsWith('- ') ? `- ${linkToolkits(markdownText(block.slice(2)))}` : linkToolkits(markdownText(block)))
    .reduce((out, block) => { const last = out.at(-1); if (block.startsWith('- ') && last?.startsWith('- ')) out[out.length - 1] = `${last}\n${block}`; else out.push(block); return out; }, []).join('\n\n');
  return `---\n${Object.entries(fm).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n${linkToolkits(markdownText(record.description))}\n\n${artwork ? `${artwork}\n\n` : ''}${summary ? `## Project\n\n${summary}\n` : ''}`;
}
export function discordSubmission(text, attachments = [], discord = '') {
  // An explicit submit/add request or a bare repository link is intake. A
  // question that merely mentions a repository keeps the existing answer lane.
  const links = (text.match(/https:\/\/(?:github|gitlab)\.com\/[^\s<>]+/gi) ?? []).filter(link => { try { repositoryUrl(link.replace(/[),.!?]+$/, '')); return true; } catch { return false; } });
  if (links.length !== 1) return null;
  const candidate = links[0].replace(/[),.!?]+$/, '');
  let repo;
  try { repo = repositoryUrl(candidate); } catch { return null; }
  const rest = text.replace(links[0], '').trim();
  if (rest && !/\b(submit|add|list|publish|made|built|my recomp|our recomp|new recomp)\b/i.test(rest)) return null;
  const images = messageImages(text, attachments);
  const title = rest.match(/(?:^|\n)(?:title|name):\s*([^\n]+)/i)?.[1];
  const clean = rest.replace(/(?:^|\n)(?:title|name):[^\n]*/gi, '').replace(/https:\/\/[^\s<>]+/g, '').replace(/(?:^|\n)(?:banner|cover|screenshots?|images?):[^\n]*/gi, '').replace(/(?:^|\n)description:\s*/gi, '');
  return { repo, ...(title ? { name: plainText(title, 100) } : {}), ...(images.length ? { images } : {}), ...(plainText(discord, 80) ? { discord: plainText(discord, 80) } : {}), description: plainText(clean.replace(/^(?:submit|add|list|publish)(?:\s+(?:this|my|our))?(?:\s+(?:recomp|project|game))?\b[\s:—–-]*/i, ''), 500) };
}
/** Where the owner of a submitted repository edits their page after signing
 * in to the CMS with that GitHub account. */
export function editLink(record, siteUrl = '') {
  // The editor opens the page whose public address `at` names.
  return `${siteUrl}/admin?at=${record.url}`;
}
export function editNote(record, siteUrl = '') {
  return `Edit the page, including its cover, at ${editLink(record, siteUrl)} after signing in with the GitHub account ${record.owner}.`;
}
export function moderationPage(raw, record, decision) {
  if (!['confirmed', 'removed'].includes(decision) || !/^data\/games\/\d+_[a-z0-9-]+\/index\.md$/.test(record.path)) throw new Error('Invalid submission moderation target.');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match || !new RegExp(`^submissionId: ["']?${record.id}["']?\\s*$`, 'm').test(match[1])) throw new Error('The page no longer belongs to this submission.');
  // Preserve editorial work. Removal unlists the page; it never deletes files.
  const draft = `draft: ${decision === 'removed'}`;
  const front = /^draft:.*$/m.test(match[1]) ? match[1].replace(/^draft:.*$/m, draft) : `${match[1]}\n${draft}`;
  // Pages generated before the review sentence was dropped lose it on confirmation.
  const body = raw.slice(match[0].length).replace(/\n*This community submission has not yet been reviewed by the team\.[^\n]*\n/, '\n');
  return `---\n${front}\n---\n${body}`;
}
