// Plain module (safe to import from client components for the types).
export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Wraps a mutation so expected failures come back as { ok: false, error } instead of being thrown.
 * (In production builds Next.js hides the message of errors thrown from server actions.)
 */
export async function attempt<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado." };
  }
}
