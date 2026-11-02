"use client";

import { useState } from "react";
import type { Result } from "@/lib/result";
import Drawer from "@/components/ui/Drawer";
import { useAction } from "@/components/ui/useAction";
import { btn, btnPrimary, errorText, input, muted } from "@/components/ui/styles";
import {
  createProductType, updateProductType, setProductTypeStatus,
  createReferenceVariant, setReferenceVariantStatus,
} from "@/lib/actions/catalogs";

type Variant = { id: number; label: string; referenceValue: number; requiresFlushTest: number; status: number };
type PType = { id: number; name: string; method: number; description: string | null; status: number; variants: Variant[] };

const METHOD_LABELS: Record<number, string> = { 1: "Comparativo", 2: "Referencia fija" };
const lbl = "text-sm font-medium text-text";

export default function ProductTypesTable({ types, usage, isAdmin }: { types: PType[]; usage: Record<string, number>; isAdmin: boolean }) {
  const [newOpen, setNewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const editing = types.find((t) => t.id === editingId) ?? null;
  const visible = types.filter((t) => showInactive || t.status === 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Tipos de producto</h1>
          <p className="text-sm text-text-muted">
            Define el método de evaluación de cada tipo.{!isAdmin && " (Solo lectura: se requiere rol Administrador.)"}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setNewOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark sm:min-h-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
            Nuevo tipo
          </button>
        )}
      </div>

      <label className="flex min-h-11 items-center gap-2 text-sm text-text-muted sm:min-h-0">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Mostrar inactivos
      </label>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center"><p className="text-text-muted">Todavía no hay tipos de producto.</p></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="border-b border-border bg-bg text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Método</th>
                <th className="px-4 py-3 font-medium">Productos</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id} className={"border-b border-border last:border-0" + (t.status === 1 ? "" : " opacity-60")}>
                  <td className="px-4 py-3 text-text">{t.name}{t.method === 2 && <span className="ml-2 text-xs text-text-muted">({t.variants.filter((v) => v.status === 1).length} variantes)</span>}</td>
                  <td className="px-4 py-3 text-text-muted">{METHOD_LABELS[t.method]}</td>
                  <td className="px-4 py-3 text-text-muted">{usage[String(t.id)] ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (t.status === 1 ? "bg-primary/10 text-primary" : "bg-bg text-text-muted")}>{t.status === 1 ? "Activo" : "Inactivo"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditingId(t.id)} aria-label={`${isAdmin ? "Editar" : "Ver"} ${t.name}`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-1.5 text-text-muted hover:bg-bg hover:text-primary sm:min-h-0 sm:min-w-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={newOpen} onClose={() => setNewOpen(false)} title="Nuevo tipo de producto">
        {newOpen && <TypeForm onDone={() => setNewOpen(false)} />}
      </Drawer>
      <Drawer open={editing !== null} onClose={() => setEditingId(null)} title={editing?.name || "Tipo de producto"}>
        {editing && <EditType key={editing.id} type={editing} isAdmin={isAdmin} />}
      </Drawer>
    </div>
  );
}

function TypeForm({ type, onDone }: { type?: PType; onDone?: () => void }) {
  const { pending, error, run } = useAction();
  const [name, setName] = useState(type?.name ?? "");
  const [method, setMethod] = useState(type?.method ?? 1);
  const [description, setDescription] = useState(type?.description ?? "");
  const [saved, setSaved] = useState(false);
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      setSaved(false);
      run<unknown>(() => (type ? updateProductType(type.id, { name, method, description }) : createProductType({ name, method, description })) as Promise<Result<unknown>>,
        () => { if (onDone) onDone(); else { setSaved(true); setTimeout(() => setSaved(false), 2000); } });
    }}>
      <div className="space-y-2"><label className={lbl}>Nombre</label><input className={input} value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div className="space-y-2">
        <label className={lbl}>Método de evaluación</label>
        <select className={input} value={method} onChange={(e) => setMethod(Number(e.target.value))}>
          <option value={1}>Comparativo (con y sin dispositivo)</option>
          <option value={2}>Referencia fija (litros por descarga)</option>
        </select>
      </div>
      <div className="space-y-2"><label className={lbl}>Descripción (opcional)</label><textarea className={input} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      {error && <p className={errorText} role="alert">{error}</p>}
      <div className="flex items-center gap-3">
        <button className={btnPrimary} disabled={pending}>{pending ? "Guardando..." : type ? "Guardar cambios" : "Crear tipo"}</button>
        {saved && <span className="text-sm text-success">Guardado</span>}
      </div>
    </form>
  );
}

function EditType({ type, isAdmin }: { type: PType; isAdmin: boolean }) {
  const { pending, error, run } = useAction();
  const active = type.status === 1;
  if (!isAdmin) return <ReadOnly type={type} />;
  return (
    <div className="space-y-6">
      <TypeForm type={type} />
      {type.method === 2 && <Variants type={type} />}
      <div className="border-t border-border pt-4">
        <button className={"text-sm font-medium hover:underline disabled:opacity-50 " + (active ? "text-danger" : "text-primary")} disabled={pending}
          onClick={() => run(() => setProductTypeStatus(type.id, active ? 2 : 1))}>
          {active ? "Desactivar tipo" : "Reactivar tipo"}
        </button>
        {error && <p className={errorText}>{error}</p>}
      </div>
    </div>
  );
}

function ReadOnly({ type }: { type: PType }) {
  return (
    <div className="space-y-2 text-sm">
      <p><span className="text-text-muted">Método: </span>{METHOD_LABELS[type.method]}</p>
      {type.description && <p>{type.description}</p>}
      {type.variants.filter((v) => v.status === 1).map((v) => <p key={v.id}>{v.label} — {v.referenceValue} L</p>)}
    </div>
  );
}

function Variants({ type }: { type: PType }) {
  const { pending, error, run } = useAction();
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [flush, setFlush] = useState(false);
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className={lbl}>Variantes de referencia</div>
      {type.variants.length === 0 && <p className={muted}>Sin variantes.</p>}
      {type.variants.map((v) => (
        <div key={v.id} className={"flex items-center justify-between gap-2 text-sm" + (v.status === 1 ? "" : " opacity-60")}>
          <span>{v.label} — {v.referenceValue} L{v.requiresFlushTest ? " · prueba de descarga" : ""}{v.status === 1 ? "" : " (inactiva)"}</span>
          <button className={btn} disabled={pending} onClick={() => run(() => setReferenceVariantStatus(v.id, v.status === 1 ? 2 : 1))}>{v.status === 1 ? "Desactivar" : "Activar"}</button>
        </div>
      ))}
      <form className="space-y-2 rounded-md border border-dashed border-border p-3" onSubmit={(e) => {
        e.preventDefault();
        run(() => createReferenceVariant(type.id, { label, referenceValue: Number(value), requiresFlushTest: flush }), () => { setLabel(""); setValue(""); setFlush(false); });
      }}>
        <div className="grid grid-cols-2 gap-2">
          <input className={input} placeholder="Etiqueta (ej. Liquido)" value={label} onChange={(e) => setLabel(e.target.value)} required />
          <input className={input} placeholder="Litros de ref." type="number" step="0.01" min="0.01" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} required />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0"><input type="checkbox" checked={flush} onChange={(e) => setFlush(e.target.checked)} /> Requiere prueba de descarga</label>
        <button className={btn} disabled={pending}>Agregar variante</button>
      </form>
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}
