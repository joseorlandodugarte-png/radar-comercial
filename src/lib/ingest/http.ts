export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  /** Injected in tests to avoid real waiting. */
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (attempt: number, reason: string, delayMs: number) => void;
};

const defaultSleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class HttpError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`HTTP ${status}: ${body.slice(0, 300)}`);
  }
}

/**
 * fetch with exponential backoff for network errors, 429 and 5xx.
 * Honours Retry-After. 4xx other than 429 are returned immediately (they won't fix themselves).
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: RetryOptions = {},
): Promise<Response> {
  const { retries = 3, baseDelayMs = 1000, sleep = defaultSleep, onRetry } = opts;
  for (let attempt = 0; ; attempt++) {
    let reason: string;
    let retryAfterMs: number | null = null;
    try {
      const res = await fetch(url, init);
      if (res.status !== 429 && res.status < 500) return res;
      reason = `HTTP ${res.status}`;
      const ra = res.headers.get("retry-after");
      if (ra && /^\d+$/.test(ra)) retryAfterMs = Number(ra) * 1000;
      if (attempt >= retries) return res;
    } catch (err) {
      reason = err instanceof Error ? err.message : String(err);
      if (attempt >= retries) throw err;
    }
    const delay = retryAfterMs ?? baseDelayMs * 2 ** attempt;
    onRetry?.(attempt + 1, reason, delay);
    await sleep(delay);
  }
}
