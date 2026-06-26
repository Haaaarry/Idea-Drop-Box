type RetryOptions = {
  attempts?: number;
  delayMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function isStartupStateRace(error: unknown): boolean {
  return String(error).includes('state not managed');
}

export async function loadWithStartupRetry<T>(
  load: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? 8;
  const delayMs = options.delayMs ?? 120;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await load();
    } catch (error) {
      if (attempt === attempts || !isStartupStateRace(error)) {
        throw error;
      }
      await sleep(delayMs);
    }
  }

  return load();
}
