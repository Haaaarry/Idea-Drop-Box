export interface Idea {
  id: string;
  content: string;
  createdAt: string;
}

export interface Report {
  id: string;
  date: string;
  markdown: string;
  createdAt: string;
  exportPath?: string;
  error?: string;
}

export interface Settings {
  apiKey: string;
  model: string;
  reportTime: string;
  shortcut: string;
  exportDir: string;
}

export interface AppState {
  ideas: Idea[];
  reports: Report[];
  settings: Settings;
  shortcutRegistered: boolean;
}

export interface SaveIdeaInput {
  content: string;
}

export interface GenerateReportResult {
  report: Report;
  exportError?: string;
}
