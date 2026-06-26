import { describe, expect, it } from 'vitest';
import { loadWithStartupRetry } from '../src/renderer/startupRetry.js';

describe('loadWithStartupRetry', () => {
  it('retries transient Tauri state initialization failures', async () => {
    let attempts = 0;

    const result = await loadWithStartupRetry(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error('state not managed for field `state` on command `get_state`');
        }
        return 'ready';
      },
      { attempts: 2, delayMs: 0 }
    );

    expect(result).toBe('ready');
    expect(attempts).toBe(2);
  });
});
