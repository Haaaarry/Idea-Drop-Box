import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { AppState, GenerateReportResult, Idea, Settings } from '../shared/types.js';

export const ideaBox = {
  getState: (): Promise<AppState> => invoke('get_state'),
  addIdea: (content: string): Promise<Idea> => invoke('add_idea', { content }),
  generateReport: (date?: string): Promise<GenerateReportResult> => invoke('generate_report', { date }),
  updateSettings: (settings: Partial<Settings>): Promise<{ settings: Settings; shortcutRegistered: boolean }> =>
    invoke('update_settings', { settings }),
  chooseExportDir: (): Promise<string | null> => invoke('choose_export_dir'),
  hideCapture: (): Promise<void> => invoke('hide_capture'),
  showMain: (): Promise<void> => invoke('show_main'),
  onDataChanged: (callback: () => void): (() => void) => {
    let cleanup: (() => void) | undefined;
    listen('data-changed', callback).then((unlisten) => {
      cleanup = unlisten;
    });
    return () => cleanup?.();
  },
  onCaptureFocus: (callback: () => void): (() => void) => {
    let cleanup: (() => void) | undefined;
    listen('capture-focus', callback).then((unlisten) => {
      cleanup = unlisten;
    });
    return () => cleanup?.();
  }
};
