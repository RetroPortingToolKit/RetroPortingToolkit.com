import { mediaUrl, readmeImages, type MediaCandidate } from '../../scripts/submission-media.mjs';
export type ImportedAsset = { name: string; content: string; alt: string };
async function publicBytes(url: string, limit: number): Promise<Buffer> {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(6000), headers: { accept: '*/*' } });
  if (!response.ok || !response.body || Number(response.headers.get('content-length')) > limit) throw new Error('Media unavailable');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length; if (size > limit) throw new Error('Media too large'); chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}
export async function repositoryReadme(repo: string, branch: string, readmePath = 'README.md') {
  try {
    const u = new URL(repo); const project = u.pathname.slice(1);
    if (u.hostname === 'github.com') {
      const data = JSON.parse((await publicBytes(`https://api.github.com/repos/${project}/readme`, 400_000)).toString());
      if (data.encoding !== 'base64' || typeof data.content !== 'string' || typeof data.path !== 'string') return [];
      const base = `https://raw.githubusercontent.com/${project}/${encodeURIComponent(branch)}/${data.path}`;
      return readmeImages(Buffer.from(data.content, 'base64').toString('utf8'), base);
    }
    const raw = await publicBytes(`https://gitlab.com/api/v4/projects/${encodeURIComponent(project)}/repository/files/${encodeURIComponent(readmePath)}/raw?ref=${encodeURIComponent(branch)}`, 300_000);
    return readmeImages(raw.toString('utf8'), `${repo}/-/raw/${encodeURIComponent(branch)}/${readmePath}`);
  } catch { return []; } // Optional artwork must not prevent a text submission.
}
function imageExtension(bytes: Buffer) {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (bytes.length >= 12 && ['GIF87a','GIF89a'].includes(bytes.toString('ascii',0,6))) return 'gif';
  if (bytes.length >= 16 && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP') return 'webp';
  return null;
}
export async function importSubmissionImages(explicit: MediaCandidate[], readme: MediaCandidate[]): Promise<ImportedAsset[]> {
  const prioritize = (items: MediaCandidate[]) => [...items].sort((a,b) => Number(/banner|cover/i.test(b.alt)) - Number(/banner|cover/i.test(a.alt)));
  const candidates = [...prioritize(explicit), ...prioritize(readme)].filter((v,i,a) => a.findIndex(x=>x.url===v.url)===i).slice(0, 8);
  // Bounded parallel fetches keep optional media within the API time budget.
  const results = await Promise.all(candidates.map(async item => {
    const url = mediaUrl(item.url); if (!url) return null;
    try { const bytes = await publicBytes(url, 4 * 1024 * 1024); const ext = imageExtension(bytes); return ext ? { bytes, ext, alt: item.alt } : null; } catch { return null; }
  }));
  const assets: ImportedAsset[] = []; let total = 0;
  for (const item of results) {
    if (!item || assets.length >= 4 || total + item.bytes.length > 8 * 1024 * 1024) continue;
    total += item.bytes.length; assets.push({ name: `submission-${assets.length + 1}.${item.ext}`, content: item.bytes.toString('base64'), alt: item.alt });
  }
  return assets;
}
