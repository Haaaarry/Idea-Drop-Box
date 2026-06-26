import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Idea } from '../shared/types.js';

export function buildFallbackReport(date: string, ideas: Idea[], reason: string): string {
  const ideaLines = ideas.length
    ? ideas.map((idea) => `- ${formatTime(idea.createdAt)} ${idea.content}`).join('\n')
    : '- 今天还没有记录想法。';

  return [
    `# 今日想法日报 - ${date}`,
    '',
    '## 状态',
    '',
    `AI 总结未生成：${reason}`,
    '',
    '## 今日想法',
    '',
    ideaLines,
    ''
  ].join('\n');
}

export function buildNoIdeaReport(date: string): string {
  return [
    `# 今日想法日报 - ${date}`,
    '',
    '今天没有记录想法。留白也算一种整理。',
    ''
  ].join('\n');
}

export async function exportReportMarkdown(exportDir: string, date: string, markdown: string): Promise<string> {
  await mkdir(exportDir, { recursive: true });
  const filePath = join(exportDir, `${date}-idea-report.md`);
  await writeFile(filePath, markdown, 'utf8');
  return filePath;
}

function formatTime(isoDate: string): string {
  const date = new Date(isoDate);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
