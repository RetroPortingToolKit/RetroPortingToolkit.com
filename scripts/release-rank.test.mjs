import { describe, it, expect } from 'vitest';
import { releaseRank, compareParts, pickRelease, releaseDecision, looseVersion, isNewsRelease, isPrerelease } from './release-rank.mjs';

/** Tags below are real: taken from the live releases feeds of the tracked
 * repositories on 2026-09-29, including the mod tag that overwrote the Mega
 * Man X page and the platform tags that sat on WarioWare and Yoshi. */

describe('ranking a release tag', () => {
  it('ranks a tag that starts with a version', () => {
    expect(releaseRank('v1.6.6')).toEqual({ parts: [1, 6, 6], suffix: '' });
    expect(releaseRank('1.6.6')).toEqual({ parts: [1, 6, 6], suffix: '' });
    expect(releaseRank('v1.3')).toEqual({ parts: [1, 3], suffix: '' });
    expect(releaseRank('v0494')).toEqual({ parts: [494], suffix: '' });
    expect(releaseRank('v0.0.6.7')).toEqual({ parts: [0, 0, 6, 7], suffix: '' });
    expect(releaseRank('v1.1.1-rc1')).toEqual({ parts: [1, 1, 1], suffix: '-rc1' });
    expect(releaseRank('v0.1.0-linux')).toEqual({ parts: [0, 1, 0], suffix: '-linux' });
    expect(releaseRank('v1.0.0-build.7')).toEqual({ parts: [1, 0, 0], suffix: '-build.7' });
    expect(releaseRank('v0.0.10-ita.1')).toEqual({ parts: [0, 0, 10], suffix: '-ita.1' });
    expect(releaseRank('v1.7.0-hd')).toEqual({ parts: [1, 7, 0], suffix: '-hd' });
  });

  it('refuses a tag that is not a version of this game', () => {
    // The mod, the platform build, the staging artifact, the branch snapshot.
    for (const tag of [
      'zero-v0.0.1', 'android-v0.0.1', 'backup-v0.0.4.1-before-pacing',
      'shared-staging-20260903', 'ws-baseline-prehistory', 'seam-good', 'rc2',
      'backup/pre-gbrecomp-merge-2026-06-24', 'backup%2Fpre-gbrecomp-merge-2026-06-24',
      'archive/cycle-accurate-pacing-experimental-2026-04-20',
      'phase1/sf2-standardized-baseline-20260813',
      '2026.04.20', '20260903', 'v20260903', '', null, undefined,
    ]) expect(releaseRank(tag), String(tag)).toBeNull();
  });

  it('compares versions as integers, not as text', () => {
    expect(compareParts([0, 1, 20], [0, 1, 19])).toBeGreaterThan(0);
    expect(compareParts([1, 0], [1, 0, 0])).toBe(0);
    expect(compareParts([494], [493])).toBeGreaterThan(0);
    expect(compareParts([0, 0, 8], [0, 0, 6, 7])).toBeGreaterThan(0);
  });
});

const feed = (...tags) => tags.map((tag) => ({ tag, name: tag, url: `https://example.test/releases/tag/${tag}`, date: '2026-01-01' }));

