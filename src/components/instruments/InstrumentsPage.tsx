"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createInstrument, updateInstrument, addCalibration, type InstrumentView } from "@/lib/actions/instruments";
import { useAction } from "@/components/ui/useAction";
import { todayIso, isIsoDate, isoToDate } from "@/lib/dates";
import type { InstrumentCategoryKey as Category } from "@/lib/constants";

const CATEGORY_LABELS: Record<Category, string> = {
  WATER_METER: "Medidores de agua",
  PRESSURE_GAUGE: "Manómetros",
  STOPWATCH: "Cronómetros",
};

const field = "w-full min-h-11 sm:min-h-0 rounded-md border border-border bg-surface px-3 py-2 text-base sm:py-1.5 sm:text-sm focus:border-primary focus:outline-none";
const smallBtn = "min-h-11 sm:min-h-0 rounded-md border border-border px-3 py-1 text-xs font-medium text-text hover:bg-bg";

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Lima" });
}

function calibrationStatus(calibratedAt: Date, expiresAt: Date, now: number) {
  const start = new Date(calibratedAt).getTime();
  const end = new Date(expiresAt).getTime() + 12 * 3600 * 1000; // valid through the whole expiry day
  const total = end - start;
  const percent = total > 0 ? Math.min(100, Math.max(0, ((now - start) / total) * 100)) : 100;
  const isExpired = now > end;
  const isNearExpiry = !isExpired && percent >= 70;
  const daysRemaining = Math.round((end - now) / 86400000);
  return { percent, isExpired, isNearExpiry, daysRemaining };
}

export default function InstrumentsPage({ instruments, isAdmin }: { instruments: InstrumentView[]; isAdmin: boolean }) {
  const categories: Category[] = ["WATER_METER", "PRESSURE_GAUGE", "STOPWATCH"];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-text">Instrumentos</h1>
        <p className="text-sm text-text-muted">Equipos de laboratorio y su calibración vigente — se imprime en la Trazabilidad del certificado.</p>
      </div>
      {categories.map((cat) => (
        <CategorySection key={cat} category={cat} instruments={instruments.filter((i) => i.category === cat)} isAdmin={isAdmin} />
      ))}
    </div>
  );
}

function CategorySection({ category, instruments, isAdmin }: { category: Category; instruments: InstrumentView[]; isAdmin: boolean }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-surface p-3 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">{CATEGORY_LABELS[category]}</h2>
        {isAdmin && (
          <button type="button" onClick={() => setAdding(true)} className="min-h-11 px-2 text-xs font-medium text-primary hover:underline sm:min-h-0">+ Agregar instrumento</button>
        )}
      </div>
      <div className="space-y-2">
        {adding && <NewInstrumentRow category={category} onDone={() => setAdding(false)} />}
        {instruments.map((inst) => <InstrumentRow key={inst.id} instrument={inst} isAdmin={isAdmin} />)}
        {instruments.length === 0 && !adding && <p className="text-sm text-text-muted">Todavía no hay instrumentos registrados.</p>}
      </div>
    </div>
  );
}

