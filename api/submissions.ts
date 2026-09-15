import { SubmissionStore, SubmissionError, submitRepository } from '../src/lib/submissionServer.js';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
// The durable register also caps submissions globally and per repository owner.
// This short local window reduces repeated requests before repository lookups.
const attempts = new Map<string, number>();
export async function handler(req: Request): Promise<Response> {
  if (!['POST', 'GET'].includes(req.method)) return json({ error: 'Method not allowed.' }, 405);
  const owner = process.env.CMS_REPO_OWNER || process.env.VERCEL_GIT_REPO_OWNER;
  const repo = process.env.CMS_REPO_NAME || process.env.VERCEL_GIT_REPO_SLUG;
  const token = process.env.GITHUB_TOKEN;
  if (!owner || !repo || !token) return json({ error: 'Submissions are temporarily unavailable. Please use Discord.' }, 503);
  // Preview deployments must never publish into a preview branch or main.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') return json({ error: 'Submissions are available on the live website.' }, 403);
  const store = new SubmissionStore(`https://api.github.com/repos/${owner}/${repo}`, token);
  try {
    if (req.method === 'GET') {
      const snapshot = await store.snapshot();
      return json({ submissions: snapshot.records.filter(r => r.status === 'pending') });
    }
    if (!(req.headers.get('content-type') || '').startsWith('application/json')) return json({ error: 'Send JSON.' }, 415);
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) return json({ error: 'Submit from this website.' }, 403);
    const text = await req.text();
    if (text.length > 16384) return json({ error: 'The submission is too long.' }, 413);
    let input;
    try { input = JSON.parse(text); } catch { return json({ error: 'Invalid JSON.' }, 400); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ error: 'Invalid submission.' }, 400);
    if (input.company) return json({ error: 'Please leave the company field empty.' }, 400);
    const ip = req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    for (const [key, at] of attempts) if (now - at > 30_000) attempts.delete(key);
    if (attempts.has(ip)) return json({ error: 'Please wait 30 seconds before submitting again.' }, 429);
    attempts.set(ip, now);
    const result = await submitRepository(store, input);
    return json({ ...result, message: result.duplicate ? 'This project has already been submitted.' : `Your game page is publishing. It usually appears within a couple of minutes. ${result.record.mediaNote || ''}` }, result.duplicate ? 200 : 201);
  } catch (error) {
    return json({ error: error instanceof SubmissionError ? error.message : 'Submissions are temporarily unavailable. Please try again.' }, error instanceof SubmissionError ? error.status : 503);
  }
}

// Match the Web API entry points used by the existing CMS and newsletter.
export async function GET(req: Request): Promise<Response> { return handler(req); }
export async function POST(req: Request): Promise<Response> { return handler(req); }