describe('picking the release out of a feed', () => {
  it('takes the highest version, not the first entry', () => {
    // Mega Man X: the mod was published last and listed first.
    expect(pickRelease(feed('zero-v0.0.1', 'v1.6.6', 'v1.6.5', 'v1.6.4')).tag).toBe('v1.6.6');
    expect(pickRelease(feed('shared-staging-20260903', 'v0.0.5-alpha', 'v0.0.4-audio-test.2')).tag).toBe('v0.0.5-alpha');
    expect(pickRelease(feed('shared-staging-20260903', 'v0.0.2', 'v0.0.1')).tag).toBe('v0.0.2');
    expect(pickRelease(feed('android-v0.0.1', 'v0.0.1')).tag).toBe('v0.0.1');
    expect(pickRelease(feed('v0.1.0-linux', 'v1.1.0', 'v1.0.0')).tag).toBe('v1.1.0');
    // Faxanadu lists its 1.x releases after its 2.x ones.
    expect(pickRelease(feed('v2.2.0', 'v0.1.0-linux', 'v2.1.0', 'v1.2.0')).tag).toBe('v2.2.0');
  });

  it('breaks an equal version on the tag, never on the date', () => {
    // Order-independent: the bare tag is the release either way round.
    expect(pickRelease(feed('v1.7.0', 'v1.7.0-hd')).tag).toBe('v1.7.0');
    expect(pickRelease(feed('v1.7.0-hd', 'v1.7.0')).tag).toBe('v1.7.0');
    expect(pickRelease(feed('v0.0.10-ita.1', 'v0.0.10')).tag).toBe('v0.0.10');
    // Ruby & Sapphire: the oldest release carries the newest <updated>,
    // because its notes were edited. Dates must not decide.
    const edited = [
      { tag: 'v0.0.1', name: 'v0.0.1', url: 'u1', date: '2026-09-20' },
      { tag: 'v0.0.4', name: 'v0.0.4', url: 'u4', date: '2026-08-01' },
    ];
    expect(pickRelease(edited).tag).toBe('v0.0.4');
  });

  it('returns nothing rather than a staging tag', () => {
    expect(pickRelease(feed('shared-staging-20260903', 'nightly'))).toBeNull();
    expect(pickRelease(feed('Foo-v1.2.0', 'Foo-v1.1.0'))).toBeNull();
    expect(pickRelease([])).toBeNull();
  });
});

describe('deciding what to do with a pick', () => {
  const at = (tag) => ({ tag, url: `u/${tag}` });
  const decide = (recorded, tag, feedTags = []) =>
    releaseDecision({ recorded, recordedUrl: `u/${recorded}`, pick: at(tag), feedTags });

  it('records a higher version and reviews everything else', () => {
    // The five repairs: a tag the watcher wrote itself, still in the feed.
    expect(decide('shared-staging-20260903', 'v0.0.5-alpha', ['shared-staging-20260903', 'v0.0.5-alpha'])).toBe('write');
    expect(decide('zero-v0.0.1', 'v1.6.6', ['zero-v0.0.1', 'v1.6.6'])).toBe('write');
    expect(decide('android-v0.0.1', 'v0.0.1', ['android-v0.0.1', 'v0.0.1'])).toBe('write');
    expect(decide('v0.1.0-linux', 'v1.1.0')).toBe('write'); // plain version increase

    // Never automatically down, and never sideways.
    expect(decide('v1.6.6', 'v1.6.5')).toBe('review');
    expect(decide('v1.6.6', 'v1.5.0')).toBe('review');
    expect(decide('v1.0.0-build.7', 'v1.0.0')).toBe('review');
    expect(decide('v0.0.10', 'v0.0.10-ita.1')).toBe('review');
    expect(decide('v0494', 'v0.5.0')).toBe('review'); // tag scheme changed
    // A hand-written tag nothing can rank is not the watcher's to replace.
    expect(decide('nightly', 'v2.0.0')).toBe('review');
    expect(releaseDecision({ recorded: 'v1.6.6', recordedUrl: 'u', pick: null })).toBe('review');

    // The series moving on is still automatic.
    expect(decide('v1.0.0-build.7', 'v1.0.0-build.8')).toBe('write');
    expect(decide('v0.8.0-rc1', 'v0.8.0-rc2')).toBe('write');

    expect(decide('', 'v1.0.0')).toBe('write'); // first sighting
    expect(decide('v1.6.6', 'v1.6.6')).toBe('seen');
    // Same tag, wrong link: Starfox Enhanced's missing download.
    expect(releaseDecision({ recorded: 'v1.6.6', recordedUrl: 'u/v1.6.5', pick: at('v1.6.6') })).toBe('write');
  });
});

