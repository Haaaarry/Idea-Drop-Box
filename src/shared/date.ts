import type { Idea } from './types.js';

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSameLocalDate(isoDate: string, targetDate = new Date()): boolean {
  return getLocalDateKey(new Date(isoDate)) === getLocalDateKey(targetDate);
}

export function ideasForDate(ideas: Idea[], dateKey: string): Idea[] {
  return ideas.filter((idea) => getLocalDateKey(new Date(idea.createdAt)) === dateKey);
}
