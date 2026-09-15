import { repositoryReadme, importSubmissionImages, type ImportedAsset } from './submissionMedia.js';
import { mediaUrl, type MediaCandidate } from '../../scripts/submission-media.mjs';
import { repositoryUrl, submissionId, plainText, submissionPage, SUBMISSIONS_PATH, type Submission } from '../../scripts/submissions.mjs';

type Entry = { path: string; sha: string; type: string };
type Snapshot = { head: string; tree: string; entries: Entry[]; records: Submission[] };
export class SubmissionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export class SubmissionStore {
  constructor(private base: string, private token: string, private branch = 'main') {}
  async gh(route: string, init: RequestInit = {}) {
    const response = await fetch(`${this.base}${route}`, { ...init, signal: AbortSignal.timeout(15_000), headers: {
      authorization: `Bearer ${this.token}`, accept: 'application/vnd.github+json', 'content-type': 'application/json',
    } });
    if (!response.ok) throw new SubmissionError('Publishing is temporarily unavailable. Please try again.', response.status === 409 || response.status === 422 ? 409 : 503);
    return response.json();
  }
  async blob(sha: string): Promise<string> {
    const blob = await this.gh(`/git/blobs/${sha}`);
    if (blob.encoding !== 'base64') throw new SubmissionError('Could not read the catalogue.', 503);
    return Buffer.from(blob.content, 'base64').toString('utf8');
  }
  async snapshot(): Promise<Snapshot> {
    const ref = await this.gh(`/git/ref/heads/${encodeURIComponent(this.branch)}`);
    const commit = await this.gh(`/git/commits/${ref.object.sha}`);
    const tree = await this.gh(`/git/trees/${commit.tree.sha}?recursive=1`);
    if (tree.truncated) throw new SubmissionError('The catalogue could not be read in full.', 503);
    const entry = (tree.tree as Entry[]).find(e => e.path === SUBMISSIONS_PATH);
    const records = entry ? JSON.parse(await this.blob(entry.sha)) : [];
    if (!Array.isArray(records)) throw new SubmissionError('The submission register is unavailable.', 503);
    return { head: ref.object.sha, tree: commit.tree.sha, entries: tree.tree, records };
  }
  async create(snapshot: Snapshot, record: Submission, assets: ImportedAsset[] = []) {
    const mediaEntries = await Promise.all(assets.map(async asset => {
      const blob = await this.gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: asset.content, encoding: 'base64' }) });
      return { path: `${record.path.slice(0, -8)}${asset.name}`, mode: '100644', type: 'blob', sha: blob.sha };
    }));
    const tree = await this.gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: snapshot.tree, tree: [
      ...mediaEntries,
      { path: record.path, mode: '100644', type: 'blob', content: submissionPage(record) },
      { path: SUBMISSIONS_PATH, mode: '100644', type: 'blob', content: JSON.stringify([...snapshot.records, record], null, 2) + '\n' },
    ] }) });
    const commit = await this.gh('/git/commits', { method: 'POST', body: JSON.stringify({
      message: `Add community submission ${record.id}`, tree: tree.sha, parents: [snapshot.head],
      author: { name: 'Shokunin', email: '30949000+tetrisgm@users.noreply.github.com' },
    }) });
    // A stale parent cannot fast-forward main. Re-read and revalidate before
    // retrying so simultaneous submissions never erase each other or editors.
    await this.gh(`/git/refs/heads/${encodeURIComponent(this.branch)}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
  }
}
export async function repositoryMetadata(repo: string) {
  const url = new URL(repo);
  const project = url.pathname.slice(1);
  const endpoint = url.hostname === 'github.com' ? `https://api.github.com/repos/${project}` : `https://gitlab.com/api/v4/projects/${encodeURIComponent(project)}`;
  // No site credential is ever sent while inspecting a submitted repository.
  const response = await fetch(endpoint, { redirect: 'error', signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json' } });
  if (response.status === 404) throw new SubmissionError('That repository could not be found publicly. Check the link and visibility.');
  if (!response.ok) throw new SubmissionError('The repository host is unavailable. Please try again shortly.', 503);
  const data = await response.json();
  if (data.private === true || (url.hostname === 'gitlab.com' && data.visibility !== 'public')) throw new SubmissionError('Only public repositories can be submitted.');
  const canonical = repositoryUrl(url.hostname === 'github.com' ? data.html_url : data.web_url);
  const branch = typeof data.default_branch === 'string' ? data.default_branch : 'HEAD';
  let readmePath = 'README.md';
  if (url.hostname === 'gitlab.com' && typeof data.readme_url === 'string') {
    const prefix = `${canonical}/-/blob/${branch}/`;
    if (data.readme_url.startsWith(prefix)) readmePath = data.readme_url.slice(prefix.length);
  }
  return { branch, readmePath, repo: canonical, title: plainText(data.name, 100), description: plainText(data.description, 500), owner: plainText(url.hostname === 'github.com' ? data.owner?.login : data.namespace?.full_path, 150) || project.split('/').slice(0, -1).join('/') };
}
export async function submitRepository(store: SubmissionStore, input: Record<string, unknown>, now = new Date()) {
  let repo: string;
  try { repo = repositoryUrl(input.repo); } catch (error) { throw new SubmissionError((error as Error).message); }
  for (const [key, max] of [['name', 100], ['description', 500]] as const) {
    if (input[key] !== undefined && (typeof input[key] !== 'string' || (input[key] as string).length > max)) throw new SubmissionError(`${key === 'name' ? 'Name' : 'Description'} must be at most ${max} characters.`);
  }
  const explicit: MediaCandidate[] = [];
  if (input.images !== undefined) {
    if (!Array.isArray(input.images) || input.images.length > 8) throw new SubmissionError('Provide up to eight image links.');
    for (const image of input.images) {
      if (!image || typeof image.url !== 'string' || !mediaUrl(image.url)) throw new SubmissionError('Use image links from GitHub, GitLab, or Discord attachments.');
      explicit.push({ url: mediaUrl(image.url)!, alt: plainText(image.alt, 150) || 'Project screenshot' });
    }
  }
  const metadata = await repositoryMetadata(repo);
  let assets: ImportedAsset[] | undefined;
  repo = metadata.repo;
  const id = submissionId(repo);
  for (let attempt = 0; attempt < 3; attempt++) {
    const snapshot = await store.snapshot();
    const existing = snapshot.records.find(r => r.id === id);
    if (existing?.status === 'removed') throw new SubmissionError('This repository was removed by a moderator. Contact the team on Discord.', 409);
    if (existing) return { record: existing, duplicate: true };
    // Deduplicate against editorial pages too, reading their current blobs,
    // not the deployment's possibly stale build-time content.
    const pages = snapshot.entries.filter(e => /^data\/games\/[^/]+\/index\.md$/.test(e.path));
    const contents = await Promise.all(pages.map(async e => ({ ...e, raw: await store.blob(e.sha) })));
    for (const page of contents) {
      const match = page.raw.match(/^repo:\s*["']?(https:\/\/[^\s"']+)/m);
      if (match) {
        try {
          if (submissionId(match[1]) === id) throw new SubmissionError(`This repository already has a game page: /games/${page.path.split('/')[2].replace(/^\d+_/, '')}`, 409);
        } catch (error) { if (error instanceof SubmissionError) throw error; }
      }
    }
    const recent = snapshot.records.filter(r => now.getTime() - Date.parse(r.createdAt) < 3600_000);
    if (recent.length >= 20 || recent.filter(r => r.owner.toLowerCase() === metadata.owner.toLowerCase()).length >= 5) throw new SubmissionError('Submissions are busy right now. Please try again in an hour.', 429);
    const slug = `${repo.split('/').at(-1)!.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'recomp'}-${id.slice(0, 8)}`;
    const order = Math.max(0, ...pages.map(p => Number(p.path.split('/')[2].split('_')[0]) || 0)) + 1;
    assets ??= await importSubmissionImages(explicit, await repositoryReadme(repo, metadata.branch, metadata.readmePath));
    const record: Submission = { id, repo, title: plainText(input.name, 100) || metadata.title,
      description: plainText(input.description, 500) || metadata.description || 'A community game project. See the source repository for details and current progress.',
      owner: metadata.owner, path: `data/games/${String(order).padStart(2, '0')}_${slug}/index.md`, url: `/games/${slug}`, createdAt: now.toISOString(), status: 'pending',
      images: assets.map(asset => ({ path: `./${asset.name}`, alt: asset.alt })),
      mediaNote: assets.length ? `Imported ${assets.length} image${assets.length === 1 ? '' : 's'}. The first is the cover; check the page for any missing artwork.` : 'No supported images could be imported. The page is publishing without artwork.' };
    try { await store.create(snapshot, record, assets); return { record, duplicate: false }; }
    catch (error) { if (!(error instanceof SubmissionError) || error.status !== 409 || attempt === 2) throw error; }
  }
  throw new SubmissionError('The catalogue changed. Please try again.', 409);
}
