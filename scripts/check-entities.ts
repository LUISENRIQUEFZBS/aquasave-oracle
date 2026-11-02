// scripts/check-entities.ts — run with: npx tsx scripts/check-entities.ts
// 1) reads up to 1 row from every entity (proves table + column names map correctly)
// 2) inserts one test Brand inside a transaction and ROLLS IT BACK (proves the
//    audit/default handling: NESTADO, NINDICADOR, trigger-set DFECCRE, VRESCRE).
async function main() {
  try { (process as any).loadEnvFile?.(".env"); } catch {} // Node >= 20.12; else export vars yourself
  const { getDb } = await import("../src/lib/db");
  const { allEntities } = await import("../src/entities");
  const { Brand } = await import("../src/entities/Brand");
  const { createAudit } = await import("../src/entities/_audit");
  const { insertReturningId } = await import("../src/lib/db-helpers");

  const ds = await getDb();
  let bad = 0;
  for (const e of allEntities) {
    const name = (e as any).options.name as string;
    try {
      const rows = await ds.getRepository(e as any).find({ take: 1 });
      console.log("OK   ", name.padEnd(28), rows.length ? "(has rows)" : "(empty)");
    } catch (err: any) {
      bad++;
      console.log("FAIL ", name.padEnd(28), err.message);
    }
  }

  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    await qr.manager.save(Brand, { name: "__CHECK__", ...createAudit("check") } as any);
    const row = await qr.manager.findOneBy(Brand, { name: "__CHECK__" } as any);
    console.log("INSERT test:", row ? "OK" : "FAIL", row);
    if (!row) bad++;
    const newId = await insertReturningId(qr.manager, Brand, { name: "__CHECK2__", ...createAudit("check") });
    const row2 = await qr.manager.findOneBy(Brand, { name: "__CHECK2__" } as any);
    const ok2 = !!row2 && row2.id === newId;
    console.log("insertReturningId test:", ok2 ? "OK" : "FAIL", { newId, found: row2?.id });
    if (!ok2) bad++;
  } catch (err: any) {
    bad++;
    console.log("INSERT test FAIL:", err.message);
  } finally {
    await qr.rollbackTransaction();
    await qr.release();
  }
  console.log(bad === 0 ? "\nALL GOOD" : "\n" + bad + " problem(s) above");
  await ds.destroy();
  process.exit(bad === 0 ? 0 : 1);
}
main();
