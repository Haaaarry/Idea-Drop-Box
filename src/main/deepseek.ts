import type { Idea } from '../shared/types.js';

interface GenerateDeepSeekReportInput {
  apiKey: string;
  model: string;
  date: string;
  ideas: Idea[];
  fetcher?: typeof fetch;
}

interface DeepSeekResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

export async function generateDeepSeekReport(input: GenerateDeepSeekReportInput): Promise<string> {
  const fetcher = input.fetcher ?? fetch;
  const response = await fetcher('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: '你是一个私人想法日报编辑。请把零散想法整理成清晰、温暖、可行动的中文 Markdown 日报。'
        },
        {
          role: 'user',
          content: buildPrompt(input.date, input.ideas)
        }
      ]
    })
  });

  const data = await response.json() as DeepSeekResponse;
  if (!response.ok) {
    throw new Error(data.error?.message ?? `DeepSeek request failed with ${response.status}`);
  }

  const markdown = data.choices?.[0]?.message?.content?.trim();
  if (!markdown) {
    throw new Error('DeepSeek returned an empty report');
  }

  return markdown;
}

function buildPrompt(date: string, ideas: Idea[]): string {
  const lines = ideas.map((idea) => `- ${idea.createdAt}: ${idea.content}`).join('\n');
  return [
    `日期：${date}`,
    '',
    '今天记录的想法：',
    lines,
    '',
    '请输出 Markdown，包含：',
    '1. 一句话总览',
    '2. 主题归类',
    '3. 值得继续推进的 3 个线索',
    '4. 明天可以做的小行动',
    '5. 原始想法列表'
  ].join('\n');
}
