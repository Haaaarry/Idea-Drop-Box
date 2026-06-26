import { describe, expect, it } from 'vitest';
import { generateDeepSeekReport } from '../src/main/deepseek.js';
import type { Idea } from '../src/shared/types.js';

describe('deepseek client', () => {
  it('sends ideas to the DeepSeek chat completions API', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '# 今日想法日报\n\n总结完成。' } }]
        })
      } as Response;
    };
    const ideas: Idea[] = [{ id: '1', content: '记录灵感', createdAt: '2026-06-24T10:00:00.000Z' }];

    const markdown = await generateDeepSeekReport({
      apiKey: 'sk-test',
      model: 'deepseek-chat',
      date: '2026-06-24',
      ideas,
      fetcher
    });

    expect(markdown).toContain('总结完成');
    expect(calls[0].url).toBe('https://api.deepseek.com/chat/completions');
    expect(calls[0].init.headers).toMatchObject({ Authorization: 'Bearer sk-test' });
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({
      model: 'deepseek-chat',
      temperature: 0.4
    });
  });
});
