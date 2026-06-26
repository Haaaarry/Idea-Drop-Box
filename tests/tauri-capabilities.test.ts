import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Tauri capabilities', () => {
  it('enables core permissions for both app windows', () => {
    const capability = JSON.parse(
      readFileSync(resolve('src-tauri/capabilities/default.json'), 'utf8')
    ) as { windows: string[]; permissions: string[] };

    expect(capability.windows).toEqual(expect.arrayContaining(['main', 'capture']));
    expect(capability.permissions).toContain('core:default');
  });
});
