import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/main/settings.js';

describe('settings', () => {
  it('fills missing settings with defaults', () => {
    expect(normalizeSettings({ apiKey: '  sk-test  ' })).toEqual({
      ...DEFAULT_SETTINGS,
      apiKey: 'sk-test'
    });
  });

  it('rejects invalid report times and blank shortcut values', () => {
    expect(normalizeSettings({ reportTime: '29:99', shortcut: '   ' })).toMatchObject({
      reportTime: DEFAULT_SETTINGS.reportTime,
      shortcut: DEFAULT_SETTINGS.shortcut
    });
  });
});
