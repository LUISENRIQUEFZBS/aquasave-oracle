// Plain helpers (no "use server"). TypeORM returns Oracle DATE columns (type "date") as 'YYYY-MM-DD' text.

export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Strict 'YYYY-MM-DD' check (also rejects impossible dates such as 2026-02-31). */
export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * 'YYYY-MM-DD' -> Date at 12:00 UTC, so formatting with timeZone "America/Lima" always shows the same
 * calendar day regardless of the server's own time zone.
 */
export function isoToDate(s: string): Date {
  return new Date(`${String(s).slice(0, 10)}T12:00:00Z`);
}

export function formatLima(s: string, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }): string {
  return isoToDate(s).toLocaleDateString("es-PE", { ...opts, timeZone: "America/Lima" });
}
