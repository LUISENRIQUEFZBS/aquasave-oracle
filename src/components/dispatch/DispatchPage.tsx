"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Drawer from "@/components/ui/Drawer";
import { useAction } from "@/components/ui/useAction";
import { btn, btnPrimary, input, muted } from "@/components/ui/styles";
import { formatLima } from "@/lib/dates";
import { recordBulkDispatch, type PendingDispatchItem, type DispatchHistoryItem } from "@/lib/actions/dispatch";

export default function DispatchPage({ pending, history }: { pending: PendingDispatchItem[]; history: DispatchHistoryItem[] }) {
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const tabCls = (on: boolean) => `min-h-11 px-4 py-2 text-sm font-medium sm:min-h-0 ${on ? "border-b-2 border-primary text-primary" : "text-text-muted hover:text-text"}`;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text">Despacho</h1>
        <p className="text-sm text-text-muted">Productos con evaluación finalizada, listos para devolver al cliente.</p>
      </div>
      <div className="flex gap-1 border-b border-border">
        <button onClick={() => setTab("pending")} className={tabCls(tab === "pending")}>Pendientes ({pending.length})</button>
        <button onClick={() => setTab("history")} className={tabCls(tab === "history")}>Despachados</button>
      </div>
      {tab === "pending" ? <PendingList items={pending} /> : <HistoryList items={history} />}
    </div>
  );
}

function PendingList({ items }: { items: PendingDispatchItem[] }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);

  if (items.length === 0) {
    return <p className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-sm text-text-muted">No hay productos pendientes de despacho.</p>;
  }
  const groups = new Map<number, { code: string; client: string; items: PendingDispatchItem[] }>();
  for (const p of items) {
    if (!groups.has(p.dossierId)) groups.set(p.dossierId, { code: p.dossierCode, client: p.clientName, items: [] });
    groups.get(p.dossierId)!.items.push(p);
  }
  const toggle = (ids: number[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  return (
    <div className="space-y-5 pb-24">
      {[...groups.entries()].map(([dossierId, g]) => {
        const ids = g.items.map((p) => p.id);
        const all = ids.every((id) => selected.has(id));
        return (
          <div key={dossierId} className="space-y-2">
            <label className="flex min-h-11 items-center gap-2 border-b border-border pb-1 sm:min-h-0">
              <input type="checkbox" className="h-4 w-4" checked={all} onChange={() => toggle(ids, !all)} />
              <span className="text-sm font-medium text-text">{g.client} - Exp. {g.code}</span>
              <span className="text-xs text-text-muted">({g.items.length})</span>
              <Link href={`/dossiers/${dossierId}`} className="ml-auto text-xs text-primary hover:underline" onClick={(e) => e.stopPropagation()}>Ver expediente</Link>
            </label>
            {g.items.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-3">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={selected.has(p.id)} onChange={(e) => toggle([p.id], e.target.checked)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text">{p.code} - {p.description}</p>
                  <p className="text-xs text-text-muted">{p.typeName} · evaluado {formatLima(p.readySince)}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.result === "CONFORME" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                      {p.result === "CONFORME" ? "Conforme" : "No conforme"}
                    </span>
                    {p.certificateNumber && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Certificado {p.certificateNumber}</span>}
                    {p.result === "CONFORME" && !p.certificateNumber && <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">Sin certificado emitido</span>}
                  </div>
                </div>
              </label>
            ))}
          </div>
        );
      })}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface p-3 shadow-lg md:left-64">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <p className="text-sm font-medium text-text">{selected.size} seleccionado{selected.size === 1 ? "" : "s"}</p>
            <div className="flex gap-2">
              <button type="button" className={btn} onClick={() => setSelected(new Set())}>Limpiar</button>
              <button type="button" className={btnPrimary} onClick={() => setOpen(true)}>Despachar</button>
            </div>
          </div>
        </div>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title={`Despachar ${selected.size} producto${selected.size === 1 ? "" : "s"}`}>
        {open && <DispatchForm ids={[...selected]} warnNoCert={items.filter((p) => selected.has(p.id) && p.result === "CONFORME" && !p.certificateNumber).length} onDone={() => { setOpen(false); setSelected(new Set()); }} />}
      </Drawer>
    </div>
  );
}

function DispatchForm({ ids, warnNoCert, onDone }: { ids: number[]; warnNoCert: number; onDone: () => void }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [recipientName, setRecipientName] = useState("");
  const [exitGuideNumber, setGuide] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => recordBulkDispatch({ productIds: ids, recipientName, exitGuideNumber, notes }), () => { router.refresh(); onDone(); });
      }}
    >
      {warnNoCert > 0 && (
        <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
          {warnNoCert} producto{warnNoCert === 1 ? "" : "s"} Conforme{warnNoCert === 1 ? "" : "s"} aún no tiene{warnNoCert === 1 ? "" : "n"} certificado emitido.
        </p>
      )}
      <label className="block space-y-1.5"><span className="text-sm font-medium">Nombre de quien recibe</span>
        <input className={input} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} required autoFocus /></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium">N° guía de salida <span className="font-normal text-text-muted">(opcional)</span></span>
        <input className={input} value={exitGuideNumber} onChange={(e) => setGuide(e.target.value)} /></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium">Notas <span className="font-normal text-text-muted">(opcional)</span></span>
        <textarea className={input} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <p className={muted}>El despacho no se puede deshacer: los productos pasan a la etapa Despacho.</p>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <button className={btnPrimary + " w-full"} disabled={pending}>{pending ? "Guardando..." : "Confirmar despacho"}</button>
    </form>
  );
}

function HistoryList({ items }: { items: DispatchHistoryItem[] }) {
  if (items.length === 0) {
    return <p className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-sm text-text-muted">Todavía no se ha despachado ningún producto.</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((d) => (
        <div key={d.id} className="rounded-md border border-border bg-surface p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-text">{d.productCode} - {d.productDescription}</p>
            <span className="text-xs text-text-muted">{d.dispatchedAt ? formatLima(d.dispatchedAt) : ""}</span>
          </div>
          <p className="text-xs text-text-muted">{d.clientName} · Exp. {d.dossierCode} · {d.typeName}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
            <span>Entregado a: <span className="text-text">{d.recipientName}</span></span>
            {d.exitGuideNumber && <span>Guía: <span className="text-text">{d.exitGuideNumber}</span></span>}
            {d.dispatchedBy && <span>Por: <span className="text-text">{d.dispatchedBy}</span></span>}
          </div>
          {d.notes && <p className="mt-1 text-xs text-text-muted">{d.notes}</p>}
        </div>
      ))}
    </div>
  );
}
