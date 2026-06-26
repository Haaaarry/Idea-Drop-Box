import type { Settings } from '../shared/types.js';

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: 'deepseek-chat',
  reportTime: '23:00',
  shortcut: 'Ctrl+Alt+Space',
  exportDir: ''
};

const REPORT_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function normalizeSettings(input: Partial<Settings> = {}): Settings {
  const reportTime = typeof input.reportTime === 'string' && REPORT_TIME_PATTERN.test(input.reportTime)
    ? input.reportTime
    : DEFAULT_SETTINGS.reportTime;

  const shortcut = typeof input.shortcut === 'string' && input.shortcut.trim()
    ? input.shortcut.trim()
    : DEFAULT_SETTINGS.shortcut;

  return {
    apiKey: typeof input.apiKey === 'string' ? input.apiKey.trim() : DEFAULT_SETTINGS.apiKey,
    model: typeof input.model === 'string' && input.model.trim() ? input.model.trim() : DEFAULT_SETTINGS.model,
    reportTime,
    shortcut,
    exportDir: typeof input.exportDir === 'string' ? input.exportDir.trim() : DEFAULT_SETTINGS.exportDir
  };
}
