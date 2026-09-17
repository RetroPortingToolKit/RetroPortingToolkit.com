import { describe, it, expect, vi } from 'vitest';
import { branchCommits, compareFiles, parseDiff, latestReleaseFromFeed } from './github-web.mjs';

const commitsAtom = `<feed><updated>x</updated><entry><id>tag:github.com,2008:Grit::Commit/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</id><updated>2026-09-17T02:51:13Z</updated><title>\n   Record v0.3.30 for &quot;Twisted&quot;\n</title></entry><entry><id>tag:github.com,2008:Grit::Commit/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb</id><updated>2026-09-17T01:00:00Z</updated><title>Older</title></entry></feed>`;
const releasesAtom = `<feed><entry><id>tag:github.com,2008:Repository/1/v0.13.0-alpha</id><updated>2026-09-12T02:37:05Z</updated><link rel="alternate" type="text/html" href="https://github.com/mstan/TombaRecomp/releases/tag/v0.13.0-alpha"/><title>Tomba! v0.13.0-alpha - AOT &amp; more</title></entry></feed>`;
const diff = `diff --git a/data/games/01_x/index.md b/data/games/01_x/index.md
index 1..2 100644
--- a/data/games/01_x/index.md
+++ b/data/games/01_x/index.md
@@ -1,3 +1,4 @@
 title: "X"
-cover: ""
+cover: "./c.png"
+draft: false
diff --git a/data/games/01_x/c.png b/data/games/01_x/c.png
new file mode 100644
index 0..3
Binary files /dev/null and b/data/games/01_x/c.png differ
diff --git a/old.md b/old.md
deleted file mode 100644
index 4..0
--- a/old.md
+++ /dev/null
@@ -1,2 +0,0 @@
-gone
-gone
`;
describe('github website endpoints', () => {
  it('reads the branch head from the commits feed', async () => {
    const fetcher = vi.fn(async () => new Response(commitsAtom));
    expect(await branchCommits('o/r', 'main', fetcher)).toEqual([
      { sha: 'a'.repeat(40), title: 'Record v0.3.30 for "Twisted"', date: '2026-09-17T02:51:13Z' },
      { sha: 'b'.repeat(40), title: 'Older', date: '2026-09-17T01:00:00Z' },
    ]);
    expect(fetcher.mock.calls[0][0]).toBe('https://github.com/o/r/commits/main.atom');
  });
  it('parses the compare diff into the API file shape', async () => {
    const files = parseDiff(diff);
    expect(files).toEqual([
      { filename: 'data/games/01_x/index.md', status: 'modified', additions: 2, deletions: 1, patch: expect.stringContaining('+cover: "./c.png"') },
      { filename: 'data/games/01_x/c.png', status: 'added', additions: 0, deletions: 0, patch: '' },
      { filename: 'old.md', status: 'removed', additions: 0, deletions: 2, patch: expect.stringContaining('-gone') },
    ]);
    const fetcher = vi.fn(async () => new Response('', { status: 500 }));
    expect(await compareFiles('o/r', 'a', 'b', fetcher)).toBeNull();
  });
  it('reads the latest release from the releases feed', async () => {
    expect(await latestReleaseFromFeed('mstan/TombaRecomp', async () => new Response(releasesAtom))).toEqual({ tag: 'v0.13.0-alpha', name: 'Tomba! v0.13.0-alpha - AOT & more', url: 'https://github.com/mstan/TombaRecomp/releases/tag/v0.13.0-alpha', date: '2026-09-12' });
    expect(await latestReleaseFromFeed('o/r', async () => new Response('<feed></feed>'))).toBeNull();
    expect(await latestReleaseFromFeed('o/r', async () => new Response('', { status: 404 }))).toBeNull();
    expect(await latestReleaseFromFeed('o/r', async () => new Response('', { status: 429 }))).toBeUndefined();
  });
});
