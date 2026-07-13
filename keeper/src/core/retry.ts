/**
 * Retry a flaky async operation (e.g. an RPC call that can hit a transient
 * ECONNRESET / timeout) a few times with linear backoff before giving up.
 */
export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const retries = opts.retries ?? 3;
  const base = opts.baseDelayMs ?? 800;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const delay = base * attempt;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `  ↻ ${label}: attempt ${attempt}/${retries} failed (${msg}); retrying in ${delay}ms`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}
