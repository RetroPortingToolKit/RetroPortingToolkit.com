import { describe, it, expect } from 'vitest';
import { repositoryUrl, submissionId, submissionPage, moderationPage, discordSubmission } from './submissions.mjs';
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
  it('unlists only the identified page and preserves editorial content', () => {
    const raw = submissionPage(record) + '\nEditorial addition.\n';
    expect(moderationPage(raw, record, 'removed')).toContain('draft: true');
    expect(moderationPage(raw, record, 'removed')).toContain('Editorial addition.');
    expect(moderationPage(raw, record, 'confirmed')).toContain('has been reviewed');
    expect(() => moderationPage(raw.replace(record.id, 'different'), record, 'removed')).toThrow();
    expect(() => moderationPage(raw, { ...record, path: '../AGENTS.md' }, 'removed')).toThrow();
  });
  it('routes submissions without converting ordinary questions into writes', () => {
    expect(discordSubmission('submit https://github.com/example/recomp This is my port')).toMatchObject({ repo: record.repo });
    expect(discordSubmission(record.repo)).toMatchObject({ repo: record.repo });
    expect(discordSubmission(`What is ${record.repo}?`)).toBeNull();
    expect(discordSubmission('submit https://github.com/a/b https://github.com/c/d')).toBeNull();
  });
});
