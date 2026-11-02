"use client";
import Link from "next/link";
import { useState } from "react";
import type { DossierDetail } from "@/lib/actions/dossiers";
import { updateDossier, setDossierStatus } from "@/lib/actions/dossiers";
import { receiveProduct } from "@/lib/actions/receptions";
import { createProduct, updateProduct, setProductStatus, uploadProductFile } from "@/lib/actions/products";
import { DOSSIER_STATUS_LABELS, PRODUCT_STAGE_LABELS } from "@/lib/constants";
import { formatLima } from "@/lib/dates";
import { fileUrl } from "@/lib/file-url";
import { useAction } from "@/components/ui/useAction";
import Drawer from "@/components/ui/Drawer";
import DossierDocuments from "@/components/dossiers/DossierDocuments";
import type { DocumentsOverview } from "@/lib/actions/dossierDocuments";
import {
  ProductFormFields, EMPTY_PRODUCT_FORM, formToInput,
  type Item, type PType, type ProductFormState,
} from "@/components/products/ProductFormFields";
import { btn, btnPrimary, errorText, input, muted } from "@/components/ui/styles";

type Product = DossierDetail["products"][number];
type Catalogs = { types: PType[]; brands: Item[]; manufacturers: Item[]; countries: Item[] };

const STATUS_PILL: Record<number, string> = { 1: "bg-primary/10 text-primary", 2: "bg-success/10 text-success", 3: "bg-danger/10 text-danger" };
const STAGE_STYLES: Record<number, string> = { 1: "bg-warning/10 text-warning", 2: "bg-primary/10 text-primary", 3: "bg-success/10 text-success" };

