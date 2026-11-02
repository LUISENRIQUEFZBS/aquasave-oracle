// Plain helper (no "use server"): internal user names by id, for display only.
import { getDb } from "@/lib/db";

export async function internalUserNames(ids: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(ids.filter((x) => Number.isSafeInteger(x) && x > 0))];
  if (!unique.length) return new Map();
  const db = await getDb();
  const rows: { ID: number; NAME: string }[] = await db.query(
    `SELECT NCODUSUARIO AS ID, VNOMBRE AS NAME FROM AQUA_USUARIO_INTERNO WHERE NCODUSUARIO IN (${unique.map((_, i) => `:${i + 1}`).join(",")})`,
    unique,
  );
  return new Map(rows.map((r) => [Number(r.ID), r.NAME]));
}
