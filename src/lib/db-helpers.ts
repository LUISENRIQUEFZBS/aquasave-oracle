import type { EntityManager, EntitySchema } from "typeorm";

/** True when an Oracle error is ORA-00001 (unique constraint violated). */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { errorNum?: number; driverError?: { errorNum?: number }; message?: string };
  return e?.errorNum === 1 || e?.driverError?.errorNum === 1 || /ORA-00001/.test(e?.message ?? "");
}

/** True for ORA-02291 (parent key not found) / ORA-02292 (child records found). */
export function isForeignKeyViolation(err: unknown): boolean {
  const msg = (err as { message?: string })?.message ?? "";
  return /ORA-02291|ORA-02292/.test(msg);
}

function findNumber(x: unknown): number | undefined {
  if (typeof x === "number") return x;
  if (Array.isArray(x)) {
    for (const v of x) {
      const n = findNumber(v);
      if (n !== undefined) return n;
    }
  } else if (x && typeof x === "object") {
    for (const v of Object.values(x)) {
      const n = findNumber(v);
      if (n !== undefined) return n;
    }
  }
  return undefined;
}

/**
 * INSERT one row and return its trigger-generated primary key.
 * (repository.save() returns an undefined id when the PK comes from a trigger —
 * see CLAUDE.md — so we use INSERT ... RETURNING id.)
 */
export async function insertReturningId<T extends object>(
  manager: EntityManager,
  entity: EntitySchema<T>,
  values: Record<string, unknown>,
): Promise<number> {
  const res = await manager
    .createQueryBuilder()
    .insert()
    .into(entity)
    .values(values as never)
    .returning(["id"] as never)
    .updateEntity(false) // TypeORM 0.3.31's Oracle entity-updater crashes with a custom RETURNING; read raw instead
    .execute();
  const id = findNumber(res.raw); // Oracle outBinds, e.g. [[3]]
  if (typeof id !== "number") throw new Error("No se pudo obtener el ID del registro creado.");
  return id;
}
