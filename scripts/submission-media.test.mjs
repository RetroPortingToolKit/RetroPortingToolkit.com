import { describe, it, expect } from 'vitest';
import { readmeSummary, mediaUrl, readmeImages, messageImages } from './submission-media.mjs';
import { discordSubmission, submissionPage } from './submissions.mjs';
const base = 'https://raw.githubusercontent.com/team/game/main/docs/README.md';
describe('submission artwork parsing', () => {
  it('resolves Markdown, reference and HTML images relative to the README', () => {
    const images = readmeImages('![Banner](../banner.png)\n![Gameplay][shot]\n[shot]: ./shot.jpg\n<img src="other.webp" alt="Second screen">\n![badge](badge.png)\n```\n![Example](fake.png)\n```', base);
    expect(images.map(i=>i.url)).toEqual(['https://raw.githubusercontent.com/team/game/main/banner.png','https://raw.githubusercontent.com/team/game/main/docs/shot.jpg','https://raw.githubusercontent.com/team/game/main/docs/other.webp']);
  });
  it('rejects private addresses, credentials, misleading hosts and executable media URLs', () => {
    for (const url of ['https://localhost/a.png','https://127.0.0.1/a.png','https://raw.githubusercontent.com.evil/a.png','https://a:b@raw.githubusercontent.com/a.png','file:///a.png','data:image/svg+xml,abc','https://discord.com/api/v10/users/@me']) expect(mediaUrl(url)).toBeNull();
    expect(mediaUrl('https://github.com/a/b/blob/main/shot.png')).toBe('https://raw.githubusercontent.com/a/b/main/shot.png');
  });
  it('keeps image URLs distinct from repository URLs and parses labelled fields', () => {
    const input = discordSubmission('submit https://github.com/team/game\ntitle: My game\ndescription: A port.\nbanner: https://github.com/team/game/blob/main/banner.png', [{ url: 'https://cdn.discordapp.com/attachments/1/2/shot.png?ex=123', name: 'shot.png', contentType: 'image/png' }]);
    expect(input).toMatchObject({ repo: 'https://github.com/team/game', name: 'My game', description: 'A port.' });
    expect(input.images).toHaveLength(2); expect(input.images[0].alt).toBe('Project banner');
    expect(messageImages('', [{url:'https://example.com/file.exe',name:'file.exe'}])).toEqual([]);
  });
  it('renders local artwork as cover and body images with escaped captions', () => {
    const page=submissionPage({title:'Game',description:'Port',repo:'https://github.com/a/b',owner:'a',createdAt:'2026-09-15',images:[{path:'./submission-1.png',alt:'<script>banner</script>'}]});
    expect(page).toContain('cover: "./submission-1.png"');expect(page).not.toContain('](./submission-1.png)');expect(page).not.toContain('![<script>');
  });
});
describe('readmeSummary', () => {
  it('keeps the intro and descriptive sections, dropping build steps, images, and code', () => {
    const md = `# Game Recompiled\n\nA native recompilation of **Game** using [\`snesrecomp\`](https://x).\n\n<p align="center"><img src="a.png" alt="x"><br><sub><b>Title screen caption</b></sub></p>\n\nIt boots from the original ROM and plays through to the ending.\n\n## Status\n\n- Intro works\n- Battles work\n\n## Build\n\n\`\`\`sh\nmake\n\`\`\`\n\nRun cmake with the preset.\n\n## License\n\nMIT\n`;
    expect(readmeSummary(md)).toEqual(['A native recompilation of Game using snesrecomp.', 'It boots from the original ROM and plays through to the ending.', '- Intro works', '- Battles work']);
    expect(readmeSummary('# Title\n\nshort\n')).toEqual([]);
    expect(readmeSummary(`# T\n\n${'x'.repeat(900)}.\n\n${'y'.repeat(900)}.\n`, 700)).toEqual(['x'.repeat(600)]);
  });
});
