import { describe, it, expect } from 'vitest';
import { parseUpdates, setUpdates, addUpdate } from './page-updates.mjs';
describe("what's new entries", () => {
  it('round-trips through frontmatter text, newest first, without touching other lines', () => {
    const fm = 'title: "Game"\nstatus: "Playable"';
    const one = addUpdate(fm, '  Saves   now work. ', '2026-09-16');
    expect(one).toBe('title: "Game"\nstatus: "Playable"\nupdates:\n  - date: "2026-09-16"\n    text: "Saves now work."');
    const two = addUpdate(one, 'Widescreen "16:9" done', '2026-09-17');
    expect(parseUpdates(two)).toEqual([{ date: '2026-09-17', text: 'Widescreen "16:9" done' }, { date: '2026-09-16', text: 'Saves now work.' }]);
    expect(setUpdates(two + '\ndraft: false', [])).toBe('title: "Game"\nstatus: "Playable"\ndraft: false');
    expect(addUpdate(fm, '   ')).toBe(fm);
  });
});
