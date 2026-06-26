import { describe, expect, it } from 'vitest';
import { buildFallbackReport } from '../src/main/reports.js';
import type { Idea } from '../src/shared/types.js';

describe('reports', () => {
  it('builds a useful fallback report when AI is unavailable', () => {
    const ideas: Idea[] = [
      { id: '1', content: '做一个快捷记录想法的小窗', createdAt: '2026-06-24T10:30:00.000Z' },
      { id: '2', content: '晚上自动总结灵感', createdAt: '2026-06-24T11:00:00.000Z' }
    ];

    const report = buildFallbackReport('2026-06-24', ideas, '缺少 DeepSeek API Key');

    expect(report).toContain('# 今日想法日报 - 2026-06-24');
    expect(report).toContain('缺少 DeepSeek API Key');
    expect(report).toContain('做一个快捷记录想法的小窗');
    expect(report).toContain('晚上自动总结灵感');
  });
});
