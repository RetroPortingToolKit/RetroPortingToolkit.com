import { describe, it, expect } from 'vitest';
import { repositoryUrl, submissionId, submissionPage, moderationPage, discordSubmission, editLink } from './submissions.mjs';
import yaml from 'js-yaml';
const record = { id: submissionId('https://github.com/example/recomp'), repo: 'https://github.com/example/recomp', owner: 'example', title: 'Game\n---\ndraft: true', description: '[bad](javascript:alert(1)) <script>bad</script>', path: 'data/games/40_recomp-1234/index.md', createdAt: '2026-09-15T00:00:00.000Z' };
describe('submission boundaries', () => {
  it('canonicalizes git URLs and supports GitLab subgroups', () => {
    expect(repositoryUrl('https://github.com/Owner/Game.git/')).toBe('https://github.com/Owner/Game');
    expect(repositoryUrl('https://gitlab.com/team/subgroup/game')).toBe('https://gitlab.com/team/subgroup/game');
    expect(submissionId('https://github.com/OWNER/game')).toBe(submissionId('https://github.com/owner/Game.git'));
  });
  it.each(['http://github.com/a/b', 'https://github.com.evil/a/b', 'https://user:pass@github.com/a/b', 'https://github.com/a/b/issues/1', 'https://gitlab.com/a/../b', 'https://github.com/a/%2e%2e', 'https://github.com/a/b?x=1', 'file:///etc/passwd', 'https://127.0.0.1/a/b'])('rejects unsafe and non-repository URL %s', value => expect(() => repositoryUrl(value)).toThrow());
  it('keeps submitted text out of frontmatter syntax and executable markdown', () => {
    const raw = submissionPage(record);
    const fm = yaml.load(raw.split('---\n')[1]);
    expect(fm.title).toBe(record.title); expect(fm.draft).toBe(false);
    expect(raw).not.toContain('\n[bad](javascript:');
    expect(raw).toContain('\\<script\\>');
  });
  it('credits the owner, links toolkits, and keeps the cover out of the body', () => {
    const raw = submissionPage({ ...record, description: 'A snesrecomp port.', images: [{ path: './submission-1.png', alt: 'Cover' }, { path: './submission-2.png', alt: 'Town' }], summary: ['Built with SNESRecomp.', '- Boots to gameplay', '- Saves work'] });
    const fm = yaml.load(raw.split('---\n')[1]);
    expect(fm.cover).toBe('./submission-1.png'); expect(fm.platform).toBe('super-nintendo'); expect(fm.links[0].href).toBe(record.repo);
    expect(raw).not.toContain('](./submission-1.png)'); expect(raw).toContain('![Town](./submission-2.png)');
    expect(raw).toContain('A [SNESRecomp](/hardware/super-nintendo) port.');
    expect(raw).toContain('## Project\n\nBuilt with [SNESRecomp](/hardware/super-nintendo).\n\n- Boots to gameplay\n- Saves work\n');
    expect(fm.creator).toEqual({ github: 'example' });
    expect(raw).not.toContain('Made by');
    expect(raw).not.toContain('reviewed'); expect(raw).not.toContain('namespace');
    expect(yaml.load(submissionPage({ ...record, repo: 'https://gitlab.com/team/sub/game', owner: 'team/sub', discord: 'maker' }).split('---\n')[1]).creator).toEqual({ gitlab: 'team/sub', discord: 'maker' });
    expect(submissionPage(record)).not.toContain('## Project');
    expect(editLink({ url: '/games/game' }, 'https://site')).toBe('https://site/admin?at=/games/game');
  });
  it('unlists only the identified page and preserves editorial content', () => {
    const raw = submissionPage(record) + '\nEditorial addition.\n';
    expect(moderationPage(raw, record, 'removed')).toContain('draft: true');
    expect(moderationPage(raw, record, 'removed')).toContain('Editorial addition.');
    expect(moderationPage(raw, record, 'confirmed')).not.toContain('reviewed by the team');
    expect(moderationPage(raw.replace('## Project', 'This community submission has not yet been reviewed by the team. See the repository.\n\n## Project'), record, 'confirmed')).not.toContain('reviewed by the team');
    expect(() => moderationPage(raw.replace(record.id, 'different'), record, 'removed')).toThrow();
    expect(() => moderationPage(raw, { ...record, path: '../AGENTS.md' }, 'removed')).toThrow();
  });
  it('routes submissions without converting ordinary questions into writes', () => {
    expect(discordSubmission('submit https://github.com/example/recomp This is my port', [], 'maker')).toMatchObject({ repo: record.repo, discord: 'maker' });
    expect(discordSubmission(record.repo)).toMatchObject({ repo: record.repo });
    expect(discordSubmission(`What is ${record.repo}?`)).toBeNull();
    expect(discordSubmission('submit https://github.com/a/b https://github.com/c/d')).toBeNull();
  });
});
