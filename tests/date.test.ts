import { describe, expect, it } from 'vitest';
import { getLocalDateKey, isSameLocalDate } from '../src/shared/date.js';

describe('date helpers', () => {
  it('formats a local date key as YYYY-MM-DD', () => {
    const date = new Date(2026, 5, 24, 23, 15);

    expect(getLocalDateKey(date)).toBe('2026-06-24');
  });

  it('matches ideas created on the same local day', () => {
    expect(isSameLocalDate('2026-06-24T01:00:00.000Z', new Date('2026-06-24T08:00:00.000Z'))).toBe(true);
    expect(isSameLocalDate('2026-06-23T01:00:00.000Z', new Date('2026-06-24T08:00:00.000Z'))).toBe(false);
  });
});