describe('deciding what is worth announcing', () => {
  it('reads a version out of a variant tag', () => {
    expect(looseVersion('android-v0.0.1')).toEqual([0, 0, 1]);
    expect(looseVersion('v0494')).toEqual([494]);
    expect(looseVersion('seam-good')).toBeNull();
  });

  it('announces a genuinely newer build and nothing else', () => {
    // The repairs, none of which is news.
    expect(isNewsRelease({ tag: 'shared-staging-20260903', at: '2026-09-03' }, { tag: 'v0.0.5-alpha', date: '2026-08-06' })).toBe(false);
    expect(isNewsRelease({ tag: 'android-v0.0.1', at: '2026-08-02' }, { tag: 'v0.0.1', date: '2026-08-29' })).toBe(false);
    expect(isNewsRelease({ tag: 'v0.1.0-linux', at: '2026-06-14' }, { tag: 'v1.1.0', date: '2026-06-13' })).toBe(false);
    expect(isNewsRelease({ tag: 'v1.6.6', at: '2026-09-25' }, { tag: 'zero-v0.0.1', date: '2026-09-29' })).toBe(false);
    expect(isNewsRelease({ tag: 'v1.6.6', at: '2026-09-25' }, { tag: 'v1.6.6', date: '2026-09-25' })).toBe(false);
    expect(isNewsRelease(undefined, { tag: 'v1.0.0', date: '2026-09-25' })).toBe(false);

    // Real releases still are.
    expect(isNewsRelease({ tag: 'v1', at: '2026-09-16' }, { tag: 'v2', date: '2026-09-16' })).toBe(true);
    expect(isNewsRelease({ tag: 'v1.0.0', at: '2026-01-01' }, { tag: 'v2.0.0', date: '2026-09-22' })).toBe(true);
    expect(isNewsRelease({ tag: 'v0.14.1', at: '2026-09-22' }, { tag: 'v0.14.2', date: '2026-09-22' })).toBe(true);
  });
});

/** On 2026-09-30 the watcher put v1.7.0-rc.1 on the Mega Man X page and
 * announced it in the channel. Its author replied "Ah shit. I didn't want to
 * publicize that yet". A release candidate is not the release. */
describe('a release candidate is not the release', () => {
  it('prefers a tag with no suffix over any variant of a higher number', () => {
    expect(pickRelease(feed('v1.7.0-rc.1', 'v1.6.6', 'v1.6.5')).tag).toBe('v1.6.6');
    expect(pickRelease(feed('v1.12.0-rc1', 'v1.11.0')).tag).toBe('v1.11.0');
    expect(pickRelease(feed('v1.1.1-rc1', 'v1.1.0')).tag).toBe('v1.1.0');
  });

  it('still uses a prerelease when the repository has never published anything else', () => {
    // Tomba has only ever shipped -alpha, and its next-best tag is a backup.
    expect(pickRelease(feed('v0.14.1-alpha', 'v0.13.0-alpha', 'v0.12.1-rbengine-bak.2')).tag).toBe('v0.14.1-alpha');
    expect(pickRelease(feed('v0.1.0-alpha')).tag).toBe('v0.1.0-alpha');
  });

  it('knows a prerelease from a platform build or a build series', () => {
    for (const tag of ['v1.7.0-rc.1', 'v1.12.0-rc1', 'v0.14.1-alpha', 'v1.0.0-beta2', 'v2.0.0-nightly']) expect(isPrerelease(tag), tag).toBe(true);
    for (const tag of ['v1.6.6', 'v0.1.0-linux', 'v1.0.0-build.7', 'v0.0.10-ita.1', 'v1.7.0-hd']) expect(isPrerelease(tag), tag).toBe(false);
  });

  it('takes a release candidate back off a page, but does not touch a real build', () => {
    const at = (tag) => ({ tag, url: `u/${tag}` });
    const decide = (recorded, tag, feedTags = [recorded, tag]) =>
      releaseDecision({ recorded, recordedUrl: `u/${recorded}`, pick: at(tag), feedTags });
    // The number goes down, and that is the point: undo what the watcher did.
    expect(decide('v1.7.0-rc.1', 'v1.6.6')).toBe('write');
    expect(decide('v1.12.0-rc1', 'v1.11.0')).toBe('write');
    // A platform build and a build series are real releases; a person decides.
    expect(decide('v0.1.0-linux', 'v0.0.1')).toBe('review');
    expect(decide('v1.0.0-build.7', 'v1.0.0')).toBe('review');
    // And a tag the watcher never published is not its to roll back.
    expect(decide('v1.7.0-rc.1', 'v1.6.6', ['v1.6.6'])).toBe('review');
    // A newer candidate in the same series still tracks.
    expect(decide('v1.7.0-rc.1', 'v1.7.0-rc.2')).toBe('write');
  });

  it('does not announce a page being put back', () => {
    expect(isNewsRelease({ tag: 'v1.7.0-rc.1', at: '2026-09-30' }, { tag: 'v1.6.6', date: '2026-09-25' })).toBe(false);
  });
});