function InstrumentRow({ instrument, isAdmin }: { instrument: InstrumentView; isAdmin: boolean }) {
  const router = useRouter();
  const { pending, error, run, clearError } = useAction();
  const [editing, setEditing] = useState(false);
  const [addingCalibration, setAddingCalibration] = useState(false);
  const [code, setCode] = useState(instrument.code);
  const [label, setLabel] = useState(instrument.label || "");
  const [active, setActive] = useState(instrument.active);
  // Date.now() must not run in the render that has to match the server HTML: compute it after mount.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  const latest = instrument.calibrations[0] || null;
  const status = latest && now !== null ? calibrationStatus(latest.calibratedAt, latest.expiresAt, now) : null;

  function save() {
    run(() => updateInstrument({ id: instrument.id, code, label, active }), () => {
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className={`rounded-md border border-border p-3 ${!instrument.active ? "opacity-60" : ""}`}>
      {editing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))} placeholder="Código" className={field} />
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Descripción (opcional)" className={field} />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-xs text-text sm:min-h-0">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5" />
            Activo (disponible para seleccionar en evaluaciones)
          </label>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={pending} className="min-h-11 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-50 sm:min-h-0">Guardar</button>
            <button type="button" onClick={() => { setEditing(false); clearError(); }} className="min-h-11 rounded-md px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-bg sm:min-h-0">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-[140px]">
            <p className="font-mono text-sm font-medium text-text">
              {instrument.code}
              {!instrument.active && <span className="ml-2 text-xs font-normal text-text-muted">(inactivo)</span>}
            </p>
            {instrument.label && <p className="text-xs text-text-muted">{instrument.label}</p>}
          </div>
          {latest && status ? (
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="min-w-[160px] text-xs text-text-muted">{fmtDate(latest.calibratedAt)} → {fmtDate(latest.expiresAt)}</div>
              <div className="h-2 min-w-[80px] max-w-[180px] flex-1 overflow-hidden rounded-full bg-bg">
                <div className={`h-full rounded-full ${status.isExpired ? "bg-danger" : status.isNearExpiry ? "bg-warning" : "bg-success"}`} style={{ width: `${status.percent}%` }} />
              </div>
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${status.isExpired ? "bg-danger/10 text-danger" : status.isNearExpiry ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                {status.isExpired
                  ? `Vencido hace ${Math.abs(status.daysRemaining)} día${Math.abs(status.daysRemaining) === 1 ? "" : "s"}`
                  : status.isNearExpiry
                    ? `Por vencer · ${status.daysRemaining} día${status.daysRemaining === 1 ? "" : "s"}`
                    : "Vigente"}
              </span>
            </div>
          ) : latest ? (
            <span className="flex-1 text-xs text-text-muted">Cargando...</span>
          ) : (
            <span className="flex-1 text-xs text-text-muted">Sin calibración registrada</span>
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setAddingCalibration(!addingCalibration)} className={smallBtn}>{addingCalibration ? "Cancelar" : "+ Calibración"}</button>
            {isAdmin && <button type="button" onClick={() => setEditing(true)} className={smallBtn}>Editar</button>}
          </div>
        </div>
      )}
      {addingCalibration && <NewCalibrationForm instrumentId={instrument.id} onDone={() => setAddingCalibration(false)} />}
    </div>
  );
}

function plusOneYear(iso: string): string | null {
  if (!isIsoDate(iso)) return null;
  const d = isoToDate(iso);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function NewCalibrationForm({ instrumentId, onDone }: { instrumentId: number; onDone: () => void }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [calibratedAt, setCalibratedAt] = useState(todayIso());
  const [expiresAt, setExpiresAt] = useState(plusOneYear(todayIso()) ?? "");
  const [doc, setDoc] = useState("");
  const [notes, setNotes] = useState("");

  function onCalibratedChange(v: string) {
    setCalibratedAt(v);
    const next = plusOneYear(v);
    if (next) setExpiresAt(next);
  }

  function save() {
    run(() => addCalibration({ instrumentId, calibratedAt, expiresAt, verificationDocumentName: doc, notes }), () => {
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="mt-2 space-y-2 border-t border-border pt-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-text-muted">Fecha de calibración</label>
          <input type="date" value={calibratedAt} onChange={(e) => onCalibratedChange(e.target.value)} className={field} />
        </div>
        <div>
          <label className="text-xs font-medium text-text-muted">Fecha de vencimiento <span className="font-normal">(por defecto: +1 año)</span></label>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={field} />
        </div>
      </div>
      <input value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="Documento de verificación (ej. Certificado de calibración)" className={field} />
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)" rows={2} className={field} />
      {error && <p className="text-xs text-danger">{error}</p>}
      <button type="button" onClick={save} disabled={pending} className="min-h-11 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-50 sm:min-h-0">
        {pending ? "Guardando..." : "Guardar calibración"}
      </button>
    </div>
  );
}

function NewInstrumentRow({ category, onDone }: { category: Category; onDone: () => void }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");

  function save() {
    run(() => createInstrument({ category, code, label }), () => {
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-primary/50 bg-primary/5 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))} placeholder="Código (ej. C007)" className={field} autoFocus />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Descripción (opcional)" className={field} />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={pending} className="min-h-11 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-50 sm:min-h-0">{pending ? "Guardando..." : "Guardar instrumento"}</button>
        <button type="button" onClick={onDone} className="min-h-11 rounded-md px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-bg sm:min-h-0">Cancelar</button>
      </div>
    </div>
  );
}