export function DossierDetailView(props: { detail: DossierDetail; documents: DocumentsOverview } & Catalogs) {
  const { dossier, clientName, siteName, products } = props.detail;
  const open = dossier.status === 1;
  const [docsOpen, setDocsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const applicable = props.documents.documents.filter((d) => d.status !== 3).length;
  const received = props.documents.documents.filter((d) => d.status === 2).length;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-mono text-xl font-semibold text-text">{dossier.code}</h1>
            <p className="mt-1 text-sm text-text-muted">{clientName} — {siteName}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className={btn} onClick={() => setDocsOpen(true)}>Documentos ({received}/{applicable})</button>
            <button className={btn} onClick={() => setEditOpen(true)}>Editar</button>
            <span className={"rounded-full px-2.5 py-1 text-xs font-medium " + (STATUS_PILL[dossier.status] ?? "bg-bg text-text-muted")}>
              {DOSSIER_STATUS_LABELS[dossier.status] ?? dossier.status}
            </span>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-text-muted">N° registro de carta</dt>
            <dd className="mt-0.5 text-text">{dossier.letterRegistrationNumber || "—"}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Fecha de creación</dt>
            <dd className="mt-0.5 text-text">{formatLima(dossier.createdAt)}</dd>
          </div>
          {dossier.notes && (
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-text-muted">Observaciones</dt>
              <dd className="mt-0.5 whitespace-pre-line text-text">{dossier.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      <ProductsSection dossierId={dossier.id} dossierOpen={open} products={products} {...props} />

      <Drawer open={docsOpen} onClose={() => setDocsOpen(false)} title="Documentos del expediente">
        <DossierDocuments dossierId={dossier.id} open={open} overview={props.documents} />
      </Drawer>
      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title="Editar expediente">
        <EditDossierForm dossierId={dossier.id} status={dossier.status} letter={dossier.letterRegistrationNumber ?? ""} notes={dossier.notes ?? ""} onDone={() => setEditOpen(false)} />
      </Drawer>
    </div>
  );
}

function EditDossierForm(p: { dossierId: number; status: number; letter: string; notes: string; onDone: () => void }) {
  const { pending, error, run } = useAction();
  const [letter, setLetter] = useState(p.letter);
  const [notes, setNotes] = useState(p.notes);
  const [status, setStatus] = useState(p.status);
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      run(async () => {
        const r = await updateDossier(p.dossierId, { letterRegistrationNumber: letter, notes });
        if (!r.ok) return r;
        return status !== p.status ? setDossierStatus(p.dossierId, status) : r;
      }, p.onDone);
    }}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-text">Estado</label>
        <select className={input} value={status} onChange={(e) => setStatus(Number(e.target.value))}>
          {[1, 2, 3].map((s) => <option key={s} value={s}>{DOSSIER_STATUS_LABELS[s]}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-text">N° de registro de carta</label>
        <input className={input} value={letter} onChange={(e) => setLetter(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-text">Observaciones</label>
        <textarea className={input} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p className={errorText} role="alert">{error}</p>}
      <button className={btnPrimary + " w-full"} disabled={pending}>{pending ? "Guardando..." : "Guardar cambios"}</button>
    </form>
  );
}

function ProductsSection(props: { dossierId: number; dossierOpen: boolean; products: Product[] } & Catalogs) {
  const { dossierId, dossierOpen, products } = props;
  const [newOpen, setNewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = products.find((p) => p.id === editingId) ?? null;
  const activeCount = products.filter((p) => p.status === 1).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-text">Productos ({activeCount})</h2>
        {dossierOpen && (
          <button onClick={() => setNewOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark sm:min-h-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
            Agregar producto
          </button>
        )}
      </div>
      {!dossierOpen && <p className={muted}>El expediente no está abierto: no se pueden agregar ni modificar productos.</p>}

      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-text-muted">Este expediente todavía no tiene productos.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="border-b border-border bg-bg text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Descripción</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={"border-b border-border last:border-0" + (p.status === 1 ? "" : " opacity-60")}>
                  <td className="px-4 py-3 font-mono text-text">
                    {p.currentStage >= 2 && p.status === 1 ? (
                      <Link href={`/dossiers/${dossierId}/products/${p.id}`} className="inline-block py-1 hover:underline">{p.code}</Link>
                    ) : p.code}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-text">{p.description}</td>
                  <td className="px-4 py-3 text-text-muted">{p.typeName}</td>
                  <td className="px-4 py-3">
                    {p.status === 1 ? (
                      <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + STAGE_STYLES[p.currentStage]}>{PRODUCT_STAGE_LABELS[p.currentStage]}</span>
                    ) : <span className="rounded-full bg-bg px-2 py-0.5 text-xs font-medium text-text-muted">Inactivo</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditingId(p.id)} aria-label={`Editar ${p.code}`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-1.5 text-text-muted hover:bg-bg hover:text-primary sm:min-h-0 sm:min-w-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={newOpen} onClose={() => setNewOpen(false)} title="Agregar producto">
        {newOpen && <NewProductForm {...props} onCreated={() => setNewOpen(false)} />}
      </Drawer>
      <Drawer open={editing !== null} onClose={() => setEditingId(null)} title={editing?.code || "Editar producto"}>
        {editing && <EditProduct key={editing.id} product={editing} {...props} />}
      </Drawer>
    </div>
  );
}

function NewProductForm(props: { dossierId: number; onCreated: () => void } & Catalogs) {
  const { pending, error, run } = useAction();
  const [f, setF] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  return (
    <form className="space-y-6" onSubmit={(e) => {
      e.preventDefault();
      if (f.typeId === "") return;
      run(() => createProduct(props.dossierId, formToInput(f)), () => { setF(EMPTY_PRODUCT_FORM); props.onCreated(); });
    }}>
      <ProductFormFields value={f} onChange={setF} {...props} />
      <p className={muted}>La foto y la ficha técnica se suben al guardar, desde &ldquo;Editar&rdquo; el producto.</p>
      {error && <p className={errorText} role="alert">{error}</p>}
      <button className={btnPrimary + " w-full"} disabled={pending}>{pending ? "Registrando..." : "Registrar producto"}</button>
    </form>
  );
}

function EditProduct({ product: p, dossierOpen, ...cat }: { product: Product; dossierOpen: boolean } & Catalogs & { dossierId: number }) {
  const { pending, error, run } = useAction();
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState<ProductFormState>({
    typeId: p.productTypeId, code: p.code, description: p.description,
    brandId: p.brandId ?? "", manufacturerId: p.manufacturerId ?? "", countryId: p.originCountryId ?? "",
    usage: p.usage ?? "", material: p.material ?? "",
    warranty: p.warrantyYears?.toString() ?? "", lpm: p.consumptionLpm?.toString() ?? "",
    variantIds: p.variantIds,
  });
  const active = p.status === 1;
  return (
    <div className="space-y-6">
      {dossierOpen && active && (
        <form className="space-y-6" onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          run(() => updateProduct(p.id, formToInput(f)), () => { setSaved(true); setTimeout(() => setSaved(false), 2000); });
        }}>
          <ProductFormFields value={f} onChange={setF} {...cat} lockType={p.currentStage >= 3} />
          {error && <p className={errorText} role="alert">{error}</p>}
          <div className="flex items-center gap-3">
            <button className={btnPrimary} disabled={pending}>{pending ? "Guardando..." : "Guardar cambios"}</button>
            {saved && <span className="text-sm text-success">Guardado</span>}
          </div>
        </form>
      )}

      <div className="grid gap-3">
        <FileSlot productId={p.id} editable={dossierOpen} kind="photo" label="Foto de referencia" accept="image/jpeg,image/png" path={p.photoPath} />
        <FileSlot productId={p.id} editable={dossierOpen} kind="techSheet" label="Ficha técnica (PDF)" accept="application/pdf" path={p.techSheetPath} />
      </div>

      {active && <ReceptionBlock product={p} dossierOpen={dossierOpen} />}

      {active && p.currentStage >= 2 && (
        <Link href={`/dossiers/${p.dossierId}/products/${p.id}`} className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline sm:min-h-0">
          Evaluaciones →
        </Link>
      )}

      {dossierOpen && <ActiveToggle product={p} />}
    </div>
  );
}

function ActiveToggle({ product: p }: { product: Product }) {
  const { pending, error, run } = useAction();
  const active = p.status === 1;
  return (
    <div className="border-t border-border pt-4">
      <button className={"text-sm font-medium hover:underline disabled:opacity-50 " + (active ? "text-danger" : "text-primary")} disabled={pending}
        onClick={() => run(() => setProductStatus(p.id, active ? 2 : 1))}>
        {active ? "Desactivar producto" : "Reactivar producto"}
      </button>
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}

function FileSlot({ productId, kind, label, accept, path, editable }: { productId: number; kind: "photo" | "techSheet"; label: string; accept: string; path: string | null; editable: boolean }) {
  const { pending, error, run } = useAction();
  const url = fileUrl(path);
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-text">{label}</div>
      {url && kind === "photo" && (
        // eslint-disable-next-line @next/next/no-img-element
        <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={label} className="h-32 w-32 rounded-md border border-border bg-bg object-contain" /></a>
      )}
      {url && kind === "techSheet" && <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">Ver ficha técnica</a>}
      {!url && <div className={muted}>Sin archivo.</div>}
      {editable && (
        <form onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form); run(() => uploadProductFile(productId, kind, fd), () => form.reset()); }}
          className="flex flex-wrap items-center gap-2">
          {/* capture lets phones open the camera directly for the photo */}
          <input name="file" type="file" accept={accept} {...(kind === "photo" ? { capture: "environment" as const } : {})} className="min-w-0 flex-1 text-sm" required />
          <button className={btn} disabled={pending}>{pending ? "Subiendo..." : url ? "Reemplazar" : "Subir"}</button>
        </form>
      )}
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}

function ReceptionBlock({ product: p, dossierOpen }: { product: Product; dossierOpen: boolean }) {
  const { pending, error, run } = useAction();
  const [expected, setExpected] = useState(p.reception?.expected ?? true);
  const [notes, setNotes] = useState(p.reception?.notes ?? "");
  const r = p.reception;
  if (r?.present) {
    return (
      <div className="rounded-md border border-border bg-bg p-3 text-sm">
        <span className="font-medium">Recibido</span> el {r.receivedAt ? formatLima(r.receivedAt) : "—"} por {r.receiverName ?? "—"}
        {!r.expected && " · no figuraba en la lista del cliente"}
        {r.notes ? ` · ${r.notes}` : ""}
      </div>
    );
  }
  if (!dossierOpen) return null;
  return (
    <form className="space-y-2 rounded-md border border-dashed border-border p-3" onSubmit={(e) => e.preventDefault()}>
      <div className="text-sm font-medium">Recepción</div>
      {r && !r.present && <p className={muted}>Registrado como no recibido{r.notes ? `: ${r.notes}` : ""}.</p>}
      <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
        <input type="checkbox" checked={expected} onChange={(e) => setExpected(e.target.checked)} />
        Figuraba en la lista del cliente
      </label>
      <input className={input} placeholder="Notas (estado del producto, faltantes...)" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} disabled={pending} onClick={() => run(() => receiveProduct(p.id, { present: true, expected, notes }))}>Marcar recibido</button>
        <button type="button" className={btn} disabled={pending} onClick={() => run(() => receiveProduct(p.id, { present: false, expected, notes }))}>No llegó</button>
      </div>
      {error && <p className={errorText}>{error}</p>}
    </form>
  );
}
