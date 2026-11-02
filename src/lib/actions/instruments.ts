"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { insertReturningId, isUniqueViolation } from "@/lib/db-helpers";
import { attempt } from "@/lib/result";
import { isIsoDate, isoToDate } from "@/lib/dates";
import { INSTRUMENT_CATEGORY, type InstrumentCategoryKey } from "@/lib/constants";
import { Instrument } from "@/entities/Instrument";
import { Calibration } from "@/entities/Calibration";
import { createAudit, updateAudit } from "@/entities/_audit";
import { requireAdmin, requireInternal, text, validId } from "./_guards";

const CATEGORY_BY_NUMBER: Record<number, InstrumentCategoryKey> = { 1: "WATER_METER", 2: "PRESSURE_GAUGE", 3: "STOPWATCH" };

export type InstrumentView = {
  id: number;
  category: InstrumentCategoryKey;
  code: string;
  label: string | null;
  active: boolean;
  calibrations: { calibratedAt: Date; expiresAt: Date; verificationDocumentName: string | null }[]; // latest only
};

async function loadInstruments(onlyActive: boolean, category?: InstrumentCategoryKey): Promise<InstrumentView[]> {
  const db = await getDb();
  const where: Record<string, unknown> = {};
  if (onlyActive) where.status = 1;
  if (category) where.category = INSTRUMENT_CATEGORY[category];
  const [instruments, calibrations] = await Promise.all([
    db.getRepository(Instrument).find({ where, order: { category: "ASC", code: "ASC" } }),
    db.getRepository(Calibration).find({ where: { status: 1 }, order: { calibratedAt: "DESC", id: "DESC" } }),
  ]);
  const latest = new Map<number, (typeof calibrations)[number]>();
  for (const c of calibrations) if (!latest.has(c.instrumentId)) latest.set(c.instrumentId, c);
  return instruments.map((i) => {
    const c = latest.get(i.id);
    return {
      id: i.id,
      category: CATEGORY_BY_NUMBER[i.category] ?? "WATER_METER",
      code: i.code,
      label: i.label,
      active: i.status === 1,
      calibrations: c ? [{ calibratedAt: isoToDate(c.calibratedAt), expiresAt: isoToDate(c.expiresAt), verificationDocumentName: c.verificationDocument }] : [],
    };
  });
}

export async function getInstruments() {
  await requireInternal();
  return loadInstruments(false);
}

/** For evaluation selectors: active instruments only. An expired calibration is only flagged by the UI. */
export async function getActiveInstruments(category: InstrumentCategoryKey) {
  await requireInternal();
  return loadInstruments(true, category);
}

function cleanCode(code: string): string {
  const c = (code ?? "").replace(/\s/g, "");
  if (!c) throw new Error("Ingresa el código del instrumento.");
  if (c.length > 50) throw new Error("El código no puede superar 50 caracteres.");
  return c;
}

export async function createInstrument(input: { category: InstrumentCategoryKey; code: string; label?: string }) {
  return attempt(async () => {
    const s = await requireAdmin();
    const category = INSTRUMENT_CATEGORY[input.category];
    if (!category) throw new Error("Categoría inválida.");
    const db = await getDb();
    try {
      await insertReturningId(db.manager, Instrument, {
        category,
        code: cleanCode(input.code),
        label: text(input.label, "La descripción", 200),
        ...createAudit(s.audit),
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("Ya existe un instrumento con ese código.");
      throw err;
    }
    revalidatePath("/instruments");
  });
}

export async function updateInstrument(input: { id: number; code: string; label?: string; active: boolean }) {
  return attempt(async () => {
    const s = await requireAdmin();
    const db = await getDb();
    try {
      const r = await db.getRepository(Instrument).update(
        { id: validId(input.id, "Instrumento") },
        { code: cleanCode(input.code), label: text(input.label, "La descripción", 200), status: input.active ? 1 : 2, ...updateAudit(s.audit) },
      );
      if (!r.affected) throw new Error("Instrumento no encontrado.");
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("Ya existe un instrumento con ese código.");
      throw err;
    }
    revalidatePath("/instruments");
  });
}

/** Any internal user may log a calibration (routine task when an instrument comes back from service). */
export async function addCalibration(input: {
  instrumentId: number;
  calibratedAt: string; // yyyy-mm-dd
  expiresAt?: string; // yyyy-mm-dd, defaults to calibratedAt + 1 year
  verificationDocumentName?: string;
  notes?: string;
}) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    const instrument = await db.getRepository(Instrument).findOne({ where: { id: validId(input.instrumentId, "Instrumento") } });
    if (!instrument) throw new Error("Instrumento no encontrado.");
    if (!isIsoDate(input.calibratedAt)) throw new Error("Fecha de calibración inválida.");
    let expiresAt = input.expiresAt;
    if (expiresAt) {
      if (!isIsoDate(expiresAt)) throw new Error("Fecha de vencimiento inválida.");
    } else {
      const d = isoToDate(input.calibratedAt);
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      expiresAt = d.toISOString().slice(0, 10);
    }
    if (expiresAt < input.calibratedAt) throw new Error("El vencimiento no puede ser anterior a la calibración.");
    await insertReturningId(db.manager, Calibration, {
      instrumentId: instrument.id,
      calibratedAt: input.calibratedAt,
      expiresAt,
      verificationDocument: text(input.verificationDocumentName, "El documento de verificación", 200),
      notes: text(input.notes, "Las notas", 1000),
      ...createAudit(s.audit),
    });
    revalidatePath("/instruments");
  });
}
