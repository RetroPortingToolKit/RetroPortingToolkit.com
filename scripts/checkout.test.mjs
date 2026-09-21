import { describe, it, expect, vi } from 'vitest';
import { rollbackOnFailure } from './checkout.mjs';

describe('checkout rollback', () => {
  it('restores what the job wrote when it throws, and nothing when it succeeds', async () => {
    const exec = vi.fn(async () => {});
    const written = [];
    await expect(rollbackOnFailure(exec, written, async () => {
      written.push('data/games/01_a/index.md', 'data/submissions.json');
      throw new Error('npm run test failed');
    })).rejects.toThrow('npm run test failed');
    expect(exec).toHaveBeenCalledWith('git', ['checkout', 'HEAD', '--', 'data/games/01_a/index.md', 'data/submissions.json']);

    const clean = vi.fn(async () => {});
    expect(await rollbackOnFailure(clean, [], async () => 'done')).toBe('done');
    expect(clean).not.toHaveBeenCalled();
  });

  it('leaves committed work alone and lets the real error through even if the restore fails', async () => {
    const committed = vi.fn(async () => {});
    const list = [];
    await expect(rollbackOnFailure(committed, list, async () => {
      list.push('data/games/01_a/index.md');
      list.length = 0; // the commit captured it
      throw new Error('push rejected');
    })).rejects.toThrow('push rejected');
    expect(committed).not.toHaveBeenCalled();

    const broken = vi.fn(async () => { throw new Error('git is unavailable'); });
    const paths = [];
    await expect(rollbackOnFailure(broken, paths, async () => {
      paths.push('data/games/01_a/index.md');
      throw new Error('the real failure');
    })).rejects.toThrow('the real failure');
  });
});
